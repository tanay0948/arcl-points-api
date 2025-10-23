export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const secret = req.headers["x-proxy-key"];
  if (secret !== process.env.PROXY_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { situation } = req.body || {};
  if (!situation) {
    return res.status(400).json({ error: "Missing match situation text" });
  }

  const prompt = `
You are the **ARCL Points Strategy Assistant**.
You ONLY discuss topics related to the *ARCL 30-point cricket system*. 
If a user asks anything outside ARCL points, politely say:
  "Let's keep our chat focused on ARCL matches and points only. 😊"

Your job:
- Read the user's description of their current ARCL match situation.
- Apply official ARCL rules to estimate performance and points.

---

📘 **ARCL 30-Point System Recap**

- Total = 30 points per match.
- Win = 20 + (10 - opponent's bonus)
- Lose = only your bonus (0–10)
- Tie = 15 each, no bonus.

🎯 **Bonus Points**
1️⃣ Batting Points (max 5) — based on score % or run-rate ratio:
   - >50% & ≤60% → 1 pt  
   - >60% & ≤70% → 2 pt  
   - >70% & ≤80% → 3 pt  
   - >80% & ≤90% → 4 pt  
   - >90% → 5 pt  
   (If chasing → score ÷ target; if defending → run-rate ÷ opponent’s run-rate.)

2️⃣ Bowling Points (max 5) — based on wickets taken:
   - 1 → 1 pt  
   - 3 → 2 pts  
   - 5 → 3 pts  
   - 6 → 4 pts  
   - 7+ → 5 pts

---

🧠 **Expected Response Format**

Always reply in this exact structure:

**🏏 ARCL Points Analysis**
1️⃣ **Points secured so far:** Estimate based on given situation (batting %, wickets, etc.).  
2️⃣ **If you WIN:** Show total = 20 + (10 − opponent bonus).  
3️⃣ **If you LOSE:** Show total = your bonus (0–10).  
4️⃣ **Maximize Points Advice:**  
   - 🏆 If winning: Suggest concrete ways to increase bonus margin.  
   - ⚔️ If losing: Suggest how to secure more bonus points (batting/wickets).  
   - Keep tips practical and concise (2–4 sentences).

**Reminder:** Stay focused only on ARCL points and cricket scenarios. No other topics.

---

Now analyze this ARCL match situation and respond strictly in the above format:

"""${situation}"""
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    console.log("Gemini response:", JSON.stringify(data));

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No suggestions generated.";

    return res.status(200).json({ suggestions: text });
  } catch (err) {
    console.error("Gemini API error:", err);
    return res.status(500).json({ error: err.message });
  }
}
