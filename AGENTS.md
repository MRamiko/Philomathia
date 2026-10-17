# Philomathia

- Recommendation scoring lives in `src/lib/recommend.ts` (pure, tested) with constants in `src/lib/config.ts`; Discover and Ask Phi both rank through it so the LLM never picks titles.
- Interaction writes use the atomic `taste_action` RPC and replay active `taste_events` through `bump_tags`; this prevents duplicate contributions and keeps undo deterministic.
- Roles live in `public.user_roles` (not profiles) to prevent privilege escalation; shop users are linked via `user_roles.shop_id`.
- App styling uses plain CSS classes at the bottom of `src/styles.css` with named colors only, per the user's strict style rules.
- Locale state comes from the profile through `LocaleProvider`, with dictionaries and translations centralized in `src/lib/strings.ts`; this separates interface language from content filters.
- PWA caching is limited to an explicit static-shell allowlist; navigation only falls back to an offline document so private HTML and API data never enter caches.
- AI calls run in `src/lib/ask.functions.ts` server functions; output is validated and falls back to rule parsing.
