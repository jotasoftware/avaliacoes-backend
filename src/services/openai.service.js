const axios = require("axios");
const categoriaService = require("./categoria.service");
const sharp = require("sharp");
const { escolherPrompt } = require("../prompts/vistoria.prompts");
const { buildPromptCategorias, buildPromptDocumento } = require("../prompts/imagens.prompts");
const {
  SCHEMA_IDENTIFICACAO,
  PROMPT_IDENTIFICACAO,
} = require("../prompts/identificacao.prompts");

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

const MODELO_DOCUMENTO = process.env.OPENAI_MODEL_DOCUMENTO || "gpt-4o";

async function chamarChat(body) {
  const response = await axios.post("https://api.openai.com/v1/chat/completions", body, {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    timeout: 180000,
  });
  return response.data.choices[0].message.content;
}

exports.identificarGravacao = async (texto) => {
  const conteudo = await chamarChat({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: {
      type: "json_schema",
      json_schema: { name: "identificacao", strict: true, schema: SCHEMA_IDENTIFICACAO },
    },
    messages: [
      { role: "system", content: PROMPT_IDENTIFICACAO },
      { role: "user", content: texto.slice(0, 4000) }, // só o começo basta
    ],
  });

  const dados = JSON.parse(conteudo);
  return {
    matricula: dados.matricula ? String(dados.matricula).replace(/\D/g, "") || null : null,
    cidade: dados.cidade?.trim() || null,
    estado:
      dados.estado && /^[A-Za-z]{2}$/.test(dados.estado.trim())
        ? dados.estado.trim().toUpperCase()
        : null,
  };
}

exports.gerarDocumento = async (texto, tipo) => {
  const documento = await chamarChat({
    model: MODELO_DOCUMENTO,
    temperature: 0.2,
    messages: [
      { role: "system", content: escolherPrompt(tipo) },
      { role: "user", content: texto.slice(0, 100000) },
    ],
  });

  if (documento.length < 800) {
    console.warn(
      `Plaud: o documento gerado ficou curto (${documento.length} caracteres). Confira o modelo e o prompt.`
    );
  }

  return documento;
}