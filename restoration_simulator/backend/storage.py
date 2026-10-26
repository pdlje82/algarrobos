"""Single-process local JSON store. Publish in memory only after atomic persistence."""
from copy import deepcopy
import hashlib
import json
import os
from pathlib import Path
import tempfile
from threading import RLock

from .engine import Invalid, new_project, require, transition, validate_state


class Conflict(Invalid):
    pass


def validate_export(payload):
    require(isinstance(payload, dict) and set(payload) == {'format_version', 'project', 'undo'}, 'Invalid export envelope.')
    require(type(payload['format_version']) is int and payload['format_version'] == 1, 'Unsupported export version.')
    project = validate_state(payload['project'])
    undo = payload['undo']
    if undo is not None:
        undo = validate_state(undo)
        require(undo['id'] == project['id'] and undo['name'] == project['name']
                and undo['scenario'] == project['scenario'], 'Undo belongs to a different project.')
        require(len(project['history']) > 0 and undo['history'] == project['history'][:-1], 'Invalid undo history.')
        require(undo['revision'] < project['revision'], 'Invalid undo revision.')
    return {'format_version': 1, 'project': project, 'undo': undo}


class Store:
    def __init__(self, path):
        self.path = Path(path)
        self.lock = RLock()
        self.error = None
        self.data = {'format_version': 1, 'project': None, 'undo': None, 'receipts': {}, 'revision': 0}
        if self.path.exists():
            try:
                raw = json.loads(self.path.read_text(encoding='utf-8'))
                require(set(raw) == set(self.data), 'Invalid autosave envelope.')
                validated = validate_export({k: raw[k] for k in ('format_version', 'project', 'undo')})
                require(type(raw['revision']) is int and raw['revision'] == validated['project']['revision'], 'Invalid store revision.')
                require(isinstance(raw['receipts'], dict) and all(isinstance(k, str) and isinstance(v, str)
                        for k, v in raw['receipts'].items()), 'Invalid request receipts.')
                self.data = {**raw, **validated}
            except (ValueError, KeyError, TypeError, OSError, RecursionError) as exc:
                self.error = f'Cannot restore autosave at {self.path}: {exc}. Preserve or move that file before restarting.'

    def check(self):
        if self.error:
            raise OSError(self.error)

    def snapshot(self):
        with self.lock:
            self.check()
            return deepcopy(self.data)

    def write(self, data):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temp = None
        try:
            with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=self.path.parent,
                                             prefix='.autosave-', suffix='.tmp', delete=False) as out:
                temp = out.name
                json.dump(data, out, ensure_ascii=False, allow_nan=False, indent=2)
                out.flush()
                os.fsync(out.fileno())
            os.replace(temp, self.path)
        finally:
            if temp and os.path.exists(temp):
                os.unlink(temp)

    def mutate(self, operation, revision, request_id, body):
        with self.lock:
            self.check()
            try:
                fingerprint = hashlib.sha256(json.dumps([operation, revision, body], sort_keys=True,
                                                        allow_nan=False).encode()).hexdigest()
            except (ValueError, TypeError, RecursionError) as exc:
                raise Invalid('Request must contain finite, valid JSON values.') from exc
            receipt = self.data['receipts'].get(request_id)
            if receipt:
                if receipt != fingerprint:
                    raise Conflict('This request identifier was already used for a different request.')
                return self.snapshot(), 'Request already saved; no effects were repeated.'
            if revision != self.data['revision']:
                raise Conflict('This view is out of date. Reload the saved project before trying again.')
            candidate = deepcopy(self.data)
            current = candidate['project']
            if operation == 'new':
                require(current is None or body['confirm_replace'], 'Confirm replacement of the current project.')
                candidate['project'] = new_project(body['name'])
                candidate['undo'] = None
                explanation = 'New project created. Choose a starting land route.'
            elif operation == 'import':
                require(current is None or body['confirm_replace'], 'Confirm replacement of the current project.')
                imported = validate_export(body['save'])
                candidate.update(imported)
                explanation = 'Project and undo snapshot imported. Its embedded scenario is preserved.'
            elif operation == 'commit':
                require(current is not None, 'Create a project first.')
                candidate['project'], explanation = transition(current, body['action_id'], body['inputs'])
                candidate['undo'] = deepcopy(current)
            elif operation == 'undo':
                require(candidate['undo'] is not None, 'No saved action to undo.')
                candidate['project'] = deepcopy(candidate['undo'])
                candidate['undo'] = None
                explanation = 'Last action undone. Its time, cash and state changes were restored.'
            else:
                raise Invalid('Unknown operation.')
            candidate['revision'] += 1
            candidate['project']['revision'] = candidate['revision']
            if operation == 'import' and candidate['undo'] is not None:
                candidate['undo']['revision'] = candidate['revision'] - 1
            candidate['receipts'][request_id] = fingerprint
            self.write(candidate)
            self.data = candidate
            return self.snapshot(), explanation

    def export(self):
        data = self.snapshot()
        require(data['project'] is not None, 'Create a project first.')
        return {k: data[k] for k in ('format_version', 'project', 'undo')}
