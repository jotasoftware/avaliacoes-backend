function validateMatNumber(value) {
    if (typeof value !== "string") return false;
  
    return /^[0-9\W]+$/.test(value); // sem letras
  }
  
  module.exports = { validateMatNumber };