
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://moonknight2077695.github.io",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json(
      { error: "Use POST to send a message to JARVIS." },
      { status: 405, headers: corsHeaders },
    );
  }

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    return Response.json(
      { error: "JARVIS backend is not configured yet." },
      { status: 500, headers: corsHeaders },
    );
  }

  try {
    const { message } = await req.json();

    if (typeof message !== "string" || !message.trim()) {
      return Response.json(
        { error: "Please provide a message." },
        { status: 400, headers: corsHeaders },
      );
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content:
                "You are JARVIS, a calm, professional, helpful AI assistant with understated dry wit. Be clear, practical, and honest about your capabilities.",
            },
            { role: "user", content: message.trim() },
          ],
        }),
      },
    );

    const data = await response.json();

    return Response.json(
      response.ok
        ? { reply: data.choices?.[0]?.message?.content ?? "I couldn't generate a reply." }
        : { error: data.error?.message ?? "The AI provider returned an error." },
      { status: response.ok ? 200 : 502, headers: corsHeaders },
    );
  } catch {
    return Response.json(
      { error: "JARVIS couldn't process that request." },
      { status: 500, headers: corsHeaders },
    );
  }
});
       
