# Philomathia

- Recommendation scoring lives in `src/lib/recommend.ts` (pure, tested) with constants in `src/lib/config.ts`; Discover and Ask Phi both rank through it so the LLM never picks titles.
- Taste weights change only via the `bump_tags` SQL function from `src/lib/data.ts`; keeps like/pass/rating deltas in one place.
- Roles live in `public.user_roles` (not profiles) to prevent privilege escalation; shop users are linked via `user_roles.shop_id`.
- App styling uses plain CSS classes at the bottom of `src/styles.css` with named colors only, per the user's strict style rules.
- AI calls run in `src/lib/ask.functions.ts` server functions; output is validated and falls back to rule parsing.
