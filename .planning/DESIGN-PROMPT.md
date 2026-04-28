# IndiePilot — AI Designer Brief

Drop this verbatim into v0, Lovable, Bolt, Galileo, Figma Make, or any AI design tool.

---

**Project:** IndiePilot — an App Store-like discovery platform for indie TestFlight apps.

**One-line pitch:** Users discover indie iOS betas, tap one button, and get a real TestFlight invite in their inbox. Indie devs get a marketing surface, an install funnel, and structured feedback — all without writing a marketing site.

**Two surfaces to design:**

1. **iOS user app (SwiftUI native, iOS 17+):** discovery + install. Should feel like a love-letter to the App Store, but with indie soul.
2. **Web dev dashboard (Next.js, desktop-first responsive):** publishing, ASC key management, install funnel, feedback inbox, feature-vote leaderboard.

---

## Brand soul

- **Vibe:** Modern + playful. Think Product Hunt's warmth × Arc Browser's confidence × Apple App Store's structure. Not corporate. Not sterile. Distinctly indie.
- **Tone:** Quietly opinionated. Celebratory of small builders. Treats the developer as the hero — show their face, their name, their story, not just an icon.
- **Personality words:** curious, hand-crafted, generous, honest, confident, a little weird.
- **What it is NOT:** flat corporate SaaS, dark-mode-first hacker aesthetic, AI-generated-looking gradients, generic "fintech blue."

## Logo & wordmark

- Name: **IndiePilot** (one word, capital I and P).
- Concept direction: a paper airplane meets a pilot's wings — small, hand-launched, going somewhere. Avoid rocket clichés. Avoid generic "compass."
- Wordmark: custom or modified geometric sans (e.g., based on Söhne, Inter Display, or General Sans), with one tiny eccentric detail (a dotted "i," a stylized terminal).
- App icon must read at 60×60 px on iOS Springboard.

## Color system

- **Primary:** a warm, slightly retro indigo or twilight blue — confident, not corporate. (Not Apple blue. Not Stripe purple.)
- **Accent:** a fresh sunrise orange or coral for the "Get" button and key CTAs — must pop against the primary without screaming.
- **Neutrals:** off-white paper, soft warm gray, deep ink. No pure #000 or #FFF.
- **Status:** muted green (testing/installed), amber (waitlist), dusty red (errors). All status colors WCAG AA against neutrals.
- **Dark mode:** required for iOS. Should feel like a different mood, not just an inverted palette.

## Typography

- **Display / headlines:** confident geometric sans with personality (General Sans, Söhne Breit, or Inter Display Bold).
- **Body:** clean readable sans (Inter, SF Pro on iOS).
- **Mono:** dev-side fields (API keys, build numbers) — JetBrains Mono or IBM Plex Mono.
- Generous line-height. Not crammed.

## iOS app — required screens

1. **Today / Feed:** large hero card (featured indie app of the day with developer story), then horizontally scrolling rails grouped by category ("Productivity," "Just shipped," "Trending," "Hand-picked"). Pull-to-refresh.
2. **App detail:** big icon, name, developer name + tiny avatar, version, screenshots carousel, long description, "What's New," feature-vote section (upvote/downvote feature requests), feedback button, and the **Get** button.
3. **Get button states:** `Get` (idle) → `Sign in to continue` (auth gate when tapped unauthenticated) → `Sending invite…` (loading) → `Check your email` (success, with note that TestFlight invite is on its way) → `Testing` (post-install, non-actionable, tasteful checkmark) → `Waitlist` (if slots full) → `You're #N on the waitlist` (after joining). Visually distinct, instantly readable.
4. **Search & categories.**
5. **Auth:** Sign in with Apple (primary), email/password (secondary), "Continue browsing" anonymous escape hatch.
6. **Profile / library:** my installed beta apps, feedback I've left, features I voted on.
7. **Feedback sheet:** opens from app detail; star-free, written feedback only, optional screenshot.

## Web dashboard — required screens

1. Sign up / sign in (email + password).
2. **Onboarding:** "Connect App Store Connect" — paste .p8 file + key ID + issuer ID, with security copy explaining encryption at rest. Three-step illustrated flow.
3. Apps list.
4. **App publishing form:** auto-pulled metadata from ASC + editable description, screenshots, category, links. Live preview of the iOS card on the right.
5. **Funnel dashboard:** views → "Get" taps → emails captured → invites sent → invites accepted → installs. Tasteful chart, not a Mixpanel screenshot.
6. Source attribution.
7. Feedback inbox: unified list, search, mark-as-read.
8. **Feature votes leaderboard:** sorted, with upvote count + status badges (Open / Planned / In Progress / Shipped).
9. Settings: ASC key management (rotate, revoke, last used), team, billing placeholder.

## Components (start here)

App card (3 sizes), Get button (with all 6 states), avatar w/ developer story tag, segmented control, search bar, screenshot carousel, vote pill, feedback row, funnel chart, slot-status badge, empty state illustration.

## Motion

- Spring-based, soft. iOS Symbol Effects on Get button state changes.
- Hero card on feed: gentle parallax on scroll.
- No bouncy gimmicks. No glow trails.

## Accessibility

- WCAG AA minimum.
- Dynamic Type on iOS, all the way up.
- VoiceOver labels on every interactive element.
- Color is never the only signal for status.

## Constraints

- iOS 17+, SwiftUI, native components first.
- Web is Next.js + Tailwind + shadcn/ui — design with that in mind.
- Mobile web for the dev dashboard is "usable, not pretty."

---

**Suggested usage:** Run it once for brand identity (logo, palette, typography pairings) and a second pass for screen designs.
