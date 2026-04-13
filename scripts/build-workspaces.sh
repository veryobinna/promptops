#!/bin/sh
set -e
npm run build --prefix packages/shared-types
npm run build --prefix packages/config
npm run build --prefix packages/ui
npm run build --prefix services/generator
npm run build --prefix services/orchestrator
npm run build --prefix services/deploy
npm run build --prefix apps/api-gateway
npm run build --prefix apps/web
