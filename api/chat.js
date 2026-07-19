// This runs on Vercel's server, never in the visitor's browser.
// Uses Google Gemini's free API tier (no credit card required) — your key
// lives only here as an environment variable, visitors never see it.
//
// It translates between the chatbot's message format and Gemini's format,
// so the frontend (index.html) never needs to know which AI is behind it.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'Server is missing GEMINI_API_KEY. Add it in Vercel project settings.' } });
  }

  try {
    const { system, messages } = req.body;

    const contents = (messages || []).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system || '' }] },
          contents,
          generationConfig: { maxOutputTokens: 500 }
        })
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({ error: { message: data?.error?.message || 'Gemini API error' } });
    }

    const replyText = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';

    res.status(200).json({ content: [{ type: 'text', text: replyText }] });

  } catch (err) {
    res.status(500).json({ error: { message: 'Server error contacting Gemini: ' + err.message } });
  }
}
