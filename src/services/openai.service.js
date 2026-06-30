const axios = require("axios");
const { CATEGORIES } = require("../constants/categories");

exports.classifyImage = async (base64) => {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
Classifique esta imagem APENAS em uma dessas categorias:
${CATEGORIES.join(", ")}

Regras:
- responda apenas com UMA palavra
- não explique nada
- se não souber, responda "outro"
              `,
            },
            {
              type: "image_url",
              image_url: { url: base64 },
            },
          ],
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );

  let category = response.data.choices[0].message.content.trim().toLowerCase();

  // 🔒 segurança extra (anti IA inventando categoria)
  if (!CATEGORIES.includes(category)) {
    category = "outro";
  }

  return category;
};