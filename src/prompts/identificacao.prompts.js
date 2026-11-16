const SCHEMA_IDENTIFICACAO = {
    type: "object",
    additionalProperties: false,
    required: ["matricula", "cidade", "estado"],
    properties: {
      matricula: { type: ["string", "null"] },
      cidade: { type: ["string", "null"] },
      estado: { type: ["string", "null"] },
    },
  };
  
  const PROMPT_IDENTIFICACAO = `
  No começo da gravação de uma vistoria, o avaliador costuma dizer a matrícula, a cidade e o estado do imóvel.
  - matricula: somente os dígitos (ex.: "87265"). Se não for dita com clareza, null.
  - cidade: como foi dita. Se não for dita com clareza, null.
  - estado: SEMPRE a sigla de duas letras (ex.: "Goiás" vira "GO"). Se não for dito com clareza, null.
  Nunca adivinhe. Na dúvida, null.
  `.trim();
  
  module.exports = { SCHEMA_IDENTIFICACAO, PROMPT_IDENTIFICACAO };