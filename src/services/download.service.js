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


const driveService = require("../services/drive.service");

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

exports.buildWordImagesFromFolder = async (folderId) => {
  const files = await driveService.listAllFilesRecursive(folderId);
  const images = [];

  const TARGET_WIDTH = 275;
  const TARGET_HEIGHT = 170;

  for (const file of files) {
    if (!file.mimeType?.startsWith("image/")) continue;

    const stream = await driveService.downloadFile(file.id);
    const originalBuffer = await streamToBuffer(stream);

    // 🔥 TRUQUE DE MESTRE: Recorte centralizado (Object-fit: Cover) via Sharp
    // Isso garante que fotos verticais ou quadradas sejam cortadas no meio sem distorcer
    const processedBuffer = await sharp(originalBuffer)
      .resize(TARGET_WIDTH * 2, TARGET_HEIGHT * 2, { 
        fit: "cover",        // Garante que preencha todo o espaço
        position: "center"   // Recorta mantendo o foco no centro da foto
      })
      .toBuffer();

    const cleanName = file.name.replace(/\.[^/.]+$/, "");

    images.push({ 
      buffer: processedBuffer, 
      name: cleanName 
    });
  }

  const pages = chunk(images, 8); 

  const sections = pages.map((page) => {
    const mainGridRows = [];

    for (let i = 0; i < page.length; i += 2) {
      const rowItems = page.slice(i, i + 2);

      const gridRow = new TableRow({
        children: rowItems.map((img) => {
          const imageCardTable = new Table({
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
                            transformation: { 
                              width: TARGET_WIDTH, 
                              height: TARGET_HEIGHT 
                            },
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
                        text: img.name,
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

          return new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
            margins: { top: 80, bottom: 150, left: 80, right: 80 }, 
            children: [imageCardTable],
          });
        }),
      });

      mainGridRows.push(gridRow);
    }

    return {
      properties: {
        page: {
          margin: { top: 1440, bottom: 500, left: 500, right: 1440 },
        },
      },
      children: [
        new Paragraph({
          text: "RELATÓRIO FOTOGRÁFICO",
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          style: {
            run: { font: "Times New Roman", bold: true, size: 24, color: "000000" },
          },
        }),
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
      ],
    };
  });

  const doc = new Document({ sections });
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