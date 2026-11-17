## Summary

<!-- What does this PR do? -->

## Test plan

- [ ] Manually tested affected tools
- [ ] If adding persistence: confirm persist key uniqueness via `buildPersistKey` (`toolName` or `namespace`)
- [ ] If adding persistence: confirm single owner — WorkspaceCard (`persistScope`) **or** page `useToolPersistence`, not both for the same fields
- [ ] `npm run test` passes (if persistence code changed)

## Persistence (if applicable)

<!-- List toolName/namespace keys used, TTL overrides, persistBlobs setting -->
