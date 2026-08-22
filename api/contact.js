// Server-to-server proxy: forwards contact/inquiry submissions to the
// Studio admin app's intake endpoint. The intake secret only ever lives
// in this function's environment — it is never sent to or readable by
// the browser.

const INTAKE_URL = "https://studio.samsarafilmss.com/api/public/intake";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.INTAKE_API_SECRET;
  if (!secret) {
    console.error("INTAKE_API_SECRET is not set");
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  const body = req.body || {};
  const { name, email, phone, instagram, message, source } = body;

  if (typeof email !== "string" || !email.trim()) {
    return res.status(400).json({ error: "Email is required" });
  }
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Message is required" });
  }

  const payload = {
    name: typeof name === "string" ? name.trim() : "",
    email: email.trim(),
    message: message.trim(),
  };
  if (typeof phone === "string" && phone.trim()) payload.phone = phone.trim();
  if (typeof instagram === "string" && instagram.trim()) payload.instagram = instagram.trim();
  if (typeof source === "string" && source.trim()) payload.source = source.trim();

  try {
    const upstream = await fetch(INTAKE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-intake-secret": secret,
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      console.error("Intake upstream error", upstream.status, await upstream.text().catch(() => ""));
      return res.status(502).json({ error: "Could not submit inquiry. Please try again shortly." });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Intake request failed", err);
    return res.status(502).json({ error: "Could not submit inquiry. Please try again shortly." });
  }
};
