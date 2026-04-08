# Terraform Workspace

This directory will hold the platform's generated and reusable Terraform assets.

Phase 0 scope:

- define the directory layout
- reserve environment and module locations
- avoid implementing production infrastructure before the contracts are stable

## Planned Layout

```text
terraform/
  envs/
    dev/
  modules/
    network/
    ecs_service/
    postgres/
```
