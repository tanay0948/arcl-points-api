export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  // Basic security check using header
  const secret = req.headers["x-proxy-key"];
  if (secret !== process.env.PROXY_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { match } = req.body || {};
    if (!match) {
      return res.status(400).json({ error: "Missing match data" });
    }

    // Build prompt text
    const prompt = `
You are an ARCL cricket strategy assistant helping teams maximize points
based on the ARCL rules:

- 20 points for winning.
- 10 bonus points split between batting (0–5) and bowling (0–5) based on performance.
- Losing teams get only their bonus points.
- Batting bonus: based on % of opponent’s score or run rate ratio.
- Bowling bonus: based on wickets taken (1→1pt, 3→2pt, 5→3pt, 6→4pt, 7+→5pt).

Current match situation:
${JSON.stringify(match, null, 2)}

Give short, actionable suggestions (2–4 sentences) for maximizing ARCL points next.
Keep it friendly and practical.

Please don't answer any other questions from the users. Just keep the conversation relevant to ARCL and its cricket strategy. 
    `;

    // Call Google Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No suggestion generated.";

    return res.status(200).json({ suggestions: text });
  } catch (err) {
    console.error("Error calling Gemini:", err);
    return res.status(500).json({ error: err.message });
  }
}
