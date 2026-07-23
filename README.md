# Petition: No Military Merger Without Debate

Single-page constituent petition (reject Senate §1217 / strike House §219, FY2027 NDAA)
with double-opt-in signatures, D1 storage, and per-state delivery exports.
Same stack as the FAFO sites: Cloudflare Pages + Functions.

## Before launch — fill in

1. `index.html` footer: replace `[YOUR NAME / PROJECT NAME]` and `[CONTACT EMAIL]`.
2. Pick a domain / Pages subdomain.

## Deploy

```
wrangler d1 create petition
wrangler d1 execute petition --remote --file=schema.sql
```

Create the Pages project (connect this folder's repo, or `wrangler pages deploy .`), then in
**Pages > Settings > Functions**:
- D1 binding: `DB` -> the `petition` database
- Env vars: `SITE_URL` = your full site URL (no trailing slash); `MAIL_FROM` = the sending address

Email goes out via MailChannels (free from Workers/Pages). Add their SPF/Domain Lockdown DNS
records for your domain per MailChannels' current docs, or swap the `fetch` in
`functions/api/sign.js` for your preferred provider (Resend, Postmark, SES).

## Test before sharing

1. Sign with your own email; confirm the link flips you to confirmed:
   `wrangler d1 execute petition --remote --command "SELECT email, confirmed FROM signatures"`
2. Check the unconfirmed-cleanup promise is kept (run occasionally, or cron it on the Orin):
   `wrangler d1 execute petition --remote --command "DELETE FROM signatures WHERE confirmed = 0 AND created_at < datetime('now','-30 days')"`

## Delivery

```
wrangler d1 execute petition --remote --command "SELECT name, zip, addr, confirmed_at FROM signatures WHERE confirmed = 1" --json > confirmed.json
python export_delivery.py confirmed.json
```

`delivery/_summary.txt` gives per-state counts for cover letters; `delivery/<STATE>.csv` is each
Senate office's packet. For the formal House presentation, hand the full set to the presenting
member's office (Massie / Khanna / AOC are the receipted opponents).

## Data-handling promises made on the page (keep them)

- Data used ONLY for congressional delivery; never sold/shared.
- Unconfirmed entries deleted after 30 days (command above).
- Deletion requests honored via the contact email:
  `wrangler d1 execute petition --remote --command "DELETE FROM signatures WHERE email = 'x@y.z'"`
- Updates emails only to `updates = 1` opt-ins, always with an unsubscribe.
