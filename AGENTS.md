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
- Module pages, forms and tables render from field config (resolveFields + DynamicForm/DynamicTable); never hand-code per-module screens. Why: business types are configuration.
- tsconfig relaxes indexed-access/exact-optional checks because the app is metadata-driven with dynamic record keys.
- Custom field ids are `cf_<tenantId>_<id>` and record values are keyed by id, never by label; fields are soft-deprecated, not deleted. Why: renames and per-tenant isolation must never orphan data.
- Tenants snapshot their bundle via bundleSnapshot() at creation; bundle edits never touch existing tenants. Why: bundles are templates for future tenants only.
