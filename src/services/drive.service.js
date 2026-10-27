const drive = require("../config/google");
const fs = require("fs");
const { Readable } = require("stream");

exports.uploadImage = async (stream, folderId) => {
    const result = await drive.files.create({
      requestBody: {
        name: `${Date.now()}.jpg`,
        parents: folderId ? [folderId] : undefined,
      },
      media: {
        mimeType: "image/jpeg",
        body: stream,
      },
      fields: "id, name",
    });
  
    return {
      fileId: result.data.id,
      fileName: result.data.name,
    };
  };

exports.createFolder = async (folderName) => {
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [process.env.GOOGLE_ROOT_FOLDER],
    },
    fields: "id",
  });
  
  return folder.data.id;
};

exports.getOrCreateFolder = async (folderName) => {
  const safeName = folderName.replace(/'/g, "\\'");
 
  const search = await drive.files.list({
    q: `
      mimeType = 'application/vnd.google-apps.folder'
      and name = '${safeName}'
      and '${process.env.GOOGLE_ROOT_FOLDER}' in parents
      and trashed = false
    `,
    fields: "files(id, name)",
  });
 
  if (search.data.files.length > 0) {
    return search.data.files[0].id;
  }
 
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [process.env.GOOGLE_ROOT_FOLDER],
    },
    fields: "id",
  });
 
  return folder.data.id;
};

exports.getOrCreateSubFolder = async (folderName, parentFolderId) => {
  const safeName = folderName.replace(/'/g, "\\'");

  const search = await drive.files.list({
    q: `
      mimeType = 'application/vnd.google-apps.folder'
      and name = '${safeName}'
      and '${parentFolderId}' in parents
      and trashed = false
    `,
    fields: "files(id, name)",
  });

  const folders = search.data.files;

  if (folders && folders.length > 0) {
    return folders[0].id;
  }

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
  });

  return folder.data.id;
};

exports.listAllFilesRecursive = async (folderId) => {
  const result = [];

  const list = async (parentId) => {
    const res = await drive.files.list({
      q: `'${parentId}' in parents and trashed=false`,
      fields: "files(id, name, mimeType)",
    });

    for (const file of res.data.files) {
      if (file.mimeType === "application/vnd.google-apps.folder") {
        await list(file.id);
      } else {
        result.push(file);
      }
    }
  };

  await list(folderId);

  result.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  return result;
};

exports.getFileUrl = (fileId) => {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
};

exports.downloadFile = async (fileId) => {
  const res = await drive.files.get(
    {
      fileId,
      alt: "media",
    },
    {
      responseType: "stream",
    }
  );

  return res.data;
};

exports.getNextNumberSubFolder = async (parentFolderId) => {
  const response = await drive.files.list({
    q: `'${parentFolderId}' in parents
        and mimeType='application/vnd.google-apps.folder'
        and trashed=false`,
    fields: "files(id,name)",
  });

  const folders = response.data.files;

  let max = 0;

  for (const folder of folders) {
    const number = parseInt(folder.name, 10);

    if (!isNaN(number) && number > max) {
      max = number;
    }
  }

  const next = String(max + 1);

  const created = await drive.files.create({
    requestBody: {
      name: next,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
  });

  return created.data.id;
};

exports.getAvaliacaoFiles = async (folderId) => {

  const foldersResponse = await drive.files.list({
    q: `
      '${folderId}' in parents
      and mimeType='application/vnd.google-apps.folder'
      and trashed=false
    `,
    fields: "files(id,name)",
  });


  const folders = foldersResponse.data.files;


  const imagensFolder = folders.find(
    folder => folder.name === "Imagens"
  );


  const documentosFolder = folders.find(
    folder => folder.name === "Documentos"
  );


  const resultado = {
    imagens: [],
    documentos: []
  };


  // =====================
  // IMAGENS
  // =====================
  if (imagensFolder) {

    const subPastas = await drive.files.list({
      q: `
        '${imagensFolder.id}' in parents
        and mimeType='application/vnd.google-apps.folder'
        and trashed=false
      `,
      fields: "files(id,name)",
    });


    for (const pasta of subPastas.data.files) {

      const imagens = await drive.files.list({
        q: `
          '${pasta.id}' in parents
          and mimeType contains 'image/'
          and trashed=false
        `,
        fields: "files(id,name)",
      });


      resultado.imagens.push({
        id: pasta.id,
        nome: pasta.name,
        quantidade: imagens.data.files.length
      });
    }
  }

  // =====================
  // DOCUMENTOS
  // =====================
  if (documentosFolder) {
    const words = await exports.listWords(documentosFolder.id);

    resultado.documentos = words.map((w) => ({
      id: w.id,
      nome: w.name.replace(/\.docx$/i, ""),
      criadoEm: w.createdTime,
    }));
  }


  return resultado;
};

exports.deleteFolder = async (folderId) => {
  await drive.files.update({
    fileId: folderId,
    requestBody: {
      trashed: true,
    },
  });
};

exports.renameFolder = async (folderId, novoNome) => {
  await drive.files.update({
    fileId: folderId,
    requestBody: {
      name: novoNome,
    },
  });
};

exports.uploadFile = async (stream, folderId, fileName, mimeType) => {
  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id",
  });

  return { fileId: file.data.id };
};

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

exports.uploadWord = async (folderId, buffer, nome) => {
  const res = await drive.files.create({
    requestBody: { name: nome, parents: [folderId] },
    media: { mimeType: DOCX, body: Readable.from(buffer) },
    fields: "id",
  });
  return res.data;
};

exports.listWords = async (folderId) => {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType = '${DOCX}' and trashed = false`,
    orderBy: "createdTime desc",
    fields: "files(id, name, createdTime)",
  });
  return res.data.files;
};

exports.getFileMeta = async (fileId) => {
  const res = await drive.files.get({ fileId, fields: "id, name, mimeType" });
  return res.data;
};