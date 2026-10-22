const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

// Environment configuration matched to your Render variables
const PORT = process.env.PORT || 3000;
const MASTER_PASSWORD = process.env.JARVIS_ACCESS_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!MASTER_PASSWORD || !JWT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENROUTER_API_KEY) {
  console.error("Missing required environment variables.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// JWT Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Access token required." });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: "Invalid or expired session." });
    req.user = user;
    next();
  });
}

// 1. Login Endpoint
app.post("/login", (req, res) => {
  const { password } = req.body;

  if (!password || password !== MASTER_PASSWORD) {
    return res.status(401).json({ error: "Incorrect access password." });
  }

  const expiresInSeconds = 60 * 60 * 8; // 8 hours session
  const token = jwt.sign({ user: "Ahnaf" }, JWT_SECRET, { expiresIn: expiresInSeconds });
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  res.json({ token, expiresAt });
});

// 2. Chat & Memory Endpoint via OpenRouter
app.post("/chat", authenticateToken, async (req, res) => {
  const { message, conversationId } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        messages: [
          { role: "system", content: "You are JARVIS, a high-end, minimalist artificial intelligence built for your creator, Ahnaf. You speak with polite precision, efficiency, and Stark-like competence." },
          { role: "user", content: message }
        ]
      })
    });

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content || "I am unable to process that query at the moment.";

    // Save to Supabase Memory Archive
    let memorySaved = true;
    try {
      await supabase.from("jarvis_memories").insert([
        { conversation_id: conversationId || "default", role: "user", content: message },
        { conversation_id: conversationId || "default", role: "assistant", content: reply }
      ]);
    } catch (memErr) {
      console.error("Memory persistence error:", memErr);
      memorySaved = false;
    }

    res.json({ reply, memorySaved });
  } catch (err) {
    console.error("Chat routing error:", err);
    res.status(500).json({ error: "AI communication failure." });
  }
});

// 3. Log Intrusion Attempt Endpoint
app.post("/log-intrusion", async (req, res) => {
  try {
    const { imageData } = req.body;
    if (!imageData) return res.status(400).json({ error: "No image data provided." });

    const { error } = await supabase
      .from("jarvis_intrusions")
      .insert([{ image_data: imageData, status: "unresolved" }]);

    if (error) throw error;
    res.json({ success: true, message: "Intrusion logged successfully." });
  } catch (err) {
    console.error("Intrusion logging error:", err);
    res.status(500).json({ error: "Failed to record security event." });
  }
});

// 4. Check Unresolved Intrusions for Ahnaf's Briefing
app.get("/check-intrusions", authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("jarvis_intrusions")
      .select("*")
      .eq("status", "unresolved")
      .order("timestamp", { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      const ids = data.map(item => item.id);
      await supabase
        .from("jarvis_intrusions")
        .update({ status: "resolved" })
        .in("id", ids);
    }

    res.json({ intrusions: data || [] });
  } catch (err) {
    console.error("Intrusion retrieval error:", err);
    res.status(500).json({ error: "Failed to retrieve security logs." });
  }
});

app.listen(PORT, () => {
  console.log(`JARVIS backend running on port ${PORT}`);
});
    
