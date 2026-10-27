"""FastAPI adapter. Run one worker: the active save is owned by this process."""

import os
from pathlib import Path
from threading import RLock
from typing import Annotated, Any
from uuid import UUID

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt, StrictStr

from .engine import (
    Invalid,
    land_catalog,
    land_form,
    list_actions,
    preview as engine_preview,
    summary,
)
from .storage import Conflict, Store


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Mutation(StrictModel):
    revision: Annotated[StrictInt, Field(ge=0, le=1_000_000_000)]
    request_id: UUID


class NewRequest(Mutation):
    name: Annotated[StrictStr, Field(min_length=1, max_length=80)]
    confirm_replace: StrictBool = False


class ActionRequest(StrictModel):
    revision: Annotated[StrictInt, Field(ge=0)]
    action_id: Annotated[StrictStr, Field(min_length=1, max_length=80)]
    inputs: dict[str, Any] = Field(default_factory=dict)


class CommitRequest(ActionRequest):
    request_id: UUID


class ImportRequest(Mutation):
    save: dict[str, Any]
    confirm_replace: StrictBool = False


class LandFormRequest(StrictModel):
    revision: Annotated[StrictInt, Field(ge=0)]
    route_id: StrictStr
    parcel_id: StrictStr = "new"
    agreement_id: StrictStr | None = None


def view(data, explanation=None):
    project = data["project"]
    return {
        "project": project,
        "revision": data["revision"],
        "can_undo": data["undo"] is not None,
        "actions": list_actions(project) if project else [],
        "summary": summary(project) if project else None,
        "land_access": land_catalog(project) if project else None,
        "explanation": explanation
        or (
            project["history"][-1]["explanation"]
            if project and project["history"]
            else "Choose a starting land route."
            if project
            else "Create your first project."
        ),
    }


def create_app(save_path=None):
    app = FastAPI(title="Restoration Simulator", version="0.2.0")
    resolved_save_path = (
        save_path
        or os.getenv("RESTORATION_SAVE_PATH")
        or Path(__file__).resolve().parents[1] / "data" / "active-project.json"
    )
    # Importing the API for tests or Python inspection must not migrate the
    # user's active save. The serving app opens it on its first request.
    app.state.store = Store(save_path) if save_path is not None else None
    initialisation_lock = RLock()

    def get_store():
        with initialisation_lock:
            if app.state.store is None:
                app.state.store = Store(resolved_save_path)
            return app.state.store

    @app.middleware("http")
    async def limit_body(request: Request, call_next):
        # Bound JSON imports even when Content-Length is absent.
        if request.method == "POST":
            body = bytearray()
            async for chunk in request.stream():
                body.extend(chunk)
                if len(body) > 2_000_000:
                    return JSONResponse(
                        {"detail": "JSON import is too large (maximum 2 MB)."},
                        status_code=413,
                    )
            request._body = bytes(body)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(Invalid)
    async def invalid_handler(request, exc):
        return JSONResponse(
            {"detail": str(exc)}, status_code=409 if isinstance(exc, Conflict) else 422
        )

    @app.exception_handler(OSError)
    async def save_handler(request, exc):
        return JSONResponse(
            {
                "detail": f"Save unavailable: {exc}. The last successfully saved project is unchanged."
            },
            status_code=503,
        )

    @app.get("/api/project")
    def current():
        return view(get_store().snapshot())

    @app.get("/api/actions")
    def actions():
        return view(get_store().snapshot())["actions"]

    def mutate(operation, req):
        body = req.model_dump(exclude={"revision", "request_id"})
        data, explanation = get_store().mutate(
            operation, req.revision, str(req.request_id), body
        )
        return view(data, explanation)

    @app.post("/api/project/new")
    def new(req: NewRequest):
        return mutate("new", req)

    @app.post("/api/preview")
    def preview(req: ActionRequest):
        data = get_store().snapshot()
        if req.revision != data["revision"]:
            raise Conflict("This view is out of date. Reload the saved project.")
        if data["project"] is None:
            raise Invalid("Create a project first.")
        return engine_preview(data["project"], req.action_id, req.inputs)

    @app.post("/api/land/form")
    def land_configuration(req: LandFormRequest):
        data = get_store().snapshot()
        if req.revision != data["revision"]:
            raise Conflict("This view is out of date. Reload the saved project.")
        if data["project"] is None:
            raise Invalid("Create a project first.")
        return land_form(data["project"], req.route_id, req.parcel_id, req.agreement_id)

    @app.get("/api/sources/{source_id}")
    def source(source_id: str):
        filenames = {
            "land-poster": "LEARN-003 - Land Restoration - Seven Land Access Options - Infographic.png",
            "coast-tender": "COAST-001 - COASTRUST Nijar - Gunter Kunkel Park Stewardship Activities Tender Specification.pdf",
            "nature-finance": "FUND-003 - Nature Finance - Funding Instruments for Land Stewardship - 2025-11.pdf",
        }
        if source_id not in filenames:
            return JSONResponse({"detail": "Unknown source."}, status_code=404)
        path = (
            Path(__file__).resolve().parents[2] / "doc_library" / filenames[source_id]
        )
        if not path.is_file():
            return JSONResponse(
                {"detail": "Source file is unavailable."}, status_code=404
            )
        return FileResponse(path)

    @app.post("/api/commit")
    def commit(req: CommitRequest):
        return mutate("commit", req)

    @app.post("/api/undo")
    def undo(req: Mutation):
        return mutate("undo", req)

    @app.get("/api/export")
    def export():
        return JSONResponse(
            get_store().export(),
            headers={
                "Content-Disposition": 'attachment; filename="restoration-project.json"'
            },
        )

    @app.post("/api/import")
    def import_project(req: ImportRequest):
        return mutate("import", req)

    return app


app = create_app()
