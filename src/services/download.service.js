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
const wordService = require("./word.service");
 
const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (c) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
 

async function loadImagesFromFolder(folderId, imgWidth, imgHeight) {
  const files = await driveService.listAllFilesRecursive(folderId);
  const images = [];

  for (const file of files) {
    if (!file.mimeType?.startsWith("image/")) continue;

    try {
      const stream = await driveService.downloadFile(file.id);
      const originalBuffer = await streamToBuffer(stream);

      const processedBuffer = await sharp(originalBuffer, { unlimited: true })
        .resize(imgWidth * 2, imgHeight * 2, { fit: "fill" })
        .jpeg({ quality: 90 })
        .toBuffer();

      const cleanName = file.name.replace(/\.[^/.]+$/, "");

      // "2-1_Bom dia" -> descricao = "Bom dia"
      const idx = cleanName.indexOf("_");
      const descricao = idx >= 0 ? cleanName.slice(idx + 1).trim() : "";

      images.push({ buffer: processedBuffer, name: cleanName, descricao });
    } catch (err) {
      console.error(`Imagem ignorada (${file.name}, ${file.mimeType}):`, err.message);
    }
  }

  images.sort((a, b) =>
    a.name.localeCompare(b.name, "pt", { numeric: true })
  );

  return images;
}

exports.buildWordImagesFromFolder = async (payload) => {
  const { imagens } = payload;

  if (!imagens || typeof imagens !== "object") {
    throw new Error("payload.imagens deve ser um objeto { folderId: qtdPorPagina }");
  }

  const grupos = [];

  for (const [folderId, qtdPorPaginaRaw] of Object.entries(imagens)) {
    const qtdPorPagina = Number(qtdPorPaginaRaw);
    const { imgWidth, imgHeight } = wordService.getLayout(qtdPorPagina);

    const images = await loadImagesFromFolder(folderId, imgWidth, imgHeight);
    grupos.push({ images, qtdPorPagina });
  }

  return wordService.buildWordImagesDocument(grupos);
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

  try {
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
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
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