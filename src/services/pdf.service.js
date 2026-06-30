const { pdf } = require("pdf-to-img");
const { Readable } = require("stream");

const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];

    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });

exports.pdfToImages = async (pdfStream) => {
  const pdfBuffer = await streamToBuffer(pdfStream);

  const pages = [];

  const document = await pdf(pdfBuffer, {
    scale: 2,
  });

  for await (const imageBuffer of document) {
    pages.push({
      smallBase64: imageBuffer.toString("base64"),
      largeStream: Readable.from(imageBuffer),
    });
  }

  return pages;
};