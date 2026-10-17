<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Demo is front-end only: all state lives in one persisted Zustand store (src/store), seeded from typed config in src/data; reset re-runs the seed. Why: spec forbids a backend.
- Generic entity pages and operational forms use resolveFields plus DynamicForm/DynamicTable; appointments, check-in, POS and kitchen have specialized workspaces. Why: operational workflows need calendars and boards while retaining configured custom fields.
- tsconfig relaxes indexed-access/exact-optional checks because the app is metadata-driven with dynamic record keys.
- Custom field ids are `cf_<tenantId>_<id>` and record values are keyed by id, never by label; fields are soft-deprecated, not deleted. Why: renames and per-tenant isolation must never orphan data.
- Tenants snapshot their bundle via bundleSnapshot() at creation; bundle edits never touch existing tenants. Why: bundles are templates for future tenants only.
- Cross-module mutations run through tenant-gated event listeners; read-only module ports expose catalogs and eligibility. Why: disabled receivers must not execute reactions, while operational screens need controlled lookup data.
- Operational seeds use the current local week and clock; kitchen seeds enter through events. Why: demo workflows must remain fresh and match production creation paths.
- validateRecord is the shared validation entry point for configured forms and quick-add workflows. Why: all writers must enforce the same tenant field rules.
- Leaf routes use unique pageHead metadata; module routes derive it from the module parameter. Why: each page needs its own search and social identity without altering the shared shell.
