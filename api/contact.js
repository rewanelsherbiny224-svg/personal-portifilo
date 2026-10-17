// Vercel serverless function: POST /api/contact
// Sends the Contact form submission through Resend. The API key is read from
// process.env on the server only and is never sent to the browser.
//
// Required env vars (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY  Resend API key
//   CONTACT_EMAIL   where messages are delivered (comma-separate for several)
//   EMAIL_FROM      sender, e.g. "Portfolio <contact@yourdomain.com>" (domain must be verified in Resend)

const RESEND_URL = "https://api.resend.com/emails";

const TYPE_LABELS = {
  freelance: "Freelance enquiry",
  employment: "Job opportunity",
  other: "Message"
};

const LIMITS = { name: 100, email: 254, message: 5000, service: 100 };
const EMAIL_RE = /^[^\s@<>"',;:]+@[^\s@<>"',;:]+\.[^\s@<>"',;:]{2,}$/;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Strip CR/LF and control characters so user input can never inject email headers.
function oneLine(s) {
  return String(s).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
}

function send(res, status, payload) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(payload);
}

function parseBody(req) {
  const b = req.body;
  if (b && typeof b === "object" && !Buffer.isBuffer(b)) return b;
  if (typeof b === "string") {
    try { return JSON.parse(b); } catch (e) { return null; }
  }
  return null;
}

function validate(body) {
  const errors = {};
  const type = TYPE_LABELS[body.type] ? body.type : "other";
  const name = oneLine(body.name == null ? "" : body.name);
  const email = oneLine(body.email == null ? "" : body.email);
  const message = String(body.message == null ? "" : body.message).replace(/\r\n/g, "\n").trim();
  const service = oneLine(body.service == null ? "" : body.service).slice(0, LIMITS.service);

  if (!name) errors.name = "Please enter your name.";
  else if (name.length > LIMITS.name) errors.name = "Name is too long (max " + LIMITS.name + " characters).";

  if (!email) errors.email = "Please enter your email.";
  else if (email.length > LIMITS.email || !EMAIL_RE.test(email)) errors.email = "Please enter a valid email address.";

  if (!message) errors.message = "Please write a message.";
  else if (message.length < 10) errors.message = "Please write at least 10 characters.";
  else if (message.length > LIMITS.message) errors.message = "Message is too long (max " + LIMITS.message + " characters).";

  return { errors, values: { type, name, email, message, service } };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { ok: false, code: "method_not_allowed", error: "Method not allowed." });
  }

  const body = parseBody(req);
  if (!body) {
    return send(res, 400, { ok: false, code: "bad_request", error: "Invalid request body." });
  }

  // Honeypot: real visitors never fill this hidden field. Pretend success so bots move on.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return send(res, 200, { ok: true });
  }

  const { errors, values } = validate(body);
  if (Object.keys(errors).length) {
    return send(res, 422, { ok: false, code: "validation_error", error: "Please fix the highlighted fields.", fields: errors });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = (process.env.CONTACT_EMAIL || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  const from = (process.env.EMAIL_FROM || "").trim();
  const missing = [];
  if (!apiKey) missing.push("RESEND_API_KEY");
  if (!to.length) missing.push("CONTACT_EMAIL");
  if (!from) missing.push("EMAIL_FROM");
  if (missing.length) {
    console.error("[contact] Missing environment variables: " + missing.join(", ") + " (check Vercel env var scope and redeploy)");
    return send(res, 500, { ok: false, code: "not_configured", error: "The contact service isn't configured yet." });
  }

  const label = TYPE_LABELS[values.type];
  const subject = label + (values.service ? " — " + values.service : "") + " — " + values.name;
  const text =
    label + (values.service ? " (" + values.service + ")" : "") + "\n" +
    "From: " + values.name + " <" + values.email + ">\n\n" +
    values.message + "\n";
  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#222">' +
    '<p style="margin:0 0 4px"><strong>' + escapeHtml(label) + "</strong>" +
    (values.service ? " &middot; " + escapeHtml(values.service) : "") + "</p>" +
    '<p style="margin:0 0 16px;color:#555">From ' + escapeHtml(values.name) +
    ' &lt;<a href="mailto:' + escapeHtml(values.email) + '">' + escapeHtml(values.email) + "</a>&gt;</p>" +
    '<div style="white-space:pre-wrap;border-left:3px solid #D9A7B0;padding-left:12px">' + escapeHtml(values.message) + "</div>" +
    "</div>";

  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, 10000);

  let resp;
  let data = null;
  try {
    resp = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from: from, to: to, reply_to: values.email, subject: subject, text: text, html: html }),
      signal: controller.signal
    });
    try { data = await resp.json(); } catch (e) { data = null; }
  } catch (err) {
    clearTimeout(timer);
    const timedOut = err && err.name === "AbortError";
    console.error("[contact] Resend request " + (timedOut ? "timed out" : "failed") + ": " + (err && err.message));
    return send(res, 504, { ok: false, code: timedOut ? "timeout" : "network_error", error: "Couldn't reach the email service. Please try again in a moment." });
  }
  clearTimeout(timer);

  // Success only when Resend accepted the email and returned its id.
  if (resp.ok && data && data.id) {
    console.log("[contact] Sent via Resend, id=" + data.id);
    return send(res, 200, { ok: true });
  }

  // Full Resend error goes to the Vercel logs only; the visitor gets a safe message.
  console.error("[contact] Resend rejected the email: HTTP " + resp.status + " " + JSON.stringify(data));
  if (resp.status === 429) {
    return send(res, 429, { ok: false, code: "rate_limited", error: "Too many messages right now. Please try again shortly." });
  }
  return send(res, 502, { ok: false, code: "send_failed", error: "Your message couldn't be sent. Please try again in a moment." });
};
