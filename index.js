// Minimal WhatsApp Cloud API webhook for TVL Media
// GET  /webhook -> answers Meta's verification check
// POST /webhook -> receives incoming messages and status updates
const express = require("express");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;        // must match the token you type in Meta
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;    // optional: enables auto-reply
const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => res.send("WhatsApp webhook is running"));

// Meta verification handshake
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token && token === VERIFY_TOKEN) {
    console.log("Webhook verified");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Incoming events
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // acknowledge fast so Meta doesn't retry
  const value = req.body?.entry?.[0]?.changes?.[0]?.value;
  if (!value) return;

  if (value.statuses) {
    for (const s of value.statuses) console.log(`Status: ${s.id} -> ${s.status}`);
  }

  for (const msg of value.messages || []) {
    const text = msg.text?.body;
    console.log(`Message from ${msg.from}: ${text ?? `[${msg.type}]`}`);

    // Optional auto-reply, only if WHATSAPP_TOKEN is set
    if (WHATSAPP_TOKEN && value.metadata?.phone_number_id) {
      try {
        const r = await fetch(
          `https://graph.facebook.com/v21.0/${value.metadata.phone_number_id}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${WHATSAPP_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: msg.from,
              text: { body: "Thanks for messaging TVL Media! We'll get back to you shortly." },
            }),
          }
        );
        if (!r.ok) console.error("Reply failed:", await r.text());
      } catch (e) {
        console.error("Reply error:", e.message);
      }
    }
  }
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
