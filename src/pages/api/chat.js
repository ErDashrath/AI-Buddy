export default async function handler(req, res) {
  const { message } = req.body;

  const systemPrompt = `
You are a friendly, fluent English-speaking partner. Your goal is to help the user speak English confidently. Engage naturally, support roleplay, and keep conversation flowing.
`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      }),
    });

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message?.content || "Sorry, I couldn't respond.";
    res.status(200).json({ reply: aiReply });
  } catch (error) {
    console.error('AI API Error:', error);
    res.status(500).json({ reply: "Something went wrong." });
  }
}
