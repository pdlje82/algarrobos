"""FastAPI adapter. Run one worker: the active save is owned by this process."""

import os
from pathlib import Path
from threading import RLock
from typing import Annotated, Any, Literal
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
from .parcel_removal import plan as removal_plan, delete as delete_parcels
from .configuration import load_defaults
from . import plant_prices
from . import designer
from . import documents, planning_draft, demonstrator_removal, funding, funding_visual


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
    planning_revision: Annotated[StrictInt, Field(ge=0)] | None = None


class ImportRequest(Mutation):
    save: dict[str, Any]
    confirm_replace: StrictBool = False


class LandFormRequest(StrictModel):
    revision: Annotated[StrictInt, Field(ge=0)]
    route_id: StrictStr
    parcel_id: StrictStr = "new"
    agreement_id: StrictStr | None = None


class RemovalPreviewRequest(StrictModel):
    revision: Annotated[StrictInt, Field(ge=0)]
    parcel_id: Annotated[StrictStr, Field(min_length=1, max_length=80)]


class DeleteParcelRequest(Mutation):
    parcel_id: Annotated[StrictStr, Field(min_length=1, max_length=80)]
    confirm: StrictBool


class DemonstratorRemovalPreview(StrictModel):
    revision: Annotated[StrictInt, Field(ge=0)]


class DeleteDemonstratorRequest(Mutation):
    confirm: StrictBool


class PlantPriceRequest(StrictModel):
    expected_revision: Annotated[StrictStr, Field(min_length=64, max_length=64)]
    unit_costs: dict[str, Any]


class DesignerPreviewRequest(StrictModel):
    revision: StrictInt
    draft: dict[str, Any]
    command: dict[str, Any] | None = None


class DesignerSaveRequest(Mutation):
    design_revision: Annotated[StrictInt, Field(ge=0)]
    draft: dict[str, Any]
    mode: Literal["create", "update"]
    design_id: UUID | None
    name: StrictStr | None


class DesignerLibraryRequest(Mutation):
    design_revision: Annotated[StrictInt, Field(ge=0)]
    operation: Literal["new", "load", "rename", "delete"]
    design_id: UUID | None
    name: StrictStr | None
    confirm: StrictBool


class PlanningEditRequest(Mutation):
    planning_revision: Annotated[StrictInt, Field(ge=0)]
    administration: dict[str, Any]


class HandoffPreviewRequest(StrictModel):
    revision: StrictInt
    design_revision: StrictInt
    planning_revision: StrictInt


class HandoffRequest(Mutation):
    design_revision: StrictInt
    planning_revision: StrictInt


class FundingContextRequest(StrictModel):
    revision: StrictInt
    planning_revision: StrictInt
    design_revision: StrictInt
    parcel_ids: list[StrictStr]
    target: Literal["activity", "demonstrator", "business"]


class FundingEvaluationRequest(StrictModel):
    revision: StrictInt
    draft: dict[str, Any]


class FundingPrepareRequest(FundingEvaluationRequest):
    applicant_choice: dict[str, Any] | None = None


class FundingMutationRequest(Mutation):
    funding_revision: StrictInt
    planning_revision: StrictInt
    design_revision: StrictInt
    operation: Literal["draft", "save", "adopt", "delete"]
    draft: dict[str, Any] | None = None
    record_id: UUID | None = None


def view(data, explanation=None):
    project = data["project"]
    return {
        "client_contract_version": 1,
        "configuration_mode": "none"
        if project is None
        else "json-snapshot-v2"
        if "form_schema_version" in project["scenario"]
        else "legacy-v4-form-adapter",
        "configuration_notice": "This earlier save uses the explicit v1 form-defaults adapter. Its saved values are preserved; new projects snapshot defaults.json."
        if project is not None and "form_schema_version" not in project["scenario"]
        else None,
        "project": project,
        "revision": data["revision"],
        "can_undo": data["undo"] is not None,
        "designer_saved": data["designer"] is not None and data["designer"]["active_id"] is not None,
        "designer_revision": data["designer_revision"],
        "funding_revision": data["funding_revision"],
        "funding_plans": [] if data["funding"] is None else [{"id": r["id"], "name": r["draft"]["name"], "activity_key": r["draft"]["activity_key"], "active": r["active"]} for r in data["funding"]["plans"]],
        "planning": None if project is None else planning_draft.workspace(project, data["planning"], data["planning_revision"]),
        "undo_kind": "delete" if data["undo_edit"] is not None else "action",
        "actions": list_actions(project) if project else [],
        "summary": summary(project) if project else None,
        "land_access": land_catalog(project) if project else None,
        "explanation": explanation
        if explanation is not None
        else (
            project["history"][-1]["explanation"]
            if project and project["history"]
            else "Choose a starting land route."
            if project
            else "Create your first project."
        ),
    }


def create_app(save_path=None):
    defaults = load_defaults()
    plant_prices.snapshot()  # Required editable configuration; never invent missing prices.
    from . import designer_library
    designer_library.defaults()
    funding.catalogue()
    app = FastAPI(title="Algarroba — Restoration planning", version="0.4.0")
    if save_path is not None:
        resolved_save_path = save_path
    elif "RESTORATION_SAVE_PATH" in os.environ:
        resolved_save_path = os.environ["RESTORATION_SAVE_PATH"]
    else:
        configured = Path(defaults["runtime"]["save_path"])
        resolved_save_path = (
            configured
            if configured.is_absolute()
            else Path(__file__).resolve().parents[1] / configured
        )
    if not str(resolved_save_path).strip():
        raise Invalid(
            "The configured save path is empty. Set a valid path or unset RESTORATION_SAVE_PATH to use defaults.json."
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
                if len(body) > 10_000_000:
                    return JSONResponse(
                        {"detail": "JSON request is too large (maximum 10 MB)."},
                        status_code=413,
                    )
            request._body = bytes(body)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(Invalid)
    async def invalid_handler(request, exc):
        return JSONResponse(
            {"detail": str(exc)},
            status_code=409
            if isinstance(exc, (Conflict, plant_prices.PriceConflict))
            else 422,
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

    def designer_state(revision=None):
        data = get_store().snapshot()
        if revision is not None and revision != data["revision"]:
            raise Conflict("Project changed. Reload it; your designer draft is retained.")
        if data["project"] is None: raise Invalid("Create a project first.")
        return data

    @app.get("/api/designer")
    def get_designer():
        data = designer_state()
        return designer.workspace(data["project"],data["designer"],data["designer_revision"])

    @app.get("/api/funding/catalogue")
    def funding_catalogue():
        return funding.catalogue()

    @app.get("/api/funding")
    def funding_workspace():
        data = designer_state()
        return funding.workspace(data["project"], data["funding"], data["funding_revision"])

    @app.post("/api/funding/context")
    def funding_context(req: FundingContextRequest):
        data = designer_state(req.revision)
        if req.planning_revision != data["planning_revision"] or req.design_revision != data["designer_revision"]:
            raise Conflict("Planning changed. Save/reload planning before opening funding context.")
        return funding.new_draft(data["project"], data["planning"], req.parcel_ids, req.target)

    @app.post("/api/funding/evaluate")
    @app.post("/api/funding/plan-preview")
    def funding_evaluate(req: FundingEvaluationRequest):
        data = designer_state(req.revision)
        return funding.evaluate(req.draft, data["project"], data["planning"])

    @app.post("/api/funding/prepare")
    def funding_prepare(req: FundingPrepareRequest):
        data = designer_state(req.revision)
        return funding.prepare(req.draft, data["project"], req.applicant_choice, resolve="applicant_choice" in req.model_fields_set)

    @app.post("/api/funding/visualise")
    def funding_visualise(req: FundingEvaluationRequest):
        data = designer_state(req.revision)
        return funding_visual.visualise(funding.evaluate(req.draft, data["project"], data["planning"]))

    @app.post("/api/funding/save")
    def funding_save(req: FundingMutationRequest):
        data = get_store().funding_mutation(req.operation, req.revision, req.funding_revision, req.planning_revision, req.design_revision, str(req.request_id), draft=req.draft, record_id=None if req.record_id is None else str(req.record_id))
        return funding.workspace(data["project"], data["funding"], data["funding_revision"])

    @app.post("/api/designer/preview")
    def designer_preview(req: DesignerPreviewRequest):
        data = designer_state(req.revision)
        return designer.evaluate(req.draft,data["project"],req.command)

    @app.post("/api/designer/import-plan")
    def designer_import_plan(req: ActionRequest):
        data = designer_state(req.revision)
        return designer.import_plan(data["project"])

    @app.post("/api/designer/save")
    def designer_save(req: DesignerSaveRequest):
        data = get_store().save_designer(req.draft,req.revision,req.design_revision,str(req.request_id),
            mode=req.mode, design_id=None if req.design_id is None else str(req.design_id), name=req.name)
        return designer.workspace(data["project"],data["designer"],data["designer_revision"])

    @app.post("/api/designer/library")
    def designer_library_operation(req: DesignerLibraryRequest):
        data = get_store().designer_library(req.operation,req.revision,req.design_revision,str(req.request_id),
            design_id=None if req.design_id is None else str(req.design_id), name=req.name, confirm=req.confirm)
        return designer.workspace(data["project"],data["designer"],data["designer_revision"])

    @app.post("/api/designer/apply-preview")
    @app.post("/api/designer/apply")
    def designer_apply_retired():
        return JSONResponse({"detail": "This designer apply operation was retired. Refresh the app, use the design in Project planning, and commit the demonstrator there."}, status_code=410)

    @app.get("/api/demonstrator/draft")
    def get_planning():
        data = designer_state()
        return planning_draft.workspace(data["project"], data["planning"], data["planning_revision"])

    @app.post("/api/demonstrator/draft")
    def update_planning(req: PlanningEditRequest):
        data = get_store().planning_mutation("edit", req.revision, req.planning_revision, str(req.request_id), administration=req.administration)
        return planning_draft.workspace(data["project"], data["planning"], data["planning_revision"])

    @app.post("/api/designer/handoff-preview")
    def handoff_preview(req: HandoffPreviewRequest):
        data = designer_state(req.revision)
        if req.design_revision != data["designer_revision"] or req.planning_revision != data["planning_revision"]:
            raise Conflict("Design or planning draft changed. Review the transfer again.")
        proposed = planning_draft.handoff(data["planning"], data["project"], data["designer"])
        previous = planning_draft.initial(data["project"]) if data["planning"] is None else data["planning"]
        recorded = planning_draft.workspace(data["project"], data["planning"], data["planning_revision"])["planting"]
        return {"planning": planning_draft.workspace(data["project"], proposed, data["planning_revision"]),
                "previous": None if recorded is None else {k: previous["inputs"][k] for k in designer.PHYSICAL},
                "notice": "Only the physical planning draft changes. Demonstration, funding, remaining budget, timing and notes are retained. No demonstrator is created; cash, time and history stay unchanged."}

    @app.post("/api/designer/handoff")
    def handoff(req: HandoffRequest):
        data = get_store().planning_mutation("handoff", req.revision, req.planning_revision, str(req.request_id), design_revision=req.design_revision)
        return planning_draft.workspace(data["project"], data["planning"], data["planning_revision"])

    @app.get("/api/designer/report")
    def designer_report(design_id: UUID | None = None):
        data = designer_state()
        attachment = data["designer"]
        if attachment is None: raise Invalid("Save a named design before downloading its report.")
        ident = attachment["active_id"] if design_id is None else str(design_id)
        if ident is None: raise Invalid("Save the active design under a name before downloading its report.")
        record = designer_library.find(attachment, ident)
        evaluation = designer.evaluate(record["draft"], data["project"])
        report = {"id":record["id"], "name":record["name"], "draft":record["draft"], "applied":attachment["applied"]}
        return JSONResponse({"project":data["project"]["name"],"design_revision":data["designer_revision"],"design":report,"evaluation":evaluation},
            headers={"Content-Disposition":'attachment; filename="algarroba-design-report.json"'})

    @app.get("/api/documents/{document_id}")
    def document_metadata(document_id: str, expected_sha256: str | None = None):
        return documents.metadata(document_id, expected_sha256)

    @app.get("/api/documents/{document_id}/file")
    def document_file(document_id: str, expected_sha256: str | None = None, download: bool = False):
        entry, path = documents.verified_file(document_id, expected_sha256)
        return FileResponse(path, media_type="application/pdf", filename=entry["filename"],
                            content_disposition_type="attachment" if download else "inline")

    @app.get("/api/designer/sources/{source_id}")
    def designer_source(source_id: str):
        data = designer_state()
        bundle = designer.load_bundle() if data["designer"] is None else data["designer"]["draft"]["bundle"]
        return FileResponse(designer.source_file(bundle,source_id))

    @app.get("/api/plant-prices")
    def default_plant_prices():
        return plant_prices.snapshot()

    @app.post("/api/plant-prices")
    def save_plant_prices(req: PlantPriceRequest):
        return plant_prices.update(req.unit_costs, req.expected_revision)

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

    @app.post("/api/parcels/removal-preview")
    def parcel_removal_preview(req: RemovalPreviewRequest):
        data = get_store().snapshot()
        if req.revision != data["revision"]:
            raise Conflict("This view is out of date. Reload the saved project.")
        if data["project"] is None:
            raise Invalid("Create a project first.")
        result = {
            "revision": data["revision"],
            **removal_plan(data["project"], req.parcel_id),
        }
        if data["funding"] is not None:
            after = delete_parcels(data["project"], [req.parcel_id])
            retained = funding.after_delete(data["funding"], data["project"], after, [req.parcel_id])
            kept = {r["id"] for r in retained["plans"] + retained["scenarios"]}
            for r in data["funding"]["plans"] + data["funding"]["scenarios"]:
                if r["id"] not in kept:
                    result["removed_actions"].append({"title": "Funding: " + r["draft"]["name"], "year": data["project"]["time"], "reason": "Linked to a removed parcel."})
        if data["planning"] is not None and planning_draft.after_parcel_deletion(data["planning"], data["project"], delete_parcels(data["project"], [req.parcel_id]), req.parcel_id) is None:
            result["removed_actions"].append({"title": "Demonstrator planning draft", "year": data["project"]["time"], "reason": "Linked to a parcel removed by this deletion."})
        if data["designer"] is not None:
            before = data["project"]
            after = delete_parcels(before,[req.parcel_id])
            retained = designer.after_parcel_deletion(data["designer"],before,after,req.parcel_id)
            kept_ids = set() if retained is None else {r["id"] for r in retained["designs"]}
            for record in data["designer"]["designs"]:
                if record["id"] not in kept_ids:
                    result["removed_actions"].append({"title":"Saved Site Designer: " + record["name"], "year":before["time"], "reason":"Linked to a parcel removed by this deletion."})
            kept_applied = 0 if retained is None else len(retained["applied"])
            removed_applied = len(data["designer"]["applied"]) - kept_applied
            if removed_applied:
                result["removed_actions"].append({"title":f"Applied designer snapshots ({removed_applied})", "year":before["time"], "reason":"Linked to a parcel removed by this deletion."})
        return result

    @app.post("/api/parcels/delete")
    def delete_parcel(req: DeleteParcelRequest):
        return mutate("delete_parcel", req)

    @app.post("/api/demonstrator/removal-preview")
    def demonstrator_removal_preview(req: DemonstratorRemovalPreview):
        data = designer_state(req.revision)
        library = data["designer"]
        return {"revision": data["revision"], **demonstrator_removal.plan(data["project"]),
                "preserved_designs": 0 if library is None else len(library["designs"]),
                "removed_applied_snapshots": 0 if library is None else len(library["applied"]),
                "planning_preserved": data["planning"] is not None}

    @app.post("/api/demonstrator/delete")
    def delete_demonstrator(req: DeleteDemonstratorRequest):
        return mutate("delete_demonstrator", req)

    @app.get("/api/sources/{source_id}")
    def source(source_id: str):
        filenames = {
            "land-poster": "LEARN-003 - Land Restoration - Seven Land Access Options - Infographic.png",
            "dryland-systems": "4033da1d50147790d978b646b319874c1f83950c7c4db915d51131eabc57e6a6.png",
        }
        if source_id not in filenames:
            document_id = documents.alias_id("/api/sources/" + source_id)
            if document_id is not None:
                return document_file(document_id)
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
