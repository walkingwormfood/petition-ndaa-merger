// GET /api/confirm?t=<token> — flip a signature to confirmed.
export async function onRequestGet({ request, env }) {
  const t = new URL(request.url).searchParams.get("t") || "";
  if (!/^[0-9a-f]{48}$/.test(t)) return page("Invalid link.");
  const r = await env.DB.prepare(
    "UPDATE signatures SET confirmed = 1, confirmed_at = datetime('now') WHERE confirm_token = ? AND confirmed = 0"
  ).bind(t).run();
  return page(r.meta.changes ? "Your signature is confirmed. Thank you — it will be delivered with your state's batch."
                             : "This link was already used or has expired.");
}
const page = (m) => new Response(
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
   <body style="background:#0d0f12;color:#e8e6e1;font:18px/1.6 Georgia,serif;display:grid;place-items:center;min-height:90vh">
   <p style="max-width:32em;padding:1em">${m}</p>`,
  { headers: { "Content-Type": "text/html; charset=utf-8" } });
