const drive = require("../config/google");
const fs = require("fs");

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

  exports.getOrCreateFolder = async (folderName) => {
    // evita quebrar query com aspas simples
    const safeName = folderName.replace(/'/g, "\\'");
  
    const search = await drive.files.list({
      q: `
        mimeType = 'application/vnd.google-apps.folder'
        and name = '${safeName}'
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