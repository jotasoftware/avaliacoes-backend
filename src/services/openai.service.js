const axios = require("axios");
const categoriaService = require("./categoria.service");
const sharp = require("sharp");

function buildPromptCategorias(categorias) {
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

function buildPromptDocumento() {
  return `
  You are an experienced real estate appraiser, used to analyzing documents from
  rural and urban property appraisal cases in Brazil.
  
  I will send you the first page of a document. Your task is to identify what
  type of document it is and reply with a short file name for it.
  
  HOW TO ANALYZE THE PAGE
  1. First look for the document title, usually at the top, in UPPERCASE or
     BOLD. It is the most reliable clue.
  2. If there is no clear title, look at the first lines of the text and at who
     issued the document (registry office, public agency, bank, city hall, etc.).
  3. Ignore protocol numbers, dates, stamps, signatures and watermarks.
     They do not tell you what type of document it is.
  
  IDENTIFICATION RULES
  - If the title is "RECIBO DE INSCRIÇÃO DO IMÓVEL RURAL NO CAR", the name is
    "CAR".
  - If the title is "CERTIDÃO DE INTEIRO TEOR", or if there is no title but the
    page starts with a long text related to a real estate registry office
    (cartório de registro de imóveis), the name is "Certidão de Inteiro Teor".
  - If it is any other kind of certificate from a real estate registry office
    (matrícula, ônus, negativa, etc.), use the name that appears in the title,
    for example "Certidão de Ônus Reais".
  
  HOW TO ANSWER
  - Reply ONLY with the name: no explanations, no quotes, no trailing
    punctuation and no file extension.
  - Use at most 5 words.
  - Write the name in Brazilian Portuguese, with the first letter of each main
    word capitalized (except acronyms such as CAR, CCIR and ITR, which stay in
    uppercase).
  - If the document has a proper name or number that clearly identifies it
    (for example, the registry number, or "matrícula"), add it at the end of
    the name.
  - If you cannot identify the document, reply only with: Documento
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
            { type: "text", text: buildPromptCategorias(categorias) },
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

function limparNome(nome) {
  return (nome ?? "")
    .replace(/[\\/:*?"<>|\n\r]/g, " ") // caracteres que o Drive ou o Windows não aceitam bem
    .replace(/\.docx$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

async function callNameModel(model, base64) {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model,
      temperature: 0,
      max_completion_tokens: 30,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildPromptDocumento().trim() },
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

  return limparNome(response.data.choices[0].message.content);
}

// recebe o Buffer da primeira página e devolve um nome pronto para o arquivo
exports.suggestDocumentName = async (primeiraPagina, fallback = "Documento") => {
  try {
    const small = await sharp(primeiraPagina)
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64 = `data:image/jpeg;base64,${small.toString("base64")}`;

    let nome = await callNameModel("gpt-4o-mini", base64);

    if (!nome || nome.toLowerCase() === "documento") {
      console.log("gpt-4o-mini não identificou o documento, tentando com gpt-4o...");
      nome = await callNameModel("gpt-4o", base64);
    }

    if (!nome || nome.toLowerCase() === "documento") return fallback;
    return nome;
  } catch (err) {
    console.error("Falha ao sugerir nome do documento:", err.message);
    return fallback; // a IA falhar não pode impedir o envio
  }
};