// Prompts de classificação de imagens e de nome de documentos.

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
  
  module.exports = { buildPromptCategorias, buildPromptDocumento };