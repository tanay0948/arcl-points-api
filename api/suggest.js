export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "https://tanay0948.github.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-proxy-key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
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
Arcl is American recreational cricket league in Seattle, Washington. 

If a user asks anything outside ARCL points, politely say:
"Let's keep our chat focused on ARCL matches and points only. 😊"

---

📘 **ARCL 30-Point System Recap**
- Total = 30 points per match.
- Win = 20 + (10 − opponent's bonus)
- Lose = only your bonus (0–10)
- Tie = 15 each, no bonus.

🎯 **Bonus Points**
1️⃣ **Batting Points (max 5)** — based on score % or run-rate ratio:
   - >50% & ≤60% → 1 pt  
   - >60% & ≤70% → 2 pts  
   - >70% & ≤80% → 3 pts  
   - >80% & ≤90% → 4 pts  
   - >90% → 5 pts  
   *(If chasing → score ÷ target; if defending → run-rate ÷ opponent’s run-rate.)*

2️⃣ **Bowling Points (max 5)** — based on wickets taken:
   - 1 → 1 pt  
   - 3 → 2 pts  
   - 5 → 3 pts  
   - 6 → 4 pts  
   - 7+ → 5 pts

📏 **Game Context**
- Each ARCL match is **16 overs per side**.  
- Each team has **8 players**, meaning **7 wickets possible**.  
- You must analyze if the match is *ongoing* or *completed* based on overs, wickets, or context provided.

---

🧩 **Your Job**

1. First, determine if the match is **ONGOING** or **COMPLETED**.
   - If total overs (16) or all 7 wickets are exhausted, it’s *completed*.
   - If a chase target has been reached or opponent all-out, it’s *completed*.
   - Otherwise, it’s *ongoing*.

3. Then, respond based on the situation type:

---

### 🟢 If the match is ONGOING
Respond in this format:

**🏏 ARCL Live Match Analysis**
1️⃣ **Match Progress:** Briefly state whether batting or bowling side and how far into the match (e.g., “12 overs done, chasing 160”).  
2️⃣ **Current Bonus Estimate:** Estimate batting and bowling points based on current data (0–5 each).  
3️⃣ **Improvement Suggestions:** Give 2–4 concise, practical tips to increase points (e.g., “Increase run rate to 90% for +1 batting point” or “Take 2 more wickets for next bonus tier”).  
4️⃣ **Mindset Tip:** Add one motivational tip with emojis (e.g., “🔥 Stay calm, aim for partnerships!”).

---

### 🔵 If the match is COMPLETED
Respond in this format:

**📊 Final ARCL Points Summary**
1️⃣ **Result:** Win / Lose / Tie.  
2️⃣ **Batting Bonus:** (show 0–5, with quick reason).  
3️⃣ **Bowling Bonus:** (show 0–5, with quick reason).  
4️⃣ **Total Points:** Show both teams’ points, calculated as per ARCL rule:  
   - Win = 20 + (10 − opponent bonus)  
   - Lose = bonus (0–10)  
   - Tie = 15 each  
5️⃣ **Quick Breakdown:** Show one-line summary like “You 8 pts • Opponent 22 pts”.  

---

Now analyze this match situation using **only ARCL 30-point rules** and follow the exact format for ONGOING or COMPLETED as explained above.

Here is the match description:

"""${situation}"""
`;


  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
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
