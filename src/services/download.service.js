const { Document, Packer, Paragraph, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, PageBreak} = require("docx");
const axios = require("axios");
const sharp = require("sharp");
globalThis.self = globalThis;
const AdmZip = require("adm-zip");
const shapefile = require("shapefile");
const fs = require("fs");
const path = require("path");
const os = require("os");
const tokml = require("tokml");
const { pdf } = require("pdf-to-img");
const { extractVerticesFromPage } = require("./openai.service");

const driveService = require("../services/drive.service");
 
const LAYOUTS = {
  2: { cols: 1, imgWidth: 572, imgHeight: 364 }, // 1x2 (1 coluna, 2 linhas) - imagem grande
  3: { cols: 1, imgWidth: 545, imgHeight: 230 }, // 1x3 (1 coluna, 3 linhas) - imagem grande
  6: { cols: 2, imgWidth: 280, imgHeight: 180 }, // 2x3 (2 colunas, 3 linhas) - layout original
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
 
const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (c) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
 
// ---------------------------------------------------------------------------
// Baixa e processa as imagens de UMA pasta.
// ---------------------------------------------------------------------------
async function loadImagesFromFolder(folderId, imgWidth, imgHeight) {
  const files = await driveService.listAllFilesRecursive(folderId);
  const images = [];
 
  for (const file of files) {
    if (!file.mimeType?.startsWith("image/")) continue;
 
    const stream = await driveService.downloadFile(file.id);
    const originalBuffer = await streamToBuffer(stream);
 
    const processedBuffer = await sharp(originalBuffer)
      .resize(imgWidth * 2, imgHeight * 2, {
        fit: "cover",
        position: "center",
      })
      .toBuffer();
 
    const cleanName = file.name.replace(/\.[^/.]+$/, "");
    images.push({ buffer: processedBuffer, name: cleanName });
  }
 
  return images;
}
 
// ---------------------------------------------------------------------------
// Monta o card de UMA imagem (foto + legenda com o nome do arquivo).
// Se "img" for null, monta uma caixa VAZIA (mesmo tamanho/borda, sem foto
// nem legenda) — usada pra completar o grid até a quantidade pedida.
// ---------------------------------------------------------------------------
function buildImageCard(img, imgWidth, imgHeight) {
  if (!img) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: {
                top: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
                left: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
                right: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
                bottom: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
              },
              margins: { top: 60, left: 60, right: 60, bottom: 60 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: (imgHeight / 2) - 10, after: (imgHeight / 2) - 10 },
                  children: [],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              borders: {
                top: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
                bottom: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
                left: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
                right: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
              },
              margins: { top: 60, bottom: 60, left: 60, right: 60 },
              children: [
                new Paragraph({
                  text: "",
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
              left: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
              right: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
            },
            margins: { top: 60, left: 60, right: 60, bottom: 60 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: img.buffer,
                    transformation: { width: imgWidth, height: imgHeight },
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
              left: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
              right: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
            },
            margins: { top: 60, bottom: 60, left: 60, right: 60 },
            children: [
              new Paragraph({
                text: "",
                alignment: AlignmentType.CENTER,
                style: {
                  run: { font: "Times New Roman", size: 18, color: "000000" },
                },
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
 
// ---------------------------------------------------------------------------
// Monta UMA página (section) com as imagens dispostas em `cols` colunas.
// ---------------------------------------------------------------------------
function buildPageContent(pageImages, cols, imgWidth, imgHeight) {
  const mainGridRows = [];
 
  for (let i = 0; i < pageImages.length; i += cols) {
    const rowItems = pageImages.slice(i, i + cols);
 
    const rowCells = rowItems.map(
      (img) =>
        new TableCell({
          width: { size: Math.floor(100 / cols), type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
          },
          margins: { top: 80, bottom: 150, left: 80, right: 80 },
          children: [buildImageCard(img, imgWidth, imgHeight)],
        })
    );
 
    // completa a linha com células vazias se a última linha estiver incompleta,
    // pra grade não desalinhar visualmente (raro agora, já que as páginas
    // já vêm preenchidas até o total pedido antes de chegar aqui)
    while (rowCells.length < cols) {
      rowCells.push(
        new TableCell({
          width: { size: Math.floor(100 / cols), type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
          },
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
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: mainGridRows,
    }),
  ];
}
 
// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------
exports.buildWordImagesFromFolder = async (payload) => {
  const { imagens } = payload;
 
  if (!imagens || typeof imagens !== "object") {
    throw new Error("payload.imagens deve ser um objeto { folderId: qtdPorPagina }");
  }
 
  const allChildren = [];
  let isFirstPage = true;
 
  for (const [folderId, qtdPorPaginaRaw] of Object.entries(imagens)) {
    const qtdPorPagina = Number(qtdPorPaginaRaw);
    const { cols, imgWidth, imgHeight } = getLayout(qtdPorPagina);
 
    const images = await loadImagesFromFolder(folderId, imgWidth, imgHeight);
    const tamanhoPagina = qtdPorPagina || 8;
    const pages = chunk(images, tamanhoPagina);

    // Completa a ÚLTIMA página com slots vazios (null) até o total pedido
    // (ex: pedido "6" com só 1 imagem -> 1 preenchida + 5 vazias;
    //  pedido "3" com só 1 imagem -> 1 preenchida + 2 vazias).
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

exports.buildWordDocumentFromFolder = async (folderId) => {
  const files = await driveService.listAllFilesRecursive(folderId);

  const documentChildren = [];
  const TARGET_WIDTH = 600;  
  const TARGET_HEIGHT = 820; 

  for (const file of files) {
    if (!file.mimeType?.startsWith("image/")) continue;

    const stream = await driveService.downloadFile(file.id);
    const originalBuffer = await streamToBuffer(stream);

    const processedBuffer = await sharp(originalBuffer)
      .resize(TARGET_WIDTH * 2, TARGET_HEIGHT * 2, { 
        fit: "cover",        
        position: "center"   
      })
      .toBuffer();

    documentChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: processedBuffer,
            transformation: { 
              width: TARGET_WIDTH, 
              height: TARGET_HEIGHT 
            },
          }),
        ],
      })
    );

    documentChildren.push(
      new Paragraph({
        children: [new PageBreak()],
      })
    );
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

exports.exportKmlCar = async (args) => {
  const url = await getDownloadUrl(args);
  const zipBuffer = await downloadZip(url);
  const geoJson = await zipToGeoJson(zipBuffer);
  const cleaned = {
    ...geoJson,
    features: geoJson.features.slice(0, 1),
  };
  const kml = tokml(cleaned);
  const kmlAmarelo = editkml(kml)
  return Buffer.from(kmlAmarelo);
};

async function getDownloadUrl(car) {
  const { data: res } = await axios.post(
    "https://api.infosimples.com/api/v2/consultas/car/download-shapefile",
    {
      car,
      token: process.env.INFOSIMPLES_TOKEN,
      timeout: 300,
    }
  );

  if (res.code !== 200) {
    throw new Error(
      `${res.code} - ${res.code_message} - ${res.errors?.join("; ")}`
    );
  }
  return res.data[0].zip_file_url;
}

async function downloadZip(url) {
  const { data } = await axios.get(url, {
    responseType: "arraybuffer",
  });

  return Buffer.from(data);
}

async function zipToGeoJson(zipBuffer) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "car-"));

  const zip = new AdmZip(zipBuffer);
  zip.extractAllTo(tmpDir, true);
  
  const files = fs.readdirSync(tmpDir);

  for (const file of files) {
    const fullPath = path.join(tmpDir, file);

    if (file.endsWith("Imovel.zip")) {
      const innerZip = new AdmZip(fullPath);
      innerZip.extractAllTo(tmpDir, true);
    }
  }

  const shpFile = findFile(tmpDir, ".shp");

  if (!shpFile) {
    throw new Error("No .shp file found even after extracting nested ZIPs");
  }

  const source = await shapefile.open(shpFile);

  const features = [];

  while (true) {
    const result = await source.read();
    if (result.done) break;
    features.push(result.value);
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

function findFile(dir, ext) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const result = findFile(fullPath, ext);
      if (result) return result;
    } else if (entry.name.endsWith(ext)) {
      return fullPath;
    }
  }

  return null;
}

function editkml(kml) {
  kml = kml.replace(
    "<Document>",
    `<Document>
      <Style id="outlineOnly">
        <LineStyle>
          <color>ff00ffff</color>
          <width>3.5</width>
        </LineStyle>
        <PolyStyle>
          <fill>0</fill>
          <outline>1</outline>
        </PolyStyle>
      </Style>`
  );
  
  kml = kml.replace(
    "<Placemark>",
    `<Placemark><styleUrl>#outlineOnly</styleUrl>`
  );

  return kml;
}


async function pdfToImageBuffers(pdfBuffer) {
  const document = await pdf(pdfBuffer, { scale: 4 });
 
  const imageBuffers = [];
  for await (const pageBuffer of document) {
    imageBuffers.push(pageBuffer);
  }
 
  return imageBuffers;
}
 

exports.exportKmlDocumento = async (fileBuffer) => {
  const pageImageBuffers = await pdfToImageBuffers(fileBuffer);
 
  if (!pageImageBuffers.length) {
    throw new Error("Não foi possível converter o PDF em imagens");
  }
 
  let todosVertices = [];
 
  for (let i = 0; i < pageImageBuffers.length; i++) {
    const base64 = `data:image/png;base64,${pageImageBuffers[i].toString("base64")}`;
 
    try {
      const verticesDaPagina = await extractVerticesFromPage(base64);
      todosVertices = todosVertices.concat(verticesDaPagina);
    } catch (err) {
      console.error(`Erro ao processar página ${i + 1}:`, err.message);
    }
  }
 
  if (!todosVertices.length) {
    throw new Error("Nenhum vértice encontrado no documento");
  }
 
  let coordinates = todosVertices.map((v) => [v.lon, v.lat]);
 
  const primeiro = coordinates[0];
  const ultimo = coordinates[coordinates.length - 1];
  if (primeiro[0] !== ultimo[0] || primeiro[1] !== ultimo[1]) {
    coordinates = [...coordinates, primeiro];
  }
 
  const geoJson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [coordinates],
        },
      },
    ],
  };
 
  const kml = tokml(geoJson);
  const kmlAmarelo = editkml(kml);
 
  return Buffer.from(kmlAmarelo);
};