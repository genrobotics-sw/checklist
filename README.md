# G-list — Checklist Flow

G-list is a mobile-first checklist/audit management app. Admins build reusable checklist templates and assign them to field operators; operators fill them out (with photo/video evidence) on their phones; admins/reviewers approve or reject submissions and pull reports (CSV/PDF, including monthly audit matrices).

- **Live:** deployed on Vercel (see [Deployment](#deployment))
- **Repo:** `github.com/genrobotics-sw/checklist`
- **Stack:** Next.js 16 (App Router) · React 19 · Prisma 5 + PostgreSQL (Supabase) · Supabase Auth & Storage · Tailwind · nodemailer

> ⚠️ **This project runs on a pre-release Next.js version with breaking changes from what you may know** (see `AGENTS.md`). Notably: `src/proxy.ts` replaces the conventional `middleware.ts`, and `after()` from `next/server` is used for background work — both are load-bearing, not optional style choices. Check `node_modules/next/dist/docs/` before assuming standard Next.js behavior.

---

## Table of contents

1. [Roles & Auth](#roles--auth)
2. [Data model](#data-model)
3. [Employee (Operator) workflow](#employee-operator-workflow)
4. [Admin / Reviewer workflow](#admin--reviewer-workflow)
5. [Reports & exports](#reports--exports)
6. [API routes](#api-routes)
7. [Storage (photos/videos)](#storage-photosvideos)
8. [Email](#email)
9. [Environment variables](#environment-variables)
10. [Local development](#local-development)
11. [Deployment (Vercel + Supabase)](#deployment-vercel--supabase)
12. [Known issues / things to clean up](#known-issues--things-to-clean-up)

---

## Roles & Auth

Three roles, stored on `profiles.role`:

| Role | Access |
|---|---|
| **OPERATOR** | `/employee/**` only. Fills out assigned checklists. (Codebase still calls this "employee" in folder/file names — `OPERATOR` is the current name, treat as synonymous.) |
| **ADMIN** | Full `/admin/**` access — templates, assignments, employees, reports, submissions. Blocked from `/employee/**`. |
| **REVIEWER** | Only `/admin/submissions*` and `/admin/profile*` — can review/approve/reject but can't manage templates, assignments, or employees. |

**Session & role enforcement** happens in [src/proxy.ts](src/proxy.ts) (this project's replacement for `middleware.ts`, runs on every request except static assets):
- Verifies the Supabase session (`supabase.auth.getUser()`).
- Caches the resolved role in a short-lived (5 min) HttpOnly cookie to avoid a DB hit per request; falls back to querying `profiles.role` on cache miss.
- Redirects unauthenticated users to `/login`; redirects already-logged-in users away from `/login`/`/forgot-password` based on role.
- Enforces the per-role path rules in the table above.

Individual pages sometimes add a redundant server-side role check (e.g. `admin/employees/page.tsx`), but `proxy.ts` is the primary gate.

Login: `src/app/(auth)/login/page.tsx` calls Supabase `signInWithPassword`, looks up the profile's role, and routes to `/admin/dashboard` (ADMIN) or `/employee/dashboard` (everyone else). Password reset uses Supabase's `resetPasswordForEmail`/`updateUser` flow.

---

## Data model

Defined in [prisma/schema.prisma](prisma/schema.prisma). Core flow: **Template → Assignment → Submission → SubmissionItem (+ Photo/Video) → StatusHistory/Comment**.

```
Profile (OPERATOR|ADMIN|REVIEWER)
  └─ ChecklistAssignment (template × operator, optional due date)
       └─ ChecklistSubmission (1:1 with assignment; DRAFT → SUBMITTED → APPROVED|REJECTED)
            ├─ SubmissionItem (1 per ChecklistItem — isChecked, note)
            │    ├─ Photo (0..n, tied to submission and/or a specific item)
            │    └─ Video (0..n)
            ├─ Comment (review comments)
            └─ StatusHistory (audit trail of status transitions)

ChecklistTemplate (title, category, isAuditTemplate)
  └─ ChecklistItem (label, REQUIRED|OPTIONAL, requiresPhoto, requiresVideo, sortOrder)
```

- `ChecklistSubmission.status`: `DRAFT → SUBMITTED → APPROVED` or `REJECTED` (rejected submissions can be edited and resubmitted).
- `ChecklistTemplate.isAuditTemplate` flags templates that should show up in the monthly audit-matrix report (see [Reports](#reports--exports)).
- Photos/Videos store a `storagePath` (Supabase Storage key) + metadata, not the file itself.

---

## Employee (Operator) workflow

1. **Discover** assigned tasks on `/employee/dashboard` ("Needs Action") or `/employee/checklists` (grouped: needs-action vs submitted).
2. **Fill out** at `/employee/checklists/[id]` ([ChecklistForm.tsx](src/app/employee/checklists/[id]/ChecklistForm.tsx)):
   - Required **Location** text field, live progress bar (% of REQUIRED items checked).
   - Each item: checkbox, notes field, and (if flagged) photo/video capture.
   - **Photos**: captured image → [PhotoAnnotator.tsx](src/app/employee/checklists/[id]/PhotoAnnotator.tsx) (canvas draw-over annotation) → client-compressed (`browser-image-compression`: max 1MB, max 1600px dimension, quality 0.85) → uploaded to the `checklist-photos` bucket with retry logic (3 attempts, 30s timeout each).
   - **Videos**: capped at 50MB and ≤10 seconds (checked client-side by reading `<video>` element duration — this is a validation gate only, **not** a compression/trim step; the raw camera file uploads unmodified up to those caps) → uploaded to `checklist-videos`.
   - If a submission was previously **rejected**, the reviewer's comment shows in a banner above the items.
3. **Save Draft** (no validation) or **Submit for Review** (validates location + all REQUIRED items checked with their required media attached).
4. Once `SUBMITTED` or `APPROVED`, the form locks (read-only). `REJECTED` submissions stay editable for resubmission.

---

## Admin / Reviewer workflow

- **Employees** (`/admin/employees`, ADMIN only) — create accounts (email/password/role) via [EmployeeManager.tsx](src/app/admin/employees/EmployeeManager.tsx); deactivate existing ones.
- **Templates** (`/admin/templates`, ADMIN only) — build/edit checklists: title, category, description, `isAuditTemplate` flag, and an ordered list of items (REQUIRED/OPTIONAL, requires-photo, requires-video).
- **Assignments** (`/admin/assignments`, ADMIN only) — assign a template to one or more operators with an optional due date.
- **Submissions** (`/admin/submissions`, ADMIN + REVIEWER) — view every answer + evidence media for a submission; **Approve** or **Reject** (rejection requires a comment, surfaced back to the operator).

---

## Reports & exports

### `/admin/reports` — org-wide
- Stat cards (Approved/Rejected/Pending/Draft) + filters (status, template, date range).
- Per-operator submission counts linking to individual reports.
- Full submissions table with CSV/PDF export ([ExportButtons.tsx](src/app/admin/reports/ExportButtons.tsx)) of the currently filtered set — CSV includes per-photo public URLs; PDF (landscape, `jspdf`+`jspdf-autotable`) links photo counts to the submission detail page.

### `/admin/reports/operator/[id]` — per-operator
- Stat cards including **Approval Rate %**; same filters, scoped export ([OperatorExportButtons.tsx](src/app/admin/reports/operator/OperatorExportButtons.tsx)).
- **Monthly Audit Report** ([AuditReportSection.tsx](src/app/admin/reports/operator/AuditReportSection.tsx)) — only shown if at least one `isAuditTemplate: true` template exists. Pick a template/month/year → renders a matrix (checklist items × calendar days, ✓/✗ per day based on that day's submission) fetched from `GET /api/reports/operator/[id]/audit`, exportable as PDF.

Both CSV exports are prefixed with a UTF-8 BOM so Excel renders special characters (e.g. the `—` placeholder for missing dates) correctly instead of as garbled text.

---

## API routes

All routes: `createClient()` (Supabase server client, [src/lib/supabase/server.ts](src/lib/supabase/server.ts)) → `auth.getUser()` → 401 if absent → role check against `profiles.role` → zod-validate body → Prisma read/write → `{ data }` / `{ error }` JSON.

| Route | Methods | Notes |
|---|---|---|
| `/api/assignments` | `POST` | ADMIN only. Creates assignments + empty DRAFT submissions in a transaction; emails assignees in the background. |
| `/api/submissions/[id]` | `POST` | Submission owner only. Saves draft or submits for review; syncs photos/videos, writes `StatusHistory` on submit, emails ADMIN/REVIEWER in the background. |
| `/api/submissions/[id]/review` | `POST` | ADMIN/REVIEWER only. Approve/reject (+ optional/required comment); emails the operator in the background. |
| `/api/templates` | `GET`, `POST` | GET: any authenticated user. POST: ADMIN only, creates template + nested items. |
| `/api/templates/[id]` | `GET`, `PUT` | PUT (ADMIN only) diffs items: soft-deletes removed ones, upserts the rest. |
| `/api/employees` | `POST`, `DELETE` | ADMIN only. Uses the Supabase **service-role** admin client to create/ban/delete auth users, then syncs the `profiles` row via Prisma. |
| `/api/profile` | `PUT` | Any authenticated user updates their own fullName/phone/department. |
| `/api/reports/operator/[id]/audit` | `GET` | Backing data for the monthly audit matrix (`?templateId=&month=&year=`). |

### Background work: `after()`
On Vercel, a serverless function can be frozen the instant its response is sent — a plain un-awaited promise gets killed mid-flight. Every email send in the routes above is wrapped in Next's `after()` (from `next/server`) so it's guaranteed to run to completion **after** the response is returned, instead of racing the function's teardown. This bit us in production once already — see [Known issues](#known-issues--things-to-clean-up) history below if you're touching this code.

---

## Storage (photos/videos)

Two public Supabase Storage buckets, created in [supabase/migrations/00_setup.sql](supabase/migrations/00_setup.sql):
- `checklist-photos`
- `checklist-videos`

Files are named `${submissionId}/${itemId}-${Date.now()}.${ext}`. Public URLs are constructed as:
```
${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/<bucket>/<storagePath>
```
When a submission is edited, `/api/submissions/[id]` diffs old vs new media paths and deletes orphaned files from storage. The admin dashboard also runs a raw SQL query against `storage.objects` to show total media storage usage against a 1GB soft cap.

---

## Email

[src/lib/email.ts](src/lib/email.ts) sends via **nodemailer over Gmail SMTP** (explicit `smtp.gmail.com:465`, not the `service:'gmail'` shorthand — chosen for more reliable behavior on serverless, with 10s connect/greeting/socket timeouts so failures surface fast instead of hanging).

- Requires `SMTP_EMAIL` + `SMTP_PASSWORD` (a Gmail **App Password**, not the account password — needs 2FA enabled on the Google account).
- If either is missing, `sendEmail()` logs a "MOCK EMAIL" block instead of throwing — safe no-op for local dev without SMTP configured. On production this can silently mask a real config problem, so if emails aren't arriving, check the Vercel Function logs for `[EMAIL FAILED]` (includes SMTP `code`/`command`/`response`) vs total silence (env vars missing → mock path).
- All call sites use `after()` — see above.

> The `resend` npm package and `RESEND_API_KEY` env var exist in this repo but are **dead code** — an earlier plan to use Resend that was abandoned in favor of nodemailer. Safe to remove.

---

## Environment variables

| Variable | Used for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client/server/admin clients; public storage URL construction |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client/server clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin Supabase client (`/api/employees` user management) — bypasses RLS, keep secret |
| `DATABASE_URL` | Prisma query connection — **must be Supabase's transaction-mode pooler**: port `6543`, with `?pgbouncer=true`. Using the session-mode pooler (port 5432) here will exhaust its small connection pool under serverless load (`EMAXCONNSESSION` errors) |
| `DIRECT_URL` | Prisma **migrations only** — direct/session connection, port `5432`, no `pgbouncer=true` |
| `NEXT_PUBLIC_APP_URL` | Should be the deployed site's URL in production (e.g. `https://checklist-xyz.vercel.app`); `http://localhost:3000` locally |
| `SMTP_EMAIL` / `SMTP_PASSWORD` | Gmail SMTP sending — App Password required |

Not in `.env.local.example` currently but required: `SMTP_EMAIL`, `SMTP_PASSWORD` — the example file is out of date, add them there.

`RESEND_API_KEY` can be deleted — unused (see [Email](#email)).

---

## Local development

```bash
npm install          # runs `prisma generate` automatically via postinstall
cp .env.local.example .env.local   # then fill in real values — see table above
npm run dev           # next dev --turbopack, http://localhost:3000
```

Requires Node ≥ 22 (`package.json` `engines`).

`next.config.ts` allows a couple of hardcoded LAN IPs and `*.devtunnels.ms` in `allowedDevOrigins` (for testing from a phone on the same network, or via VS Code dev tunnels, without host/origin mismatch errors on Server Actions). Update the IPs if you're on a different network.

---

## Deployment (Vercel + Supabase)

1. Import the GitHub repo into Vercel ([vercel.com/new](https://vercel.com/new)), framework auto-detects as Next.js.
2. Set all env vars from the table above in **Production** scope (Settings → Environment Variables). Double check:
   - `DATABASE_URL` uses the **6543 / pgbouncer=true** pooled connection, not the direct one.
   - `NEXT_PUBLIC_APP_URL` is the real deployed URL, not `localhost`.
3. `postinstall: prisma generate` in `package.json` ensures the Prisma Client is generated on every Vercel build (without it, builds fail with a stale-client error since Vercel caches `node_modules`).
4. In Supabase → Authentication → URL Configuration, add the deployed URL to Site URL / Redirect URLs.
5. Deploy. Check Vercel's **Logs** tab (per-request → expand → look at "External APIs" and any console output) if something that works locally doesn't work in production — most cross-environment bugs here have been serverless-specific (see below).

---

## Known issues / things to clean up

- **`resend` package + `RESEND_API_KEY`** — dead code, remove.
- **Duplicate Supabase admin client** — [src/lib/supabase/admin.ts](src/lib/supabase/admin.ts) exports `createAdminClient()` which is never imported; [src/app/api/employees/route.ts](src/app/api/employees/route.ts) defines its own inline duplicate instead. Consolidate.
- **`handle_new_user()` trigger role mismatch** — in [supabase/migrations/00_setup.sql](supabase/migrations/00_setup.sql), the trigger that auto-creates a `profiles` row on signup defaults `role` to the literal string `'EMPLOYEE'`, which isn't a valid value in the app's `Role` enum (`OPERATOR | ADMIN | REVIEWER`). Worth confirming this doesn't leave any user with an invalid role — new users get their role explicitly set right after by `/api/employees`, but this default is inconsistent and worth fixing at the source.
- **Hardcoded dev IPs** in `next.config.ts`'s `allowedDevOrigins` — machine-specific, update per developer.
- **`.env.local.example` is out of date** — missing `SMTP_EMAIL`/`SMTP_PASSWORD`, still lists the unused `RESEND_API_KEY`.

### Notable production bugs already fixed (context for future debugging)
These aren't current bugs, but the fixes reflect real serverless gotchas worth knowing about if something "works locally, breaks on Vercel" again:
1. **Prisma client stale on Vercel builds** — fixed by adding `postinstall: prisma generate`.
2. **Emails silently not sending in production** — root cause was fire-and-forget promises (`sendEmail(...).catch(...)`, not awaited) getting killed when the serverless function froze right after sending its response. Fixed by wrapping all background email sends in `after()` from `next/server`.
3. **Dashboard erroring with `EMAXCONNSESSION`** — `DATABASE_URL` was pointed at Supabase's session-mode pooler (port 5432, small fixed pool), which serverless functions exhaust quickly since each holds a dedicated connection. Fixed by switching to the transaction-mode pooler (port 6543, `?pgbouncer=true`), which returns connections to the pool after each query.
4. **CSV exports showing garbled characters in Excel** — missing UTF-8 BOM on the CSV `Blob`. Fixed by prefixing `'﻿'`.
