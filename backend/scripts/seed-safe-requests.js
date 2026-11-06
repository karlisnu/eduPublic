const fs = require("node:fs/promises");
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { pool } = require("../src/db");

const localHosts = new Set(["localhost", "127.0.0.1", "::1", "mysql", "db"]);
const databaseName = process.env.DB_NAME || "";
const databaseHost = (process.env.DB_HOST || "").toLowerCase();
const productionLikeDatabase = /(^|[_-])(prod|production)([_-]|$)/i.test(databaseName);

async function seedSafeRequestsData() {
  if (process.env.NODE_ENV === "production" || !localHosts.has(databaseHost) ||
      productionLikeDatabase) {
    throw new Error("Safe Requests fixtures can only be applied to a local non-production database");
  }

  const seedPath = path.join(__dirname, "../sql/seeds/002_safe_requests_local_data.sql");
  const sql = await fs.readFile(seedPath, "utf8");
  const statements = sql.split(";").map((statement) => statement.trim()).filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }

  console.log("Applied local Safe Requests tutor profiles and availability.");
}

seedSafeRequestsData()
  .catch((error) => {
    console.error("Safe Requests local seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
