require("dotenv").config();

const express = require("express");
const cors = require("cors");

const sequelize = require("./database/database");

require("./models/Card");

const uploadRoutes = require("./routes/upload.routes");
const downloadRoutes = require("./routes/download.routes");
const cardRoutes = require("./routes/card.routes");
const pendenteRoutes = require("./routes/pendente.routes");
const categoriaRoutes = require("./routes/categoria.routes");
const Card = require("./models/Card");

const app = express();

app.use(cors({
  origin: "http://localhost:5173", // seu frontend React/Vite
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Disposition"],
}));

app.use(express.json());

app.use("/upload", uploadRoutes);
app.use("/download", downloadRoutes);
app.use("/avaliacao", cardRoutes);
app.use("/pendente", pendenteRoutes);
app.use("/categoria", categoriaRoutes);


sequelize
  .sync()
  .then(async () => {
    app.listen(process.env.PORT, () => {
      console.log(
        `Server running on port ${process.env.PORT}`
      );
    });
  })
  .catch((error) => {
    console.error("Erro ao conectar com banco:", error);
  });