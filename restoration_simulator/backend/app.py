"""FastAPI adapter. Run one worker: the active save is owned by this process."""
import os
from pathlib import Path
from typing import Annotated, Any
from uuid import UUID

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt, StrictStr

from .engine import Invalid, list_actions, summary, transition
from .storage import Conflict, Store


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid')


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


def view(data, explanation=None):
    project = data['project']
    return {'project': project, 'revision': data['revision'], 'can_undo': data['undo'] is not None,
            'actions': list_actions(project) if project else [],
            'summary': summary(project) if project else None,
            'explanation': explanation or (project['history'][-1]['explanation'] if project and project['history']
                                           else 'Choose a starting land route.' if project else 'Create your first project.')}


def create_app(save_path=None):
    app = FastAPI(title='Restoration Simulator', version='0.1.0')
    app.state.store = Store(save_path or os.getenv('RESTORATION_SAVE_PATH') or
                            Path(__file__).resolve().parents[1] / 'data' / 'active-project.json')

    @app.middleware('http')
    async def limit_body(request: Request, call_next):
        # Bound JSON imports even when Content-Length is absent.
        if request.method == 'POST':
            body = bytearray()
            async for chunk in request.stream():
                body.extend(chunk)
                if len(body) > 2_000_000:
                    return JSONResponse({'detail': 'JSON import is too large (maximum 2 MB).'}, status_code=413)
            request._body = bytes(body)
        response = await call_next(request)
        response.headers['Cache-Control'] = 'no-store'
        return response

    @app.exception_handler(Invalid)
    async def invalid_handler(request, exc):
        return JSONResponse({'detail': str(exc)}, status_code=409 if isinstance(exc, Conflict) else 422)

    @app.exception_handler(OSError)
    async def save_handler(request, exc):
        return JSONResponse({'detail': f'Save unavailable: {exc}. The last successfully saved project is unchanged.'}, status_code=503)

    @app.get('/api/project')
    def current():
        return view(app.state.store.snapshot())

    @app.get('/api/actions')
    def actions():
        return view(app.state.store.snapshot())['actions']

    def mutate(operation, req):
        body = req.model_dump(exclude={'revision', 'request_id'})
        data, explanation = app.state.store.mutate(operation, req.revision, str(req.request_id), body)
        return view(data, explanation)

    @app.post('/api/project/new')
    def new(req: NewRequest):
        return mutate('new', req)

    @app.post('/api/preview')
    def preview(req: ActionRequest):
        data = app.state.store.snapshot()
        if req.revision != data['revision']:
            raise Conflict('This view is out of date. Reload the saved project.')
        if data['project'] is None:
            raise Invalid('Create a project first.')
        projected, explanation = transition(data['project'], req.action_id, req.inputs)
        entry = projected['history'][-1]
        return {'revision': req.revision, 'explanation': explanation, 'cost': entry['cost'],
                'cash_change': entry['cash_change'], 'duration': round(entry['end'] - entry['start'], 4),
                'end_year': projected['time'], 'cash_after': projected['cash']}

    @app.post('/api/commit')
    def commit(req: CommitRequest):
        return mutate('commit', req)

    @app.post('/api/undo')
    def undo(req: Mutation):
        return mutate('undo', req)

    @app.get('/api/export')
    def export():
        return JSONResponse(app.state.store.export(), headers={'Content-Disposition': 'attachment; filename="restoration-project.json"'})

    @app.post('/api/import')
    def import_project(req: ImportRequest):
        return mutate('import', req)

    return app


app = create_app()
