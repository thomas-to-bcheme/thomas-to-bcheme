---
title: Portfolio ZeroGPU Backend
emoji: ⚡
colorFrom: indigo
colorTo: purple
sdk: gradio
sdk_version: "6.17.3"
app_file: app.py
pinned: false
license: mit
---

# Portfolio ZeroGPU Backend

GPU inference backend for the [thomas-to-bcheme portfolio](https://thomas-to-bcheme-github-io.vercel.app/)
site, deployed as a Hugging Face ZeroGPU Space. API-only — the Gradio UI exists just to expose
the `/infer` endpoint, it isn't meant to be used as a polished interface.

This is currently a **placeholder**: `infer()` runs a trivial tensor op through a
randomly-initialized `torch.nn.Linear` layer on `DEVICE` (`"cuda"` on the real Space,
`"cpu"` in local dev) so the deploy pipeline and API contract can be verified end-to-end
before a real model is wired in.

## Local development

`./run.sh` activates `.venv`, frees port 7860 (killing whatever currently holds it), and
starts the app — a single command for repeat local restarts.

## Deployment

This folder deploys independently from the rest of the monorepo via
`.github/workflows/deploy-backend.yml`, triggered on pushes to `main` that touch
`backend/**`. It uploads this folder's contents to the Space via
`huggingface_hub.HfApi().upload_folder(...)` — never a git push — so it can never
clobber this Space's own separate git history.

## API contract

The inference function is wired to an explicit endpoint name, `api_name="infer"`, rather
than Gradio's default `/predict`, so the contract stays stable independent of UI layout
changes.

### gradio_client (Python)

```python
from gradio_client import Client

client = Client("thomas-to-bcheme/portfolio-zerogpu", hf_token="hf_...")  # HF_TOKEN_READ
result = client.predict(3.5, api_name="/infer")
print(result)  # "device=cuda output=..."
```

Note the leading slash on `api_name` here — this is a real `gradio_client` convention:
the endpoint is registered as `api_name="infer"` (no slash) in `app.py`, but
`gradio_client` calls address it as `"/infer"` (with slash).

### Raw HTTP (curl)

Gradio's REST API (confirmed against the installed `gradio==6.17.3`) is a two-step
call/poll shape under a `/gradio_api/` prefix — a single POST does **not** return the
result directly:

```bash
# 1. Submit the call, get back an event_id
curl -s -X POST https://thomas-to-bcheme-portfolio-zerogpu.hf.space/gradio_api/call/infer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $HF_TOKEN_READ" \
  -d '{"data": [3.5]}'
# => {"event_id": "..."}

# 2. Poll for the result via SSE
curl -N https://thomas-to-bcheme-portfolio-zerogpu.hf.space/gradio_api/call/infer/<event_id> \
  -H "Authorization: Bearer $HF_TOKEN_READ"
# => event: complete
#    data: ["device=cuda output=..."]
```

## Secrets

| Secret | Lives in | Consumed by | Purpose |
|---|---|---|---|
| `HF_TOKEN_WRITE` | GitHub Actions repo secret | `.github/workflows/deploy-backend.yml` | Write-scoped token so CI can create/update this Space |
| `HF_TOKEN_READ` | Next.js server env (root `.env.local` / Vercel project env) | Frontend server-side code calling this Space | Attributes API calls to the owner's own HF account/quota instead of anonymous traffic |

Neither variable is read by `app.py` itself — both are consumed outside this folder (CI
for `HF_TOKEN_WRITE`, the frontend for `HF_TOKEN_READ`).

## Hardware

ZeroGPU hardware must be selected manually, once, via this Space's **Settings → Hardware**
after the first successful deploy — this is not set via YAML front matter or automated by
CI.
