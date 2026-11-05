const sharp = require("sharp");

const {
  Document, Packer, Paragraph, ImageRun, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, PageBreak, HeightRule,
} = require("docx");
// o sharp e o buildWordDocumentFromBuffers que já existem aqui continuam

const LAYOUTS = {
  2: { cols: 1, imgWidth: 572, imgHeight: 345 },
  3: { cols: 1, imgWidth: 545, imgHeight: 200 },
  6: { cols: 2, imgWidth: 280, imgHeight: 180 },
};

function getLayout(qtdPorPagina) {
  return LAYOUTS[qtdPorPagina] || LAYOUTS[6];
}

function chunk(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

exports.getLayout = getLayout;

exports.prepararImagem = (buffer, imgWidth, imgHeight) =>
  sharp(buffer, { unlimited: true })
    .resize(imgWidth * 2, imgHeight * 2, { fit: "fill" })
    .jpeg({ quality: 90 })
    .toBuffer();

// ---------------------------------------------------------------------------
// Monta o card de UMA imagem (foto + legenda).
// Se "img" for null, monta uma caixa VAZIA com a MESMA altura de uma caixa
// com foto, para colar a foto depois no Word sem a caixa mudar de tamanho.
// ---------------------------------------------------------------------------
function buildImageCard(img, imgWidth, imgHeight) {
  const borda = { style: BorderStyle.SINGLE, size: 2, color: "111111" };
  const bordas = { top: borda, bottom: borda, left: borda, right: borda };
  const margens = { top: 60, bottom: 60, left: 60, right: 60 };

  const paragrafoFoto = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 0 },
    children: img
      ? [
          new ImageRun({
            type: "jpg",
            data: img.buffer,
            transformation: { width: imgWidth, height: imgHeight },
          }),
        ]
      : [],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        // mesma altura com ou sem foto (1 px = 15 twips, + margens da célula)
        height: { value: imgHeight * 15 + 120, rule: HeightRule.ATLEAST },
        children: [new TableCell({ borders: bordas, margins: margens, children: [paragrafoFoto] })],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: bordas,
            margins: margens,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: img?.descricao
                  ? [new TextRun({ text: img.descricao, size: 18 })]
                  : [],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ---------------------------------------------------------------------------
// Monta UMA página com as imagens dispostas em `cols` colunas.
// ---------------------------------------------------------------------------
function buildPageContent(pageImages, cols, imgWidth, imgHeight) {
  const semBorda = {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
  };

  const mainGridRows = [];

  for (let i = 0; i < pageImages.length; i += cols) {
    const rowItems = pageImages.slice(i, i + cols);

    const rowCells = rowItems.map(
      (img) =>
        new TableCell({
          width: { size: Math.floor(100 / cols), type: WidthType.PERCENTAGE },
          borders: semBorda,
          margins: { top: 80, bottom: 150, left: 80, right: 80 },
          children: [buildImageCard(img, imgWidth, imgHeight)],
        })
    );

    // completa a linha com células vazias se a última estiver incompleta
    while (rowCells.length < cols) {
      rowCells.push(
        new TableCell({
          width: { size: Math.floor(100 / cols), type: WidthType.PERCENTAGE },
          borders: semBorda,
          children: [new Paragraph("")],
        })
      );
    }

    mainGridRows.push(new TableRow({ children: rowCells }));
  }

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        ...semBorda,
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: mainGridRows,
    }),
  ];
}

// grupos: [{ images, qtdPorPagina }]  (uma entrada por pasta)
exports.buildWordImagesDocument = async (grupos) => {
  const allChildren = [];
  let isFirstPage = true;

  for (const { images, qtdPorPagina } of grupos) {
    const { cols, imgWidth, imgHeight } = getLayout(qtdPorPagina);
    const tamanhoPagina = qtdPorPagina || 8;
    const pages = chunk(images, tamanhoPagina);

    if (pages.length > 0) {
      const ultimaPagina = pages[pages.length - 1];
      while (ultimaPagina.length < tamanhoPagina) {
        ultimaPagina.push(null);
      }
    }

    for (const pageImages of pages) {
      if (!isFirstPage) {
        allChildren.push(new Paragraph({ children: [new PageBreak()] }));
      }
      isFirstPage = false;

      allChildren.push(...buildPageContent(pageImages, cols, imgWidth, imgHeight));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 500, left: 500, right: 1440 },
          },
        },
        children: allChildren,
      },
    ],
  });

  return await Packer.toBuffer(doc);
};

exports.buildWordDocumentFromBuffers = async (buffers) => {
  const documentChildren = [];
  const TARGET_WIDTH = 600;
  const TARGET_HEIGHT = 820;

  for (const originalBuffer of buffers) {
    const processedBuffer = await sharp(originalBuffer)
      .resize(TARGET_WIDTH * 2, TARGET_HEIGHT * 2, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    documentChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            type: "jpg",
            data: processedBuffer,
            transformation: { width: TARGET_WIDTH, height: TARGET_HEIGHT },
          }),
        ],
      })
    );

    documentChildren.push(new Paragraph({ children: [new PageBreak()] }));
  }

  if (documentChildren.length > 0) {
    documentChildren.pop();
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: documentChildren,
      },
    ],
  });

  return await Packer.toBuffer(doc);
};