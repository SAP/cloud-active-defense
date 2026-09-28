# Protect Any Docker App with Cloud Active Defense

This guide shows how to add cloud-active-defense (CAD) to any Docker-based application in three steps. We use [neowriter](https://github.com/valvolt/neowriter) as the concrete example throughout.

## How it works

CAD runs as an Envoy proxy in front of your app. A WASM plugin intercepts every HTTP request and response. It injects decoy tokens (fake credentials, hidden fields, honeypot URLs) into responses and fires alerts when those tokens appear in subsequent requests — indicating an attacker found and reused them.

Traffic flows: `browser → Envoy (port 8000) → your app`

No changes to your application code are needed.

## What you need

Three things to add to any project:

| File | Purpose |
|------|---------|
| `envoy/envoy.yaml` | Envoy config pointing to your app |
| `controlpanel-stub/` | Lightweight decoy config server (copy from this repo) |
| `decoys.json` | Your decoy definitions |

## Step 1: Copy the required files

From this repository, copy the following into your project:

```
controlpanel-stub/
  Dockerfile
  app.py
proxy/envoy.minimal.yaml   → rename to envoy/envoy.yaml in your project
proxy/wasm/cloud-active-defense.wasm  → copy to envoy/wasm/
decoys.json                → starter file, customize for your app
```

## Step 2: Adjust envoy.yaml for your app

Edit `envoy/envoy.yaml`. The only thing you need to change is the upstream cluster for your app.

Find the `web_service` cluster section and update the address:

```yaml
  - name: web_service
    connect_timeout: 0.25s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: web_service
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: myapp      # ← change to your service name
                    port_value: 3000    # ← change to your app's port
```

The `controlpanel-api` cluster should point to `controlpanel-stub:8050` — leave that as-is.

## Step 3: Add services to your docker-compose.yml

Add these two services to your existing compose file:

```yaml
services:
  # ... your existing services ...

  envoy:
    image: envoyproxy/envoy:v1.29.2
    ports:
      - "8000:8000"        # expose this port instead of your app's port
    volumes:
      - ./envoy/envoy.yaml:/etc/envoy.yaml:ro
      - ./envoy/wasm/cloud-active-defense.wasm:/var/local/lib/wasm/cloud-active-defense.wasm:ro
    command: /usr/local/bin/envoy -c /etc/envoy.yaml --service-cluster proxy --log-level warn
    depends_on:
      - your-app-service   # ← your app's service name
      - controlpanel-stub
    networks: [frontend, backend]

  controlpanel-stub:
    build: ./controlpanel-stub
    volumes:
      - ./decoys.json:/app/decoys.json
    networks: [backend]

networks:
  frontend:
  backend:
    internal: true   # prevents direct access to app from host
```

Change your app service from `frontend` to `backend` network only (so it's not directly accessible):

```yaml
  your-app-service:
    # ... existing config ...
    networks: [backend]   # ← add this; remove any port: mappings if present
```

Users now connect on port 8000 (Envoy) instead of your app's original port.

## Neowriter example

**Before** (original `docker-compose.yml` from `github.com/valvolt/neowriter`):

```yaml
services:
  neowriter:
    build: .
    ports:
      - "3000:3000"
    environment:
      - AUTH0_DOMAIN=...
      - AUTH0_CLIENT_ID=...
```

**After** (protected with CAD):

```yaml
services:
  neowriter:
    build: .
    environment:
      - AUTH0_DOMAIN=...
      - AUTH0_CLIENT_ID=...
    networks: [backend]   # no direct port exposure

  envoy:
    image: envoyproxy/envoy:v1.29.2
    ports:
      - "8000:8000"
    volumes:
      - ./envoy/envoy.yaml:/etc/envoy.yaml:ro
      - ./envoy/wasm/cloud-active-defense.wasm:/var/local/lib/wasm/cloud-active-defense.wasm:ro
    command: /usr/local/bin/envoy -c /etc/envoy.yaml --service-cluster proxy --log-level warn
    depends_on: [neowriter, controlpanel-stub]
    networks: [frontend, backend]

  controlpanel-stub:
    build: ./controlpanel-stub
    volumes:
      - ./decoys.json:/app/decoys.json
    networks: [backend]

networks:
  frontend:
  backend:
    internal: true
```

Access neowriter at `http://localhost:8000` instead of `http://localhost:3000`.

## Starter decoys.json for neowriter

This covers three high-value patterns: cookie tampering, hidden form field (mass assignment), and a honeypot admin URL:

```json
{
  "config": { "configReload": 60 },
  "decoys": [
    {
      "decoy": { "key": "role", "separator": "=", "value": "user" },
      "inject": {
        "store": {
          "inResponse": ".*",
          "withVerb": "GET",
          "as": "cookie",
          "whenTrue": [{ "key": "session", "value": ".*", "in": "cookie" }],
          "whenFalse": [{ "key": "role", "value": ".*", "in": "cookie" }]
        }
      },
      "detect": {
        "seek": { "inRequest": ".*", "in": "cookie" },
        "alert": { "severity": "CRITICAL", "whenModified": true }
      }
    },
    {
      "decoy": { "key": "isAdmin", "separator": "=", "value": "false" },
      "inject": {
        "store": {
          "inResponse": "/login",
          "withVerb": "GET",
          "as": "body",
          "at": { "method": "before", "property": "</form>" }
        }
      },
      "detect": {
        "seek": { "inRequest": ".*", "withVerb": "POST", "in": "postParam" },
        "alert": { "severity": "CRITICAL", "whenModified": true }
      }
    },
    {
      "decoy": { "key": "/admin/users", "string": "<!-- mgmt: /admin/users -->" },
      "inject": {
        "store": {
          "inResponse": ".*",
          "withVerb": "GET",
          "as": "body",
          "at": { "method": "before", "property": "</body>" }
        }
      },
      "detect": {
        "seek": { "inRequest": ".*", "in": "url" },
        "alert": { "severity": "CRITICAL", "whenSeen": true }
      }
    }
  ]
}
```

## Viewing alerts

Alerts are written to Envoy's stdout as structured JSON log lines:

```sh
docker compose logs -f envoy | grep '"type": "alert"'
```

Example alert line:

```json
{"type": "alert", "DecoyKey": "role", "severity": "CRITICAL", "ip": "172.18.0.1", ...}
```

For more decoy patterns see the [examples/](../examples/) directory and the [decoy catalog](../examples/).
