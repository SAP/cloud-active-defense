#!/usr/bin/env python3
"""
Minimal CAD controlpanel stub.
Reads decoy config from decoys.json on every request — edit the file and the
WASM plugin picks up the change on its next config poll (configReload seconds).
Set "configReload": 1 in your decoys.json config section for instant test feedback.
Persists blocklist/throttlelist entries in memory so the WASM blocklist reload
does not erase entries written by the plugin during the same session.
"""
import json
import os
from flask import Flask, jsonify, request

app = Flask(__name__)

import logging
logging.getLogger('werkzeug').disabled = True

DECOYS_PATH = os.path.join(os.path.dirname(__file__), 'decoys.json')

# In-memory store: key = "namespace/application" → list of {"type": ..., "content": ...}
_blocklists = {}


def load_decoys():
    with open(DECOYS_PATH) as f:
        return json.load(f)


@app.get('/health')
def health():
    return jsonify({"status": "ok"})


@app.get('/configmanager/blocklist/<namespace>/<application>')
def get_blocklist(namespace, application):
    key = f"{namespace}/{application}"
    return jsonify({"type": "success", "code": 200, "data": _blocklists.get(key, [])})


@app.post('/configmanager/blocklist/<namespace>/<application>')
def set_blocklist(namespace, application):
    key = f"{namespace}/{application}"
    body = request.get_json(force=True, silent=True) or {}
    items = []
    for entry in body.get("blocklist", []):
        items.append({"type": "blocklist", "content": entry})
    for entry in body.get("throttle", []):
        items.append({"type": "throttle", "content": entry})
    _blocklists[key] = items
    return jsonify({"type": "success", "code": 200})


@app.get('/configmanager/<namespace>/<application>')
def get_config(namespace, application):
    return jsonify({"type": "success", "code": 200, "data": load_decoys()})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8050, debug=False)


@app.get('/configmanager/<namespace>/<application>')
def get_config(namespace, application):
    return jsonify({"type": "success", "code": 200, "data": load_decoys()})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8050, debug=False)
