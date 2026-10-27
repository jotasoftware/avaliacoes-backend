const sharp = require("sharp");
const {
  Document,
  Packer,
  Paragraph,
  ImageRun,
  PageBreak,
  AlignmentType,
} = require("docx");

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