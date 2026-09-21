const fs = require("fs/promises");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { pool } = require("../src/db");

const migrationsDirectory = path.join(__dirname, "../sql/migrations");
const splitStatements = (sql) => sql.split(";").map((statement) => statement.trim()).filter(Boolean);

async function upgradeLegacyUsers(connection) {
  const [tables] = await connection.query("SHOW TABLES LIKE 'users'");
  if (tables.length === 0) return;

  const [columns] = await connection.query("SHOW COLUMNS FROM users");
  const existing = new Set(columns.map((column) => column.Field));
  if (!existing.has("email")) {
    await connection.query("ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL AFTER username");
    await connection.query(
      "UPDATE users SET email = CONCAT(username, '@legacy.local') WHERE email IS NULL",
    );
    await connection.query("ALTER TABLE users MODIFY email VARCHAR(255) NOT NULL");
    await connection.query("ALTER TABLE users ADD UNIQUE KEY uq_users_email (email)");
  }
  if (!existing.has("account_status")) {
    await connection.query(
      "ALTER TABLE users ADD COLUMN account_status ENUM('pending', 'approved', 'rejected', 'suspended') NOT NULL DEFAULT 'approved' AFTER role",
    );
  }
  if (!existing.has("approved_at")) {
    await connection.query("ALTER TABLE users ADD COLUMN approved_at DATETIME NULL AFTER account_status");
    await connection.query(
      "UPDATE users SET approved_at = created_at WHERE account_status = 'approved'",
    );
  }
  if (!existing.has("updated_at")) {
    await connection.query(
      "ALTER TABLE users ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    );
  }
  const roleColumn = columns.find((column) => column.Field === "role");
  if (roleColumn && !roleColumn.Type.includes("'tutor'")) {
    await connection.query(
      "ALTER TABLE users MODIFY role ENUM('admin', 'alumno', 'tutor') NOT NULL DEFAULT 'alumno'",
    );
  }
}

async function migrate() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await upgradeLegacyUsers(connection);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const files = (await fs.readdir(migrationsDirectory))
      .filter((file) => file.endsWith(".sql"))
      .sort();
    const [appliedRows] = await connection.query("SELECT version FROM schema_migrations");
    const applied = new Set(appliedRows.map((row) => row.version));

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await fs.readFile(path.join(migrationsDirectory, file), "utf8");
      for (const statement of splitStatements(sql)) {
        await connection.query(statement);
      }
      await connection.query("INSERT INTO schema_migrations (version) VALUES (?)", [file]);
      console.log(`Applied migration: ${file}`);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
});
