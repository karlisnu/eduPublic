const fs = require("fs/promises");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { pool } = require("../src/db");

const seedsDirectory = path.join(__dirname, "../sql/seeds");
const splitStatements = (sql) => sql.split(";").map((statement) => statement.trim()).filter(Boolean);

async function seed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Development seed accounts must not be loaded in production");
  }

  const files = (await fs.readdir(seedsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await fs.readFile(path.join(seedsDirectory, file), "utf8");
    for (const statement of splitStatements(sql)) {
      await pool.query(statement);
    }
    console.log(`Applied seed: ${file}`);
  }
  await pool.end();
}

seed().catch(async (error) => {
  console.error("Seed failed:", error.message);
  await pool.end();
  process.exitCode = 1;
});
