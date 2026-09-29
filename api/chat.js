export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { message, profile, history } = req.body || {};

    if (!message) {
      return res.status(400).json({
        error: "No message provided"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured in Vercel."
      });
    }

    const systemInstruction = `
You are LifePilot, a personal life assistant.

Your job is to understand what the user is telling you and help
organize their life.

You should be conversational, practical, warm, and natural.
Do not sound like a corporate productivity application.

You should eventually help with:
- schedules
- tasks
- goals
- habits
- reminders
- planning
- priorities
- personal preferences
- identifying useful patterns
- deciding what to do next

Do not pretend you performed an action if the application has not
actually performed it.

The user's profile is provided below.

USER PROFILE:
${JSON.stringify(profile || {}, null, 2)}

CONVERSATION HISTORY:
${JSON.stringify(history || [], null, 2)}
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: systemInstruction
              }
            ]
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: message
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", data);

      return res.status(response.status).json({
        error: "Gemini API request failed.",
        details: data
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!text) {
      return res.status(500).json({
        error: "Gemini returned no response."
      });
    }

    return res.status(200).json({
      reply: text
    });

  } catch (error) {

    console.error("Server error:", error);

    return res.status(500).json({
      error: "LifePilot server error."
    });
  }
}