# Tool state persistence

IndexedDB-backed reload safety for tool pages. State is **not** long-term storage — it expires quickly and is scoped per tool.

## What is persisted

- Uploaded files (`File` / `Blob`)
- Tool options (sliders, selects, text inputs)
- Result blobs where applicable
- Editor-specific state (e.g. PDF edit annotations) via page-level hooks

## TTL policy

Default TTL: **60 seconds** (`TOOL_STATE_TTL_MS` in `toolStatePersistence.js`).

- Purpose: survive accidental reloads / tab crashes, not multi-day sessions.
- Privacy: data stays in the user's browser and is discarded after TTL or when cleared.
- Override per tool: `useToolPersistence({ ttlMs: 300_000 })` or `usePersistentToolState(key, { ttlMs })`.
- Use longer TTL sparingly (e.g. PDF editor at 5× default).

## Storage key naming

Always use `buildPersistKey` from `utils/persistKey.js`:

```
tool:<pathname>:<toolName | namespace | default>[:<instanceId>]
```

Examples:

| Tool                        | Key segments                                                   |
| --------------------------- | -------------------------------------------------------------- |
| WebP → JPG converter        | `toolName: "WebP to JPG"`                                      |
| PDF crop tab                | `namespace: "pdf-crop"`                                        |
| Video format converter page | `toolName` from props + `persistScope="none"` on WorkspaceCard |
| WorkspaceCard-only tool     | `toolName` + internal workspace scope                          |

**Rules**

1. Multiple tools on the same route **must** pass `toolName` or `namespace`.
2. Never hand-roll `tool:${pathname}` keys.
3. Shared PDF tab tools: pass a unique `namespace`.

## Persistence owner (no duplicates)

Choose **one** owner per snapshot field:

| Pattern                      | Owner                     | WorkspaceCard                        |
| ---------------------------- | ------------------------- | ------------------------------------ |
| Simple workspace tool        | `WorkspaceCard`           | `persistScope="workspace"` (default) |
| Custom UI + controlled files | Page `useToolPersistence` | `persistScope="none"`                |

Canonical examples: `VideoFormatConverter.jsx`, `VideoTrimmer.jsx`, `AudioFormatConverter.jsx`.

## Large files (`persistBlobs`)

`useToolPersistence({ persistBlobs: false })`:

- Debounced saves store blob **metadata** only (name, size, type).
- `pagehide` still flushes the full snapshot including blobs.

Use for video/audio/PDF tools with large uploads.

## Restore UX

When state is restored after reload, show `RestoreSessionBanner`:

```jsx
const { sessionRestored, dismissSession, clearSession } = useToolPersistence({ ... });

{sessionRestored && (
  <RestoreSessionBanner
    onContinue={dismissSession}
    onDiscard={() => { clearSession(); resetLocalState(); }}
  />
)}
```

## Adding persistence to a new tool

Every tool with user-editable state must opt in explicitly:

| Tool type                     | What to do                                                               |
| ----------------------------- | ------------------------------------------------------------------------ |
| Uses `WorkspaceCard` only     | Nothing extra — `persistScope="workspace"` is default                    |
| Custom UI (like Word Counter) | Call `useToolPersistence({ toolName, snapshot, hasContent, onRestore })` |
| Custom UI + `WorkspaceCard`   | Page owns persistence → set `persistScope="none"` on the card            |

Register with `passToolName: true` in `toolRegistry.js` when the page accepts a `toolName` prop.

**Checklist for new tools:** `useToolPersistence` or `WorkspaceCard`, `toolName`/`namespace` in the key, single persistence owner, reload tested within 60s TTL.

## Opting out

- WorkspaceCard: `persistScope="none"`
- Hook: `enabled: false` or omit `useToolPersistence`

## Debugging

IndexedDB failures log `[toolStatePersistence] <op> failed` in development.
Optional telemetry hook: `window.__telemetry?.report('persistence_error', …)`.
