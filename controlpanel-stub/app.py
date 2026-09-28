#!/usr/bin/env python3
"""
Minimal CAD controlpanel stub.
Reads decoy config from decoys.json on every request — edit the file and the
WASM plugin picks up the change on its next config poll (configReload seconds).
Set "configReload": 1 in your decoys.json config section for instant test feedback.
Accepts blocklist updates and silently discards them (no persistence).
"""
import json
import os
from flask import Flask, jsonify

app = Flask(__name__)

import logging
logging.getLogger('werkzeug').disabled = True

DECOYS_PATH = os.path.join(os.path.dirname(__file__), 'decoys.json')


def load_decoys():
    with open(DECOYS_PATH) as f:
        return json.load(f)


@app.get('/health')
def health():
    return jsonify({"status": "ok"})


@app.get('/configmanager/blocklist/<namespace>/<application>')
def get_blocklist(namespace, application):
    return jsonify({"type": "success", "code": 200, "data": []})


@app.post('/configmanager/blocklist/<namespace>/<application>')
def set_blocklist(namespace, application):
    return jsonify({"type": "success", "code": 200})


@app.get('/configmanager/<namespace>/<application>')
def get_config(namespace, application):
    return jsonify({"type": "success", "code": 200, "data": load_decoys()})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8050, debug=False)
