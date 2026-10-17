# Philomathia

- Recommendation scoring lives in `src/lib/recommend.ts` (pure, tested) with constants in `src/lib/config.ts`; Discover and Ask Phi both rank through it so the LLM never picks titles.
- Interaction writes use the atomic `taste_action` RPC and replay active `taste_events` through `bump_tags`; this prevents duplicate contributions and keeps undo deterministic.
- Roles live in `public.user_roles` (not profiles) to prevent privilege escalation; shop users are linked via `user_roles.shop_id`.
- App styling uses plain CSS classes and semantic palette tokens in `src/styles.css`; offline palette and PWA icons derive from that theme to keep fallback and install branding aligned.
- Auth screens share an email draft persisted in sessionStorage (`phi-email-draft`) and shared form controls; separate leaf routes preserve the draft without storing passwords. Password reset uses public /forgot-password and /reset-password routes; reset success flags /login via sessionStorage `phi-pw-reset`.
- Motion durations and easing live in the global stylesheet; screen and control motion uses transform/opacity only with a reduced-motion override.
- Overlays use shared Presence with token-based exit fallback, focus return and router Back blocking, avoiding same-URL history pushes that remount authenticated pages.
- Lists use shared MotionList with stable entity keys, per-set entrance tracking and transform-only FLIP capped at 30 rows, preventing replay and abrupt removal gaps.
- Display names use shared Unicode validation, signup metadata consumed by the auth lifecycle trigger, and own-profile writes; protected profile identifiers/baselines are not client-writable.
- Locale state comes from the profile through `LocaleProvider`, with dictionaries and translations centralized in `src/lib/strings.ts`; this separates interface language from content filters.
- PWA caching is limited to an explicit static-shell allowlist; navigation only falls back to an offline document so private HTML and API data never enter caches.
- AI calls run in `src/lib/ask.functions.ts` server functions; output is validated and falls back to rule parsing.
- Catalog imports use authenticated admin-checked server functions, durable import jobs and official-provider batches; rule normalization is shared and IDs are preserved on reconciliation.
- Administrator import commands queue while a batch is busy rather than being discarded; provider credentials remain project-scoped server secrets, never per-account browser storage.
- Search and candidate selection run through indexed SQL RPCs; scoring receives sampled candidates and separate interaction context so sampling cannot erase learned history.
- Cover URLs are built only by `src/lib/images.ts` from provider references; shared Poster handles fixed-size loading/error placeholders and the global image kill switch.
- Shop stock uploads parse in src/lib/stock-csv.ts (client) and commit through src/lib/stock.functions.ts; writes are scoped by user_roles.shop_id or admin.
- Admin per-provider imports live in src/lib/admin-import.functions.ts (+ admin-import.server.ts); the bulk resumable importer stays in import.server.ts.
