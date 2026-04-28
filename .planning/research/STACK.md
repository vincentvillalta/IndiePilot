# Stack Research

**Domain:** TestFlight discovery platform (web dashboard for indie iOS devs + native iOS app for end users + optional iOS SDK)
**Researched:** 2026-04-28
**Confidence:** HIGH overall (MEDIUM on a few specific version pins, called out inline)

This is a prescriptive stack. Each choice is paired with a "why this and not the alternatives" so the roadmap can move without re-litigating decisions.

---

## Recommended Stack — Web Dashboard (Next.js + Vercel + Neon)

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 15.x (App Router) | Full-stack web framework for the developer dashboard | Already a project constraint. App Router + Server Components are the 2026 norm; Vercel-native with first-class streaming, Server Actions, and Route Handlers. Caching defaults flipped to "uncached by default" in 15, which is the right default for a dashboard with mostly fresh data. |
| React | 19.x | UI library | Pinned by Next.js 15. Required for React Email's current major and for Server Components. |
| TypeScript | 5.6+ (strict) | Type safety end-to-end | Non-negotiable for a solo dev — types are the second pair of eyes. Better-Auth and Drizzle are both type-first and lean on TS inference heavily. |
| Vercel | — | Hosting / serverless functions / preview deploys | Project constraint. Use Node.js runtime (not Edge) for Route Handlers that touch ASC API + KMS — these need full Node crypto + outbound network without Edge restrictions. |
| Neon Postgres | 16+ (current Neon default) | Primary datastore | Project constraint. Branching for preview deploys is the killer feature; pair with the HTTP serverless driver to avoid connection-pool pain on Vercel. |
| `@neondatabase/serverless` | ^0.10 | Neon HTTP/WS driver | The supported way to talk to Neon from Vercel functions. HTTP driver for one-shot reads, Pool/WS for transactions. Drizzle has dedicated adapters for both. |
| Drizzle ORM | ^0.36 (1.0 RC has shipped; pin to a stable 0.x for a couple weeks until 1.0 GA, then upgrade) | TypeScript-first ORM | Tiny bundle (~7KB vs Prisma's ~1.6MB), zero native binaries, ~500ms cold starts on serverless vs Prisma's 1–3s. SQL-first feel matches what a solo dev actually wants for an analytics-heavy dashboard. Confidence: HIGH on choice; MEDIUM on exact version pin — verify on `npm view drizzle-orm version` at scaffold time. |
| `drizzle-kit` | matching Drizzle | Migration generator + studio | The only sane way to manage schema migrations with Drizzle. Generates SQL migrations; check them in. |
| Better-Auth | ^1.6 | Authentication for the dev dashboard | See dedicated section below. Email+password, sessions in Postgres, owns the user table — the right call for a self-hosted dashboard with no Apple Sign-in on the dev side. |
| Resend | ^4 | Transactional email | See dedicated section below. |
| React Email | ^3 | Email template components | JSX templates, type-safe, native Resend integration, Tailwind support. Same DX as the rest of the app. |
| Tailwind CSS | 4.x | Styling | Tailwind v4 is GA, ships an Oxide-powered engine, and is the de-facto pairing with Next.js + shadcn/ui. |
| shadcn/ui | latest | Component primitives | Copy-into-repo philosophy fits a solo-dev "do it right" project — no upstream churn risk. Pairs natively with Tailwind v4. |
| Zod | ^3.23 | Runtime validation for API input + ASC payloads | Validate at every trust boundary: form inputs, API request bodies, ASC API responses (Apple changes payloads). Better-Auth uses Zod internally so it's already in the dep graph. |

### Supporting Libraries (web)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@aws-sdk/client-kms` | ^3.x | KMS calls from Node Route Handlers | For envelope-encrypting the developer's `.p8` private key before it touches Postgres. |
| `@aws-crypto/client-node` | ^4.x | AWS Encryption SDK (envelope encryption helper) | Strongly recommended over hand-rolling KMS GenerateDataKey + AES-GCM. Handles key caching, algorithm selection, and key commitment correctly. |
| `jsonwebtoken` | ^9.x | Generate ES256 JWTs for ASC API | Battle-tested. ASC API requires ES256 + a 20-minute max expiry. No need for an ASC-specific wrapper library — `jsonwebtoken` is 30 lines of code away from a working ASC client. |
| `jose` | ^5.x (alternative) | JWT signing + Apple identity-token verification | **Required** for verifying Sign in with Apple identity tokens server-side — `jose` handles JWKS fetching/caching out of the box. Can also handle ASC JWT signing if you want a single JWT lib. Recommendation: use `jose` for both (verify Apple SIWA tokens *and* sign ASC requests) and skip `jsonwebtoken` entirely. |
| `bullmq` + Upstash Redis (or **Inngest**) | ^5.x / Inngest latest | Background jobs: waitlist promotion, ASC retries, scheduled refreshes | Vercel functions are short-lived; ASC tester promotion is async (Apple sends the actual TF email). Need a durable queue. **Recommendation: Inngest.** It's purpose-built for serverless, handles retries/scheduling/event fan-out, has a generous free tier, and avoids running a Redis. |
| `pino` | ^9.x | Structured logging | Pipe to Vercel logs in dev, ship to Axiom or Better Stack in production. JSON logs are non-negotiable when you're debugging Apple's API responses at 2am. |
| `@vercel/blob` *or* Cloudflare R2 + `@aws-sdk/client-s3` | latest | Storage for app screenshots | See "Storage" section below. **Recommendation: Cloudflare R2.** Egress-free; screenshots are bandwidth-heavy on the iOS feed. |
| `next-safe-action` | ^7.x | Type-safe Server Actions with Zod | Optional but eliminates an entire class of "I forgot to validate" bugs in form-driven dashboard flows. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm | Package manager | Faster, stricter, plays well with Vercel. `corepack enable` and pin in `package.json`. |
| Biome | Lint + format | Replaces ESLint + Prettier in 2026 indie stacks. ~20× faster, single config file. ESLint still fine if you prefer; Biome is the lower-friction default for solo dev. |
| Vitest | Unit tests | First-class TypeScript, faster than Jest, works with Next.js out of the box. |
| Playwright | E2E for the critical "Get → ASC tester added" path | Skip Cypress; Playwright is the 2026 standard. |
| `drizzle-kit studio` | Local DB browser | Free, runs on `pnpm db:studio`. |

---

## Recommended Stack — iOS App (SwiftUI native, end-user discovery)

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Swift | 6.0 (strict concurrency on) | Language | Swift 6 strict concurrency is the 2026 compiler default. Embracing it now avoids a painful retrofit later — and the iOS SDK we're shipping must be Swift 6-clean to avoid forcing concurrency warnings on consumer apps. |
| SwiftUI | iOS 17+ baseline (recommended), iOS 18+ aggressive | UI framework | Project constraint. **Set deployment target to iOS 17.** Rationale: iOS 17 covers ~95%+ of active devices in 2026, gives you `Observable` macro, `ScrollView` enhancements, and `ContentUnavailableView` (perfect for empty discovery feed states). Going to iOS 18 buys you very little for this product and excludes a meaningful tail of indie users. iOS 26 / 18 features (Liquid Glass, etc.) can be opt-in via `#available`. |
| URLSession + `Codable` | stdlib | Networking | **Do not pull in Alamofire.** URLSession + `async`/`await` + `Codable` covers 100% of this app's networking needs in <100 LOC. Wrap in a thin `APIClient` actor. Every dependency you skip here is one you don't have to audit on every iOS release. |
| `AuthenticationServices` (`SignInWithAppleButton`) | stdlib | Sign in with Apple | First-class SwiftUI component. Backend verifies the `identity_token` JWT against Apple's JWKS and pulls `sub` as the stable user ID. |
| Keychain Services (via a thin wrapper or `KeychainAccess`) | stdlib + tiny dep | Secure token storage | Store the IndiePilot session token in Keychain, **not** UserDefaults. Use a 50-line wrapper or pull `KeychainAccess` (~700 LOC, MIT). Either is fine. |
| Observation (`@Observable`) | iOS 17+ | State management | Replaces `ObservableObject` + `@Published`. Cleaner, more performant, and the canonical 2026 pattern. No need for Redux-style libs (TCA, etc.) at this product's scale. |
| Swift Testing | iOS 18 SDK | Unit tests | The new `@Test` macro framework. Better than XCTest for new code; co-exists with XCTest if you ever need to. |

### Supporting Libraries (iOS)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `swift-collections` (Apple) | ^1.1 | OrderedSet / Deque if needed for the feed | Only pull when you actually need it. |
| Nuke *or* `AsyncImage` | Nuke ^12 / stdlib | Remote image loading for app screenshots | Stdlib `AsyncImage` is fine for v1. Switch to Nuke if you need disk caching, prefetching, or progressive JPEG — likely yes once the discovery feed gets dense. |

**Explicit non-dependencies** (skip these unless a specific need arises):
- Alamofire — URLSession is enough.
- Combine — `async`/`await` + `@Observable` is the 2026 path.
- RxSwift — same reason.
- SwiftData — overkill for a discovery client; the server is the source of truth. If you need local cache, a small `Codable` + filesystem layer beats SwiftData's iOS-version-coupled migrations.

### iOS Tooling

| Tool | Purpose | Notes |
|------|---------|-------|
| Xcode 16+ | IDE | Required for Swift 6 / iOS 18 SDK. |
| SwiftLint | Lint | Optional but cheap insurance. Pin a config in `.swiftlint.yml`. |
| swift-format | Formatter | Apple's official; pairs with SwiftLint. |
| Tuist *or* plain Xcode project | Project generation | For a single-app + single-SDK monorepo, plain Xcode + SPM is fine. Reach for Tuist only if the project structure starts fighting you. |
| Fastlane | TF/App Store automation for the IndiePilot iOS app itself | Yes, you'll dogfood — IndiePilot uses TestFlight to ship IndiePilot. |

---

## Recommended Stack — iOS SDK (feedback widget + feature voting)

### Core Approach

| Decision | Choice | Why |
|----------|--------|-----|
| Distribution | **Swift Package Manager, source-distributed (not XCFramework)** | Source SPM gives indie devs zero-friction integration: paste a URL into Xcode → done. XCFrameworks are needed only for closed-source or when you need to ship pre-built binaries; IndiePilot's SDK should be open-source-readable so devs trust it (it's running in *their* TestFlight build). Source SPM also means consumer apps build only the platforms they target. |
| Minimum target | **iOS 17** (match the IndiePilot iOS app) | Lower buys you nothing meaningful in 2026 and forces you to backport `Observable` / SwiftUI APIs. Indie devs targeting iOS 16 or below are an edge case worth losing v1. |
| Public API surface | One `IndiePilot` entry-point class + 2–3 SwiftUI views | Minimal. See "SDK API surface" below. |
| Dependencies | **Zero external dependencies.** Stdlib only. | Every dep you ship is a dep your customer's app inherits. Zero deps = zero version conflicts, zero supply-chain surface, zero anxiety for the consumer dev. |
| Concurrency | Swift 6 strict, all public API `Sendable` | Mandatory in 2026. SDK warnings = lost trust. |
| Privacy Manifest (`PrivacyInfo.xcprivacy`) | **Required.** Ship one declaring exactly what you collect (feedback text, votes, anonymous device ID) | App Store submission gate as of 2024; Apple is enforcing more strictly in 2026. Get this right or consumer apps fail App Store review. |

### SDK Public API (sketch — informs roadmap, not final code)

```swift
// One-line config in App init
IndiePilot.configure(apiKey: "ip_pk_...")

// Drop-in feedback button anywhere in the host app's SwiftUI tree
IndiePilotFeedbackButton()

// Or full-screen feedback + voting view, pushed by host app
IndiePilotFeedbackView()
```

That's it for v1. Resist the urge to add analytics, crash reporting, screenshot capture, or session replay — they're explicitly out of scope per PROJECT.md.

### SDK Packaging Specifics

- Repo: separate from the main monorepo (`indiepilot-ios-sdk`) so consumer devs don't pull the whole org.
- `Package.swift`: `swift-tools-version: 6.0`, single library product, single target.
- Ship a `Sources/IndiePilot` directory + a `Tests/IndiePilotTests` directory + a top-level `README.md` with copy-pasteable integration steps.
- Tag releases with semver. Breaking changes bump major. Treat the public API like an actual API contract because it is one.
- Networking: same URLSession + Codable pattern as the main iOS app. Endpoints hit a public SDK API on the IndiePilot backend with a per-developer API key (NOT the same as the dev's ASC key — issue an `ip_pk_...` key from the dashboard).

### What NOT to do for the SDK

| Avoid | Why |
|-------|-----|
| XCFramework binary distribution | Locks consumer apps to specific architectures, makes Swift 6 concurrency warnings opaque to them, breaks debugging. |
| CocoaPods support | Dead. SPM is the standard. Don't dual-publish. |
| Carthage support | Same as CocoaPods. |
| Pulling in Sentry, Firebase, Mixpanel, etc. | Customer apps already have their own observability stack; competing with it is hostile. |
| Auto-init on app launch (without `configure()`) | Surprise side-effects in someone else's app are how you get one-star App Store reviews on *their* product. Explicit `configure()` only. |
| Background uploads, swizzling, runtime patching | Get you blocked from App Store review and break consumer apps in non-obvious ways. |

---

## Authentication — Web Dashboard (Better-Auth)

### Recommendation: **Better-Auth v1.6+**

**Why Better-Auth over the alternatives:**

| Option | Verdict | Reasoning |
|--------|---------|-----------|
| **Better-Auth** ✅ | Recommended | Self-hosted, owns the user table, native Drizzle adapter, email+password built in, organizations / RBAC built in (useful when freemium tiers land), Sign in with Apple plugin available if dashboard ever needs it, no per-MAU pricing. Auth.js team itself has effectively redirected new projects here as of late 2025. |
| Clerk ❌ | Skip | Hosted, fast to ship, but per-MAU pricing scales badly for a freemium product, EU data-residency story is "trust the DPF," and you don't own the user table — which is a problem when ASC keys are foreign-keyed off your `users` table. |
| Auth.js v5 (NextAuth) ❌ | Skip for greenfield | Maintenance team transferred to Better-Auth in late 2025; lib is in security-patch mode. Auth.js's own guidance is "use Better-Auth for new projects." |
| Lucia ❌ | Skip | Author sunset Lucia as a library and replaced it with educational content. Functionally Better-Auth is the spiritual successor. |
| Roll your own | Skip | Not worth it for a solo dev. Sessions, password reset, email verification, rate-limiting, CSRF — Better-Auth gives you all of this and stays out of the way. |

### Better-Auth Configuration Notes

- **Email + password** with email verification on. Verification emails sent via Resend.
- **Session storage:** Postgres (via Drizzle adapter), HTTP-only cookies, 7-day rolling sessions.
- **Rate limiting:** Use Better-Auth's built-in rate-limit plugin or layer on `@upstash/ratelimit` if you need finer control.
- **Sign in with Apple:** Not needed on the dev dashboard. Devs use email+password per PROJECT.md. Don't add it just because.
- **2FA / passkeys:** Defer to v2. Solo dev, MVP timeline.

### Authentication — iOS App (separate from dashboard)

The end-user iOS app authenticates against the same backend but as a **distinct user role/table** (`endUsers` vs `developers`). Two paths:

1. **Email + password** — POST to a Better-Auth-style sign-in endpoint, receive a session token, store in Keychain. Build this on top of Better-Auth using a separate `auth` instance OR custom routes that share the session model.
2. **Sign in with Apple** — Native `SignInWithAppleButton`, ship the resulting `identity_token` (JWT) to the backend, verify with `jose` against Apple's JWKS at `https://appleid.apple.com/auth/keys`, extract `sub` as the stable user ID.

**Implementation note:** Better-Auth supports custom routes and multiple auth methods, but supporting "two distinct user types in one Better-Auth instance" is awkward. Cleanest pattern: **two Better-Auth instances** — one mounted at `/api/auth/dev/*` for the dashboard, one at `/api/auth/user/*` for the iOS app. They each have their own user table. Confidence: MEDIUM — verify with Better-Auth docs at scaffold time; alternative is one instance with a `userType` field.

---

## Encryption at Rest — Developer ASC `.p8` Keys

This is the single highest-stakes engineering decision in the project. A leaked ASC key gives an attacker control of someone's App Store listings.

### Recommendation: **AWS KMS envelope encryption + AES-256-GCM, ciphertext stored in Postgres column**

**Architecture:**

```
[Dev uploads .p8 in dashboard]
   ↓
[Server reads file content into memory]
   ↓
[KMS GenerateDataKey] → returns plaintext data key + encrypted data key
   ↓
[Encrypt .p8 contents with plaintext data key using AES-256-GCM]
   ↓
[Discard plaintext data key; store ciphertext + encrypted data key + IV + auth tag in Postgres]
   ↓
[At signing time: KMS Decrypt(encrypted data key) → AES-GCM decrypt(.p8) → sign JWT → discard]
```

**Why this approach:**

| Approach | Verdict | Reasoning |
|----------|---------|-----------|
| **AWS KMS envelope encryption (via AWS Encryption SDK)** ✅ | Recommended | Industry-standard for SaaS handling third-party API credentials. Master key never leaves KMS. Per-record data keys. Auditable via CloudTrail. AWS Encryption SDK (`@aws-crypto/client-node`) handles the GCM details, key commitment, and caching correctly so you don't roll your own. |
| Vercel-native env-var encryption only | ❌ Insufficient | Vercel encrypts env vars at rest, but env vars are global — you can't store *per-developer* secrets there. Wrong tool. |
| Postgres `pgcrypto` symmetric encryption | ❌ Skip | The encryption key has to live somewhere — either in Postgres (defeats purpose) or in env (then why not just AES-GCM in app code?). pgcrypto's `pgp_sym_encrypt` is also not authenticated; you'd be combining it with HMAC manually. KMS is strictly better. |
| `pgsodium` (libsodium in Postgres) | ❌ Skip | Server-managed keys are a nice idea, but Neon doesn't expose pgsodium as a built-in extension (verify at scaffold time — Neon's extension list changes). And key custody still ultimately ends up on the cloud provider. KMS gives you the same property with better tooling. Confidence: MEDIUM on Neon extension availability — confirm before relying. |
| `libsodium` (pure JS) with key in env var | ⚠️ Acceptable fallback | If AWS KMS feels heavy for v1 (extra cloud account, IAM, billing), you can do AES-256-GCM with a master key in a Vercel env var as a temporary measure. Migrate to KMS before launching publicly. Be honest in your risk doc that this is a pre-KMS interim. |
| HashiCorp Vault | ❌ Overkill | Solo dev, no ops team. KMS is the right level. |

**Key handling rules (write these into ARCHITECTURE.md too):**

1. The plaintext `.p8` content **never** touches disk on the server. Read from multipart upload directly into a Buffer, encrypt, discard.
2. The plaintext `.p8` content is held in memory only for the duration of one ASC JWT signing operation, then explicitly zeroed (best-effort in Node — at minimum, drop the reference and don't log it).
3. The KMS master key is account-scoped, with an IAM role the Vercel function assumes via OIDC federation (Vercel → AWS OIDC is the 2026 standard; no static AWS access keys in env vars).
4. Audit log every `Decrypt` call: (developer ID, app ID, action that triggered the decrypt, timestamp).
5. Rotation: KMS handles master-key rotation. Per-record data keys never need rotating; if a developer wants to rotate their `.p8`, they re-upload and you re-encrypt (and revoke the old key in their App Store Connect).
6. Never log the JWT. Never log the data key. Never log the `.p8`. Add a log scrubber.

### Library setup

```ts
// Recommended
import { buildClient, CommitmentPolicy, KmsKeyringNode } from "@aws-crypto/client-node";

const { encrypt, decrypt } = buildClient(
  CommitmentPolicy.REQUIRE_ENCRYPT_REQUIRE_DECRYPT
);
const keyring = new KmsKeyringNode({ generatorKeyId: process.env.KMS_KEY_ARN! });

// encrypt(keyring, p8Buffer, { encryptionContext: { developerId, appId } })
```

The `encryptionContext` becomes a tamper-evident binding: a row in the DB cannot be decrypted with a different developerId/appId pair. This catches a whole class of "the wrong key got attached to the wrong dev" bugs.

---

## App Store Connect API Integration — Specifics

### JWT Signing

- **Algorithm:** ES256 (mandatory).
- **Header:** `{ "alg": "ES256", "kid": <keyId>, "typ": "JWT" }`.
- **Claims:** `iss` = issuer ID (UUID from ASC), `iat` = now, `exp` = now + 19 minutes (max is 20; leave a 1-min buffer for clock skew), `aud` = `appstoreconnect-v1`.
- **Library:** `jose` (preferred — handles ES256 cleanly with `importPKCS8` + `SignJWT`).
- **Caching:** Cache the signed JWT in-memory (per Vercel function instance, scoped by developer ID) for ~15 minutes. Do not cache across developers.

### Tester Management Endpoints (the magic-moment path)

Two-step flow when a user taps "Get":

1. **Create the beta tester** (or look up if exists):
   `POST /v1/betaTesters`
   Body: `{ data: { type: "betaTesters", attributes: { email, firstName?, lastName? }, relationships: { betaGroups: { data: [{ id: <groupId>, type: "betaGroups" }] } } } }`
   This adds them to the group in one call. Apple sends the TestFlight invite email automatically.

2. **Alternative:** if the tester already exists for this team, use:
   `POST /v1/betatesters/{id}/relationships/betaGroups` to attach to additional groups.

You'll need both paths because the same email can be re-tapped across different IndiePilot apps that share an ASC team.

### Rate Limits (verified against community-confirmed Apple behavior, MEDIUM confidence)

| Limit | Value | Source |
|-------|-------|--------|
| Hourly (documented) | 3,600 requests/hour, returned in `x-rate-limit` header | Apple official |
| Per-minute (undocumented) | ~300 requests/minute observed | Community-reported on Apple forums; confirmed across multiple developers |
| Tester-add specific | No publicly documented per-endpoint limit | Treat as included in the global hourly bucket |

**Implementation rules:**

- **Throttle to 200 requests/min/developer** as a safety margin (well under 300).
- **Read the `x-rate-limit` response header** on every call: parse `user-hour-lim` and `user-hour-rem`. When `user-hour-rem` < 200, back off proactively.
- **On `429`:** exponential backoff starting at 60s, max 5 retries, jitter. **Surface to the dashboard** if a developer is being throttled — they need to know.
- **Background queue (Inngest) is mandatory:** never call ASC inside the user-facing "Get" request. Enqueue the tester-add job, return 202 to the iOS app, let Inngest call ASC asynchronously. Inngest gives you free retry-with-backoff + visibility.
- **Per-developer rate isolation:** if Dev A is throttled, Dev B's "Get" taps must still work. Inngest queues should be partitioned by developer ID.

### Apple Gotchas (write these into PITFALLS.md too — flagging here so they're not lost)

1. **JWT max 20 min.** Anything longer = 401, no useful error message.
2. **`kid` (key ID) goes in the header, not the payload.** Easy to miss.
3. **The private key format is PKCS#8.** `jose.importPKCS8` handles it; `jsonwebtoken` needs the full PEM headers preserved.
4. **TestFlight external testing groups cap at 10,000 testers per app.** Hit cap → ASC returns a specific error; you must surface "slots full" UX (already in PROJECT.md).
5. **Email already invited:** ASC returns a specific error code; treat as success, don't retry.
6. **App must have an approved external test submission** before you can add external testers. If a dev hasn't submitted a build for review, "Get" cannot work yet — surface this state in the dashboard.
7. **Apple changes payload shapes occasionally** without changelog. Validate every response with Zod; log diffs when validation fails so you catch breakage in CI alerts before it breaks production.
8. **Don't store the JWT in cookies/localStorage anywhere.** Server-side only, in-memory only.

---

## Email — Transactional (Resend)

### Recommendation: **Resend**

| Option | Verdict | Reasoning |
|--------|---------|-----------|
| **Resend** ✅ | Recommended | Best-in-class DX for Next.js/React stacks. Native React Email integration (same team). 3,000 emails/month free tier covers v1 launch. ~$20/mo gets 50k/mo. TypeScript SDK is excellent. Webhooks for bounce/delivery handling. |
| Postmark ⚠️ | Acceptable alternative | Better deliverability reputation for transactional (slight edge). Pricier (~$15 for 10k vs Resend $20 for 50k). Choose only if deliverability problems materialize — Resend's deliverability has been competitive in 2026 reports. |
| AWS SES ❌ | Skip for v1 | $0.10/1k emails is cheaper, but the ergonomics tax (sandbox approval, IP warming, no React Email integration without extra plumbing, harder bounce handling) is not worth it at solo-dev scale. Revisit at >200k emails/mo. |
| SendGrid ❌ | Skip | Free tier was killed in 2025. Pricing is uncompetitive vs Resend. DX is dated. |
| Mailgun ❌ | Skip | Same — has gone backwards relative to Resend on DX. |

### Email Templates — React Email

Build templates as React components in `app/emails/`:

```tsx
// app/emails/waitlist-promotion.tsx
import { Html, Button, Text } from '@react-email/components';

export default function WaitlistPromotion({ appName, downloadUrl }: Props) {
  return (
    <Html>
      <Text>You're in! {appName} just opened a slot for you.</Text>
      <Button href={downloadUrl}>Open in TestFlight</Button>
    </Html>
  );
}
```

Send from a Server Action / Route Handler:

```ts
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({
  from: 'IndiePilot <hello@indiepilot.app>',
  to: user.email,
  subject: `You're in for ${appName}`,
  react: WaitlistPromotion({ appName, downloadUrl }),
});
```

### Email types IndiePilot needs (v1)

1. **Email verification** (Better-Auth, dev signup) — cheap, send via Resend.
2. **Password reset** (Better-Auth, dev) — same.
3. **Waitlist promotion** ("You're in for {app}, check TestFlight") — async, fired from Inngest job.
4. **Feedback alert** (dev gets digest of new feedback / new feature votes) — daily digest, fired from Inngest cron.
5. **Tester-add failure** (dev's ASC key is invalid / their app has no approved external test) — operational, fired immediately.

**TestFlight invite emails are NOT IndiePilot's problem.** Apple sends those when you POST to `betaTesters`. Don't shadow-send — users would get two emails and be confused.

### Deliverability hygiene (do these on day 1)

- Verify a domain in Resend (`indiepilot.app`).
- Set up SPF, DKIM, DMARC records (Resend's setup wizard walks you through it).
- Use a dedicated subdomain for transactional (`mail.indiepilot.app`) so marketing emails (when they exist) don't poison transactional reputation.
- Never send from `noreply@`. Send from `hello@` or `team@`. Reply-to should go to a real inbox.

---

## Storage — App Screenshots and Assets

### Recommendation: **Cloudflare R2** (with `@aws-sdk/client-s3`)

| Option | Verdict | Reasoning |
|--------|---------|-----------|
| **Cloudflare R2** ✅ | Recommended | Zero egress fees — critical because the iOS discovery feed will be image-heavy. S3-compatible API works with the standard AWS SDK. ~$0.015/GB storage. Free tier covers v1. |
| Vercel Blob ⚠️ | Acceptable | Tightest Next.js integration (single import). But egress is metered and bandwidth costs compound on a discovery feed. Use only if R2 setup feels like too much yak-shaving for v1. |
| AWS S3 ❌ | Skip | Egress fees. R2 is the strict upgrade. |
| Tigris ⚠️ | Interesting | Faster on small objects. Newer, smaller ecosystem. R2 is the safer default. |

### Image Pipeline

- Upload from dashboard → Vercel Route Handler → R2 via S3-compatible API.
- Serve via Cloudflare's CDN (R2 + custom domain or `r2.dev`).
- Use `next/image` with R2 URL as remote pattern. Or, if you go heavy, swap to a Cloudflare Images / `@cloudflare/next-on-pages` combo down the line.
- Strip EXIF on upload (server-side with `sharp`). EXIF can leak GPS coordinates from screenshots (yes, this happens).
- Resize on upload to 3 sizes (thumbnail, feed, detail). Don't ship 4MB screenshots to the iOS feed.

---

## Background Jobs / Queues

### Recommendation: **Inngest**

| Option | Verdict | Reasoning |
|--------|---------|-----------|
| **Inngest** ✅ | Recommended | Built for Next.js + serverless. Step functions, retries, fan-out, scheduled jobs all in one. Free tier (50k runs/mo) covers v1. No infrastructure to manage. |
| Trigger.dev ⚠️ | Acceptable alt | Similar product. Inngest has slightly better Next.js DX as of 2026. |
| BullMQ + Upstash Redis ❌ | Skip | Requires Redis infrastructure. Workers don't run cleanly on Vercel functions (need long-lived process). Right answer if you ever leave Vercel; wrong tool for v1. |
| Vercel Cron + Vercel Queues | ⚠️ | Vercel's own queue product is newer and viable. Consider if you don't want a third vendor. Inngest is more battle-tested. |

### Jobs IndiePilot needs

1. **Add tester to ASC** — fired from "Get" tap, retries on 429, surfaces failures.
2. **Promote waitlist** — fired when a developer's tester count drops or they raise the cap; processes waitlist FIFO.
3. **Email digests** — daily cron for feedback summaries.
4. **ASC key health check** — weekly cron: try a no-op ASC call per developer, mark key as invalid if it 401s, alert the developer.
5. **Stats rollup** — hourly cron for the funnel dashboard (pageviews → "Get" → invites → installs).

---

## Installation

```bash
# Web app — core
pnpm add next@latest react@latest react-dom@latest typescript

# Database
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit dotenv

# Auth
pnpm add better-auth
pnpm add -D @better-auth/cli

# ASC API + crypto
pnpm add jose
pnpm add @aws-sdk/client-kms @aws-crypto/client-node

# Email
pnpm add resend react-email @react-email/components

# Background jobs
pnpm add inngest

# Storage
pnpm add @aws-sdk/client-s3 sharp

# Validation
pnpm add zod

# UI
pnpm add tailwindcss@latest @tailwindcss/postcss
pnpm dlx shadcn@latest init

# Logging
pnpm add pino

# Optional but recommended
pnpm add next-safe-action

# Dev tools
pnpm add -D @biomejs/biome vitest @playwright/test
```

```bash
# iOS SDK package (in indiepilot-ios-sdk repo)
# Package.swift only — no external deps.
# swift-tools-version: 6.0
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Drizzle | Prisma | If you want maximum schema-first abstraction and don't care about cold-start performance (e.g., you're moving off Vercel onto Fly/Railway with persistent connections). Otherwise Drizzle wins for serverless. |
| Better-Auth | Clerk | If you'd rather pay $25-100/mo than maintain auth code, and you can live with US-only data residency. Valid for very-early-stage; revisit migration before paid plans launch (Clerk migration is annoying). |
| Resend | Postmark | If transactional deliverability proves problematic on Resend (it shouldn't in 2026, but it has historically). Otherwise Resend's React Email DX wins. |
| AWS KMS | libsodium-with-env-var-master-key | Only as a pre-launch interim if KMS setup blocks shipping. Migrate before public launch. |
| `jose` | `jsonwebtoken` | `jsonwebtoken` is fine for ASC JWT signing but you still need `jose` (or similar) to verify Sign in with Apple identity tokens. Skip the duplication; use `jose` for both. |
| Inngest | Trigger.dev | Personal preference; both work. Inngest has slightly more momentum in the Next.js community. |
| Cloudflare R2 | Vercel Blob | If you genuinely need every piece of infra to live in Vercel for ops simplicity. Egress costs will catch up. |
| URLSession + Codable (iOS) | Alamofire | If your team is already deep in Alamofire on another project. For greenfield, skip. |
| SPM source distribution (SDK) | XCFramework | If you ever close-source the SDK. v1 should be open-source-readable. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Prisma in serverless | 1.6MB bundle, 1-3s cold starts, native binary issues on Vercel functions historically | Drizzle ORM |
| Auth.js v5 (NextAuth) for greenfield | Maintenance handed off; Auth.js team itself recommends Better-Auth for new projects | Better-Auth |
| Clerk for a freemium product | Per-MAU pricing destroys margin once you have users; can't own the user table for FK relationships | Better-Auth |
| Lucia | Sunset by maintainer | Better-Auth |
| `pgcrypto` `pgp_sym_encrypt` for ASC keys | Not authenticated encryption; key custody problem unsolved; weaker than KMS-backed AES-GCM | AWS KMS envelope encryption |
| Storing `.p8` files on disk (e.g., `/tmp` on Vercel) | Vercel function filesystems are ephemeral but logged; risk of accidental persistence | In-memory only, sourced from KMS-decrypted column |
| Vercel Edge runtime for ASC + KMS calls | Edge runtime restricts Node crypto, AWS SDK packages may not all run, harder to debug | Node.js runtime for `/api/asc/*` and `/api/auth/*` routes |
| Alamofire for the iOS app | Adds ~1MB to app size for nothing URLSession can't do | URLSession + async/await + Codable |
| CocoaPods for the iOS SDK | Effectively dead in 2026; doubling distribution channels doubles maintenance | SPM only |
| XCFramework binary distribution for the iOS SDK | Hides Swift 6 concurrency warnings from consumers, breaks debug experience | Source SPM |
| `UserDefaults` for auth tokens (iOS) | Not encrypted, accessible if device is jailbroken | Keychain Services |
| SendGrid / Mailgun | Worse DX, worse pricing vs Resend in 2026 | Resend |
| AWS SES at v1 scale | Sandbox approval friction, no React Email integration, manual bounce handling | Resend |
| Vercel Cron alone for ASC retries | Cron is fire-and-forget; no retry semantics, no observability into job state | Inngest |
| Storing JWTs in cookies for ASC | ASC JWTs are server-only credentials; never expose to browser | In-memory cache, server-side only |
| Logging ASC responses verbatim | Can leak tester emails (PII) and API key metadata | Structured logging with field allowlist |

---

## Stack Patterns by Variant

**If solo-dev scaling stays under 1k developers + 100k end-users:**
- Single Vercel deployment, single Neon project (with branching for previews), single KMS key, single Inngest workspace.
- Skip multi-region. Latency from a single region is fine; Apple's API is the slow path anyway.

**If a developer hits ASC rate limits frequently (popular indie app gets featured):**
- Move that developer's ASC calls to a dedicated Inngest queue with stricter throttling.
- Surface throttle state in dashboard so they know to upgrade their App Store Connect API rate (Apple does grant higher limits on request).

**If launch volume on a single app exceeds 10k testers:**
- This is a hard Apple cap, not an IndiePilot limit. Surface "slots full" and trigger waitlist flow per PROJECT.md.

**If the dev dashboard ever needs Sign in with Apple (e.g., devs want to use their iOS device's Apple ID):**
- Better-Auth has an Apple plugin. Add it then. Don't pre-build.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 15 | React 19 | Required pairing as of Next 15.x. Don't downgrade React. |
| Drizzle ORM 0.36+ | `@neondatabase/serverless` ^0.10 | Use `drizzle-orm/neon-http` for serverless functions, `drizzle-orm/neon-serverless` for Pool/WS in long-lived contexts (background workers). |
| Better-Auth 1.6+ | Drizzle ORM 0.36+ | Use `drizzleAdapter(db, { provider: "pg" })`. Run `npx @better-auth/cli@latest generate` to produce the schema, commit the output. |
| `@aws-crypto/client-node` 4.x | Node.js 20+ | Vercel default runtime is Node 20. |
| React Email 3.x | React 19 | The render() function is async in 3.x. |
| Resend SDK 4.x | React Email 3.x | Pass components as function calls, not JSX (Resend docs are explicit). |
| Swift Package Manager 5.10+ | iOS 17 deployment target | `swift-tools-version: 6.0` requires Xcode 16. |
| Inngest SDK 3.x | Next.js 15 App Router | Use the `serve()` Route Handler pattern. |

---

## Sources

- [Better Auth Installation Docs](https://better-auth.com/docs/installation) — verified v1.6, Drizzle adapter setup. **HIGH confidence.**
- [Better Auth Drizzle Adapter](https://better-auth.com/docs/adapters/drizzle) — verified email/password flow. **HIGH confidence.**
- [LogRocket: Best Auth Library for Next.js 2026](https://blog.logrocket.com/best-auth-library-nextjs-2026/) — Better-Auth as 2026 default. **MEDIUM confidence.**
- [Auth.js → Better-Auth maintenance handoff](https://supastarter.dev/blog/better-auth-vs-nextauth-vs-clerk) — September 2025 transition. **MEDIUM confidence (multiple sources confirm).**
- [Drizzle ORM Neon Setup](https://orm.drizzle.team/docs/connect-neon) — neon-http vs neon-serverless drivers. **HIGH confidence.**
- [Drizzle vs Prisma in 2026](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) — bundle size + cold start data. **MEDIUM confidence.**
- [Neon Drizzle guide](https://neon.com/docs/guides/drizzle) — official Neon recommendation. **HIGH confidence.**
- [Apple: Add Beta Tester to Beta Group](https://developer.apple.com/documentation/appstoreconnectapi/post-v1-betatesters-_id_-relationships-betagroups) — official endpoint. **HIGH confidence.**
- [Apple: Create Beta Tester](https://developer.apple.com/documentation/appstoreconnectapi/post-v1-betatesters) — official endpoint. **HIGH confidence.**
- [Apple Developer Forums: ASC Rate Limits](https://developer.apple.com/forums/thread/731014) — 3600/hour documented, ~300/min undocumented. **MEDIUM confidence (community-verified, Apple has not officially documented per-minute).**
- [App Store Connect API JWT generation](https://medium.com/xcblog/generating-jwt-tokens-for-app-store-connect-api-2b2693812a35) — 20-minute max expiry, ES256. **HIGH confidence (consistent across sources and Apple docs).**
- [Resend + Next.js docs](https://resend.com/docs/send-with-nextjs) — current SDK pattern. **HIGH confidence.**
- [React Email changelog](https://react.email/docs/changelog) — v3, React 19 support. **HIGH confidence.**
- [Resend vs Postmark vs SES 2026](https://devtoolpicks.com/blog/resend-vs-postmark-vs-mailgun-solo-developers-2026) — pricing + DX comparison. **MEDIUM confidence.**
- [AWS Encryption SDK for JS](https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/js-examples.html) — official KMS envelope-encryption library. **HIGH confidence.**
- [pgsodium GitHub](https://github.com/michelp/pgsodium) — alternative considered. **MEDIUM confidence on Neon availability.**
- [Apple: Sign in with Apple — User Authentication](https://developer.apple.com/documentation/AuthenticationServices/implementing-user-authentication-with-sign-in-with-apple) — backend verification flow. **HIGH confidence.**
- [Apple: Distributing Binary Frameworks as Swift Packages](https://developer.apple.com/documentation/xcode/distributing-binary-frameworks-as-swift-packages) — XCFramework distribution. **HIGH confidence.**
- [SwiftLee: Picking your minimum iOS version](https://www.avanderlee.com/workflow/minimum-ios-version/) — deployment target guidance. **MEDIUM confidence.**
- [iOS App Development in 2026 Guide](https://fwctecnologia.com/en/blog/post/ios-app-development-2026-technical-guide) — Swift 6 strict concurrency as default. **MEDIUM confidence.**
- [Cloudflare R2 vs Vercel Blob 2026](https://www.wmtips.com/technologies/compare/cloudflare-r2-vs-vercel-blob/) — usage and cost comparison. **MEDIUM confidence.**

---
*Stack research for: TestFlight discovery platform (web + iOS app + iOS SDK)*
*Researched: 2026-04-28*
