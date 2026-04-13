# PromptOps

PromptOps is an AI-assisted DevOps platform that turns plain-English deployment requests into structured deployment specs and deterministic infrastructure artifacts.

Current scope:

- submit a deployment prompt
- generate a normalized deployment spec
- review and edit the spec in the UI
- persist saved runs locally
- generate deterministic Terraform and GitHub Actions artifacts from a saved run

The project is being built as a monorepo with a small microservice architecture.

## What It Looks Like Today

The current flow is:

1. enter a deployment prompt in the web app
2. send it to the `api-gateway`
3. forward the request to the `generator` service
4. return a normalized deployment spec
5. save the run locally
6. review or edit the spec
7. generate infrastructure artifacts from that saved run

Current generated artifacts:

- `terraform/main.tf`
- `terraform/variables.tf`
- `terraform/outputs.tf`
- `.github/workflows/deploy.yml`

## Repo Structure

```text
apps/
  web/
  api-gateway/
services/
  generator/
  orchestrator/
  deploy/
packages/
  shared-types/
  config/
  ui/
infrastructure/
  terraform/
```

## Current Services

- `web`: user-facing review interface
- `api-gateway`: public backend entry point
- `generator`: prompt-to-spec and spec-to-artifact generation
- `orchestrator`: reserved for later workflow coordination
- `deploy`: reserved for later dry-run and deploy execution

## Requirements

- Node.js `20+`
- npm `10+`

## Install

```bash
npm install
```

## Build, Typecheck, Test

```bash
npm run typecheck
npm run build
npm test
```

## Run Locally

Build first:

```bash
npm run build
```

Then start the current runtime services in separate terminals:

```bash
npm run start --prefix services/generator
```

```bash
npm run start --prefix apps/api-gateway
```

```bash
npm run start --prefix apps/web
```

Open:

- web app: `http://127.0.0.1:3000`
- api gateway health: `http://127.0.0.1:4000/health`
- generator health: `http://127.0.0.1:4001/health`

## Main Endpoints

### API Gateway

- `POST /api/prompts/parse`
- `GET /api/prompt-runs`
- `GET /api/prompt-runs/:id`
- `PATCH /api/prompt-runs/:id`
- `DELETE /api/prompt-runs/:id`
- `POST /api/prompt-runs/:id/artifacts`
- `GET /api/prompt-runs/:id/artifacts`

### Generator

- `POST /internal/spec/generate`
- `POST /internal/artifacts/generate`

## Notes

- prompt parse runs and generated artifacts are currently stored as local JSON files under `apps/api-gateway/.promptops-data/`
- the current generator is deterministic and does not use a live LLM yet
- the web UI is intentionally minimal and focused on the review workflow
- there is no single root `dev` command yet; services are started individually

## Future Plans

Near-term:

- expand deterministic artifact generation
- improve artifact preview and download flow
- add dry-run workflow support
- add cost estimation

Later:

- integrate an LLM into the generator for richer prompt interpretation
- add orchestrator-driven run management
- add real AWS deployment support for the golden path
- add observability for platform and deployment runs

## Design Goals

PromptOps is structured to emphasize:

- microservice boundaries inside a monorepo
- shared contract design
- human-in-the-loop AI workflows
- deterministic infrastructure generation
- progressive movement from prompt parsing to deployment automation
