const axios = require("axios");
const categoriaService = require("./categoria.service");

function buildPrompt(categorias) {
  return `
Classify this image into ONLY one of the following categories:

${categorias.join(", ")}, unknown

Instructions:
- Return ONLY the category name.
- The category MUST exactly match one of the names above.
- Do NOT explain your answer.
- Do NOT add punctuation or extra text.
- If no category clearly matches, return "unknown".

Special criteria for aerial-image categories, if present in the list above:

- earth:
  satellite or map-based imagery processed by Google Earth / Google Maps,
  usually showing tiled or stitched visual patterns,
  inconsistent textures between areas,
  and often includes map UI elements such as:
  - credits in the bottom corner (e.g. © Google, Map data ©, Image ©)
  - capture date or imagery year
  - Google watermark or attribution
  - geometric overlays such as polygons, boundaries, drawn shapes, or highlighted areas
  These polygonal or GIS-like overlays are strong indicators of Google Earth / Google Maps usage

- drone:
  real aerial photograph captured by a camera,
  high sharpness and natural lighting,
  realistic shadows consistent with sunlight,
  slight lens distortion (wide-angle),
  fully photographic appearance,
  NO map UI, credits, or interface overlays

- unknown:
  origin cannot be reliably determined

Now classify the image:
`;
}

async function callClassificationModel(model, base64, categorias) {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model,
      temperature: 0,
      max_completion_tokens: 5,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildPrompt(categorias) },
            { type: "image_url", image_url: { url: base64 } },
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

  const categoriasValidas = [...categorias, "unknown"];
  if (!categoriasValidas.includes(category)) {
    category = "unknown";
  }

  return category;
}

/**
 * Classifica a imagem em duas etapas:
 * 1. Tenta com gpt-4o-mini (rápido e barato) — faz a "peneira" da maioria das imagens.
 * 2. Se vier "unknown" (a IA não teve certeza), tenta de novo com
 *    gpt-4o (modelo cheio, mais caro e mais preciso) antes de desistir.
 *    Como só roda nos casos difíceis (uma minoria das imagens), o custo
 *    extra fica bem controlado mesmo usando o modelo mais caro aqui.
 */
exports.classifyImage = async (base64) => {
  const categorias = await categoriaService.getAllNomes();

  const resultadoInicial = await callClassificationModel(
    "gpt-4o-mini",
    base64,
    categorias
  );

  if (resultadoInicial !== "unknown") {
    return resultadoInicial;
  }

  console.log("gpt-4o-mini não teve certeza, tentando com gpt-4o...");

  const resultadoFallback = await callClassificationModel(
    "gpt-4o",
    base64,
    categorias
  );

  return resultadoFallback === "unknown" ? "outros" : resultadoFallback;
};