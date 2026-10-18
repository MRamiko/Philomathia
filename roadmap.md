# Startup freeze repair
- [x] Instrument opt-in scrubbed diagnostics, bounded backend requests, render counters and recovery controls
- [x] Remove awaited route auth, consolidate queue initialization, isolate shell imports and preserve security
- [x] Verify real startup and five tabs at 360/390/430, delayed queue, denied profile, signed-out route and report copying; 84 tests pass
- [ ] Validate published cold-start and installed Android/PWA upgrade; blocked by no published deployment or physical device. Development slow-4G script loading still exceeds target; do not claim the speed budget passed.
- [ ] Offline completion requires published-environment verification: local offline navigation was blank despite a correctly cached public offline document. Detailed measurements and unverified checks are recorded in startup-report.md.

# October 18 taste and mobile update
- [x] Timings, cached independent tabs, optimistic record_swipe, eight-card SQL queue and indexes implemented
- [x] Controlled facets, exposure learning, portraits, overrides, preference and onboarding implemented
- [x] Resumable rule/AI trait enrichment and admin editing implemented; rule pass complete, AI paused after 20 items
- [x] Semantic tonal ramps, geometry logo/icons, native navigation/media switch implemented
- [x] Discover, Library, Profile and English-only interface refreshed
- [x] Query-first Ask Phi with validated intent and relevant SQL results; romantic comedy flow verified
- [x] Authenticated seven-day GE watch-provider cache and details display; cached reopen observed at 29ms
- [x] 77 tests passed; Discover/Profile/Undo checked at 360/390/430; one visible nav, no overflow or page errors
- [x] Post-edit five-tab navigation and one shared profile fetch verified at 360/390/430
- [ ] Slow-4G and 5,000-item budgets, complete multi-genre learning/probe scenarios and physical Android verification remain unverified
- [ ] Full AI coverage waits for an explicit administrator Resume; 801 / 873 items have six or more traits

# Earlier corrective update
- [x] Administrator/TMDB access verified through a real import; commands queue instead of being discarded, paused progress survived refresh; 10 targeted tests passed
- [ ] Night background, forest surfaces and install branding
- [ ] Catalog image/popularity fields, indexes and admin-only resumable import jobs
- [ ] Official API bulk imports, reconciliation, coverage and optional mood refinement
- [ ] Shared real-cover helper, image fallback/loading and bilingual credits
- [ ] Indexed Search, SQL candidate sampling and bounded onboarding picker
- [ ] Verify new catalog update and report provider/configuration limits
- [x] Latest palette, icon and contrast corrections; old palette/unauthorized hex scan clean
- [x] Shared overlay exits/focus, router Back handling and list transitions/FLIP implemented
- [x] Metadata signup name, own-profile repair/edit/security and Unicode tests
- [x] English/Georgian Search at 360/390/430, real name edit/refresh, profile access isolation, dialogs/import/teaser exits, reduced motion and Search replay checks; 33 tests passed
- [x] Separate Login and Sign-up presentation, bilingual validation, retained email, autofill attributes and 360px browser checks
- [x] CSS-only screen/control/list/swipe/sheet/teaser motion and reduced-motion fallback implemented; 25 regression tests passed
- [ ] Physical Android full motion/performance, swipe drag, all insertion/removal/FLIP scenarios and HTTPS install — no physical device; Discover displayed onboarding, so swipe was not exercised
- [ ] New-account Georgian name lifecycle with email confirmation both enabled/disabled and missing-profile repair — requires disposable accounts and confirmation settings; not tested by changing live settings
- [ ] Bookshop checkbox — no existing supported bookshop-registration flow
- [x] Adaptive scorer, atomic event saves/undo, bounded queue, admin debug and unit tests implemented
- [x] Central dictionaries, global profile language, content fallback and bilingual parser implemented
- [x] Android sizing, install assets, explicit offline cache, drawer history and remembered choices implemented
- [x] All unverified demo ISBNs cleared, duplicate guard, sample labels, pagination and error recovery implemented
- [ ] Destructive data reset/delete and import submission regression — not exercised against the user's existing data; preview and cancel paths checked
- [ ] Real Android back/keyboard and HTTPS PWA installation verification — blocked by unpublished site and no physical Android device
- [ ] Replace demo stock with verified ISBN-matched stock — blocked by no verified inventory source
- [x] Admin Import: Status/Films/Books/Georgian works/Bulk tabs with Search-Review-Confirm-Summary, check-keys, run-all-passes
- [x] Bookshop CSV upload: parser (BOM, semicolons, ISBN-10→13, duplicates last-wins), shop-scoped writes, admin picker, shops.is_sample
- [x] Delete my data removes the auth account server-side
- [ ] Verify as a non-admin account (blocked: only one account exists)
- [ ] Real Android device feel (unverified)

# Oct 18 covers, Georgian dashboard, where to watch
- [x] Desktop/tablet Discover cover keeps 2:3 frame instead of cropping
- [x] Georgian for dashboard traits, stage, shop and streaming sections
- [x] Where to watch and buy page (liked films → streaming, liked books → shop price/stock), linked from taste card
- [x] Walk Discover → Where to watch verified; source has no Georgia streaming data
- [ ] Branded confirmation sender — blocked: needs a domain the user owns
