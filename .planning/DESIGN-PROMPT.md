# IndiePilot — AI Designer Brief

Drop this verbatim into v0, Lovable, Bolt, Galileo, Figma Make, or any AI design tool.

---

**Project:** IndiePilot — a discovery platform for indie TestFlight apps.

**One-line pitch:** Users discover indie iOS betas, tap one button ("Join Beta"), and get a real TestFlight invite in their inbox a few minutes later. Indie devs get a marketing surface, an install funnel, and structured feedback — all without writing a marketing site.

**Two surfaces to design:**

1. **iOS user app (SwiftUI native, iOS 17+):** discovery + install. Distinctly indie, modern, playful — App Store DNA but explicitly NOT an App Store clone (this is an Apple App Review constraint, not just an aesthetic preference).
2. **Web dev dashboard (Next.js, desktop-first responsive):** publishing, ASC key management, install funnel, feedback inbox, feature-vote leaderboard.

---

## Brand soul

- **Vibe:** Modern + playful. Think Product Hunt's warmth × Arc Browser's confidence × a hand-stamped indie press. Not corporate. Not sterile. Distinctly indie.
- **Tone:** Quietly opinionated. Celebratory of small builders. Treats the developer as the hero — show their face, their name, their story, not just an icon.
- **Personality words:** curious, hand-crafted, generous, honest, confident, a little weird.
- **What it is NOT:** flat corporate SaaS, dark-mode-first hacker aesthetic, AI-generated-looking gradients, generic "fintech blue," App Store mimicry (no green Get-style buttons, no chart-icon "Today" tab, no five-star widgets).

## Logo & wordmark

- Name: **IndiePilot** (one word, capital I and P).
- Concept direction: a paper airplane meets a pilot's wings — small, hand-launched, going somewhere. Avoid rocket clichés. Avoid generic "compass."
- Wordmark: custom or modified geometric sans (e.g., based on Söhne, Inter Display, or General Sans), with one tiny eccentric detail (a dotted "i," a stylized terminal).
- App icon must read at 60×60 px on iOS Springboard. Must NOT visually echo any top-100 App Store icon.

## Color system

- **Primary:** a warm, slightly retro indigo or twilight blue — confident, not corporate. (Not Apple blue. Not Stripe purple.)
- **Accent:** a fresh sunrise orange or coral for the "Join Beta" button and key CTAs — must pop against the primary without screaming. Critically: must NOT be App-Store green.
- **Neutrals:** off-white paper, soft warm gray, deep ink. No pure #000 or #FFF.
- **Status:** muted green (testing/installed), amber (waitlist), dusty red (errors). All status colors WCAG AA against neutrals.
- **Dark mode:** required for iOS. Should feel like a different mood, not just an inverted palette.

## Typography

- **Display / headlines:** confident geometric sans with personality (General Sans, Söhne Breit, or Inter Display Bold).
- **Body:** clean readable sans (Inter, SF Pro on iOS).
- **Mono:** dev-side fields (API keys, build numbers) — JetBrains Mono or IBM Plex Mono.
- Generous line-height. Not crammed.

## iOS app — required screens

1. **Today / Feed:** large hero card (featured indie app of the day with developer story), then horizontally scrolling rails grouped by category ("Productivity," "Just shipped," "Trending," "Hand-picked"). Pull-to-refresh. Anonymous browsing — no auth wall here.
2. **App detail:** big icon, name, developer name + tiny avatar, **verified-developer badge** (subtle checkmark, shown when dev has a valid ASC key), version + build number, screenshots carousel, long description, "What's New," feature-vote section (upvote/downvote feature requests), feedback button, **report-app affordance** (small, in overflow menu), and the **Join Beta** button.
3. **Privacy disclosure modal:** appears between tapping Join Beta and the network call. Tasteful sheet that names the developer ("Your email goes to **[Developer Name]** so they can send you a TestFlight invite") with explicit Continue / Cancel buttons. Required for GDPR + Apple Review.
4. **Join Beta button states** — visually distinct, instantly readable:
   - `Join Beta` (idle, accent color)
   - `Sign in to continue` (auth gate when tapped unauthenticated)
   - `Sending…` (loading, after disclosure consent)
   - `Check your email` (success — with helper copy: "Apple will email you within ~5 minutes; check spam")
   - `Testing` (post-install, non-actionable, tasteful checkmark, deep-links to TestFlight on tap)
   - `Full` (slots exhausted, app uses `hide` behavior — disabled state)
   - `Waitlist` → `You're #N on the waitlist` (slots exhausted, app uses `waitlist` behavior)
   - Plus a subtle "Resend invite" affordance reachable from the user's Library if the email never arrived.
5. **Search & categories.**
6. **Auth screen:** Sign in with Apple (primary, recommended), email/password (secondary), "Continue browsing" anonymous escape hatch. Auth is only ever prompted when a user taps Join Beta — never at app launch.
7. **Profile / Library:** my installed beta apps (with current state), feedback I've left, features I voted on, my waitlist positions, resend-invite buttons.
8. **Feedback sheet:** opens from app detail; star-free, written feedback only, optional screenshot attachment. NO five-star ratings anywhere.

> **Important constraint for the iOS app:** No public ranked feature leaderboard in the v1 App Review submission — design the screens but assume the rank is feature-flagged off until after first Apple approval. The voting UI itself is fine; the public ordered list is what's gated.

## Web dashboard — required screens

1. **Sign up / sign in** (email + password — no OAuth in v1).
2. **Onboarding "Connect App Store Connect":** three-step illustrated flow — paste `.p8` file + key ID + issuer ID. Security copy is prominent and reassuring: "**Your key is encrypted at rest with AWS KMS envelope encryption, bound to your developer ID. Plaintext never touches disk and never appears in logs.**" Click-through Data Processing Agreement before submit.
3. **Apps list:** developer's connected apps; each shows current state (draft / published / unpublished), version, recent activity sparkline.
4. **App publishing form:** auto-pulled metadata from ASC (name, bundle ID, icon) + editable: long description, screenshots (drag-drop, EXIF stripped), category, external links, "What's New" / changelog, public TestFlight join link as fallback. **Live iOS card preview** on the right side. Save-as-draft + Preview before Publish.
5. **Funnel dashboard:** views → Join Beta taps → emails captured → invites sent → invites accepted (estimated) → installs. Each step labeled with **confidence: HIGH / MEDIUM / "Install SDK for exact"**. Tasteful chart, not a Mixpanel screenshot.
6. **Source attribution:** direct, search, featured, per-app branded share-link breakdown.
7. **Feedback inbox:** unified across all the dev's apps. Search, filter, mark-as-read / archive / star. Daily Resend email digest preview.
8. **Feature votes leaderboard:** sorted by upvote count, with **status badges** the dev can change inline: Open / Planned / In Progress / Shipped.
9. **Tester list per app** (read-only, hourly synced from ASC) + slot utilization indicator (used / 10,000 cap).
10. **Settings:**
    - ASC key management — rotate (in <60s), revoke, "last used" timestamp, audit log of every Decrypt
    - Per-app full-slots behavior toggle (`waitlist` | `hide`)
    - Per-app SDK key management (`ip_pk_…` keys: issue, rotate, revoke)
    - Team, billing placeholder, sub-processor list link

## Components (start here)

App card (3 sizes), Join Beta button (with all 7 states), avatar w/ developer story tag, verified-developer badge, segmented control, search bar, screenshot carousel, vote pill (with status badge variants), feedback row, funnel chart with confidence labels, slot-status badge, waitlist position chip, privacy-disclosure sheet, ASC key upload component (with security copy), audit-log row, empty state illustration.

## Motion

- Spring-based, soft. iOS Symbol Effects on Join Beta button state changes.
- Hero card on feed: gentle parallax on scroll.
- No bouncy gimmicks. No glow trails.

## Accessibility

- WCAG AA minimum.
- Dynamic Type on iOS, all the way up.
- VoiceOver labels on every interactive element.
- Color is never the only signal for status (Join Beta states must read by shape/icon too).

## Constraints

- iOS 17+, SwiftUI, native components first.
- Web is Next.js 15 + Tailwind v4 + shadcn/ui — design with that in mind, but override the default shadcn look so it doesn't feel like every other shadcn site.
- Mobile web for the dev dashboard is "usable, not pretty."
- **Apple App Review hedge:** the iOS app must NOT visually mimic the App Store. No "Today" tab, no green Get-style buttons, no five-star widgets, no app-card layout that copies the App Store's. Different categories of style cues (warmer palette, indie illustrations, paper-airplane motif, more developer-forward storytelling).

---

**Suggested usage:** Run it once for brand identity (logo, palette, typography pairings) and a second pass for screen designs. The Join Beta button states and the privacy disclosure sheet are the highest-value details — design those carefully; everything else is variations on familiar patterns.
