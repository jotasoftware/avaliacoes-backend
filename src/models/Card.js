const { DataTypes } = require("sequelize");
const sequelize = require("../database/database");

const Card = sequelize.define("Card", {
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

  proprietario: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  tipo: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  id_drive: {
    type: DataTypes.STRING,
  },

  tamanho: {
    type: DataTypes.STRING,
  },

  status: {
    type: DataTypes.STRING,
    defaultValue: "todo",
  },

  ordem: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

module.exports = Card;