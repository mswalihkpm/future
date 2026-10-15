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

# SPR architecture rules

- Database access lives only in `src/services/*`; components call services through TanStack Query — keeps queries reusable and paginated.
- Pure scoring logic lives in `src/lib/spr/` and must mirror the `student_spr` view — UI and DB must agree on the SPR.
- Final SPR divides by the sum of active weights, never by a hardcoded 100 — guarantees an exact 100% maximum.
- Navigation comes from `src/lib/modules.ts`; "planned" modules render via `/modules/$module` until built — avoids fake functionality.
- Roles live in `public.user_roles` and are checked via `has_role`/`is_staff`/`can_manage` SQL functions in RLS — never client-side.
- Signed-in pages live under `src/routes/_authenticated/` — the layout gates the whole subtree.
- `spr_id` is immutable (DB trigger) — SPR Student IDs are permanent.
