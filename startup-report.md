# Startup repair verification

## 1. Root cause
- The authenticated route previously awaited `supabase.auth.getUser()` before any screen shell could render. The initial throttled check stayed blank for over 30 seconds. Removing this gate allows the pending navigation shell to render without an authentication request.
- Discover had duplicate reset/refill effects, and shared shell imports reached catalog/detail/provider modules. Resetting a request could bypass the in-flight guard. These are now consolidated/cancelled and the navigation shell is isolated in `app-shell.tsx`.
- A separate cold-development loading delay remains: one slow-4G, 4x CPU run fetched 161 resources and reached the first React diagnostic effect at 44.9 seconds, before any database request. This cannot honestly be attributed to database latency. The diagnostics-initialized mark is a post-commit mark, not a precise main-script execution timestamp.

## 2. Changes made
- Data-independent pending shell; session restoration outside route loading; one cleaned-up auth subscription; callbacks deferred outside the auth lock; local preferences guarded.
- Shared account query single-flight through QueryClient; parallel settled reads; catalog starting query reduced to 20 rather than 300 rows. Existing related-history reads remain available.
- One Discover reset effect, AbortController deadline, stale-generation protection, current plus next-two image preloading, recoverable failure without a false empty-catalog message.
- Backend request deadlines cover response bodies, reads have at most two safe network/5xx retries within the overall deadline, and writes/4xx are never automatically retried. Static and streaming page requests bypass the wrapper.
- Per-tab/global recovery, loading pulse, eight-second content watchdog, reset-local-data action, optional scrubbed diagnostics and Copy report. Ordinary logging is disabled.
- Service-worker cleanup scoped to app caches; generic public offline fallback and content-hashed JS/CSS caching only; one-time chunk-reload recovery. No private HTML, API data or provider images cached.
- No schema, RLS, provider secrets, accounts or catalog IDs changed.

## 3. Verification
### Measured before/after
| Check | Before | After |
| --- | --- | --- |
| Throttled visible shell | Blank beyond 30s | 405ms in a 360px run |
| Cold-development hydrated navigation | Not established | Still about 45s in the measured slow-4G run; two-second target not met |
| First real Discover card, normal network | Earlier blank/freeze observed | Latest 360/390/430 checks: 1946 / 1883 / 1881ms |
| Startup database requests | Duplicate queue paths found | Six actual calls: one queue, profile, swipes, logs, weights, roles |
| Profile reload across five tabs | Repeated startup work identified | One profile call across each tested tab sequence |
| Main-thread tasks under throttling | No reliable baseline | 215ms observed; 200ms target not met |

### Tests actually run
- Full suite: 84 tests in 18 files passed. Subsequent targeted startup/PWA suite: 11 passed. Latest automatic build: OK.
- Returning signed-in session, real catalog cards and five-tab navigation at 360, 390 and 430px: one visible navigation, no overflow, no page errors.
- Discover artificially delayed 15 seconds: Search remained usable; Discover displayed an error and Retry after its deadline.
- Profile read denied with 403: clear failure and Search navigation remained available; no security changes.
- Signed-out Discover redirected to Login without a loop. Diagnostics Copy report succeeded with browser clipboard permission.
- Offline service-worker test attempted: public offline document was cached correctly, but browser offline navigation showed a blank document. Offline completion is **not verified** and remains a failure to investigate in the published environment.

### Inspection only / not run
New account and missing-profile repair, expired or failing auth refresh, missing RPC/provider secret fallback, full rapid-swipe/reopen stress, destructive local reset, complete upgrade/chunk-failure flows and physical installed Android behavior were not established end-to-end.

## 4. Remaining issues
- Cold-development script delivery and the 215ms main-thread task fail the requested speed budgets. Visible server shell is not proof that controls are tappable.
- Published/installed performance cannot be established before publication; no physical Android device is available here.
- Offline start remains unverified after an attempted local test returned a blank page.
- Existing account-history reads are still broader than a minimal profile read; a complete per-area data split is not finished.
- Diagnostics start after React commit, not at browser entry; pre-hydration watchdog and exact script-entry measurement are not implemented.

## 5. Startup status
Complete real startup was observed repeatedly on normal network, with live cards and working navigation. Complete slow-4G startup was observed once after roughly 46.7 seconds before the lightweight shell split, but the requested slow-network interactive budget has **not passed**. This is a partial repair, not a claim that every startup requirement is complete.