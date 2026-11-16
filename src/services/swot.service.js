const sharp = require("sharp");

const LARGURA = 1600;   
const MARGEM = 24;
const COLUNA = (LARGURA - MARGEM * 3) / 2;
const FONTE = 29;
const ALTURA_LINHA = 38;
const ALTURA_TITULO = 64;
const PADDING = 26;
const FAMILIA = "'Times New Roman', 'Liberation Serif', 'DejaVu Serif', serif";

const MARINHO = "#1d3557";
const VERDE = "#3b7e75";
const QUADRANTES = [
  { chave: "forcas", titulo: "FORÇAS", cor: MARINHO, fundo: "#f4f6f9" },
  { chave: "fraquezas", titulo: "FRAQUEZAS", cor: MARINHO, fundo: "#f4f6f9" },
  { chave: "oportunidades", titulo: "OPORTUNIDADES", cor: VERDE, fundo: "#f1f8f7" },
  { chave: "ameacas", titulo: "AMEAÇAS", cor: VERDE, fundo: "#f1f8f7" },
];

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// quebra o texto em linhas pela largura estimada (Arial ~0,53 × tamanho da fonte por caractere)
function quebrar(texto, larguraPx) {
  const max = Math.floor(larguraPx / (FONTE * 0.5));
  const linhas = [];
  let atual = "";
  for (const palavra of String(texto).split(/\s+/)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (tentativa.length > max && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

function montarBlocos(itens) {
  const lista = (itens || []).map((t) => String(t).trim()).filter(Boolean);
  if (lista.length === 0) {
    return { vazio: true, blocos: [], linhasTotal: 1 };
  }
  const larguraTexto = COLUNA - PADDING * 2 - 28; // 28 = espaço do marcador
  const blocos = lista.map((t) => quebrar(t, larguraTexto));
  const linhasTotal = blocos.reduce((s, b) => s + b.length, 0);
  return { vazio: false, blocos, linhasTotal };
}

// dados: { forcas: [...], oportunidades: [...], fraquezas: [...], ameacas: [...] }
exports.gerarSwotPng = async (dados = {}) => {
  const montados = Object.fromEntries(QUADRANTES.map((q) => [q.chave, montarBlocos(dados[q.chave])]));

  const GAP_ITEM = 12;
  const alturaDe = (m) =>
    ALTURA_TITULO + PADDING + m.linhasTotal * ALTURA_LINHA + (m.vazio ? 0 : (m.blocos.length - 1) * GAP_ITEM) + PADDING;

  const linhaCima = Math.max(alturaDe(montados.forcas), alturaDe(montados.fraquezas));
  const linhaBaixo = Math.max(alturaDe(montados.oportunidades), alturaDe(montados.ameacas));

  const TOPO = 30; // faixa do título geral
  const altura = TOPO + linhaCima + MARGEM + linhaBaixo + MARGEM;

  const partes = [];
  partes.push(`<rect width="${LARGURA}" height="${altura}" fill="#ffffff"/>`);
  QUADRANTES.forEach((q, i) => {
    const col = i % 2;
    const linha = Math.floor(i / 2);
    const x = MARGEM + col * (COLUNA + MARGEM);
    const y = TOPO + (linha === 0 ? 0 : linhaCima + MARGEM);
    const h = linha === 0 ? linhaCima : linhaBaixo;
    const m = montados[q.chave];

    partes.push(`<rect x="${x}" y="${y}" width="${COLUNA}" height="${h}" rx="10" fill="${q.fundo}" stroke="${q.cor}" stroke-width="2"/>`);
    partes.push(`<path d="M${x} ${y + 10} a10 10 0 0 1 10 -10 h${COLUNA - 20} a10 10 0 0 1 10 10 v${ALTURA_TITULO - 10} h-${COLUNA} z" fill="${q.cor}"/>`);
    partes.push(
      `<text x="${x + COLUNA / 2}" y="${y + 42}" text-anchor="middle" font-family="${FAMILIA}" font-size="34" font-weight="700" fill="#ffffff">${q.titulo}</text>`
    );

    let cursor = y + ALTURA_TITULO + PADDING + 22;
    if (m.vazio) {
      partes.push(
        `<text x="${x + PADDING}" y="${cursor}" font-family="${FAMILIA}" font-size="${FONTE}" font-style="italic" fill="#6b6b6b">Nenhum item marcado</text>`
      );
    } else {
      for (const linhas of m.blocos) {
        partes.push(`<circle cx="${x + PADDING + 6}" cy="${cursor - 9}" r="5.5" fill="${q.cor}"/>`);
        linhas.forEach((l, k) => {
          partes.push(
            `<text x="${x + PADDING + 28}" y="${cursor + k * ALTURA_LINHA}" font-family="${FAMILIA}" font-size="${FONTE}" fill="#000000">${esc(l)}</text>`
          );
        });
        cursor += linhas.length * ALTURA_LINHA + GAP_ITEM;
      }
    }
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGURA}" height="${altura}" viewBox="0 0 ${LARGURA} ${altura}">${partes.join("")}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
};