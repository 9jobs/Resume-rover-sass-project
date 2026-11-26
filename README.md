# Current local verification — 23 November 2026

Verified app: http://127.0.0.1:3210/. See [final-verification/REPORT.md](final-verification/REPORT.md) for completed changes, live Gemini results, screenshots, restart instructions and pending items. SaaS tests: 68/68; Python ATS: 18/18; preserved engine: 129/130 (one missing historical fixture). Resume creation remains local and factual; Gemini cover letters and English/Hinglish interview flows were live-tested.

## Historical implementation notes

The notes below describe earlier snapshots. Old port numbers and integration availability may differ from the current report.

## Deep verification update

Latest report and actual checks are in [deep-verification/REPORT.md](deep-verification/REPORT.md). The guided exporter now checks source coverage and real PDF pagination, and blocks omitted-content or over-limit PDF/DOCX downloads. Full TXT remains available for long drafts. The verified local preview is http://127.0.0.1:3211/.

## Guided resume workflow — local update

Open http://127.0.0.1:3211/?workspace=1#resume-dashboard and choose **Create new resume**. The homepage button also opens this dashboard with a separate local guest session when needed.

From PowerShell, restart inside the existing workspace with:

~~~powershell
Set-Location D:\ATS-Rover-Clerk\resume-saas-local
$env:LOCAL_PORT = '3211'
npm start
~~~

Stop a server launched in your terminal with Ctrl+C. The verification instance is also available at http://127.0.0.1:3212/.

### Working flows

- Setup a resume title, experience level, target role/company and optional saved job or pasted job description.
- Import PDF, DOCX or TXT locally, or paste existing resume / LinkedIn profile text. Files are limited to 1 MB, PDF imports to ten pages, and extracted text to 45,000 characters. Text extraction requires selectable text. Review the preserved original text and imported sections.
- Edit contact, summary, employment, education, projects and skills. Change section order and visibility. Browser drafts are scoped to the account and candidate.
- Preview a proposed bullet reorder or compose a bullet from your confirmed action/task/tools/result. Apply or discard explicitly. Suggestions are local rules and the factual composer uses the details you enter.
- Review the existing engine's readiness and job keyword scores, matched/missing terms and recommendations.
- Use the existing Standard or Harshibar format and existing spacing / page-target controls. The preview, pagination, DOCX and TXT exports reuse protected engine functions.
- Save separate resume versions and link a saved version to the selected job. The job's tracker stage is retained.
- Download PDF locally through Chrome/Edge, rendering the engine's HTML. This additional export path lives outside the preserved engine. Set LOCAL_CHROME_PATH in the backend process only when the browser is installed elsewhere.
- Open the existing advanced editor or send the saved version and target context to Cover Letter.
- Choose a previous role and recorded skills to highlight in the existing Gemini cover-letter module. Unsupported emphasis is rejected before inference. Changing the selected candidate/resume clears the displayed letter.
- Server permissions apply to saving, parent versions, job association and every document download.

### Integrations and limitations

Resume composition and suggestions work locally. Live Gemini inference remains limited to the cover-letter and interview features. GEMINI_API_KEY and GEMINI_MODEL belong in this workspace's backend environment. The current verification environment reports **Gemini is not configured**, so live inference remains pending. Earlier saved letters and their export/edit flows remain available.

LinkedIn profile text can be pasted. A browser extension, automated LinkedIn access and a conversational AI resume agent are outside this local implementation. Import field extraction follows the existing parser and requires user review.

The displayed subscription remains a local simulation. No billing, email or deployment service is called.

### Architecture and checks

The guided UI is in public/resume-workflow.js, with scoped styles in public/style.css and integration in public/app.js. Authenticated routes in server.mjs call features/resume-workflow.mjs. features/resume-pdf.mjs renders a temporary local file through a private headless browser profile. Version metadata is stored in existing record JSON, without a schema migration. Existing records and access rules remain in place.

Verification artifacts are saved under workflow-verification. All 31 SaaS tests pass. All nine new workflow tests pass, including import/export, version preservation, fact-only suggestions, highlighted-role validation, limits and account/client isolation. Live browser checks cover the connected workflow, exports, persistence and mobile layout. The protected engine suite has 129 passing tests and one failure caused by the missing fixture engine/qa-artifacts/import-check/word-tables-attempt-2.json. No engine source was edited to resolve that missing fixture.

The original and preserved engine each match all 114 source/configuration baseline hashes, and the original Git status matches its baseline.

Official workflow references reviewed:
- https://www.rezi.ai/rezi-docs/create-resume
- https://www.rezi.ai/rezi-docs/download-resume
- https://www.rezi.ai/rezi-docs/ai-cover-letter-generator-explained
- https://www.rezi.ai/rezi-docs/the-rezi-score-explained

---

# Premium authentication — local setup

The active workspace is **D:\ATS-Rover-Clerk\resume-saas-local**. The earlier D:\resume-saas-local path was moved inside ATS-Rover-Clerk. This section supersedes older auth-screen descriptions below. The original project and preserved engine remain unchanged.

## Start

```cmd
cd /d D:\ATS-Rover-Clerk\resume-saas-local
npm start
```

Open http://127.0.0.1:3210/#login. The page has a centred 1200px two-column showcase, a 490px login card, responsive mobile layout and the requested restrained purple palette. Demo accounts and passwords remain documented below for local testing but are no longer displayed on the auth page. The existing landing-page source is not changed.

## Email sessions

Existing signup/login/logout and the existing scrypt password hashes are preserved. Remember me uses the existing seven-day server session expiry and an HttpOnly, SameSite=Strict cookie with Max-Age=604800. Unchecked Remember me omits Max-Age, giving a browser-session cookie while keeping the same upper server-side expiry. Existing API clients that omit remember retain the earlier seven-day behaviour. Password visibility is a browser-only control. Normal form validation and errors are shown inline.

## Google sign-in configuration

Google OAuth credentials are **not configured** at delivery; no live Google login is claimed. The UI shows the Google logo with a disabled Continue with Google button and a clear configuration-required state. The provider flow is implemented and verified with signed fictional ID tokens and a mocked transport.

Create a Google OAuth Web application client using your own Google Cloud account, then add these backend-only values to the existing .env.local file in THIS workspace. Do not put them in engine, wrapper-next, browser code or public environment variables:

```dotenv
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:3210/api/auth/google/callback
```

Register that exact redirect URI in the Google client. Restart npm start. Configure consent/test users as required by your Google project. No Google console resources or external accounts were modified by Codex. If you start sign-in at localhost:3210 while the redirect uses 127.0.0.1, the backend first moves the flow to its configured canonical loopback origin so the security cookie matches.

The server uses authorization code flow with PKCE, state, nonce, browser binding and ten-minute one-use challenges. The official google-auth-library verifies the ID token signature, issuer, audience and expiry; the adapter additionally checks nonce and verified email. Tokens are exchanged only with oauth2.googleapis.com/token, signing certificates are fetched only from www.googleapis.com/oauth2/v1/certs, and redirects are rejected by the private backend transport. Access/refresh tokens are not stored. All unrelated external integrations remain blocked as before.

A new verified Google identity gets the normal separate personal organisation. An existing email account is NEVER silently merged: Google verification first produces a five-minute pending link, and the user must authenticate with the existing local password for the same email before linking. Organisation roles, assignments and permissions are not changed. Existing Google subject links then sign in to that exact local user.

Official references: https://developers.google.com/identity/openid-connect/openid-connect and https://developers.google.com/identity/branding-guidelines .

## Functional development-only password recovery

No email is sent. Forgot password opens a local recovery form with an explicit no-email explanation. Submit an email, then ask the person running this local app to retrieve the one-time recovery link using:

```cmd
cd /d D:\ATS-Rover-Clerk\resume-saas-local
npm run auth:inbox -- you@example.com
```

This command reads the PRIVATE local recovery inbox. The link is never returned by the unauthenticated HTTP request, written to application logs, exposed by a web download endpoint, or stored in browser localStorage. Open the link in the browser and enter a new password twice. The token is in the URL fragment and is immediately removed from browser history by the client; it is then held only in page memory until submitted. Links expire after fifteen minutes, are single-use, and are invalidated by a newer request. The backend stores only token hashes and revokes all of that user's earlier sessions after a successful password change. Known and unknown email requests return the same response; requesting a link does not claim that email was delivered.

The auth metadata database and inbox are isolated under data/auth-private. On Windows their directory ACL is restricted to the current user and SYSTEM; on POSIX it uses 0700 directory and 0600 inbox-file permissions. The app never serves this directory. Only a person with local filesystem access can retrieve a recovery link; this is an intentional trusted-development workflow, NOT production email recovery. It is disabled with NODE_ENV=production or LOCAL_AUTH_RECOVERY=false. Keep the app bound to loopback. The main application database schema is unchanged; auth challenges/identity links live in a separate SQLite file.

## Checks

22 local tests and 24 actual HTTP checks passed. They cover existing SaaS flows, email registration/login, remembered and session cookies, one-use reset, expiry, confirmation, session revocation, account enumeration prevention, CSRF/origin checks, Google missing-config behaviour, signed-token verification, state/binding/PKCE/nonce/audience checks and secure account linking. Existing saved rows are compared with premium-auth-verification/baseline.json. Original/engine verification uses the existing 114-file integrity baseline.

Live Google OAuth remains pending credentials and user consent. Local password recovery is functional and does not send emails. No original-project edits, Git publishing or deployment occurred.

---

# Gemini cover letters and interview preparation

This section supersedes the older demo-only descriptions below ONLY for these two features. The protected resume engine, ATS logic, billing, notifications and other providers remain unchanged. Latest requested white/mint application styling is active.

## Start and configure

Node 22.18+ is supported. Dependencies include official `@google/genai` 3.6.1, `docx` 9.5.1 and `pdfkit` 0.17.2. There is no configured Gemini key at delivery; live verification is pending.

```powershell
cd D:\ATS-Rover-Clerk\resume-saas-local
Copy-Item .env.example .env.local
# Edit .env.local locally and enter your Gemini API key.
# GEMINI_MODEL defaults to gemini-3.5-flash-lite; override with a compatible available model.
npm start
```

Use the environment file only if it does not already exist; do not overwrite existing keys. You can instead set GEMINI_API_KEY/GEMINI_MODEL in the backend process environment. Restart the local backend after configuration. No key is exposed in status JSON, browser code/storage, screenshots or application logs. Configuration is captured privately before the existing resume runtime's environment is scrubbed. Do not add provider credentials under wrapper-next or engine.

Links: http://127.0.0.1:3210/#cover-letter and http://127.0.0.1:3210/#interview-prep. The existing navigation and Jobs buttons lead to the upgraded modules. Login may open Dashboard; choose the desired screen after sign-in.

## Cover letters

Select an existing candidate resume/version, optionally a saved job or pasted JD, role and company. Saved-job selection fills the existing associated resume, role, company and JD. Candidate facts come from the selected resume, not other client profiles. Contacts are appended locally from that resume, omitted when unavailable, and excluded from Gemini input.

Generate produces validated body paragraphs with exact resume evidence. A second Gemini factual-support audit and local numerical/evidence checks reject unsupported drafts before saving. The request treats resume/JD/answers as untrusted source data, never instructions. Human review remains necessary; automated evidence/audit checks are safeguards, not a mathematical guarantee of factual correctness.

The paper is plain white A4 with 24 mm margins, Arial 11 pt, left-aligned black text, approximately 1.15 line height, paragraph gaps, Hi, and a locally constructed signature. Only Kind regards, is bold. Available email is a blue underlined mailto link. No title, logo, date, address, heading, tables or decoration. Sparse resumes produce shorter letters instead of invented experience. No attachment was visible in this chat, so formatting follows the detailed written specification.

Click body paragraphs to edit. Copy copies the current text. Save creates a new edited version. Regenerate explicitly creates a separate generated version; previous saved versions remain. Downloads save pending manual edits as another version first, then export exactly that version. Overlong content is rejected instead of being clipped or shrunk. DOCX/PDF exports use separate local code in features/letter-export.mjs; no protected resume exporters are changed or called for these letters. PDF generation uses local Arial fonts when available, otherwise Helvetica. The UI scales the A4 canvas to fit its panel without changing exported font size.

## Interview preparation and mocks

Choose resume/version, optional job/JD/role, English or Hinglish, and Preparation or Mock interview mode. Preparation returns 8–12 questions, normally 10, with why, answer coverage, resume-grounded suggested answers and STAR guidance. Missing personal examples are requested explicitly. No story is invented to fill a gap.

Mock mode shows one question at a time. Enter an answer, request Gemini feedback, retry, continue or finish. Feedback covers relevance, clarity, structure and examples; it includes improvements and an improved answer based only on the resume and confirmed submitted answer. Multiple attempts and feedback are retained. Save answer/Continue/Finish persist local progress; retry does not delete earlier feedback. Sessions are linked to the owning candidate, selected resume and job, and survive restart. Previous demo practice is retained in a clearly labelled legacy section.

Feedback is coaching guidance, without hiring guarantees or official Google assessment claims.

## Network, validation and permissions

Only the private official SDK transport can POST to `https://generativelanguage.googleapis.com/v1beta/models/<configured-model>:generateContent`. It rejects alternate hosts/paths/methods and redirects. The general external network block stays in place, including for protected resume routes, payments and notifications. The browser cannot call Google directly.

The SDK uses models.generateContent with responseMimeType application/json, responseJsonSchema, no tools, no automatic continuation, explicit backend API key, a 22-second per-attempt timeout, SDK retries disabled and at most one bounded application retry for transient 500/502/503 errors. Quota, timeout, invalid JSON/schema and factual-audit failures have explicit errors; no demo fallback is substituted. A successful generation or feedback request uses one generation and one factual-audit call; provider retries are bounded. The local simulated plan counter remains the pre-existing demo counter and is not a Gemini billing estimate.

New records reuse the existing records table (`cover-letter`, `interview-session`) with no schema migration. All generation, edits, progress, feedback and DOCX/PDF downloads enforce the existing server-side organisation/owner/staff-assignment permissions. The generic record-write API cannot bypass the feature validators. Old profiles, resumes, jobs and practice records are preserved.

## Verification and sample previews

- 14 local tests passed: existing SaaS workflows plus new provider-mocked feature/error/permission/export checks.
- 26 HTTP checks passed, including official SDK serialization through a fake private transport, cross-user/org generation/save/download restrictions, missing-key paths and unchanged payment blocking.
- 34 focused original-engine regression tests passed. Original/copied engine integrity: 114/114 source/config/lockfile hashes and original Git status unchanged.
- Browser checked missing-key errors, job prefill, letter editing/new version save, Copy, candidate signature isolation and saved mock feedback.
- New PDF rendered as exactly one unclipped A4 page; visually inspected. DOCX content, OOXML structure, Arial font, margins, line spacing and email hyperlink verified. Native DOCX raster verification is pending: bundled LibreOffice is unavailable and an existing Word session was left alone. No PDF behavior of the protected resume engine was altered.
- Existing data rows are compared against ai-verification/data-baseline.json. Added records belong only to a separate fictional verification organisation.

To inspect populated screens without a key, use ai.preview@demo.local / FictionalPreview!2026 and select Avery Stone or Riley Lake. These separately seeded records are explicitly marked **Offline test fixture — not live AI**. They were created with injected mocked SDK responses in a test helper; there is no fake-generation endpoint or demo fallback in the running application. Their feedback is offline test output. The normal generation button still reports Gemini is not configured.

Tests: `npm test`; `node ai-verification/verify-http.mjs` (app must run on 3210). PDF QA and screenshots are under ai-verification. Live Gemini inference was not performed because no key was available. Billing/notifications remain simulated. No original-project edits, Git commits/pushes/PRs or deployment occurred.

Official references checked: [Google Gen AI SDK](https://googleapis.github.io/js-genai/release_docs/index.html), [GenerateContentConfig](https://googleapis.github.io/js-genai/release_docs/interfaces/types.GenerateContentConfig.html), [structured responses](https://ai.google.dev/gemini-api/docs/structured-output), [model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite).

---

## Earlier local SaaS setup reference

# AI Resume Maker — isolated local SaaS

Workspace: D:\ATS-Rover-Clerk\resume-saas-local. Original: D:\ATS-Rover-Clerk\rover-resume (read-only).

## Run

Requires Node 22.18+ (built-in experimental SQLite) and Python 3 for integrity checks.

```powershell
cd D:\ATS-Rover-Clerk\resume-saas-local
npm ci --cache .npm-cache --no-audit --no-fund
npm start
```

Open the printed LOCAL_SAAS_URL, normally http://127.0.0.1:3210. If occupied, the app selects the next available port through 3230 without stopping any process. LOCAL_PORT sets the starting port. Only 127.0.0.1 is bound. First editor load compiles Next.js and may take several seconds.

Stop: Ctrl+C in the terminal running npm start. Restart: same npm start command. The live preview started by Codex is a retained process; its PID is recorded in preview-process.json. To stop just that preview, verify its recorded command line with Get-CimInstance Win32_Process and then Stop-Process -Id <that PID>. Do not stop other Node processes.

## Fictional demo accounts

All use password `LocalDemo!2026`:

- owner@demo.local — Team organisation owner (Morgan Ellis).
- staff@demo.local — staff assigned to Alex only (Taylor Reed).
- candidate@demo.local — Alex; own data only.
- private@demo.local — Jamie; not assigned to staff.
- other@demo.local — separate isolated Free organisation.

Use fictional data only. New signups create independent Free organisations with an owner account. There are no invitation emails. A Team owner creates local candidate/staff accounts in Team and assigns candidates to staff. The Working with selector changes which candidate workspace you are editing. Review Queue spans documents that the reviewer is authorised to see.

## Working flows

1. Profile: save verified background and skills.
2. Documents: save text resume versions, or open the existing editor. The wrapper's Save editor as new version button persists the current editor snapshot to SQLite. Editor drafts alone use namespaced browser storage. Open a saved document to resume editing; snapshots create new independent versions. Nothing changes a job to Applied automatically.
3. Jobs: save company, role, JD, link, notes, deadline and follow-up. Associate a resume version belonging to that candidate. Save edits explicitly.
4. Draft from saved profile: creates editable cover-letter/application-answer templates using only saved facts plus visible placeholders. Save application to persist them. Demo generation consumes shared draft allowance.
5. Interview Prep: create JD/profile prompts, use STAR guidance and save editable practice answers.
6. Documents: submit for review and add comments. Assigned staff/owners on Team can approve or request changes in Review Queue. Editing content invalidates an earlier approval.
7. Account: simulate Free/Pro/Team upgrade, downgrade or cancellation. No card collection and no actual money. Cancellation immediately switches to Free. Existing data stays accessible when over allowance; new documents/drafts are blocked server-side.

## Architecture and isolation

- `engine/`: 114 sanitized source/config/assets copied byte-for-byte, including original uncommitted code. Never edited. No .git, .env credentials, dependencies, production DBs, customer documents, QA response archives or build caches copied. Engine dependencies install in this workspace root.
- `wrapper-next/`: NEW Next route files mount the unchanged engine editor on the client and re-export its layout and local DOCX parse/validate routes. Its own config aliases Clerk's client interface to the local session adapter. A one-time factory adapter seeds the selected saved version because the original editor intentionally clears drafts on mount; subsequent New actions still use the original blank factory.
- `server.mjs`: custom loopback HTTP gateway, session checks, same-origin/Host validation, API allowlist, local source-preserving import and analysis adapters, CSP and external network denial. Clears integration credentials from the process environment. No original server/API/payment handlers are mounted except explicitly local DOCX routes.
- `store.mjs`: local SQLite WAL database, scrypt password hashes with random salts, random HttpOnly SameSite=Strict session cookies, hashed session tokens with seven-day expiry, login throttling. Server-side organisation/owner/staff-assignment permissions apply to all record reads/writes and TXT/JSON/DOCX downloads. Candidates cannot change plans or manage members. Staff see only assigned candidates. Owners see their organisation. Team collaboration requires Team plan.
- `public/`: framework-free SaaS wrapper with original purple/dark visual style, responsive navigation, empty/error/loading states. Existing editor remains inside an iframe. Editor browser drafts are namespaced per authenticated account, candidate and source version; the gateway validates the namespace owner. Browser storage is cleared on UI logout.
- `data/local.sqlite`: durable local accounts, profiles, documents, jobs, practice, review comments, assignments, plans and counters. Passwords are never stored as plaintext. Do not remove this file if you want to retain data. Test-only SQLite files live under data/test-* and are separate from application data.

## Fully local versus simulated

Fully functional: signup/login/logout, persistence, profile/document/job/practice CRUD, version association, stage changes, deadlines/in-app reminder dashboard, local document reviews, permissions, text/JSON/DOCX download, editor and deterministic ATS scoring.

Simulated: all billing, AI drafting and notifications. No emails, external databases, remote AI, payment calls or deployments. Drafts are deterministic templates, not actual AI output. Usage is an organisation-wide lifetime demo counter (Free: 3 docs/5 drafts; Pro: unlimited documents and demo drafts; Team: 300/1000); no monthly reset or charges. Local text import keeps source verbatim in a custom section rather than asking a provider to restructure it. Local tailoring returns the current resume with unchanged deterministic analysis; automatic rewriting is intentionally unavailable to avoid inventing facts. Existing editor buttons may retain inherited Gemini/AI wording; the visible wrapper notice clarifies all output is local demo.

Remote DocRaptor and native Office automation are not run. Generic editor client PDF fallback is retained; template-specific server PDF can report unavailable. Browser Print to PDF and DOCX/TXT remain alternatives. Native PDF conversion is a known limitation. No live AI capability is verified.

This is a local demonstration, not an internet deployment: no password reset emails, OAuth, MFA or production account lifecycle. Job links are saved as text; nothing submits applications. Reminders appear in-app while viewing Dashboard; no background notifications.

## Verification

```powershell
npm test
node verify-http.mjs
node verify-local-export.mjs
npm run test:engine
npm run integrity
```

The DOCX round-trip verification uses the fictional browser-created snapshot; download, OOXML validation, import, text recovery and server validation all passed. Browser verification also passed for login, persisted sessions after restarts, editor snapshot save, job/version association, Ready to Apply stage, review approval/comment, draft editing and interview answer persistence.

HTTP verification expects the app on 3210 and creates an isolated fictional test organisation. Tests record results in saas-test-results.txt and http-test-results.json. Store tests use separate databases and verify reopening persistence, sessions, limits, ownership, assignments, review flows and drafting. Original engine tests: 129/130 passed; one offline Gemini replay test references excluded QA response fixtures (`engine/qa-artifacts/import-check/*.json`). Those archives were not copied because they may contain non-fictional candidate data. Neither the test nor resume engine is modified to hide the limitation.

`baseline-sha256.json`, `baseline-git-status.txt` and `integrity-result.json` establish/compare original source/config/lockfile integrity and copied source integrity. Baseline uncommitted changes: app/homepage.css, app/page.jsx, components/ResumeBuilder.jsx. No reset, restore, clean or stash was used. Credentials and runtime/generated directories are outside the source manifest. No Git initialization, commit, publish, remote changes or hosting deployment occurred.

## Universal ATS extension (staged)

Edited guided fields use mint/green highlights, with preview-only change marks. Downloads remain black. The new Review & Export ATS panel invokes the isolated Python rule engine for diverse role families and transparent conservative scores. See [backend/README.md](backend/README.md) for setup, architecture and explicit unfinished capabilities. This is not yet the complete production-ready product specified in the master prompt.

## Resume management

Dashboard and My Resumes offer Edit, Rename, Duplicate, Delete and Undo. Use Update this resume to update the current record; Save as new version preserves a separate active version. Previous update content is retained in internal revision records. Delete removes the active resume and frees its slot while retaining its source for linked letters/interviews; it is reversible via Undo. Mutations enforce existing access permissions and reject stale updates. See resume-crud-verification/README.md for validation details.

## ATS score and improvement workspace (current extension)

Dashboard → Improve ATS and the ATS score & improve navigation open a working resume preview with local score breakdown, reviewable suggestions, Apply & re-score, Undo, confirmed keyword evidence, explicit update/version save, and PDF/Word export. This is a limited local estimate, not a cloned Rezi score or a guaranteed ATS result. See [ats-optimizer-verification/README.md](ats-optimizer-verification/README.md) for the formula, supported operations, public reference links, limitations and browser/export/security evidence.
