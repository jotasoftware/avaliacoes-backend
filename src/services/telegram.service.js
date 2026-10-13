const axios = require("axios");
const sharp = require("sharp");

exports.getImageStream =
  async (fileId) => {
    const token =
      process.env
        .TELEGRAM_BOT_TOKEN;

    const fileResponse =
      await axios.get(
        `https://api.telegram.org/bot${token}/getFile`,
        {
          params: {
            file_id: fileId,
          },
        }
      );

    const filePath =
      fileResponse.data.result
        .file_path;

    const fileUrl =
      `https://api.telegram.org/file/bot${token}/${filePath}`;

    const imageResponse =
      await axios.get(fileUrl, {
        responseType: "stream",
      });

    return imageResponse.data;
  };
  
  async function getFileUrl(fileId) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
  
    const { data } = await axios.get(
      `https://api.telegram.org/bot${token}/getFile`,
      {
        params: {
          file_id: fileId,
        },
      }
    );
  
    return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
  }

  exports.getImageWithBase64 = async (fileId) => {
    const fileUrl = await getFileUrl(fileId);
  
    const { data } = await axios.get(fileUrl, {
      responseType: "arraybuffer",
    });
  
    const originalBuffer = Buffer.from(data);
  
    const resizedBuffer = await sharp(originalBuffer)
      .resize({
        width: 1024,
        height: 1024,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 85,
      })
      .toBuffer();
  
    return {
      buffer: resizedBuffer,
      base64: `data:image/jpeg;base64,${resizedBuffer.toString("base64")}`,
    };
  };

  exports.getDocumentStream = async (fileId) => {
  const file = await axios.get(
    `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${fileId}`
  );

  const filePath = file.data.result.file_path;

  const response = await axios.get(
    `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`,
    {
      responseType: "stream",
    }
  );

  return response.data;
};

exports.getDocumentStream = async (fileId) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  const fileResponse = await axios.get(
    `https://api.telegram.org/bot${token}/getFile`,
    {
      params: {
        file_id: fileId,
      },
    }
  );

  const filePath = fileResponse.data.result.file_path;

  const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

  const documentResponse = await axios.get(fileUrl, {
    responseType: "stream",
  });

  return documentResponse.data;
};

exports.sendErrorNotification = async (error, context = {}) => {
  const token = process.env.TELEGRAM_BOT_ERROR_TOKEN;
  const chatId = process.env.TELEGRAM_BOT_ERROR_CHAT_ID;

  if (!token || !chatId) {
    console.error("TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados");
    return;
  }

  const contextLines = Object.entries(context)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  const text = [
    "🚨 *Erro no backend*",
    `\`${error.message}\``,
    contextLines ? `\n${contextLines}` : "",
    error.stack ? `\n\`\`\`${error.stack.slice(0, 500)}\`\`\`` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    });
  } catch (err) {
    console.error("Falha ao enviar notificação pro Telegram:", err.message);
  }
};