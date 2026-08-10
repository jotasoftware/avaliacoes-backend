const { DataTypes } = require("sequelize");
const sequelize = require("../database/database");

const Pendente = sequelize.define("Pendente", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  matricula: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  cidade: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  estado: {
    type: DataTypes.STRING,
  },

  id_drive: {
    type: DataTypes.STRING,
  },
});

module.exports = Pendente;