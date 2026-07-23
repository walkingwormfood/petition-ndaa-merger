// POST /api/sign — store an unconfirmed signature and send the confirmation email.
// Bindings (set via wrangler.toml): D1 database as DB.
// Vars: SITE_URL, MAIL_FROM, TEST_MODE ("1" = return the confirm link in the response
// instead of emailing — for pre-launch testing ONLY; unset for production).
// Production email: Resend (free tier) — set RESEND_API_KEY as an encrypted secret.

function token() {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return [...a].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return err("Bad request", 400); }
  const name = (body.name || "").trim().slice(0, 120);
  const email = (body.email || "").trim().toLowerCase().slice(0, 200);
  const zip = (body.zip || "").trim().slice(0, 10);
  const addr = (body.addr || "").trim().slice(0, 200);
  const updates = body.updates ? 1 : 0;

  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !/^\d{5}(-\d{4})?$/.test(zip))
    return err("Please provide a name, a valid email, and a 5-digit ZIP.", 400);

  const t = token();
  try {
    await env.DB.prepare(
      `INSERT INTO signatures (name, email, zip, addr, updates, confirm_token, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(email) DO NOTHING`
    ).bind(name, email, zip, addr, updates, t).run();
  } catch (e) { return err("Storage error.", 500); }

  const existing = await env.DB.prepare("SELECT confirmed, confirm_token FROM signatures WHERE email = ?")
    .bind(email).first();
  if (existing && existing.confirmed) return ok("You have already signed and confirmed. Thank you.");
  const useToken = existing ? existing.confirm_token : t;
  const link = `${env.SITE_URL}/api/confirm?t=${useToken}`;

  if (env.TEST_MODE === "1")
    return ok(`TEST MODE — confirm here: ${link}`);

  if (!env.RESEND_API_KEY)
    return err("Signature stored, but email sending is not configured yet.", 503);

  const mail = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: `Petition: No Military Merger Without Debate <${env.MAIL_FROM}>`,
      to: [email],
      subject: "One click to confirm your signature",
      text:
`You (or someone using this address) signed the petition asking the Senate and NDAA conferees to reject Section 1217 and strike Section 219.

Confirm your signature: ${link}

If this wasn't you, ignore this email and the entry will be deleted within 30 days. We will never email you again unless you opted into updates.`
    })
  });
  if (!mail.ok) return err("Signature stored but confirmation email failed — try again later.", 502);
  return ok("Confirmation sent — check your email.");
}

const ok = (m) => new Response(JSON.stringify({ message: m }), { status: 200, headers: { "Content-Type": "application/json" } });
const err = (m, s) => new Response(JSON.stringify({ error: m }), { status: s, headers: { "Content-Type": "application/json" } });
