# AI Assistant Upgrade – Phase 1

## Architecture selected
Single AI Assistant: one conversational identity routes requests by intent while using the room context and deterministic application logic where appropriate.

## Changes in this phase
- Expanded the Gemini system instruction so the assistant can answer general knowledge questions as well as feng shui, interior design, and 3D-room questions.
- Added explicit rules against inventing room state, claiming unexecuted actions, or guessing ambiguous furniture targets.
- Added request validation and safe defaults to `/api/gemini/chat` so malformed or incomplete request bodies return a 400 response instead of crashing the route.
- Fixed the undefined `hasApiKey` variable used by the server startup log.

## Important limitations
- This phase does not yet implement reliable tool/function calling for 3D actions.
- The existing local fallback remains rule/keyword-based and cannot answer arbitrary general-knowledge questions without a working Gemini connection.
- 3D collision detection and whole-room layout optimization are separate later phases.
- The browser-provided API-key mechanism is retained for compatibility in this phase; for production, prefer a server-side key and remove client-side key storage/transmission.

## Validation
- `npm run lint` passes (`tsc --noEmit`).
- `npm run build` could not be completed in the supplied environment because the installed Vite/Rolldown optional native binding is missing (`@rolldown/binding-linux-x64-gnu`). This is an environment/dependency installation issue, not a TypeScript error. Reinstall dependencies on the target machine (`npm ci`) and run `npm run build` again.

# Phase 2 – Correctness fixes
- Manual drag / gizmo / rotate now go through `validatePlacementSafety` (walls, furniture, door corridor). Blocked moves slide along the obstacle or are rejected with a toast. Objects that already overlap (legacy presets) can still move freely so they can escape.
- Each drag / gizmo gesture and each rotate button now pushes one undo snapshot.
- `circulationScore` is computed from geometry (door corridor, overlaps, floor occupancy) instead of the constant 88.
- Optimizer `afterScore` / `estimatedScore` are the real rule-engine scores. The +8 floor was removed; if no better layout is found an empty proposal is returned. Bed candidates are penalized when they overlap furniture, and mirror candidates must not reflect into a bed.
- The fake `+10` score in the chat "executed" card was removed.
- "Hoàn tác / undo" now works in offline mode (server local chat and client fallback).
- Not verified here: `npm ci` / `npm run build` (registry blocked in the sandbox). Engine logic was compiled with tsc and exercised with node scripts on the three presets.
