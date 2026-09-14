const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "db",
  user: process.env.DB_USER || "dev",
  password: process.env.DB_PASSWORD || "dev",
  database: process.env.DB_NAME || "appdb",
  port: process.env.DB_PORT || 3306
});

module.exports = pool;