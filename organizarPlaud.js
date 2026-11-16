require("dotenv").config();
const { organizarEntradaPlaud } = require("./src/services/plaud-inbox.service");

organizarEntradaPlaud()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });