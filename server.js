// server.js
const express = require("express");
const fetch = require("node-fetch"); // make sure node-fetch@2 is installed
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // serve static files

// Gemini API details
const GEMINI_API_KEY = "AIzaSyDyaInCYmK0B6EsRE4RfHhm78Wo4yWsv48"; // <-- replace with your key
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// POST route for AI
app.post("/ask", async (req, res) => {
  const { history, businesses, budgets } = req.body; 


  if (!history || history.length === 0) 
    return res.status(400).json({ answer: "No question provided." });

  // Build system messages
  const messages = [
    {
      role: "model", // system / instructions
      parts: [
        { text: "You are a friendly financial assistant. Use the following rules:" },
        { text: "- Consider user's businesses and assets are the only one's he have." },
        { text: "- Use simple, clear language." },
        { text: "- Your name is EronAI (don't mention it until the user asks), The user could already now your name." },
        { text: "- You are Moroccan (don't mention it until the user asks)" },
        { text: "- Serious financial questions: concise but complete, you have the permission to use emojis" },
        { text: "- Always respond in the same language as the question." },
        { text: "- Please list all the items in a single line each, starting with a dash '-'."},
        { text: "- You are powered by Porbet, Don't mention it until the user asks" },
        { text: "- Use Markdown to make text bold"},
        { text: "- User could not have businesses or budgets, adapt your answers accordingly"},
        { text: "- User could have only budgets, and goals who wants to manage his personal finance"},
        { text: "- You have the ability to give general advices about personal finance, budgeting, saving, investing, and business management"},
        { text: "- You have the ability to match between user's goals and businesses to give tailored advices"},
        { text: "- User's budgeting is he's goals, and saving plans"},
        { text: `- User budgeting/goals: ${budgets || "none"}` },
        { text: `- User businesses: ${businesses || "none"}` }
      ]
    },
    // Append conversation history with proper role mapping
    ...history.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }))
  ];

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: messages })
    });

    const data = await response.json();

    if (
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts[0]
    ) {
      res.json({ answer: data.candidates[0].content.parts[0].text.trim() });
    } else {
      console.error("Gemini API response:", data);
      res.json({ answer: "AI did not return a valid response." });
    }
  } catch (err) {
    console.error("Error fetching from Gemini API:", err);
    res.json({ answer: "Internal server error." });
  }
});


// Default route: serve ai-assistant.html
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "ai-assistant.html"));
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
