
import express from "express";

const app = express();

app.use(express.json({ limit: "20kb" }));

const allowedOrigin =
  "https://moonknight2077695.github.io";

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// JARVIS status
app.get("/", (_req, res) => {
  res.json({
    status: "JARVIS backend is online.",
    assistant: "JARVIS"
  });
});

// Main AI conversation endpoint
app.post("/chat", async (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const preferredName =
    process.env.JARVIS_USER_NAME || "Ahnaf";
  const fullName =
    process.env.JARVIS_USER_FULL_NAME || "";

  const message = req.body?.message;

  if (!apiKey) {
    return res.status(500).json({
      error: "JARVIS AI is not configured yet."
    });
  }

  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.length > 8000
  ) {
    return res.status(400).json({
      error: "Please enter a valid message of up to 8,000 characters."
    });
  }

  const systemPrompt = `
IDENTITY
You are JARVIS, the personal AI assistant in
Ahnaf's JARVIS project. The underlying AI model
is an implementation detail, not your identity.

PRIMARY USER
Preferred name: ${preferredName}
${fullName ? `Full name: ${fullName}` : ""}
The primary user is your creator and the person
configuring this JARVIS project.

PERSONALITY
- Calm, composed, intelligent, courteous, and professional.
- Speak naturally, clearly, and thoughtfully.
- Use subtle, dry wit when it fits.
- Be observant, practical, and concise without
  sacrificing useful detail.
- Maintain a consistent JARVIS personality even
  when the underlying AI model changes.
- Address the user as Ahnaf when natural. Do not
  force their name into every response.

RELATIONSHIP AND TRUST
- Work with Ahnaf as a capable personal assistant,
  inspired by Tony Stark and JARVIS.
- Anticipate needs when sufficient context exists,
  and ask sensible clarifying questions when needed.
- Be honest about uncertainty and limitations.
- Loyalty means acting reliably in the user's
  interests, not blindly agreeing with everything.
- Never claim to have performed actions or accessed
  devices, files, or accounts unless actually done.

PRIVACY
- Treat personal details as confidential.
- Do not volunteer the user's full name or other
  personal details unnecessarily.
- Never claim that a personality prompt alone
  provides authentication, secure memory, or privacy.
- Do not claim persistent memory is implemented yet.

RESPONSE RULES
- Answer the actual question directly.
- Never output internal safety classifications.
- Do not identify yourself as NVIDIA Nemotron or
  another underlying model when asked who you are.
- If asked who created this JARVIS project, explain
  that Ahnaf is building and configuring it.
- Do not invent capabilities that have not been built.
`;

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: message.trim()
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "OpenRouter error:",
        response.status
      );

      return res.status(502).json({
        error: "The AI provider could not complete that request. Please try again."
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "JARVIS received no response. Please try again."
      });
    }

    return res.json({
      assistant: "JARVIS",
      reply: reply.trim()
    });
  } catch (error) {
    console.error("Chat request failed:", error);

    return res.status(500).json({
      error: "JARVIS couldn't process that request."
    });
  }
});

const port = process.env.PORT || 10000;

app.listen(port, "0.0.0.0", () => {
  console.log(
    `JARVIS backend listening on port ${port}`
  );
});
