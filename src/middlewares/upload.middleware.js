const multer = require("multer");
const fs = require("fs");
const os = require("os");

function erro(mensagem, status, userMessage) {
  const e = new Error(mensagem);
  e.status = status;
  e.userMessage = userMessage;
  return e;
}

function lerInicio(caminho, n) {
  const fd = fs.openSync(caminho, "r");
  const buf = Buffer.alloc(n);
  fs.readSync(fd, buf, 0, n, 0);
  fs.closeSync(fd);
  return buf.toString("latin1");
}

const limpar = (files = []) => files.forEach((f) => fs.unlink(f.path, () => {}));

function criarUpload({ campo = "files", maxArquivos = 5, maxMB = 200, assinatura, nomeTipo }) {
  const upload = multer({
    storage: multer.diskStorage({
      destination: os.tmpdir(),
      filename: (req, file, cb) =>
        cb(null, `upload-${Date.now()}-${Math.round(Math.random() * 1e9)}.tmp`),
    }),
    limits: { fileSize: maxMB * 1024 * 1024, files: maxArquivos },
  });

  return (req, res, next) => {
    upload.array(campo, maxArquivos)(req, res, (err) => {
      if (err) {
        limpar(req.files);
        return next(
          err.code === "LIMIT_FILE_SIZE"
            ? erro(err.message, 413, "arquivo_muito_grande")
            : erro(err.message, 400, "upload_invalido")
        );
      }

      if (!req.files?.length) {
        return next(erro("Nenhum arquivo enviado", 400, "nenhum_arquivo"));
      }

      if (assinatura) {
        for (const f of req.files) {
          if (lerInicio(f.path, assinatura.length) !== assinatura) {
            limpar(req.files);
            return next(erro(`${f.originalname} não é ${nomeTipo}`, 400, "tipo_invalido"));
          }
        }
      }

      // apaga os temporários quando a resposta terminar (com sucesso ou erro)
      res.on("close", () => limpar(req.files));
      next();
    });
  };
}

exports.uploadPdfs = criarUpload({
  maxArquivos: 5,
  maxMB: 200,
  assinatura: "%PDF-",
  nomeTipo: "um PDF",
});