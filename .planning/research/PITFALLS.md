# Pitfalls Research

**Domain:** Two-sided marketplace for indie iOS TestFlight apps (Next.js dashboard + SwiftUI iOS app + ASC API integration + optional iOS SDK)
**Researched:** 2026-04-28
**Confidence:** MEDIUM-HIGH (Apple TOS interpretation is HIGH risk; rate limit specifics MEDIUM; marketplace dynamics HIGH)

> Severity legend: **SHOWSTOPPER** = product cannot exist if this is wrong, **SERIOUS** = major rework or business risk, **MINOR** = annoying but recoverable.

---

## Critical Pitfalls

### Pitfall 1: Apple TOS — "Service Provider may not use TestFlight on your behalf"

**Severity:** SHOWSTOPPER (or at minimum, SERIOUS — needs legal interpretation before scaling)

**What goes wrong:**
The Apple Developer Program License Agreement explicitly states a developer "may not use a Service Provider to submit an Application to the App Store or use TestFlight on your behalf." IndiePilot's core mechanic — taking a developer's `.p8` key and calling `POST /v1/betaTesterInvitations` to add users to that developer's TestFlight group — is plausibly "using TestFlight on the developer's behalf." If Apple decides this interpretation applies, IndiePilot becomes legally untenable: developers risk account termination, IndiePilot risks platform-level retaliation (its own iOS app rejected, demands to cease).

**Why it happens:**
The clause is ambiguous. RevenueCat, fastlane, App Store Manager, Helm, and many CI tools all use developer-supplied ASC keys to perform actions "on behalf of" the developer. Apple has not publicly enforced against this category, and a RevenueCat staffer noted "generally Apple has not disallowed our use case." But none of those services are doing what IndiePilot does at scale: routing *third-party end users* (not the developer's own testing operations) into TestFlight slots. That distinction may matter.

**How to avoid:**
- **Frame the relationship contractually as developer self-service, not delegation.** Terms must say: developer authorizes IndiePilot as a Service Provider for backend tester management *that the developer remains responsible for*. Mirror language from Apple's own clause. Consider requiring developers to acknowledge Apple's rules in onboarding.
- **Do not script TestFlight or ASC web actions** — only use the official ASC API. (Already a stated constraint; reinforce.)
- **Have developers create the API key under their own ASC account** and grant only the minimum role needed. Never centralize keys under a single IndiePilot ASC team account.
- **Get a written legal opinion** before public launch (post-v1 acceptable, but before paid tier). Budget for it.
- **Have a contingency:** if Apple objects, can IndiePilot pivot to "discovery + public TestFlight link routing" without programmatic tester adds? That preserves part of the product. Design the data model so this pivot is possible (store public link as a fallback field per app from day one).

**Warning signs:**
- Apple Developer Relations contacts a partner developer asking about IndiePilot
- A high-profile competitor in this exact niche gets shut down
- App Review rejects the IndiePilot iOS app citing the developer agreement
- Developer reports their ASC account flagged after connecting to IndiePilot

**Phase to address:**
- **Phase 0 / Foundation:** ToS, contractual framing, onboarding acknowledgment, fallback data model field for public link
- **Phase 1 (paid tier or 100+ devs):** legal opinion before scaling

---

### Pitfall 2: App Store Review Rejection of the IndiePilot iOS App Itself

**Severity:** SHOWSTOPPER

**What goes wrong:**
IndiePilot's iOS app is an "App Store-like discovery surface inside the App Store." Apple has multiple guidelines that could trigger rejection:
- **Guideline 4.3 (Spam/Design):** apps that look like the App Store or duplicate its function
- **Guideline 4.7 / 4.7.4 (Mini-apps and catalogs):** apps that surface other software must comply with strict catalog-app rules; the streaming-games carve-out *requires* every listed item to link to an App Store product page, but TestFlight betas have no App Store page yet
- **Guideline 5.6.3 (Discovery Fraud):** anything Apple reads as "manipulating App Store discovery, charts, or referrals" (votes, leaderboard) is forbidden
- **Guideline 2.5.7-style restrictions** on promoting external services / encouraging traffic out of the App Store

A "Get" button that visually mimics the App Store while routing the user out to TestFlight is exactly the kind of UX Apple historically rejects.

**Why it happens:**
Solo dev underestimates Apple's willingness to reject "App Store within App Store" experiences. Designers chase App Store DNA because it tests well, not realizing the visual mimicry is itself a flag. App Review is unpredictable and the same app can be approved by one reviewer and rejected by another.

**How to avoid:**
- **Brand clearly as Indie/TestFlight discovery, not "the App Store."** The PROJECT.md design direction already says "Product Hunt / Arc, not literal App Store clone" — hold this line ruthlessly. No App Store-blue gradients, no copying chart icons, no "Today" tab, no five-star ratings widget that looks like Apple's.
- **Replace "Get" with "Join Beta" or "Join TestFlight."** "Get" is App Store branding — Apple notices.
- **Show TestFlight handoff explicitly.** After tap, show a sheet: "We'll send you a TestFlight invite from Apple. Open it from your inbox." This frames IndiePilot as a referrer, not a distributor.
- **Never claim the apps are "from the App Store"** — they're TestFlight betas. Different store, different category.
- **Submit the iOS app for review with low expectations on the first attempt.** Plan 2-3 rejection rounds and have a contact pattern with App Review (Resolution Center) to negotiate.
- **Pre-emptively disable upvoting/leaderboard public-rank UX in the iOS app on first review submission.** Add it back after first approval. Public ranked lists are exactly what 5.6.3 attacks.

**Warning signs:**
- App Review keeps citing 4.3 ("Design: Spam") or asks "how is this different from the App Store?"
- Reviewers ask whether listed apps are reviewed by Apple
- Multiple resubmissions cited under "Other"

**Phase to address:**
- **Phase: iOS app design system / brand:** non-App-Store-mimicry as a hard design rule
- **Phase: iOS app first submission:** strip leaderboard/voting UX from initial review, reintroduce post-approval

---

### Pitfall 3: ASC API Rate Limits at Marketplace Scale

**Severity:** SERIOUS

**What goes wrong:**
The ASC API has a **per-user-per-hour rolling limit** (commonly 3,600 req/hr, communicated via `x-rate-limit: user-hour-lim:3600` header) and an **undocumented per-minute ceiling** around ~300-350 req/min. Critically, the limit is **per JWT subject (per ASC user / key)**, not per IndiePilot. That means:

- For *one* developer's key, IndiePilot can do ~3,600 ops/hour. Adding a tester is ~2-3 calls (find/create tester, add to group, optionally invite). That's ~1,200-1,800 tester adds/hour *per developer*.
- A viral indie app getting 5,000 "Get" taps in an hour will be capped — testers will join with delays of minutes to hours.
- A "fix-up" job that retries failed adds for many devs simultaneously can blow the limit per-developer-key and stall.
- Token-related calls (JWT generation is local, doesn't count, but every refreshed key = new bursts) and pagination on tester lists eats budget fast.

**Why it happens:**
Easy to assume "the ASC API has a rate limit" means a single global limit you can engineer around. It's actually per-key, with undocumented sub-limits and unpredictable bursts (Apple reserves the right to throttle further). Worse, if IndiePilot retries naively on 429, it amplifies the problem.

**How to avoid:**
- **Per-developer-key job queue** with a token-bucket limiter (e.g., 50 req/min, 2,500 req/hour, leaving headroom for the developer's own tooling — fastlane, etc.).
- **Single "tester sync worker" per developer.** Never parallelize ASC API calls for the same key.
- **Graceful 429 backoff:** parse `Retry-After` header, exponential backoff, jittered.
- **Batch where possible:** `POST /v1/betaGroups/{id}/relationships/betaTesters` accepts arrays — adding multiple users to a group in one call is a 5-10x amplifier.
- **Cache tester existence checks.** A user who is already a tester for some other dev's app doesn't need to be re-fetched per Get tap.
- **User-facing UX must tolerate delay.** "Joining…" → "Sent! Check your email in ~15 minutes" is fine. Synchronous "Get" → instant TF invite is not always achievable.
- **Surface rate-limit headroom on the dev dashboard** — devs should see "your API budget for this hour: 78%". Avoids debugging customer support tickets.

**Warning signs:**
- Random Get taps return errors during Product Hunt-style traffic spikes
- Specific developers report invites are hours late while others are fine (= per-key throttling)
- 429 error rate creeping up in logs

**Phase to address:**
- **Phase: ASC API integration:** queue + rate limiter from day one (not added later)
- **Phase: launch readiness:** load test against a sandbox dev's key

---

### Pitfall 4: TestFlight Email Delivery Is Apple's Black Box

**Severity:** SERIOUS

**What goes wrong:**
The "magic moment" of IndiePilot is "tap Get → TF invite arrives in your email." Apple sends that email. Apple's email deliverability is mediocre: Developer forums are full of testers reporting invites going to spam, never arriving for certain domains (Outlook, ProtonMail, corporate), being delayed, or being silently dropped. Common causes per Apple forums:

- Domain-specific filtering — some corporate / privacy-focused domains drop Apple's beta invitation
- Apple ID conflicts — if the email is associated with a different Apple ID than the device, the invite is "delivered" but unusable
- Existing production app on device blocks TestFlight install
- Browser-specific bugs when opening the redeem link (Chrome vs Safari)
- Service outages — TestFlight has had multi-hour incidents
- Rate-limited "notify testers" flag must be set explicitly in some workflows

When the magic moment fails, IndiePilot looks broken even though the failure is 100% on Apple's side. Users blame IndiePilot, churn, and tell friends "it doesn't work."

**Why it happens:**
The architecture treats Apple as a reliable component. It isn't. Email is the second-flakiest channel after SMS, and Apple's system isn't built for end-user-facing transactional delivery — it's built for developers managing their own testers.

**How to avoid:**
- **Set expectations explicitly.** Post-Get UI: "Apple will email you within ~5 minutes. Check spam if it doesn't arrive in 15."
- **Provide a self-serve resend.** "Didn't get it? Resend invite" button → re-call ASC API. Critical for support deflection.
- **Show the user their TestFlight redemption code if Apple's API exposes it,** so they can manually enter it in the TestFlight app.
- **Detect known-bad email domains** (corporate, .edu, certain ProtonMail patterns) at signup and warn before the user commits.
- **Recommend Sign in with Apple** as primary path because it returns a verified iCloud email which routes correctly to that user's Apple ID. Email/password creates Apple ID mismatches.
- **Track invite acceptance rate per developer.** A developer with 0% acceptance is probably a bug somewhere; surface it.
- **Have a backup channel:** IndiePilot's own transactional email (Resend/Postmark) sends a "your TestFlight invite was sent — here's what to do if it doesn't arrive" message, with manual redemption fallback.
- **Consider falling back to public TestFlight link** for developers who opt in: if first invite attempt fails or user is on a flagged domain, offer "tap here to join via public link" instead of the per-email API path.

**Warning signs:**
- Funnel shows huge drop between "invite sent" and "invite accepted"
- Support inbox dominated by "I tapped Get and nothing happened"
- Specific email domains have 0% acceptance

**Phase to address:**
- **Phase: TestFlight integration:** post-Get UX, resend, email domain warning, fallback messaging
- **Phase: feedback/observability:** funnel instrumentation including "TF invite accepted" metric

---

### Pitfall 5: Cold Start — Empty Marketplace Death Spiral

**Severity:** SERIOUS

**What goes wrong:**
Launch the iOS app with 8 indie apps listed. Users browse, see thin selection, churn. Devs check IndiePilot, see no users, don't bother uploading their .p8. Both sides leave. Marketplace dies in week 2.

**Why it happens:**
Default assumption: "if I build it, they will come." Two-sided platforms are an exception — neither side has reason to show up without the other. Standard Andrew Chen / Reforge guidance: **target supply first**, but in IndiePilot's case "supply" (indie devs willing to upload .p8) requires trust IndiePilot won't have on day one.

**How to avoid:**
- **Pre-seed 50-100 indie apps before public launch.** Cold-outreach indie devs (Twitter/X #buildinpublic, Indie Hackers, IndieDev forums, r/iOSProgramming). Offer manual concierge onboarding — a real person walks them through .p8 upload. The lift is high but not optional.
- **Provide a "tool" before a "marketplace."** Even with 5 listed apps, the iOS app should be useful — e.g., a curated "indie betas worth trying this week" feed Vincent personally curates. "Come for the tool, stay for the network" (Hipcamp pattern).
- **Geographic / category density over breadth.** Better to have 30 apps in one niche (productivity, dev tools, social) than 5 apps in 6 niches. Pick a beachhead — likely "indie productivity / dev tools" since that's also the audience for Twitter/IH outreach.
- **Side with the user side first for traffic, side with the dev side first for inventory.** User-side launch is content marketing (Product Hunt, HN). Dev-side launch is concierge sales. Both happen in parallel but with different tactics.
- **Track marketplace liquidity weekly:** "% of Get taps that result in TF acceptance within 24h" + "% of devs who get >10 Get taps in a week." If either metric is collapsing, the loop is broken.
- **Don't add a paid tier until both sides are loaded.** Premature monetization scares away supply when supply is already scarce.

**Warning signs:**
- Dev signups drop below 1/week three weeks post-launch
- iOS app DAU drops 50%+ between launch and week 4
- Average "Get" taps per app per week < 5 across 80% of listed apps

**Phase to address:**
- **Phase: pre-launch:** concierge onboarding for first 50 devs
- **Phase: launch:** beachhead category strategy, no paid tier yet
- **Phase: post-launch month 2:** liquidity dashboard

---

### Pitfall 6: .p8 Key Compromise Blast Radius

**Severity:** SHOWSTOPPER (if it happens) / SERIOUS (probability)

**What goes wrong:**
IndiePilot stores hundreds or thousands of developers' `.p8` private keys. A single key compromise gives attackers programmatic access to that developer's TestFlight (add malicious testers, exfiltrate tester emails, push fake builds in some role configurations, modify metadata). A *database* breach gives attackers everything. Aggregating developer ASC keys is a uniquely high-value target — IndiePilot becomes a honeypot.

Worse: developers will (rightly) blame IndiePilot for the breach, and Apple may revoke the IndiePilot relationship.

**Why it happens:**
- Solo dev under-invests in secrets management ("envelope encryption is overkill for v1")
- Database backups stored unencrypted or with the same key
- App-level encryption with a key stored next to the data
- Logs accidentally contain the key (e.g., debug print, error reporting)
- Vercel / Neon connection strings leak via env files in screenshots, GitHub commits

**How to avoid:**
- **Envelope encryption from day one.** Each `.p8` encrypted with a per-record DEK; DEK encrypted with a KEK held in a KMS (AWS KMS, GCP KMS, or HashiCorp Vault). Database compromise alone is not sufficient.
- **Never log raw `.p8` content or JWT tokens.** Add automated detection in logging pipeline.
- **Restrict role on the developer's ASC key.** Recommend "Developer" role with only TestFlight management permissions, not Admin. Document this in onboarding.
- **One-way decryption boundary.** Only the tester-sync worker decrypts; web dashboard never sees the raw key. Consider a separate microservice with its own deployment so a Next.js code injection doesn't expose the key store.
- **Rotation tooling from day one.** A dev who suspects compromise should be able to upload a new key in 60 seconds and have IndiePilot purge the old one immediately. (Apple lets devs revoke at any time on their side; IndiePilot must mirror that.)
- **Notify devs proactively** when a key fails (revoked or expired) — the "graceful key revocation" UX is also a blast-radius reducer.
- **Audit trail per key.** Every API call logged with developer ID, timestamp, endpoint. If a key is compromised, the dev (and you) can answer "what was done with it."
- **Cyber insurance** before the dev count justifies it. The premium is small relative to the risk.

**Warning signs:**
- Logs containing partial key material (private headers/footers)
- Backup process bypasses encryption
- Vercel deployments with secrets in build output
- A developer reports unexpected testers added to their group

**Phase to address:**
- **Phase: security foundation (Phase 0 or 1):** envelope encryption, KMS, audit log, no exceptions
- **Phase: dashboard:** rotation UI, key health indicator
- **Phase: ongoing:** quarterly secret review

---

### Pitfall 7: User Email Aggregation = GDPR/CCPA Data Controller Risk

**Severity:** SERIOUS

**What goes wrong:**
IndiePilot collects iOS user emails ("enter your email once") and then hands those emails to *third-party developers* by adding them as testers in the developer's TestFlight. From a GDPR perspective:

- IndiePilot is the data controller for "users who created an IndiePilot account"
- Each developer is *also* a data controller for "testers of my app" — but they received the user's email *via* IndiePilot
- IndiePilot is arguably acting as a data broker / disclosing personal data to third parties

Without explicit user consent at the right moment, with the right disclosures, and a clear DPA between IndiePilot and developers, this is a GDPR violation. CCPA has similar exposure (data sale / sharing definitions are broad).

**Why it happens:**
Founders treat email like an internal account credential. They forget that "joining a TestFlight beta" = the email is now in another company's system, governed by *that* company's policies. The user consented to IndiePilot's policy, not the developer's.

**How to avoid:**
- **Explicit consent at the Get tap moment.** Modal: "By joining this beta, your email will be shared with [Developer Name] and added to their TestFlight tester list. They will be subject to [link to developer's privacy policy]. Continue?" Granular per-Get, not signup-level blanket consent.
- **Require developers to provide a privacy policy URL** before publishing. Reject listings without one.
- **DPA between IndiePilot and each developer,** auto-signed at .p8 upload, with terms restricting how the developer uses the email (only for TestFlight purposes, must honor user deletion requests).
- **Right-to-erasure flow** that propagates: when a user deletes their IndiePilot account, IndiePilot must (a) delete its records and (b) call ASC API to remove user from all dev groups they joined.
- **Developer dashboard cannot expose user emails in bulk.** Developers see aggregate funnel data; the actual emails live in their ASC dashboard (where Apple controls the export).
- **GDPR-required disclosures:** privacy policy lists the categories of recipients (developers), legal basis (consent), retention, user rights.
- **No selling the data, ever.** Even "anonymized analytics for advertisers" creates CCPA risk. Out of scope for v1 — keep it that way.

**Warning signs:**
- A user files a GDPR data subject request and you can't enumerate where their email went
- Developer requests "export my testers' emails" via API — IndiePilot must not provide a path that violates user consent
- Privacy-focused communities (HN, Mastodon) flag IndiePilot as a "data broker"

**Phase to address:**
- **Phase: signup / Get flow:** per-Get consent modal
- **Phase: developer onboarding:** DPA, privacy policy requirement
- **Phase: account deletion:** propagation across all developer groups

---

### Pitfall 8: Auto-Publish + No Review = Spam, Phishing, Malware Distribution

**Severity:** SERIOUS

**What goes wrong:**
PROJECT.md states auto-publish, no manual review. But TestFlight has a documented history of being abused for phishing (fake Meta Ads Manager apps), CryptoRom scams ($1.4M stolen via TestFlight beta distribution), and Chinese state-sponsored malware. Apple's Beta App Review for TestFlight is significantly less rigorous than App Store review — beta apps slip through.

If IndiePilot auto-publishes any app whose dev uploaded a valid .p8, IndiePilot becomes the discovery layer for these scams. Reputation damage is fast and Google/HN coverage is brutal.

Worse: legitimate-looking copycat apps (clone of a popular productivity app, identical icon, slightly different name) cause confusion and erode user trust, even if not malicious.

**Why it happens:**
Solo dev assumes "Apple already reviewed it" — but Apple reviewed it for *technical* compliance, not for *trustworthiness as content listed on a third-party discovery surface*. Different threat model.

**How to avoid:**
- **Auto-publish ≠ no checks.** Lightweight automated checks at submission:
  - The app's bundle ID exists in App Store Connect (already verified by .p8 ownership)
  - The app icon doesn't visually match a top-100 App Store app (image hash + perceptual diff against a reference set)
  - The app name + dev name don't impersonate a known brand (deny list of common impersonation targets)
  - The dev's Apple Developer account isn't days old (signal: how long has the team ID existed?)
- **Time-delay first-publish.** 2-4 hour soft hold on first listing per developer. Manual review at the start (Vincent personally clears the queue) is feasible at low volume and builds the deny-list. This is the "do it right" move.
- **Community reporting from day one,** with rapid (sub-24h) response. Show "report this listing" prominently. Build a workflow for automatic suspension after N reports pending review.
- **Trust tier per developer.** Day 1 dev: limited reach (e.g., not eligible for "featured" or homepage). Established dev (X verified Get→Accept conversions over Y weeks): full reach.
- **Pull listings on App Store rejection.** If the dev's app gets removed from TF/AppStore, IndiePilot should auto-detect (next ASC API sync) and unpublish.
- **Disclaimer per listing:** "TestFlight betas are pre-release software. Install at your own risk. [Report this app]"

**Warning signs:**
- A spike in newly-registered dev accounts
- Listings with brand names of popular apps
- User reports "I installed [app] and it asked for my crypto seed phrase"
- A scam listing escapes for >24h

**Phase to address:**
- **Phase: dev onboarding:** automated trust signals at .p8 upload
- **Phase: publishing:** soft-hold review queue, perceptual image diff, deny list
- **Phase: post-launch ops:** community reporting + Vincent-as-moderator until volume forces hire

---

### Pitfall 9: Vote Brigading and Feedback Weaponization

**Severity:** SERIOUS

**What goes wrong:**
Feature voting, written feedback, and per-app "Get" tap counts are all manipulable. A dev with motivation can:
- Buy upvotes on Fiverr (this is a real service for Product Hunt — IndiePilot is a smaller, easier target)
- Create burner Apple ID emails to inflate "Get" taps for their own app
- Coordinate vote brigades against a competitor (downvote their feature requests, write hostile reviews)
- Spam-vote feature requests they oppose into oblivion

Product Hunt has spent years building anti-brigading systems and still has chronic problems. IndiePilot will hit this faster because the audience is small enough that 50 brigade votes shifts rankings dramatically.

**Why it happens:**
Underestimating adversarial creativity. "Why would anyone manipulate a small indie marketplace?" — because it's small enough to manipulate cheaply and prestige (homepage placement) translates directly to TF tester acquisition.

**How to avoid:**
- **One vote per Apple ID per item, server-side dedup.** Email-only signups can game this; Sign in with Apple is harder (one Apple ID per device, hardware-bound).
- **Time decay on votes.** A vote's weight decays over weeks. Stops "stack votes once, dominate forever."
- **Velocity anomaly detection.** 50 votes in 2 minutes from a new app from a new dev = suspicious; soft-quarantine pending review. Product Hunt does this; replicate the pattern.
- **No public ranked leaderboard in the iOS app on first review submission** (also addresses Pitfall 2 / Guideline 5.6.3). Internal dashboard yes, public ranking — defer or obfuscate.
- **Account quality signals:** verified Apple ID > unverified email; older account > new account; account that has accepted past TF invites > zero accepted.
- **Rate-limit feedback submission** per user per app per day. Prevents spam reviews.
- **Don't let downvotes outweigh upvotes by raw count** in any sorting algorithm. Use Wilson score / Bayesian average.
- **Make brigading visible to the brigaded dev.** Show feedback authors anonymized but enough metadata (account age, # of total feedbacks across IndiePilot) so the dev can mentally weight them.

**Warning signs:**
- A new app jumps to homepage in < 24h with no marketing
- Feature requests with 100+ votes from accounts created the same day
- A dev complains their listing got 50 1-star feedbacks in 10 minutes

**Phase to address:**
- **Phase: voting/feedback v1:** velocity detection, account quality weights, no public leaderboard initially
- **Phase: post-launch:** Bayesian sort, decay, manual override tools

---

### Pitfall 10: TestFlight 10,000 Slot Cap and Group Management Logic

**Severity:** SERIOUS

**What goes wrong:**
Apple's per-app cap of 10,000 external testers is a *hard ceiling enforced by ASC API* — you cannot exceed it programmatically. IndiePilot must handle:

- A successful indie app fills its 10K slots
- Dev wants new users in, but old (inactive) testers occupy slots
- Inactive tester removal is unpleasant — they got the invite and may have installed but don't open the app; were they "rejected by your platform"?
- Multiple groups per app: which group does IndiePilot add to? "External Testers"? A custom IndiePilot-managed group? Mixing IndiePilot adds with the dev's own manual adds is messy.
- Per Apple's rules, 10K is per-app, not per-group — multiple groups don't help raise the cap, only segment builds.

PROJECT.md says "developer chooses per-app behavior when slots are full (waitlist or hide)" — but the implementation of slot tracking, waitlist promotion, and inactive culling is non-trivial.

**Why it happens:**
Underestimated as an integration detail. Real challenge: ASC API's tester model is designed for the dev's manual operations, not for a programmatic third party racing the cap.

**How to avoid:**
- **Create a dedicated IndiePilot beta group per connected app** (e.g., "IndiePilot Discovery"). Don't mix with the dev's existing tester pools. Lets the dev see at a glance which testers came from where, lets IndiePilot manage churn without touching the dev's other testers.
- **Slot tracker in IndiePilot DB,** synced from ASC API hourly. Don't rely on real-time count from ASC (latency, rate limits).
- **Waitlist as a DB queue,** auto-promote when slots open. Run a periodic worker that checks: ASC group count < cap, waitlist non-empty → promote oldest.
- **Inactive culling is the dev's choice, with IndiePilot offering opinionated defaults.** "Remove testers who haven't opened the app in 90 days?" Surface this in dashboard with explicit consent — never auto-cull without dev opt-in (it's *their* tester list, they may have reasons).
- **Show the dev their slot utilization** with clear graphics. A fast-growing app needs to know "you're at 8,500/10,000 — waitlist enabled?" before it's too late.
- **Communicate to waitlisted users:** "You're in line. Avg wait time at this app: 3 days. We'll email you when a slot opens."
- **Apple's 10,000 limit doesn't include declined/expired invites.** Revoking invites that expire (after 30 days unaccepted) reclaims slots. Build this into culling logic.

**Warning signs:**
- A dev's group is at 9,500+ and waitlist behavior hasn't been tested at scale
- Get taps return errors that say "slot full" without a graceful waitlist path
- Tester counts in IndiePilot DB drift from ASC by >50

**Phase to address:**
- **Phase: ASC integration:** dedicated beta group per app, slot sync worker
- **Phase: waitlist UX:** queue + promotion job
- **Phase: dashboard:** utilization view, opt-in inactive culling

---

### Pitfall 11: SDK Scope Creep into PostHog Territory

**Severity:** MINOR (in v1) / SERIOUS (if scope creeps in v2)

**What goes wrong:**
PROJECT.md is correct that SDK should be feedback + voting only. But once developers ask: "can the SDK also track session length? screen views? funnel events? crashes?" — each is reasonable in isolation. Adding all of them turns IndiePilot's SDK into a half-baked PostHog clone competing with serious analytics tools, draining solo-dev time from the differentiator (TestFlight discovery + onboarding).

**Why it happens:**
Customer requests feel like signal. Each feature is small. Death by 1,000 cuts to focus.

**How to avoid:**
- **Codify SDK scope in a written spec:** feedback (free-text), feature voting, that's it. No analytics events, no crash reporting, no session tracking, no A/B framework.
- **Refer SDK analytics requests to existing tools.** Provide a docs page: "for crash reporting, use Sentry; for analytics, use PostHog; for feature flags, use ConfigCat. IndiePilot is for distribution and feedback, not telemetry."
- **The SDK's success metric is opt-in rate, not feature count.** Track "% of connected devs who installed the SDK." If it's >40% with a tight scope, the scope is right.
- **Defer the "PostHog-lite" temptation to v2 explicitly** (PROJECT.md already does — keep this commitment).
- **Hard rule: any SDK feature must be unique to TestFlight context.** "Pre-release feedback widget targeting the public TF audience" is unique. "Generic event tracking" is not — bail.

**Warning signs:**
- Dev requests SDK feature — someone else's product does it
- The SDK's API surface grows beyond ~5 public methods
- You start thinking "we should match Mixpanel/PostHog feature X"

**Phase to address:**
- **Phase: SDK v1 spec:** explicit scope document
- **Phase: ongoing:** review SDK roadmap quarterly, prune

---

### Pitfall 12: Premature Monetization vs. Delayed Monetization

**Severity:** MINOR (recoverable)

**What goes wrong:**
Two failure modes:
- **Premature:** Add paywall in week 1 → scares away the developer supply IndiePilot is desperate for during cold start. Dies.
- **Delayed:** Free forever → users + devs assume free permanently → introducing paid tier 18 months later causes backlash + churn.

PROJECT.md defers the question to a later milestone, which is correct, but the trap is real.

**Why it happens:**
Solo dev needs revenue (motivation, runway). Indie devs hate platform fees. Solo dev rationalizes premature pricing as "validation."

**How to avoid:**
- **Be explicit from day one that IndiePilot will have a paid tier.** Footer/about page: "Free during beta. Pricing for premium features lands [target quarter]." Sets expectations.
- **Hold pricing until liquidity exists.** Defined threshold: "100+ active devs (uploaded .p8 + 10+ Get taps in last 30d) and 10,000+ user accounts." Below this, no paid tier.
- **Charge devs, not users.** Users on the supply-constrained side of any marketplace must remain frictionless. Devs are the ones getting value (testers + funnel data + feedback) and have budget.
- **Feature-gate, don't usage-gate.** "Free: up to 100 Get taps/month" punishes growth. "Free: basic dashboard, paid: source attribution, advanced funnel, SDK premium widgets" rewards growth without capping it.
- **Grandfather early devs.** First 50-100 devs get Pro tier free for life. Cheap user-acquisition + word-of-mouth + skin in the game.

**Warning signs:**
- Pricing decisions made under runway pressure rather than data
- Cold-start metrics (active devs, Get→accept rate) regressing during paywall design
- Dev signups visibly drop the moment pricing is announced

**Phase to address:**
- **Phase: post-cold-start (likely milestone 3+):** pricing strategy, grandfather list, upgrade UX
- **Phase: founding period:** explicit "this will be paid eventually" in marketing

---

### Pitfall 13: Over-Engineering Before Users Exist

**Severity:** MINOR (but invisible — eats the calendar)

**What goes wrong:**
Solo dev with "do it right, don't over-engineer" mandate paradoxically over-engineers. Symptoms:
- Multi-region deploy on Vercel + Neon read replicas before any user exists
- Microservice split between web dashboard, ASC worker, SDK ingest, feedback ingest before the monolith has been stressed
- Custom auth before Better-Auth/Clerk has been evaluated
- Premature observability stack (full OpenTelemetry, Grafana, Loki) before there's anything to observe
- Hand-rolled queueing on Postgres LISTEN/NOTIFY when Inngest/Trigger.dev would ship in a day

**Why it happens:**
"Do it right" is interpreted as "build the platform you'd build at scale" rather than "build something defensible and refactorable." Solo devs especially over-build because they have no PM to push back. Hacker News culture rewards "I built this from scratch" over "I picked the right vendor."

**How to avoid:**
- **Default to managed services.** Neon + Vercel + Better-Auth/Clerk + Inngest/Trigger + Resend/Postmark + Sentry. Build what's unique (ASC integration, marketplace logic, SDK), buy everything else.
- **Single Vercel deployment, single Neon DB until usage demands otherwise.** Multi-region can wait until 10K+ DAU.
- **Postgres-as-everything until it isn't.** Queue table, audit log, vote tally — Postgres handles all of this past 100K users.
- **Encryption: KMS-backed envelope (Pitfall 6) is necessary; HSM is not** (in v1).
- **Observability: Sentry + Vercel logs + 1 dashboard** is enough at v1. Resist OTel until you actually need cross-service tracing.
- **"What problem does this solve *today*?"** test before any infra decision. If the answer is "scaling at 100K DAU," defer.
- **Refactor budget over premature abstraction.** Build it monolithic; budget 1-2 weeks per quarter for refactor when bottlenecks emerge.

**Warning signs:**
- Week 4 of building, no UI working end-to-end yet, but you have a beautiful CI/CD pipeline
- You've spent more time configuring Terraform/Pulumi than implementing the .p8 → tester flow
- You're "evaluating" 3+ options for any given component for >2 days

**Phase to address:**
- **Phase: every phase:** "boring tech, managed services" review at phase entry
- **Phase: planning:** explicit decisions to defer (multi-region, microservices, custom auth)

---

### Pitfall 14: Deep Link from IndiePilot iOS App to TestFlight Is Fragile

**Severity:** MINOR / SERIOUS in edge cases

**What goes wrong:**
The user taps Get → IndiePilot adds them via API → Apple emails them → they open the email *not the IndiePilot app* and tap the TestFlight link. The user flow leaves IndiePilot entirely. There is no clean iOS deep link from inside IndiePilot's app directly into TestFlight's "Apps" view that pre-populates the user's invite. TestFlight has `itms-beta://` and public-link `https://testflight.apple.com/join/XXXXXXXX` URLs, but:

- `itms-beta://` is unreliable across iOS versions
- Public links require the dev to enable them — many won't, by default IndiePilot is doing per-email invites *not* public-link routing
- If TestFlight isn't installed, the universal link bounces to App Store TestFlight install page — a multi-step flow that loses 30-50% of users
- Apple Mail vs Gmail vs ProtonMail handle the link differently
- The user might be on the wrong Apple ID on their device (per Pitfall 4)

**Why it happens:**
Believing the magic moment is "tap Get → app installs." It's not. It's "tap Get → 5-step out-of-app flow → app installs." The product must own this UX even when control leaves IndiePilot.

**How to avoid:**
- **In the IndiePilot iOS app post-Get, show a step-by-step:** (1) Open Mail/Gmail (deep-link to user's mail app via `mailto:` opener trick), (2) Find email from "noreply@email.apple.com," (3) Tap "Start Testing," (4) TestFlight opens, (5) Tap Install.
- **Detect TestFlight installed.** Use `canOpenURL(itms-beta://)` to check. If not installed, show a "Install TestFlight first" CTA before initiating Get.
- **Cache the redemption URL** if available from ASC API and offer "Open in TestFlight directly" as a fallback path within 60s of the Get tap.
- **Push notification (v2 — out of scope for v1)** when invite send succeeds: "Your TestFlight invite for [App] is ready! Tap to open." Re-engages users who closed IndiePilot.
- **Test on real devices across iOS versions.** Specifically: iOS 17, 18, 19; on each, with TestFlight installed and not installed; on Apple Mail and Gmail iOS app.
- **Telemetry on each step.** Where does the funnel break? Get → email arrived → email tapped (if measurable) → TestFlight opened → install completed. Even partial visibility helps.

**Warning signs:**
- iOS app analytics show Get tap rate high but ASC API shows acceptance rate < 30%
- Support tickets: "I tapped Get on my iPhone and nothing happened"
- A specific iOS version regression (e.g., iOS 19 changes universal link behavior)

**Phase to address:**
- **Phase: iOS app v1:** post-Get instructional UX, TestFlight-installed check
- **Phase: iOS app v1.1:** redemption URL caching, deeper telemetry

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing `.p8` keys with simple AES + key in env var | Ship in 1 day vs 1 week | Single env breach = total compromise; cannot rotate without re-encrypting all rows | NEVER (envelope/KMS from day one — Pitfall 6) |
| One ASC API call per Get tap, no queue | Simple synchronous code | 429 storms, race conditions on slot count, terrible UX during traffic spikes | Only for prototype with single test dev; production must queue |
| Auto-publish with zero checks | Ships as PROJECT.md says | Spam/phishing/malware lists; reputation damage | Until first abuse incident; then immediate hardening |
| No DPA between IndiePilot and devs | Skip lawyer cost | GDPR violation when a user files DSAR | Pre-public-launch only; required before paid tier |
| Storing every tester's email in IndiePilot DB | Easy lookups for funnel UI | Aggregating PII for thousands of devs increases breach impact | Acceptable if encrypted + retention policy + DSAR-ready |
| Ignoring `x-rate-limit` headers, retry on 429 | One less code path | Per-key throttling cascading into per-developer failure modes | NEVER |
| Building own auth instead of Better-Auth/Clerk | Full control | Account recovery, social login, MFA, SAML — all become solo-dev problems | NEVER for v1 |
| One Vercel function per ASC API endpoint | Easy mental model | Cold starts, JWT regenerated per call (waste), no rate-limit coordination | Only for non-critical endpoints; tester ops must use a worker |
| Skipping perceptual hash on app icons | Faster auto-publish | Brand impersonation listings | Only with manual review fallback (and Vincent reviewing first 100 listings) |
| Email-only auth for users (no Sign in with Apple) | One less Apple integration | Apple ID mismatches break TF invite acceptance — kills magic moment | NEVER — SiwA required for the magic moment to work reliably |
| No audit log on .p8-key-related operations | Less infra | When a dev asks "what did you do with my key on Tuesday?" — can't answer | NEVER |
| Public leaderboard ranking in iOS app on first submission | Differentiator UX | App Review rejection on Guideline 5.6.3 | Only after first approval, then re-add |
| Mixed beta groups (IndiePilot + dev's other testers) | One less group to create | Dev can't distinguish IndiePilot users from their own; cleanup is dangerous | NEVER — dedicated IndiePilot group per app |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| App Store Connect API | JWT generated per request, ignoring 20-minute lifetime | Cache JWT for ~18 minutes per developer key; regenerate before expiry |
| ASC API key storage | Storing alongside DB password in `.env` | KMS-backed envelope encryption; key never decrypted in web tier |
| ASC API key role | Recommending "Admin" to devs for "permissions to be safe" | Document minimum: a custom role with TestFlight permissions only |
| ASC API rate limits | Treating limit as global | Limit is per-key (per JWT subject); queue per-developer-key |
| ASC API tester adds | Adding individually in a loop | Batch via `betaGroups/{id}/relationships/betaTesters` POST array |
| ASC API tester check | Looking up tester by email each time | Cache "is this email a tester for this group" result for 1 hour |
| TestFlight invite | Assuming `notify=true` is default | Verify on the relationship endpoint; explicit `attributes.firstName/lastName` helps deliverability metadata |
| TestFlight email delivery | Treating Apple as a reliable channel | Resend button, fallback messaging, public-link fallback for opt-in |
| Sign in with Apple | Treating as optional alternative | Treat as primary path — verified email + correct Apple ID = 90% of TF problems disappear |
| Resend / Postmark transactional | Same domain as marketing | Separate `tx.indiepilot.app` subdomain with strict DKIM/SPF/DMARC |
| Vercel + Neon | Connection pool exhaustion in serverless | PgBouncer (Neon offers it), or Drizzle/Prisma with `pgbouncer=true` |
| Better-Auth/Clerk | Mixing user (iOS) and dev (web) auth in one tenant | Separate auth namespaces — different sign-in routes, different session tables |
| Apple Push Notifications (v2) | Confusing dev APNs key with ASC API key | Two different .p8 files; document clearly |
| iOS SDK | Bundling networking that overrides developer's URLSession config | Standalone URLSession or NSURLSession; never swizzle |
| iOS SDK | Crash on missing API key in Release builds | Fail silently in Release, log loudly in Debug |
| Image upload (screenshots) | Not stripping EXIF | Geolocation leaks; always strip on upload |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous ASC API call on Get tap | Slow Get tap, timeouts on traffic spike | Background job + optimistic UI ("Sending invite…") | First viral moment (>20 Get/min on one app) |
| Pagination loops fetching all testers | High API budget consumption per dev | Incremental sync (only changes since last cursor) | When a dev has >500 testers |
| Postgres full-text search on listing search | OK at 100 listings, terrible at 10K | Pre-built tsvector column with GIN index, or pgvector for semantic | ~2K listings or first complex search query (multi-word) |
| Vote count denormalization missing | Real-time COUNT(*) on votes table | Materialized view or trigger-maintained counter | ~100K total votes |
| Full re-sync of all testers per developer hourly | Burns ASC budget | Webhook-style reconciliation if Apple ever ships them; otherwise incremental + on-demand | When dev count > 100 |
| Loading all dev dashboard data in one query | Dashboard slow at scale | Per-component data loading, streaming | Dev with >1K Get taps |
| iOS SDK chatty network | Battery drain reports from end users | Debounced/batched events, max 1 req/min | First 1-star review citing battery |
| Image storage in Postgres or Vercel | Slow page loads with screenshots | S3/R2/Vercel Blob, CDN-fronted, serve WebP | Even at 50 listings if screenshots are large |
| Per-Get email sending for transactional follow-up | Resend rate limits hit | Dedicated tx provider with high quota, queue with backoff | First 10K Get tap day |
| No caching on app detail page | Same query 1000x for popular app | Edge cache (Vercel CDN) + 5-min TTL + bust on dev edit | First HN/PH front-page hit |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing `.p8` content with same encryption key as session secrets | Single env breach = total compromise | KMS-backed envelope per record; keys rotate independently |
| Logging request bodies that may include `.p8` or JWT tokens | Logs become a credential vault | Redaction middleware; allow-list of safe fields; pre-commit hook scanning logs |
| Accepting `.p8` upload via standard form POST | TLS termination logs may capture body | Direct-to-storage upload, encrypted in transit, never persisted in proxy logs |
| Using developer's full ASC team key instead of individual key | Greater blast radius if compromised | Document and require individual user keys (or limited team keys) |
| User session tokens with no per-device binding | Account takeover via stolen cookie | Sign in with Apple device-bound + short-lived sessions for sensitive ops (.p8 upload requires re-auth) |
| Cross-tenant data leakage in dashboard | Dev A sees Dev B's funnel | Row-level security at DB layer; explicit `WHERE owner_id = $1` audit |
| No rate limit on Get tap | Bot enumerates all apps + extracts emails of users | Per-IP and per-account rate limits; CAPTCHA after threshold |
| Tester email exposure in dev API responses | One leaky endpoint = mass user PII leak | Default-deny: dashboard never returns raw emails; aggregate stats only |
| Public TF redemption URLs in IndiePilot DB exposed via API | Anyone gets access to bypass IndiePilot's funnel | Treat redemption URLs as secrets; per-user URL never exposed beyond that user's session |
| No 2FA option for dev accounts (high-value, holds .p8) | Dev account compromise → IndiePilot account takeover → key access | TOTP at minimum; SMS not acceptable for high-value accounts |
| SSRF in screenshot/image-from-URL flows | Internal service enumeration | Strict URL allow-list, no localhost/private-IP fetch, separate egress proxy |
| Dependency on a single dev's NPM package for ASC integration | Supply chain attack into the heart of IndiePilot | Pin versions, audit weekly, prefer Apple's official SDKs (Swift, etc.); review any 3rd-party JS ASC client carefully |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| "Get" button labeled like App Store | Apple review rejection (Pitfall 2) + user confusion ("did I just install it?") | "Join Beta" or "Get TestFlight Invite" |
| Silent success after Get tap | User doesn't know what to do next | Explicit "Check your email — invite arrives in 5 min" UI with countdown |
| No visible distinction between TF beta and App Store app | User assumes app is final, complains about beta-quality bugs | Persistent "BETA" badge, "this is pre-release software" disclosure on detail page |
| Forcing email signup before browsing | High top-of-funnel drop | Anonymous browsing (per PROJECT.md); auth only at Get — keep this |
| No feedback that the dev is real | Users skeptical of unknown developer | Show dev's verified Apple Developer team name (from ASC), GitHub link if provided |
| No way to leave a beta from inside IndiePilot | User stuck on TF group, can't easily unsubscribe | "Leave this beta" → IndiePilot calls API to remove + tells user to also delete TF profile |
| No status indicator for "your invite is on its way" | User taps Get repeatedly, gets re-invited 10x | Disabled state + "Invite sent X minutes ago" + resend button after 5 min |
| Treating waitlist as a black box | User on waitlist for 2 weeks, no update, churns | Email when promoted; show estimated wait time; show queue position |
| Same iOS UX for browsing as for committing | Anonymous browsing path feels weighty | Differentiate: browsing is feed-style, Get tap is the commitment moment |
| Feature voting has no per-vote context | Dev has 50 votes for "dark mode" but no idea what users mean | Optional comment per vote; cluster similar votes |
| Feedback inbox is one giant list | Dev can't prioritize | Tag feedback (bug / feature / praise), allow status updates ("Planned," "Shipped") |
| Push devs to upload .p8 before they understand value | High dropoff at upload step | Walk dev through "here's what we'll do with this key" + show example funnel screenshot before upload |
| Hide developer privacy policy / terms | GDPR exposure (Pitfall 7) + trust erosion | Link prominently before each Get tap |
| No way for users to report an app | Spam/phishing scales unchecked | Persistent report button on every detail page; rapid response queue |

---

## "Looks Done But Isn't" Checklist

- [ ] **ASC API integration:** Often missing per-key rate limit budgeting — verify load test on a single dev's key shows graceful degradation, not 429 cascades
- [ ] **`.p8` key storage:** Often missing rotation UI — verify a dev can replace a key in <60s and the old one is purged immediately
- [ ] **Get tap flow:** Often missing post-tap UX — verify the user sees clear "what happens next" guidance, not just a state change
- [ ] **TestFlight invite delivery:** Often missing fallback path — verify resend button works and a public-link alternative exists for opt-in devs
- [ ] **Slot full waitlist:** Often missing auto-promotion job — verify when a slot opens, the next waitlisted user is added within 30 minutes
- [ ] **GDPR account deletion:** Often missing dev-side propagation — verify deleting an IndiePilot account removes the user from every connected dev's TF group
- [ ] **Auto-publish:** Often missing trust signals — verify new dev's first listing gets soft-held for review during low-volume period
- [ ] **iOS app App Review submission:** Often missing pre-submission audit — verify the app does not visually mimic App Store's UI elements
- [ ] **Vote/feedback system:** Often missing brigading defenses — verify velocity-anomaly job runs and quarantines suspicious patterns
- [ ] **Sign in with Apple:** Often missing correctness check — verify the email returned matches the user's actual Apple ID (no relay-only edge cases breaking TF invite)
- [ ] **Dev dashboard funnel:** Often missing the "TF invite accepted" stage — verify this is fetched from ASC and not assumed from invite-sent count
- [ ] **Audit log:** Often missing for .p8 operations — verify every API call decoded with which dev's key is logged with timestamp, endpoint, success/failure
- [ ] **Webhook / sync reconciliation:** Often missing — verify the IndiePilot DB tester count matches ASC tester count within drift tolerance
- [ ] **Privacy policy + DPA:** Often missing — verify both exist, both linked at signup, both versioned with explicit user re-consent on material change
- [ ] **iOS deep link to TestFlight:** Often missing fallback when TF not installed — verify graceful "Install TestFlight first" path
- [ ] **Email delivery (IndiePilot's own tx mail):** Often missing DMARC/DKIM strict mode — verify with mail-tester.com, score >9/10
- [ ] **Rate limit observability:** Often missing — verify dashboard shows per-developer ASC budget consumption
- [ ] **Spam reporting workflow:** Often missing SLA — verify there's a defined "report received → action taken" timeline (e.g., 24h)
- [ ] **Cold start metrics:** Often missing — verify dashboard tracks active devs, active users, Get tap success rate, and TF acceptance rate weekly

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Apple TOS interpretation issue (Pitfall 1) | HIGH | Pause new dev signups; legal review; pivot to public-link routing if needed; communicate transparently with existing devs |
| iOS app rejection (Pitfall 2) | MEDIUM | Iterate via Resolution Center; remove flagged UX; rebrand "Get" if needed; resubmit; in worst case, ship as TestFlight beta itself + dev-only web app |
| ASC rate limit cascade (Pitfall 3) | LOW | Deploy queue + per-key limiter; backfill failed Get taps from queue; communicate per-app delays to affected users |
| TestFlight email delivery failures (Pitfall 4) | LOW | Resend logic, SiwA push, public-link fallback for affected devs/domains |
| Cold start failure (Pitfall 5) | MEDIUM | Pivot to beachhead niche; concierge dev onboarding; consider a "tool first" angle (e.g., free TF analytics for any dev, marketplace optional) |
| .p8 key compromise (Pitfall 6) | HIGH | Immediate revoke at Apple side, force-rotate all keys (require re-upload), notify affected users, postmortem, possibly cyber insurance claim |
| GDPR breach (Pitfall 7) | HIGH | Notify supervisory authority within 72h, notify users, retain counsel, stop affected processing |
| Spam/malware listing (Pitfall 8) | MEDIUM | Immediate unpublish, ban dev, notify any users who joined the bad listing, postmortem, tighten checks |
| Vote brigading (Pitfall 9) | LOW | Roll back affected votes, ban accounts, deploy stronger anomaly detection, recalculate rankings |
| 10K slot saturation without waitlist (Pitfall 10) | MEDIUM | Emergency culling of stale invites (with dev consent), promote waitlist, rate-limit Get taps on saturated apps |
| SDK scope explosion (Pitfall 11) | LOW | Cut features in next minor; communicate scope clarification |
| Pricing backlash (Pitfall 12) | MEDIUM | Grandfather existing users, restructure tiers, communicate apology + reasoning |
| Over-engineered system (Pitfall 13) | MEDIUM | Decommission unused infra, consolidate to managed services, document the lesson |
| TestFlight deep link breakage on iOS update (Pitfall 14) | LOW | Detect TF version, fall back to email-flow instructional UX, urgent iOS app patch |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Apple TOS — TestFlight delegation | Foundation / Onboarding (Phase 0-1) | Onboarding includes ToS acknowledgment; legal opinion before paid tier |
| 2. App Store Review rejection of iOS app | iOS app design + first submission phase | Pre-submission self-audit checklist; brand-not-clone enforced in design system |
| 3. ASC API rate limits | ASC integration phase | Load test simulating 100 Get taps/min for one dev shows zero 429s |
| 4. TestFlight email delivery | TestFlight integration + iOS app post-Get UX | Resend works, fallback messaging visible, SiwA primary |
| 5. Cold start | Pre-launch + launch phase | 50+ devs onboarded before public iOS app launch; weekly liquidity dashboard |
| 6. .p8 key compromise | Security foundation phase (early) | KMS envelope + audit log + rotation UI all functional before first dev signup |
| 7. GDPR / data controller | Pre-launch legal + dev onboarding | Per-Get consent modal, DPA, privacy policy URL required from devs |
| 8. Auto-publish abuse | Publishing phase + ongoing ops | Trust signals + soft hold + report flow live; manual queue review for first 100 listings |
| 9. Vote brigading | Voting/feedback v1 phase | Velocity anomaly job + account-quality weighting before public ranked UX exists |
| 10. 10K slot management | ASC integration + dashboard phase | Dedicated IndiePilot group per app; slot sync; waitlist auto-promote tested |
| 11. SDK scope creep | SDK v1 phase + ongoing | Written SDK scope spec; quarterly review |
| 12. Monetization timing | Post-cold-start (later milestone) | Pricing held until liquidity threshold met; grandfather list maintained |
| 13. Over-engineering | Every phase entry | "Boring tech, managed services" review at phase kickoff |
| 14. TestFlight deep link | iOS app v1 phase | Real-device test matrix (iOS 17/18/19, Mail/Gmail, TF installed/not) |

---

## Sources

- [Apple Developer Program License Agreement (Service Provider clause)](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/) — HIGH confidence: official source
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — HIGH confidence: official, all rejection categories
- [App Store Connect API — Identifying Rate Limits](https://developer.apple.com/documentation/appstoreconnectapi/identifying-rate-limits) — HIGH confidence: official, exact `x-rate-limit` header format
- [App Store Connect API JSON secret rate limit forum thread](https://developer.apple.com/forums/thread/731014) — MEDIUM confidence: developer-reported per-minute (~300-350) limits, undocumented
- [Generating Tokens for API Requests (JWT 20-min lifetime)](https://developer.apple.com/documentation/appstoreconnectapi/generating-tokens-for-api-requests) — HIGH confidence: official
- [Send an Invitation to a Beta Tester](https://developer.apple.com/documentation/appstoreconnectapi/post-v1-betatesterinvitations) — HIGH confidence: official
- [TestFlight invite emails not being received forum thread](https://developer.apple.com/forums/thread/76362) — HIGH confidence: extensive developer reports
- [Beware bogus Betas — TestFlight crypto scams (Sophos)](https://news.sophos.com/en-us/2022/03/16/beware-bogus-betas-cryptocoin-scammers-abuse-apples-testflight-system/) — HIGH confidence: documented abuse history
- [Fake Meta Ads Manager phishing via TestFlight (Sublime Security)](https://sublime.security/blog/fake-meta-ads-manager-in-app-store-and-testflight-used-to-phish-meta-ad-accounts/) — HIGH confidence: documented attack pattern
- [Scammers using TestFlight to distribute malicious iOS apps (9to5Mac)](https://9to5mac.com/2022/03/16/scammers-have-been-using-apples-testflight-to-distribute-malicious-ios-apps/) — HIGH confidence: corroborates Sophos
- [Apple's new App Review Guidelines crack down on copycat apps (9to5Mac, 2025-11)](https://9to5mac.com/2025/11/13/apple-tightens-app-review-guidelines-to-crack-down-on-copycat-apps/) — HIGH confidence: recent (within last 6 months)
- [Apple's Guideline 4.7 mini-apps update (Dev.to)](https://dev.to/arshtechpro/apples-guideline-47-update-what-every-developer-hosting-html5-mini-apps-must-know-90) — MEDIUM confidence: secondary source explaining 4.7.4 catalog rules
- [Mini Apps Partner Program — Apple Developer](https://developer.apple.com/programs/mini-apps-partner/) — HIGH confidence: official
- [App Store Review Guideline updates (5.6.3 Discovery Fraud)](https://developer.apple.com/news/?id=dovxb62h) — HIGH confidence: official
- [How Product Hunt prevents vote manipulation](https://help.producthunt.com/en/articles/11869098-how-does-product-hunt-ensure-fair-voting-and-prevent-spam-or-vote-manipulation) — HIGH confidence: operator perspective
- [Tell HN: Product Hunt is full of shill accounts (HN discussion)](https://news.ycombinator.com/item?id=30509760) — MEDIUM confidence: anecdotal but consistent across many posters
- [Andrew Chen on marketplaces (Stripe Atlas)](https://stripe.com/guides/atlas/andrew-chen-marketplaces) — HIGH confidence: canonical reference for cold-start
- [Beat the cold start problem in a marketplace (Reforge)](https://www.reforge.com/guides/beat-the-cold-start-problem-in-a-marketplace) — HIGH confidence: industry-standard framework
- [Decoding the Cold Start Problem (GoPractice)](https://gopractice.io/product/solving-the-cold-start-problem/) — MEDIUM confidence: secondary but well-aligned
- [GDPR controller vs processor (Usercentrics)](https://usercentrics.com/knowledge-hub/gdpr-controller-vs-processor/) — HIGH confidence: regulatory framework
- [GDPR for SaaS companies (EDPO)](https://edpo.com/gdpr-saas-companies/) — HIGH confidence: legal/regulatory firm
- [TestFlight external testers limit (Apple developer help)](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/) — HIGH confidence: official, 10K cap
- [Apple expanded TestFlight tester limit to 10000 users (9to5Mac, 2017)](https://9to5mac.com/2017/07/31/apple-expansterlimit/) — HIGH confidence: limit history
- [Sherlocking — Apple's pattern of copying indie features (Astropad)](https://astropad.com/apple-antitrust/) — MEDIUM confidence: indie-dev industry analysis
- [App Store Connect API Key — Apple's ToC's doesn't allow Third Party (RevenueCat community)](https://community.revenuecat.com/general-questions-7/app-store-connect-api-key-apple-s-toc-s-doesn-t-allow-third-party-4585) — MEDIUM confidence: community-sourced ambiguity flag, RevenueCat staff comment
- [App Store Connect API Key Configuration (RevenueCat docs)](https://www.revenuecat.com/docs/service-credentials/itunesconnect-app-specific-shared-secret/app-store-connect-api-key-configuration) — HIGH confidence: a real-world SaaS using the same model IndiePilot uses

---

*Pitfalls research for: IndiePilot — App Store-like discovery for indie TestFlight apps*
*Researched: 2026-04-28*
