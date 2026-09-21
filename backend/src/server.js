const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config();
const { pool, isDbAvailable } = require("./db");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/Alumnos/html", express.static(path.join(__dirname, "../../Alumnos/html")));
app.use("/imagenes", express.static(path.join(__dirname, "../../imagenes")));

const fallbackUsers = [
  { id: 1, username: "admin", password_hash: hashPassword("admin123"), role: "admin", account_status: "approved" },
  { id: 2, username: "alumno", password_hash: hashPassword("alumno123"), role: "alumno", account_status: "approved" },
];

const fallbackTutors = [
  { id: 1, name: "Ana García", subject: "Matemáticas", experience: "5 años", availability: "Lun-Vie", rating: 4.9, bio: "Especialista en álgebra y cálculo.", is_available: true },
  { id: 2, name: "Luis Ramírez", subject: "Física", experience: "4 años", availability: "Mar-Jue", rating: 4.8, bio: "Apoya con ejercicios y teoría.", is_available: true },
  { id: 3, name: "Marina López", subject: "Programación", experience: "6 años", availability: "Mie-Sab", rating: 5.0, bio: "Clases prácticas de JavaScript y lógica.", is_available: true },
];

let usersSupportsApproval = false;

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const calculatedHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(calculatedHash, "hex"));
}

const ensureUsersTable = async () => {
  const dbReady = await isDbAvailable();
  if (!dbReady) {
    console.warn("MySQL no disponible. Usando almacenamiento en memoria para usuarios y tutores.");
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(80) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'alumno', 'tutor') NOT NULL DEFAULT 'alumno',
      account_status ENUM('pending', 'approved', 'rejected', 'suspended') NOT NULL DEFAULT 'pending',
      approved_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_username (username),
      UNIQUE KEY uq_users_email (email)
    )
  `);

  const [userColumns] = await pool.query("SHOW COLUMNS FROM users");
  usersSupportsApproval = userColumns.some((column) => column.Field === "account_status");

  const defaultUsers = [
    ["admin", "admin@example.com", "admin123", "admin"],
    ["alumno", "alumno@example.com", "alumno123", "alumno"],
  ];

  for (const [username, email, password, role] of defaultUsers) {
    if (usersSupportsApproval) {
      await pool.query(
        `INSERT IGNORE INTO users
         (username, email, password_hash, role, account_status, approved_at)
         VALUES (?, ?, ?, ?, 'approved', CURRENT_TIMESTAMP)`,
        [username, email, hashPassword(password), role],
      );
    } else {
      await pool.query(
        "INSERT IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)",
        [username, hashPassword(password), role],
      );
    }
  }
};

app.get("/", (req, res) => {
  res.json({
    message: "API EDU-EduMatch funcionando",
    login: "http://localhost:8000/Alumnos/html/Login.html",
    endpoints: ["GET /api/health", "POST /api/login", "POST /api/users", "GET /api/tutors"],
    database: "fallback-memory",
  });
});

app.get("/api/health", (req, res) => {
  res.json({ message: "Backend funcionando" });
});

app.post("/api/login", async (req, res, next) => {
  const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!username || !password) {
    return res.status(400).json({ error: "Usuario y contraseña son obligatorios" });
  }

  try {
    const dbReady = await isDbAvailable();

    if (!dbReady) {
        const user = fallbackUsers.find((item) => item.username === username);
        if (!user || user.account_status !== "approved" || !verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
      }

      return res.json({ id: user.id, username: user.username, role: user.role });
    }

    const [rows] = await pool.query(
      `SELECT id, username, password_hash, role
       ${usersSupportsApproval ? ", account_status" : ""}
       FROM users WHERE username = ? LIMIT 1`,
      [username],
    );

    if (
      rows.length === 0 ||
      (usersSupportsApproval && rows[0].account_status !== "approved") ||
      !verifyPassword(password, rows[0].password_hash)
    ) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

    res.json({ id: rows[0].id, username: rows[0].username, role: rows[0].role });
  } catch (error) {
    next(error);
  }
});

app.post("/api/users", async (req, res, next) => {
  const username = typeof req.body.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const role = req.body.role === "tutor" ? "tutor" : "alumno";
  const email = typeof req.body.email === "string" ? req.body.email.trim() : "";

  if (username.length < 3 || password.length < 6 || !email.includes("@")) {
  return res.status(400).json({ error: "Usuario, correo y contraseña tienen un formato inválido" });
  }

  try {
    const dbReady = await isDbAvailable();

    if (!dbReady) {
      const existingUser = fallbackUsers.find((user) => user.username === username);
      if (existingUser) {
        return res.status(409).json({ error: "El usuario ya existe" });
      }

      const newUser = {
        id: fallbackUsers.length + 1,
        username,
        password_hash: hashPassword(password),
        role,
        account_status: "pending",
      };
      fallbackUsers.push(newUser);
      return res.status(201).json({ id: newUser.id, username, role });
    }

    const [result] = usersSupportsApproval
      ? await pool.query(
          "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
          [username, email, hashPassword(password), role],
        )
      : await pool.query(
          "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
          [username, hashPassword(password), role],
        );
    res.status(201).json({ id: result.insertId, username, role });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "El usuario ya existe" });
    }
    next(error);
  }
});

app.get("/api/tutors", async (req, res, next) => {
  try {
    const dbReady = await isDbAvailable();
    const subject = typeof req.query.subject === "string" ? req.query.subject.trim() : "";

    if (!dbReady) {
      const filtered = subject
        ? fallbackTutors.filter((tutor) => tutor.subject.toLowerCase().includes(subject.toLowerCase()))
        : fallbackTutors;
      return res.json(filtered);
    }

    const query = `
      SELECT
        tp.user_id AS id,
        CONCAT(tp.first_name, ' ', tp.last_name) AS name,
        GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') AS subject,
        tp.experience,
        tp.availability,
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
        tp.availability, tp.bio, tp.is_available
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
    const dbReady = await isDbAvailable();

    if (!dbReady) {
      const tutor = fallbackTutors.find((item) => item.id === id && item.is_available);
      if (!tutor) {
        return res.status(404).json({ error: "Tutor no encontrado" });
      }
      return res.json(tutor);
    }

    const [rows] = await pool.query(
      `SELECT
         tp.user_id AS id,
         CONCAT(tp.first_name, ' ', tp.last_name) AS name,
         GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') AS subject,
         tp.experience,
         tp.availability,
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
         tp.availability, tp.bio, tp.is_available`,
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
  res.status(500).json({ error: "Error interno del servidor" });
});

const PORT = process.env.PORT || 8000;

ensureUsersTable()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend ejecutándose en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("No se pudieron preparar los usuarios iniciales", error);
    process.exitCode = 1;
  });