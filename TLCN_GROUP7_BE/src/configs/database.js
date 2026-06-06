// config/database.js
const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,     
  process.env.DB_USER,     
  process.env.DB_PASSWORD, 
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: "postgres", // Ép kiểu Postgres
    logging: false,         
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // Bọc thép: Vượt rào bảo mật Supabase
      }
    },
    pool: {
      max: 5,       
      min: 0,        
      acquire: 30000, 
      idle: 10000     
    }
  }
);

module.exports = sequelize;