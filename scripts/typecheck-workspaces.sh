#!/bin/sh
set -e
npm run typecheck --prefix packages/shared-types
npm run typecheck --prefix packages/config
npm run typecheck --prefix packages/ui
npm run typecheck --prefix services/generator
npm run typecheck --prefix services/orchestrator
npm run typecheck --prefix services/deploy
npm run typecheck --prefix apps/api-gateway
npm run typecheck --prefix apps/web
