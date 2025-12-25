export const analyzeImageWithOpenAI = async (base64Image, apiKey) => {
  if (!apiKey) {
    throw new Error("Missing OpenAI API Key");
  }

  const SYSTEM_PROMPT = `You are a professional data extraction agent.
Carefully analyze the uploaded image (receipt or payment screenshot).
Extract only factual, visible information. Do not guess or invent data.

Output FORMAT (Strict JSON only):
{
  "amount": "0.00",
  "date": "YYYY-MM-DD",
  "merchant": "Name of store/vendor",
  "category": "One of: Food, Travel, Shopping, Health, Bills, Others",
  "payment_method": "One of: Cash, UPI, Card, NetBanking",
  "confidence_score": 0-100,
  "notes": "Short description of items or context"
}

If a field is not visible, use null or empty string.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this image and extract data." },
              {
                type: "image_url",
                image_url: {
                  url: base64Image // Expecting data:image/jpeg;base64,...
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || "OpenAI API Request Failed");
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    return JSON.parse(content);

  } catch (error) {
    console.error("OpenAI Analysis Error:", error);
    throw error;
  }
};
