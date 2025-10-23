export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const secret = req.headers["x-proxy-key"];
  if (secret !== process.env.PROXY_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { match } = req.body || {};
  if (!match) {
    return res.status(400).json({ error: "Missing match data" });
  }

  const prompt = `
You are an ARCL cricket strategy assistant helping teams maximize their points
based on ARCL's 30-point rules:

- 20 points for win.
- 10 bonus points split between batting (0–5) and bowling (0–5).
- Batting bonus depends on % of opponent's score or run-rate ratio.
- Bowling bonus depends on wickets taken (1=1pt, 3=2pt, 5=3pt, 6=4pt, 7+=5pt).

Match situation:
${JSON.stringify(match, null, 2)}

Give short actionable advice (2–4 sentences) for maximizing points. Be concise and use emojis where natural.
`;

  try {
    const response = await fetch(
  `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-latest:generateContent?key=${process.env.GOOGLE_API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  }
);
    

    const data = await response.json();

    // Debugging log (visible in Vercel logs)
    console.log("Gemini response:", JSON.stringify(data));

    // Safely extract the model’s reply
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      data.promptFeedback?.safetyRatings?.[0]?.category ||
      "No suggestions generated.";

    return res.status(200).json({ suggestions: text });
  } catch (err) {
    console.error("Gemini API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
