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

async function validateProfileRulesMigration(connection) {
  const [rows] = await connection.query(`
    SELECT
      (SELECT COUNT(*) FROM users
       WHERE NOT REGEXP_LIKE(username, '^[[:alpha:]]+$')
          OR NOT REGEXP_LIKE(email, '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'))
        AS invalid_users,
      (SELECT COUNT(*) FROM student_profiles
       WHERE NOT REGEXP_LIKE(first_name, '^[[:alpha:]]+$')
          OR NOT REGEXP_LIKE(last_name, '^[[:alpha:]]+$')
          OR NOT REGEXP_LIKE(student_number, '^[0-9]{11}$')
          OR phone IS NULL
          OR NOT REGEXP_LIKE(phone, '^[0-9]{11}$'))
        AS invalid_student_profiles,
      (SELECT COUNT(*) FROM tutor_profiles
       WHERE NOT REGEXP_LIKE(first_name, '^[[:alpha:]]+$')
          OR NOT REGEXP_LIKE(last_name, '^[[:alpha:]]+$')
          OR CHAR_LENGTH(bio) > 100
          OR CHAR_LENGTH(experience) > 100)
        AS invalid_tutor_profiles,
      (SELECT COUNT(*) FROM subjects
       WHERE description IS NOT NULL
         AND CHAR_LENGTH(TRIM(description)) > 0
         AND CHAR_LENGTH(REGEXP_REPLACE(TRIM(description), '[[:space:]]+', ' '))
             - CHAR_LENGTH(REPLACE(REGEXP_REPLACE(TRIM(description), '[[:space:]]+', ' '), ' ', '')) >= 100)
        AS invalid_subject_descriptions,
      (SELECT COUNT(*) FROM tutor_ratings WHERE CHAR_LENGTH(review) > 50)
        AS invalid_tutor_reviews,
      (SELECT COUNT(*) FROM student_evaluations WHERE CHAR_LENGTH(comments) > 50)
        AS invalid_student_evaluation_comments
  `);
  const invalidCounts = Object.entries(rows[0]).filter(([, count]) => Number(count) > 0);

  if (invalidCounts.length > 0) {
    const details = invalidCounts.map(([field, count]) => `${field}: ${count}`).join(", ");
    throw new Error(
      `Cannot apply profile data rules while legacy rows violate them (${details}). ` +
      "Review and correct legacy data without inventing verified student numbers, then rerun the migration.",
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
      if (file === "002_apply_profile_data_rules.sql") {
        await validateProfileRulesMigration(connection);
      }
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
