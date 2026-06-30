const axios = require("axios");

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

  exports.getImageWithBase64 = async (fileId) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
  
    // 1. pega info do arquivo
    const fileResponse = await axios.get(
      `https://api.telegram.org/bot${token}/getFile`,
      {
        params: { file_id: fileId },
      }
    );
  
    const filePath = fileResponse.data.result.file_path;
  
    // 2. monta URL
    const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
  
    // 3. baixa como buffer
    const response = await axios.get(fileUrl, {
      responseType: "arraybuffer",
    });
  
    const buffer = Buffer.from(response.data);
  
    return {
      stream: buffer,
      base64: `data:image/jpeg;base64,${buffer.toString("base64")}`,
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