#!/bin/sh
set -e
npm run build
npm run test --prefix services/generator
npm run test --prefix apps/api-gateway
