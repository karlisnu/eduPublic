const mysql = require("mysql2/promise");

const requiredVariables = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "DB_PORT"];
const missingVariables = requiredVariables.filter((name) => !process.env[name]?.trim());

if (missingVariables.length > 0) {
  throw new Error(`Faltan variables de conexión MySQL: ${missingVariables.join(", ")}`);
}

const port = Number(process.env.DB_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("DB_PORT debe ser un número entero entre 1 y 65535");
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 2000,
});

module.exports = { pool };