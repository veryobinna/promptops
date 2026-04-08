# Shared Types

This package owns the cross-service contracts for PromptOps.

Phase 0 scope:

- deployment spec contract
- deployment run state model
- generated artifact types
- JSON schema and example payloads

Services should depend on these contracts instead of duplicating request and state types locally.
