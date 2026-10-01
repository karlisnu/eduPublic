const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config();
const { pool } = require("./db");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/Alumnos/html", express.static(path.join(__dirname, "../../Alumnos/html")));
app.use("/imagenes", express.static(path.join(__dirname, "../../imagenes")));

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !/^[a-f\d]{128}$/i.test(hash || "")) return false;

  const calculatedHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(calculatedHash, "hex"));
}

function isValidPassword(password) {
  return password.length >= 6 &&
    /\p{Lu}/u.test(password) &&
    /\p{N}/u.test(password) &&
    /[^\p{L}\p{N}]/u.test(password);
}

async function requireDatabase() {
  try {
    await pool.query("SELECT 1");
  } catch (error) {
    error.status = 503;
    error.publicMessage = "MySQL no está disponible; los datos no se guardaron.";
    throw error;
  }
}

const prepareDatabase = async () => {
  try {
    await requireDatabase();
  } catch (error) {
    throw new Error(
      "No se pudo conectar con MySQL. Inicia la base de datos y ejecuta `npm --prefix backend run db:setup`.",
      { cause: error },
    );
  }

  const requiredColumnsByTable = {
    users: ["id", "username", "login_identifier", "email", "password_hash", "role", "account_status", "approved_at"],
    student_profiles: ["user_id", "student_number", "career_id", "campus_id"],
    tutor_profiles: ["user_id", "application_status", "is_available"],
    careers: ["id", "name", "is_active"],
    campuses: ["id", "name", "is_active"],
    subjects: ["id", "name"],
    tutor_subjects: ["tutor_id", "subject_id"],
    tutor_ratings: ["tutor_id", "rating"],
  };
  const [tableRows] = await pool.query("SHOW TABLES");
  const existingTables = new Set(tableRows.map((row) => Object.values(row)[0]));
  const schemaErrors = [];
  for (const [table, requiredColumns] of Object.entries(requiredColumnsByTable)) {
    if (!existingTables.has(table)) {
      schemaErrors.push(`falta la tabla ${table}`);
      continue;
    }
    const [columns] = await pool.query(`SHOW COLUMNS FROM \`${table}\``);
    const availableColumns = new Set(columns.map((column) => column.Field));
    const missingColumns = requiredColumns.filter((column) => !availableColumns.has(column));
    if (missingColumns.length > 0) {
      schemaErrors.push(`${table}: ${missingColumns.join(", ")}`);
    }
  }
  if (schemaErrors.length > 0) {
    throw new Error(
      `Esquema MySQL incompleto (${schemaErrors.join("; ")}). Ejecuta \`npm --prefix backend run db:setup\`.`,
    );
  }
};

app.get("/", async (req, res) => {
  await requireDatabase();
  res.json({
    message: "API EDU-EduMatch funcionando",
    login: "http://localhost:5173/",
    endpoints: ["GET /api/health", "GET /api/catalogs", "POST /api/login", "POST /api/users", "GET /api/tutors"],
    database: "mysql",
  });
});

app.get("/api/health", async (req, res, next) => {
  try {
    await requireDatabase();
    res.json({ message: "Backend funcionando", database: "mysql" });
  } catch (error) {
    next(error);
  }
});

app.get("/api/catalogs", async (req, res, next) => {
  try {
    await requireDatabase();
    const [careers, campuses, subjects] = await Promise.all([
      pool.query("SELECT id, name FROM careers WHERE is_active = TRUE ORDER BY name"),
      pool.query("SELECT id, name FROM campuses WHERE is_active = TRUE ORDER BY name"),
      pool.query("SELECT id, name FROM subjects ORDER BY name"),
    ]);
    res.json({
      careers: careers[0],
      campuses: campuses[0],
      subjects: subjects[0],
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/login", async (req, res, next) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const identifier = typeof body.username === "string"
    ? body.username.trim()
    : typeof body.identifier === "string"
      ? body.identifier.trim()
      : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = typeof body.role === "string" ? body.role : "";

  if (!identifier || !password || !role) {
    return res.status(400).json({ error: "Matrícula o usuario y contraseña son obligatorios" });
  }
  if (!["alumno", "tutor", "admin"].includes(role)) {
    return res.status(400).json({ error: "El tipo de cuenta no es válido" });
  }

  try {
    await requireDatabase();

    let query;
    if (role === "alumno") {
      query = pool.query(
        `SELECT u.id, u.username, u.password_hash, u.role, u.account_status
         FROM users u
         INNER JOIN student_profiles sp ON sp.user_id = u.id
         WHERE u.login_identifier = ? AND sp.student_number = u.login_identifier
           AND u.role = 'alumno'
         LIMIT 1`,
        [identifier],
      );
    } else if (role === "tutor") {
      query = pool.query(
        `SELECT u.id, u.username, u.password_hash, u.role, u.account_status,
                tp.application_status
         FROM users u
         INNER JOIN tutor_profiles tp ON tp.user_id = u.id
         WHERE (u.username = ? OR u.email = ?) AND u.role = 'tutor'
         LIMIT 1`,
        [identifier, identifier],
      );
    } else if (role === "admin") {
      query = pool.query(
        `SELECT id, username, password_hash, role, account_status
         FROM users
         WHERE (login_identifier = ? OR username = ? OR email = ?) AND role = 'admin'
         LIMIT 1`,
        [identifier, identifier, identifier],
      );
    }
    const [rows] = await query;

    if (rows.length === 0 || !verifyPassword(password, rows[0].password_hash)) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }
    if (rows[0].account_status !== "approved") {
      return res.status(403).json({ error: "La cuenta está pendiente de aprobación o no está habilitada" });
    }
    if (role === "tutor" && rows[0].application_status !== "approved") {
      return res.status(403).json({ error: "La solicitud de tutor está pendiente de aprobación" });
    }

    res.json({ id: rows[0].id, username: rows[0].username, role: rows[0].role });
  } catch (error) {
    next(error);
  }
});

app.post("/api/users", async (req, res, next) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = typeof body.role === "string" ? body.role : "";
  const email = typeof body.email === "string" ? body.email : "";
  const usernameContainsOnlyLetters = /^\p{L}+$/u.test(username);
  const emailHasValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const isValidName = (value) => /^\p{L}+$/u.test(value);

  if (username.length < 3 || username.length > 80 ||
      email.length > 255 || !usernameContainsOnlyLetters || !emailHasValidFormat) {
    return res.status(400).json({ error: "El usuario o el correo tienen un formato inválido" });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({
      error: "La contraseña debe tener al menos 6 caracteres, una mayúscula, un número y un carácter especial",
    });
  }
  if (!["alumno", "tutor"].includes(role)) {
    return res.status(400).json({ error: "El rol de registro no es válido" });
  }
  if (!isValidName(firstName) || firstName.length > 80 ||
      !isValidName(lastName) || lastName.length > 120) {
    return res.status(400).json({ error: "El nombre y apellido solo pueden contener letras" });
  }

  let studentNumber = "";
  let careerId;
  let campusId;
  let phone = "";
  let bio = "";
  let experience = "";
  if (role === "alumno") {
    studentNumber = typeof body.studentNumber === "string" ? body.studentNumber : "";
    careerId = Number(body.careerId);
    campusId = Number(body.campusId);
    phone = typeof body.phone === "string" ? body.phone : "";
    if (!/^\d{11}$/.test(studentNumber) || !/^\d{11}$/.test(phone)) {
      return res.status(400).json({ error: "La matrícula y el teléfono deben tener exactamente 11 dígitos" });
    }
    if (!Number.isSafeInteger(careerId) || careerId < 1 || !Number.isSafeInteger(campusId) || campusId < 1) {
      return res.status(400).json({ error: "Selecciona una carrera y un campus válidos" });
    }
  } else {
    bio = typeof body.bio === "string" ? body.bio.trim() : "";
    experience = typeof body.experience === "string" ? body.experience.trim() : "";
    if (bio.length > 100 || experience.length < 1 || experience.length > 100) {
      return res.status(400).json({ error: "La biografía y la experiencia deben tener como máximo 100 caracteres" });
    }
  }

  let connection;
  let transactionStarted = false;
  try {
    await requireDatabase();
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    if (role === "alumno") {
      const [careers] = await connection.query(
        "SELECT id FROM careers WHERE id = ? AND is_active = TRUE",
        [careerId],
      );
      const [campuses] = await connection.query(
        "SELECT id FROM campuses WHERE id = ? AND is_active = TRUE",
        [campusId],
      );
      if (careers.length === 0 || campuses.length === 0) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(400).json({ error: "La carrera o campus seleccionado no está activo en el catálogo" });
      }
    }

    const [result] = await connection.query(
      `INSERT INTO users
        (username, login_identifier, email, password_hash, role, account_status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [username, role === "alumno" ? studentNumber : null, email, hashPassword(password), role],
    );

    if (role === "alumno") {
      await connection.query(
        `INSERT INTO student_profiles
          (user_id, first_name, last_name, student_number, student_number_verification_status,
           career_id, campus_id, phone)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [result.insertId, firstName, lastName, studentNumber, careerId, campusId, phone],
      );
    } else {
      await connection.query(
        `INSERT INTO tutor_profiles
          (user_id, first_name, last_name, bio, experience, application_status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [result.insertId, firstName, lastName, bio || null, experience],
      );
    }

    await connection.commit();
    transactionStarted = false;
    res.status(201).json({
      id: result.insertId,
      username,
      role,
      accountStatus: "pending",
      ...(role === "tutor"
        ? { applicationStatus: "pending" }
        : { studentNumberVerificationStatus: "pending" }),
    });
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback();
      transactionStarted = false;
    }
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "El usuario ya existe" });
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
});

app.get("/api/tutors", async (req, res, next) => {
  try {
    await requireDatabase();
    const subject = typeof req.query.subject === "string" ? req.query.subject.trim() : "";

    const query = `
      SELECT
        tp.user_id AS id,
        CONCAT(tp.first_name, ' ', tp.last_name) AS name,
        GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') AS subject,
        tp.experience,
        COALESCE(ROUND(AVG(tr.rating), 1), 0) AS rating,
        tp.bio,
        tp.is_available
      FROM tutor_profiles tp
      INNER JOIN users u ON u.id = tp.user_id
      INNER JOIN tutor_subjects ts ON ts.tutor_id = tp.user_id
      INNER JOIN subjects s ON s.id = ts.subject_id
      LEFT JOIN tutor_ratings tr ON tr.tutor_id = tp.user_id
      WHERE tp.is_available = 1
        AND tp.application_status = 'approved'
        AND u.account_status = 'approved'
        ${subject ? "AND s.name LIKE ?" : ""}
      GROUP BY tp.user_id, tp.first_name, tp.last_name, tp.experience,
        tp.bio, tp.is_available
      ORDER BY rating DESC, name ASC`;
    const [rows] = await pool.query(query, subject ? [`%${subject}%`] : []);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get("/api/tutors/:id", async (req, res, next) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "El id debe ser un entero positivo" });
  }

  try {
    await requireDatabase();

    const [rows] = await pool.query(
      `SELECT
         tp.user_id AS id,
         CONCAT(tp.first_name, ' ', tp.last_name) AS name,
         GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') AS subject,
         tp.experience,
         COALESCE(ROUND(AVG(tr.rating), 1), 0) AS rating,
         tp.bio,
         tp.is_available
       FROM tutor_profiles tp
       INNER JOIN users u ON u.id = tp.user_id
       INNER JOIN tutor_subjects ts ON ts.tutor_id = tp.user_id
       INNER JOIN subjects s ON s.id = ts.subject_id
       LEFT JOIN tutor_ratings tr ON tr.tutor_id = tp.user_id
       WHERE tp.user_id = ?
         AND tp.is_available = 1
         AND tp.application_status = 'approved'
         AND u.account_status = 'approved'
       GROUP BY tp.user_id, tp.first_name, tp.last_name, tp.experience,
         tp.bio, tp.is_available`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Tutor no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  const status = Number.isInteger(error.status) ? error.status : 500;
  res.status(status).json({
    error: error.publicMessage || (status === 503
      ? "MySQL no está disponible; los datos no se guardaron."
      : "Error interno del servidor"),
  });
});

const PORT = process.env.PORT || 8000;

prepareDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend ejecutándose en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("No se pudo iniciar el backend:", error.message);
    pool.end().finally(() => {
      process.exitCode = 1;
    });
  });