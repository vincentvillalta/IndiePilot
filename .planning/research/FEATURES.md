# Feature Research: IndiePilot

**Domain:** Two-sided iOS app discovery marketplace (TestFlight beta distribution + indie dev marketing dashboard)
**Researched:** 2026-04-28
**Confidence:** HIGH (direct competitors found and analyzed; adjacent products well-documented)

---

## Competitive Landscape Map

IndiePilot occupies a previously-unfilled intersection. No single competitor does what it proposes; instead, fragments of the value prop exist across five categories:

| Category | Players | What They Do | Gap IndiePilot Fills |
|----------|---------|--------------|----------------------|
| **TestFlight discovery (direct)** | departures.to, airport.community | Lists public TF links in a directory; users click out to TF | No tester-group automation; user copies link, devs lose attribution. IndiePilot owns the install loop. |
| **Beta distribution (incumbent)** | TestFlight, Firebase App Distribution, BetaTesting, Beta Family | Recruit/manage testers; some have their own runtime SDKs | TF has no discovery surface; Firebase isn't iOS-native distribution; Beta Family is paid + sample-test focused. |
| **Indie launch / discovery** | Product Hunt, BetaList, Setapp, AlternativeTo | General-purpose product launch + discovery | None are iOS-beta-native; no install automation; PH is one-day spike. |
| **Feedback / voting** | Canny, Featurebase, Frill, ProductBoard | Standalone roadmap + voting tools devs embed in their own sites | Adjacent — IndiePilot bundles a lite version per-app inside the discovery surface, not a separate portal. |
| **Indie creator dashboards** | Gumroad, Tally | Sales/funnel analytics for digital products | Pattern reference for dev dashboard UX; not a competitor. |
| **Mobile product analytics** | PostHog, Mixpanel, Amplitude | Full event analytics + feature flags + experiments | Explicitly NOT competing. SDK scope intentionally bounded. |

**Key competitive insight:** departures.to and airport.community validate the *demand* (users will use a TF directory) but leave the *magic moment* on the table. Their flow is: see app → click link → land on TF → copy email → join. IndiePilot's flow is: see app → tap Get → invite arrives. That single delta is the entire wedge.

---

## Feature Landscape

### Table Stakes — iOS User Audience

Features iOS users will assume exist after their first session. Missing these = product feels broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Browseable feed of apps (today / this week / trending) | Every discovery surface (App Store, Product Hunt, departures.to) opens with a feed | M | Already in PROJECT.md Active. Departures uses "Today / This Week" buckets — proven pattern. |
| App detail page (icon, screenshots, description, version, developer, category) | Apple sets the bar: ~10 screenshots, app preview, version history | M | In PROJECT.md. App Store allows up to 10 screenshots — match that ceiling. |
| Search by name/keyword | Universal; Departures, Airport, App Store all have it | M | In PROJECT.md (search/filter by category). Add free-text search to active list. |
| Category filtering | App Store and Departures both organize by category | S | In PROJECT.md. |
| One-tap install ("Get" button) | App Store DNA — the entire UX target | M | THE differentiator pretending to be table stakes. Without it the product is just departures.to. |
| Install state visible on app card ("Get" / "Testing" / "Full") | App Store shows install state; users expect lifecycle visibility | S | In PROJECT.md (non-actionable Testing state). Add "Full" / "Waitlisted" states explicitly. |
| Email/password + Sign in with Apple | iOS users on a TF discovery app strongly expect SiwA; Apple may even require it for App Store apps that offer 3rd-party auth | M | In PROJECT.md. Note: SiwA's Hide My Email forwards to a `@privaterelay.appleid.com` address — that *is* the email Apple's TF API needs, so the auto-add flow works fine. Verify deliverability of TF invites to private relay addresses. |
| Anonymous browsing (auth wall only at install) | Reducing friction on the discovery side is industry-standard for marketplaces | S | In PROJECT.md. |
| Handling of "slots full" (10K external tester cap) | Hard Apple constraint; product breaks without UX for it | M | In PROJECT.md (waitlist or hide). Critical edge case. |
| Waitlist auto-promotion when slots open | Promised in PROJECT.md; users will ask "what happened to my slot" | M | In PROJECT.md. Needs a periodic job + email notification. |
| Transactional email for waitlist promotion ("you're in") | Implicit in the waitlist promise; if user doesn't know they were promoted, the feature fails | S | Constraint mentions Resend/Postmark/SES TBD. Decision needed. |
| Privacy / TOS disclosure at install | iOS users + Apple reviewers expect clear data handling, especially when email is being passed to a third-party dev | S | **GAP in PROJECT.md.** Must disclose: "your email is shared with [developer name] via Apple's TestFlight." Legal-adjacent, ship at v1. |

### Table Stakes — Developer Audience

Features indie devs will compare against Firebase, TestFlight, and their existing toolchain.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email/password signup + sign-in | Standard SaaS dashboard; PROJECT.md confirms no social login for v1 | S | In PROJECT.md. |
| Upload ASC API key (.p8 + Key ID + Issuer ID) with encryption-at-rest | This is the technical core; constraint explicit in PROJECT.md | M | In PROJECT.md. Storage decision matters — KMS / envelope encryption / Vercel encrypted env-equivalent. Phase research likely needed. |
| Connect one or more apps via the key | API supports multi-app per key; standard expectation | M | In PROJECT.md. |
| Publish app listing (title, copy, category, screenshots, links) | Mirrors App Store Connect's product page UX | M | In PROJECT.md. |
| Preview listing before publish | Universal in any CMS-style flow; users will request it on day one | S | **GAP in PROJECT.md.** Add preview/draft state. |
| Auto-publish (no manual review) | Explicit decision in PROJECT.md | S | In PROJECT.md. Implies trust+safety must come from elsewhere (see report/abuse below). |
| Funnel dashboard: views → Get taps → emails captured → invites sent → invites accepted → installs | Gumroad, App Store Connect Analytics, every dev dashboard worth its salt | L | In PROJECT.md. The "invites accepted" and "installs" steps are *signal-only* (Apple owns the hand-off) — clarify what's measurable vs estimated. |
| Source attribution (direct / search / featured / share link) | Standard in Gumroad / PH / App Store Analytics | M | In PROJECT.md. |
| Per-app full-slots behavior (waitlist or hide) | Different growth strategies; PROJECT.md flags this as opinionated | S | In PROJECT.md. |
| Aggregated written feedback inbox | One of two pillars of the feedback loop | M | In PROJECT.md. |
| Feature-vote leaderboard | Mirrors Canny / Featurebase / Frill | M | In PROJECT.md. Should have status states (planned / in-progress / done) — see differentiators. |
| Manage testers list / view who's been invited | Firebase has this; TestFlight has this; devs will look for it | M | **GAP in PROJECT.md.** Read-only view of "who clicked Get on my app" is implicitly needed for the inbox to make sense. |
| Resend invite / remove tester | Standard tester management; ASC API supports it | S | **GAP in PROJECT.md.** Edge case but devs hit this within first week. |
| Revoke / rotate ASC key | Security hygiene; if key leaks, devs need a self-serve fix | S | **GAP in PROJECT.md.** Must be in v1 — security-critical. |
| Email notifications for new feedback / new feature requests | Devs check email more than they check dashboards | S | **GAP in PROJECT.md.** Implicit in the inbox; make explicit. |
| Settings: app description editing, screenshot replacement, category change | App Store Connect parity; devs iterate on listings constantly | S | Implicit in "publish" but spell out edit/update flow in v1. |
| Visible build/version of currently-distributed TF build | Devs need to confirm IndiePilot is pulling the right build from ASC | S | **GAP in PROJECT.md.** Display the current externally-distributed build version on the app's dashboard. |

### Differentiators (Competitive Edge)

Features that make IndiePilot distinct from departures/airport, Firebase, Product Hunt, and Canny *combined*. These are where the product earns its right to exist.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **One-tap TestFlight install via ASC API automation** | The wedge. Departures.to has discovery; nobody has discovery + automation. Eliminates the copy-paste-email step that breaks every existing TF discovery flow. | L | Core to PROJECT.md. Phase research already flagged. The hard parts: race conditions when multiple apps' invites are sent in a session, handling Apple's eventual consistency on tester-group adds, error states (key revoked, app removed from ASC). |
| **Slot-aware UX (Full / Waitlist / Auto-promote)** | The 10K cap is the #1 break in indie TF flows; no other discovery surface treats it as a first-class concept. | M | In PROJECT.md. Differentiator only because nobody else acknowledges the problem. |
| **Per-app feedback inbox + vote leaderboard, no separate Canny portal needed** | Indie devs currently choose between expensive Canny ($19-359/mo) or nothing. Bundling lite versions inside the discovery surface = "free + already where users are." | M | In PROJECT.md. The fact that voters are *actual testers* (not random web visitors) is itself a differentiator — Canny has no idea if a voter ever installed. |
| **Optional iOS SDK that works inside the developer's TF build** | Closes the loop: votes/feedback inside the app being tested, not on a website nobody visits. PinpointKit/Shake/Instabug exist, but require a separate dashboard. IndiePilot's SDK feeds the same dashboard the listing lives in. | L | In PROJECT.md. Differentiator strength: low if SDK is just "send to inbox"; high if it includes voting (where users vote on features inside the app they're using). |
| **Source attribution into the funnel (direct / search / featured / share link)** | Indie devs pay nothing for ASO and have zero attribution today. Apple's own analytics gives near-nothing on TF. | M | In PROJECT.md. Generates obvious "growth-loop" insights for devs. |
| **Branded share link per app** (e.g., `indiepilot.app/[handle]/[app-slug]`) | Devs share *one* link instead of choosing between TF link, App Store link, landing page; share link funnels through IndiePilot's funnel + attribution. | S | **GAP in PROJECT.md.** Implicit in attribution but make explicit. |
| **Public roadmap status per feature request** (Open / Planned / In Progress / Shipped) | Canny and Featurebase both have this; users expect transparency on votes. Cheap to add, big trust signal. | S | **GAP in PROJECT.md** (the leaderboard exists but no status). |
| **Changelog / "What's New" per app** | App Store has it. Devs want to broadcast updates to current testers. Low effort, high recurring value. | S | **GAP in PROJECT.md.** Could pull from ASC build release notes or be a separate field. |
| **Editorial/featured curation surface** (added later) | Cold-start two-sided marketplace mitigation: solo dev can curate quality early, before community signal works. | M | PROJECT.md says "auto-publish in v1; curated 'Featured' can come later." Confirmed sensible order. |
| **Verified developer badge** (proves they own the ASC key — implicit) | Just by uploading a working .p8, devs prove they control the App Store account. Surface that as a trust signal. | S | **GAP in PROJECT.md.** Free trust signal that beats Departures (anyone can post any link there). |
| **Indie/playful design language** (not literal App Store clone) | PROJECT.md explicitly calls this out; brand differentiation matters in a category where most competitors look like enterprise dashboards. | M | In PROJECT.md (Brand & Design section). |

### Anti-Features (Deliberately NOT Building, with Rationale)

Some are already in PROJECT.md's Out of Scope. Surfacing additional ones found during research.

| Anti-Feature | Why Tempting | Why Problematic for IndiePilot | Alternative |
|--------------|--------------|--------------------------------|-------------|
| **Real-time chat between devs and users** | Users want to ask devs questions; "feels social" | High moderation cost; solo dev cannot scale; written feedback is async-friendly and creates a record | Written feedback + dev replies (async, threaded). Already in PROJECT.md Out of Scope. |
| **Push notifications to users** | Engagement boost | Native push requires APNs setup, permission UX, and a notification preferences surface. Email is sufficient for v1 (waitlist promotion, feedback replies). | Email-only in v1; push deferred. Already in PROJECT.md Out of Scope. |
| **Manual app review / curation** | Quality bar; prevents spam | Solo dev cannot scale review; bottlenecks supply side of marketplace | Auto-publish + community report/flag + later "Featured" curation layer. Already in PROJECT.md Out of Scope. |
| **Sponsored / paid placement / ads** | Obvious revenue | Erodes trust on day one in an indie/community product; conflicts with "App Store but better for indies" positioning | Freemium dev plan only in v1. Already in PROJECT.md Out of Scope. |
| **Crash reporting / full event analytics SDK** | Competing with PostHog/Mixpanel feels like SDK upside | Massive scope creep; mature competitors; SDK becomes a maintenance black hole | SDK = feedback widget + voting only. Devs use PostHog/Sentry separately. Already in PROJECT.md Out of Scope. |
| **Cross-platform SDK (RN/Flutter)** | "More platforms = more devs" | Complicates support matrix; iOS-only is the entire premise | iOS-native SDK only. Already in PROJECT.md Out of Scope. |
| **Android / Play Store** | Doubles addressable market | TestFlight automation is the wedge — there's no "Play Store wedge" because Google's beta tooling is already easier | iOS-only. Already in PROJECT.md Out of Scope. |
| **User-to-user follow / social graph** | Common in PH/AlternativeTo style products | Adds moderation burden and timeline/feed complexity; doesn't help install funnel | "Save for later" / favorites is enough — no follow graph. **Add to Out of Scope.** |
| **Public comment threads on app pages** | Social validation; PH-style discussion | Moderation burden, brigading, off-topic noise; written feedback to dev is the structured channel | Feedback goes to dev (private/aggregated) + votes are public signal. **Add to Out of Scope.** |
| **Star ratings / numeric reviews** | App Store DNA; users expect them | One-star bombing is real; for early-stage betas, ratings are misleading (the app is *supposed* to be rough); creates dev anxiety that suppresses publishing | Upvotes on apps + feature voting + written feedback. **Add to Out of Scope** for v1; revisit when there are stable, post-beta apps. |
| **In-product DM / "ask the developer"** | Users want to talk to devs | Same problem as chat; spam + support burden | Feedback inbox is the channel. Same rationale as chat. |
| **Build distribution / hosting (replacing TF)** | "Just host the .ipa ourselves" | Apple TOS violation; doesn't scale; not the wedge | Always go through ASC API + TF. Already implicit in PROJECT.md constraints. |
| **OAuth / social login for developers** | Lower friction | Devs are already used to email/password for ASC, GitHub, etc.; SiwA-for-devs would be cute but not critical | Email/password for v1. Already in PROJECT.md. |
| **AI-generated app descriptions / screenshots** | "Magic" feature; content gen is hot | Erodes quality + trust; devs writing their own copy is part of indie character | Devs write their own. Could revisit as an *assist* tool (like draft suggestions) post-PMF. **Add to Out of Scope** for v1. |
| **Referral / "invite a friend" virality loops** | Waitlist tools (LaunchList, Waitlister) make it easy | Adds complexity; for v1 the feed itself is the discovery loop; can add later if growth stalls | Organic word-of-mouth + share links. Defer. |
| **Multi-tester-group support per app** (assigning testers to A/B groups) | TF supports it; sophisticated devs use it | YAGNI for v1; one external group per app is the indie norm | One default external group; expose group selection later if asked. |

---

## Feature Dependencies

```
[Auth: email + SiwA + anonymous browse]
    └──required by──> [Tap "Get" → invite flow]

[ASC key upload + encryption]
    └──required by──> [App publish]
                          └──required by──> [Browseable feed]
                          └──required by──> [App detail page]
                          └──required by──> [Tap "Get" → invite flow]
                                                └──required by──> [Funnel analytics]
                                                └──required by──> [Source attribution]

[Tap "Get" → invite flow]
    └──required by──> [Slot-full UX]
                          └──required by──> [Waitlist + auto-promote]
                                                └──required by──> [Transactional email]

[App publish]
    └──required by──> [Written feedback inbox]
    └──required by──> [Feature voting + leaderboard]
                          └──enhances────> [Public roadmap status]
                          └──required by──> [iOS SDK in-app voting]
    └──required by──> [Per-app share link]
                          └──required by──> [Source attribution]

[iOS SDK]
    └──optional────> [App publish]  (SDK opt-in; product works without it)

[Brand & design system]
    └──pervasive──> [iOS app, web dashboard, transactional email]

[Email transactional provider decision]  ← BLOCKER for waitlist promotion + feedback notifications
```

### Dependency Notes

- **ASC key upload is the single keystone:** every developer-side feature past signup gates on it. A dev who can't upload a key sees an empty dashboard. UX for the upload flow has to be exceptional — this is the moment most devs will bounce.
- **Auth before Get, not before browse:** PROJECT.md gets this right. Anonymous browsing is the marketplace top-of-funnel; auth wall is a conversion event, not an entry barrier.
- **Slot-full UX cannot ship after Get:** they're the same feature. If "Get" works on apps with open slots and silently fails on full apps, the product feels broken on day one. Ship together.
- **Transactional email provider decision unblocks waitlist auto-promote:** PROJECT.md flags this as TBD. Decision needed before the waitlist feature can ship.
- **iOS SDK is genuinely optional:** product is fully usable without it. SDK can ship in a later phase without blocking v1 validation.
- **Editorial/featured surface is post-MVP:** it requires both supply (apps to feature) and demand (users to see them). Auto-publish + community signal is the v1 quality bar; editorial layer comes after liquidity exists.

---

## MVP Definition

### Launch With (v1) — what's needed to validate the magic moment

**iOS app:**
- [ ] Browseable feed (today / this week)
- [ ] App detail page (icon, screenshots, description, version, developer, category)
- [ ] Search + category filter
- [ ] Auth: email/password + Sign in with Apple, anonymous browsing until "Get"
- [ ] Tap "Get" → ASC API adds email to external group → "Testing" state shown
- [ ] Slot-full UX (waitlist or hidden, per dev's per-app setting)
- [ ] Waitlist auto-promotion + email notification
- [ ] Privacy disclosure at install ("we share your email with [dev]")

**Web dashboard:**
- [ ] Email/password auth
- [ ] ASC key upload with encryption-at-rest + revoke/rotate
- [ ] Connect apps to the key
- [ ] Publish/edit app listing with preview/draft state
- [ ] Auto-publish (no manual review)
- [ ] Funnel dashboard: views → Get → invites sent → invites accepted (estimate where unmeasurable)
- [ ] Source attribution
- [ ] Per-app full-slots behavior toggle
- [ ] Aggregated feedback inbox + email notification on new feedback
- [ ] Feature-vote leaderboard with status states (Open / Planned / In Progress / Shipped)
- [ ] Tester list (read-only view of who tapped Get)
- [ ] Per-app branded share link
- [ ] Display current externally-distributed build version
- [ ] What's New / changelog field per app

**Brand & design:**
- [ ] Design system, brand identity, voice (PROJECT.md confirms greenfield)

**Trust & safety (minimum):**
- [ ] Report-app affordance on app detail page (route to admin email is fine for v1)
- [ ] Verified developer badge (implicit from working .p8 key)

**Why these and not less:** every item above breaks the v1 premise if removed. The funnel dashboard *could* be cut for a stricter MVP, but devs won't trust the platform without proof their effort moved a metric — it's a retention requirement, not a vanity feature.

### Add After Validation (v1.x)

- [ ] iOS SDK (in-app feedback widget + voting) — ship once 10+ devs request it
- [ ] Editorial / "Featured" curation surface — once there's enough supply that a homepage decision is meaningful
- [ ] Save / bookmark apps for later (iOS users)
- [ ] Multi-tester-group support per app (advanced devs)
- [ ] Custom domain on developer share links
- [ ] Webhook on funnel events (devs piping data to their own analytics)

### Future Consideration (v2+)

- [ ] Push notifications (currently in PROJECT.md Out of Scope)
- [ ] Cross-platform SDK (RN/Flutter) (currently Out of Scope; revisit only with strong demand)
- [ ] Android / Play Store (currently Out of Scope; would be a sister product, not an extension)
- [ ] Sponsored / paid placement (currently Out of Scope; revisit once organic ranking is mature)
- [ ] Crash reporting in SDK (currently Out of Scope; revisit if SDK gains traction)

---

## Feature Prioritization Matrix

P1 = must ship for v1 to be coherent. P2 = should ship soon after. P3 = nice to have, future.

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| ASC key upload + encryption + revoke | HIGH (blocks everything) | MEDIUM | P1 |
| App listing publish (with preview/draft) | HIGH | MEDIUM | P1 |
| Browseable feed + detail page + search/category | HIGH | MEDIUM | P1 |
| Auth (email + SiwA) + anonymous browse | HIGH | MEDIUM | P1 |
| Tap "Get" → ASC API tester add | HIGH (the wedge) | HIGH | P1 |
| Slot-full UX + waitlist + auto-promote | HIGH (constraint) | MEDIUM | P1 |
| Transactional email (waitlist promo, feedback notify) | HIGH | LOW | P1 |
| Privacy disclosure at install | MEDIUM (legal) | LOW | P1 |
| Funnel analytics + source attribution | HIGH (dev retention) | HIGH | P1 |
| Feedback inbox | HIGH | MEDIUM | P1 |
| Feature voting + leaderboard + status | HIGH | MEDIUM | P1 |
| Per-app share link | MEDIUM | LOW | P1 |
| Tester list (read-only) | MEDIUM | LOW | P1 |
| Build/version display in dashboard | MEDIUM | LOW | P1 |
| What's New / changelog field | MEDIUM | LOW | P1 |
| Verified developer badge | MEDIUM (trust) | LOW | P1 |
| Report-app affordance | MEDIUM (trust&safety) | LOW | P1 |
| Brand & design system | HIGH (positioning) | MEDIUM | P1 |
| iOS SDK (feedback + voting) | MEDIUM | HIGH | P2 |
| Editorial / Featured curation | MEDIUM | MEDIUM | P2 |
| Save/bookmark apps | LOW | LOW | P2 |
| Resend invite / remove tester (dev side) | LOW | LOW | P2 |
| Multi-tester-group per app | LOW | MEDIUM | P3 |
| Webhook events | LOW | MEDIUM | P3 |
| Custom domain on share links | LOW | MEDIUM | P3 |
| Push notifications | LOW (email covers it) | HIGH | P3 |

---

## Competitor Feature Analysis

| Feature | Departures.to | Airport.community | TestFlight (Apple) | Firebase App Dist | Product Hunt | Canny / Featurebase | IndiePilot |
|---------|---------------|--------------------|--------------------|--------------------|--------------|---------------------|------------|
| Discovery feed | Yes (Today/Week) | Yes (daily) | No | No | Yes (daily) | No | **Yes** (Today/Week + featured later) |
| App detail page | Lightweight | Yes (with screenshots) | No (TF link only) | No | Yes (rich) | N/A | **Yes** (App Store-grade) |
| Search/filter | Tag/category | Yes | No | No | Yes | N/A | **Yes** |
| One-tap install (no copy-paste) | No (clicks out to TF) | No (clicks out) | N/A | Email link only | N/A | N/A | **Yes — the wedge** |
| Slot-aware ("Full" / Waitlist) | Tracks dead links only | No | Hard error | N/A | N/A | N/A | **Yes — first-class** |
| Auth required | No | Apparently no | Yes (Apple ID) | Yes | Yes | Yes | **No to browse, yes to install** |
| Dev attribution / funnel | No | No | Apple analytics only (limited) | Yes (basic) | One-day spike only | No (it's a feedback tool) | **Yes — multi-step funnel** |
| Per-app feedback inbox | No | No | Yes (TF screenshots) | Yes (basic) | Comments | Yes (the whole product) | **Yes — bundled with discovery** |
| Feature voting | No | No | No | No | Upvotes (per launch) | Yes (the whole product) | **Yes — bundled** |
| In-app SDK (optional) | No | No | TF native screenshot feedback | Yes | No | Yes (their own widget) | **Yes — opt-in, lite scope** |
| Editorial / Featured | Newsletter curation | No | Sometimes (Featured by Apple) | No | Yes | No | **Post-MVP** |
| Verified developer | No | No | Yes (Apple ID) | Yes (Google) | Maker badge | N/A | **Yes (implicit from .p8)** |
| Free for devs | Yes | Yes | Free | Free | Free | $19-359/mo | **Free in v1 (freemium TBD)** |
| Free for users | Yes | Yes | Free | N/A | Free | N/A | **Yes** |

**Headline takeaway:** the "one-tap install" column is empty everywhere except IndiePilot. That single column being filled is the entire defensible position; everything else is supporting infrastructure to make that column matter.

---

## Gaps in PROJECT.md Active List (must-add for v1 coherence)

These features are competitive table stakes that PROJECT.md doesn't currently list. Recommend adding to the Active list before roadmap planning:

1. **Privacy disclosure at install** ("your email is shared with [dev]") — legal-adjacent, Apple reviewer expectation
2. **ASC key revoke/rotate UI** — security-critical; if a key leaks, devs need a self-serve fix
3. **Listing preview/draft state** — universal CMS expectation
4. **Tester list (read-only) per app** — devs ask for this within first week
5. **Email notifications on new feedback / new vote** — implicit but worth making explicit
6. **Build/version display in dashboard** — devs need to confirm IndiePilot is reading the right ASC build
7. **What's New / changelog field per app** — App Store parity, low effort, recurring value
8. **Public status per feature request** (Open / Planned / In Progress / Shipped) — Canny/Featurebase parity
9. **Per-app branded share link** — implicit in attribution; make explicit
10. **Verified developer badge** — free trust signal that beats Departures
11. **Report-app affordance** — minimum trust&safety for an auto-publish marketplace
12. **Decide and document transactional email provider** — blocks waitlist auto-promote (PROJECT.md flags Resend/Postmark/SES as TBD)

## Recommended Additions to PROJECT.md Out of Scope (anti-features uncovered)

Surfacing these prevents drift during planning:

1. **User-to-user follow / social graph** — moderation burden, doesn't help funnel
2. **Public comment threads on app pages** — feedback to dev is the structured channel
3. **Star ratings / numeric reviews on betas** — one-star bombing on incomplete apps; revisit post-beta
4. **In-product DM with developer** — same rationale as no-chat
5. **AI-generated listings / screenshots** — erodes trust + indie character
6. **Referral / viral waitlist mechanics** — defer until growth stalls

## Validation of PROJECT.md Active List Against the Market

Items already listed and confirmed by competitive research:

| PROJECT.md Item | Market Validation |
|-----------------|-------------------|
| Browseable feed | Departures, Airport, App Store all use Today/Week buckets |
| App detail page (screenshots, description, etc.) | Direct App Store parity |
| Search/filter by category | Universal in this category |
| Email + SiwA, anonymous browse until Get | Best-practice pattern; SiwA private relay works with TF |
| ASC key (.p8 + Key ID + Issuer ID) | This is the actual ASC API requirement; no OAuth alternative exists |
| Tap Get → ASC tester add → invite | Validated end-to-end against ASC API (BetaTesterInvitations endpoint) |
| Per-app waitlist/hide on full slots | Necessary; 10K cap is a hard Apple constraint, no competitor handles this gracefully |
| Funnel + source attribution | Gumroad/PH/App Store Analytics parity; expected by devs |
| Feedback inbox + feature-vote leaderboard | Canny/Featurebase parity, bundled |
| Optional iOS SDK | PinpointKit/Shake/Instabug pattern; opt-in is correct |
| Auto-publish | Confirmed sensible for solo dev + low volume |
| Modern/playful design (Product Hunt / Arc DNA) | Differentiates from enterprise-dashboard look of Firebase/Canny |

All Active items survive market validation; no item is misguided. The list is incomplete (see gaps above) but not wrong.

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Direct competitor analysis (Departures, Airport) | HIGH | Both sites fetched directly; feature sets confirmed |
| TestFlight / ASC API capabilities | HIGH | Apple official documentation; multiple corroborating sources |
| Adjacent feedback tools (Canny/Featurebase/Frill) | HIGH | Recent comparison articles, multiple sources |
| Indie marketplace patterns (Setapp, PH, BetaList) | HIGH | Multiple independent sources |
| iOS SDK feedback patterns (PinpointKit/Shake/Instabug) | MEDIUM-HIGH | Open-source repos and documentation directly inspected |
| MVP scope recommendation | HIGH | Derived from PROJECT.md core value + validated competitive baseline |
| SiwA private relay → TF deliverability | MEDIUM | Logically sound (TF accepts the relay address as the tester's email); not directly verified end-to-end. Worth a phase-research spike before building. |
| Anti-feature recommendations | MEDIUM-HIGH | Pattern-matched from PROJECT.md voice + standard marketplace pitfalls |

## Sources

- [Departures - Discover TestFlight apps](https://departures.to/)
- [Departures - About](https://departures.to/about)
- [Airport Community](https://airport.community/)
- [Apple - Invite external testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/)
- [Apple - App Store Connect API](https://developer.apple.com/app-store-connect/api/)
- [Apple - Send an Invitation to a Beta Tester](https://developer.apple.com/documentation/appstoreconnectapi/send_an_invitation_to_a_beta_tester)
- [Apple - TestFlight](https://developer.apple.com/testflight/)
- [Apple - App Store Product Page guidelines](https://developer.apple.com/app-store/product-page/)
- [Apple - Sign in with Apple / Hide My Email](https://support.apple.com/en-us/105078)
- [Apple - Communicating using the private email relay service](https://developer.apple.com/documentation/signinwithapple/communicating-using-the-private-email-relay-service)
- [Firebase App Distribution - Distribute iOS apps to testers](https://firebase.google.com/docs/app-distribution/ios/distribute-console)
- [Firebase App Distribution - Manage Beta Testers & Groups](https://techielearn.com/tutorials/firebase/firebase-app-distribution/setting-up-testers-and-groups)
- [Product Hunt](https://www.producthunt.com/)
- [Setapp Marketplace](https://setapp.com/marketplace)
- [Setapp - How to launch an app: indie developer's playbook](https://setapp.com/how-to/launch-an-app)
- [BetaList](https://betalist.com/)
- [Beta Family](https://betafamily.com/)
- [BetaTesting](https://betatesting.com/)
- [AlternativeTo - About](https://alternativeto.net/software/alternativeto/about/)
- [Canny vs Featurebase: Complete 2026 Comparison](https://rightfeature.com/blog/canny-vs-featurebase/)
- [Top 14 Feature Voting Tools for SaaS Companies in 2026 - Featurebase](https://www.featurebase.app/blog/top-feature-voting-tools)
- [PostHog vs Mixpanel comparison](https://posthog.com/blog/posthog-vs-mixpanel)
- [Mixpanel - Feature Flags](https://docs.mixpanel.com/docs/featureflags)
- [Gumroad - Sales Analytics Dashboard](https://help.gumroad.com/article/74-the-analytics-dashboard)
- [PinpointKit (iOS feedback SDK)](https://github.com/Lickability/PinpointKit)
- [Shake SDK (iOS feedback)](https://docs.shakebugs.com/docs/ios/user-feedback/invoke/)
- [Instabug iOS SDK](https://docs.instabug.com/docs/ios-invocation)
- [Some developers are using TestFlight as an underground App Store - AppleInsider](https://appleinsider.com/articles/20/08/17/some-developers-are-using-testflight-as-an-underground-app-store)
- [Solving the Marketplace Cold-Start Problem - David Ciccarelli](https://www.davidciccarelli.com/articles/product-marketing-playbook-for-two-sided-platforms/)

---
*Feature research for: IndiePilot — App Store-like discovery for TestFlight betas with ASC-API-driven one-tap install*
*Researched: 2026-04-28*
