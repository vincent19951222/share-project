# Handoff: Supply AI Image Phase 1 Local Review

## Focus

Next session should continue from the Phase 1 user-side AI image MVP and address the latest UI feedback: on PC, the secondary Supply Station navigation strip shown under the top nav is no longer needed. The user highlighted the whole strip containing "生图工位 / 主题扭蛋 / 作品库 / 旧补给归档" and said: "pc端这个红框不需要了。"

## Current State

- Main checkout: `/Users/vincent/Projects/share-project`, branch `simplify`.
- Active implementation worktree: `/Users/vincent/Projects/share-project/.worktrees/codex-supply-ai-image-phase1`, branch `codex/supply-ai-image-phase1`, HEAD `28e0cd0` (`fix: close ai image settlement gaps`).
- Phase 1 user MVP was completed in the worktree and reviewed clean. The user chose to keep the branch as-is rather than merge/PR yet.
- The app was started earlier with `npm run dev` in the worktree and was available at `http://localhost:3001/login`; `/login` returned `200 OK`, and protected routes redirected to `/login`.
- After the latest interruption, `lsof` showed no listener on `3001` and no listener on `3000`. Restart the dev server before visual verification.
- Earlier, a `3000` listener was confirmed to be `/Users/vincent/Projects/IPStudio`; avoid killing or reusing that port unless rechecked.
- The screenshot source path from the user was `/var/folders/vv/n1rll3n53qjdpt3jwwkz7t9c0000gn/T/codex-clipboard-7e3f7c72-51ac-4c79-b334-6aaa0b45c7bc.png`.

## Decisions And Constraints

- Keep work focused on the current worktree as the implementation source of truth.
- Do not merge Phase 1 until the user explicitly asks.
- For the PC nav feedback, likely target is hiding/removing the desktop secondary Supply Station hover/dropdown strip, not deleting the actual Supply Station subroutes.
- Preserve route definitions in `lib/navigation-routes.ts` unless the user explicitly wants those sections removed.
- Keep mobile behavior checked separately; the request specifically says PC.
- Relevant code:
  - `/Users/vincent/Projects/share-project/.worktrees/codex-supply-ai-image-phase1/components/navbar/Navbar.tsx`: secondary nav renders around lines 447-470 as `.app-supply-secondary-nav`.
  - `/Users/vincent/Projects/share-project/.worktrees/codex-supply-ai-image-phase1/app/globals.css`: `.app-supply-secondary-nav`, `.app-supply-secondary-rail`, and `.app-supply-secondary-tab` styles start around lines 619-716.
  - `/Users/vincent/Projects/share-project/.worktrees/codex-supply-ai-image-phase1/lib/navigation-routes.ts`: `supplyNavItems` labels/routes around lines 45-77.

## Verification

Already completed earlier on the Phase 1 worktree:

- `npm run lint` passed.
- `npm test` passed: 202 files / 965 tests.
- `npm run build` passed, with the existing Next multiple-lockfile warning.

Still needed:

- Restart local dev server in the worktree with `npm run dev`.
- Verify desktop at `http://localhost:3001/` or `http://localhost:3001/dashboard/status` after login.
- Confirm the PC secondary Supply Station strip is gone.
- Check mobile/narrow viewport to ensure no unintended nav regression.
- Real provider/COS image generation smoke remains unverified because env vars were missing: `BOLUOPETS_API_KEY`, `COS_SECRET_ID`, `COS_SECRET_KEY`, `COS_BUCKET`, `COS_REGION`, `COS_PUBLIC_BASE_URL`.

## Suggested Skills

- `superpowers:verification-before-completion` before claiming the UI fix is complete.
- `playwright` or `browser:control-in-app-browser` for screenshot-based desktop/mobile verification.

## Next Steps

1. Work in `/Users/vincent/Projects/share-project/.worktrees/codex-supply-ai-image-phase1`.
2. Run `npm run dev` and open `http://localhost:3001/`.
3. Implement the PC-only removal/hide of `.app-supply-secondary-nav`, most likely in `components/navbar/Navbar.tsx` and/or `app/globals.css`.
4. Verify desktop nav against the user's screenshot feedback.
5. Verify mobile viewport still behaves acceptably.
6. Run a focused check such as `npm run lint`; run broader tests only if the change touches behavior beyond CSS/rendering.
