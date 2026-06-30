require("dotenv").config();

const express = require("express");

const uploadRoutes = require("./routes/upload.routes");
const downloadRoutes = require("./routes/download.routes");

const app = express();

app.use(express.json());

app.use("/upload", uploadRoutes);
app.use("/download", downloadRoutes);

app.listen(process.env.PORT, () => {
  console.log(
    `Server running on port ${process.env.PORT}`
  );
});