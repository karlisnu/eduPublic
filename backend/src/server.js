const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config();
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/Alumnos/html", express.static(path.join(__dirname, "../../Alumnos/html")));
app.use("/imagenes", express.static(path.join(__dirname, "../../imagenes")));

const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const calculatedHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(calculatedHash, "hex"));
};

const ensureUsersTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(80) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'alumno') NOT NULL DEFAULT 'alumno',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_username (username)
    )
  `);

  const defaultUsers = [
    ["admin", "admin123", "admin"],
    ["alumno", "alumno123", "alumno"],
  ];

  for (const [username, password, role] of defaultUsers) {
    await pool.query(
      "INSERT IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)",
      [username, hashPassword(password), role],
    );
  }
};

app.get("/", (req, res) => {
  res.json({
    message: "API EDU-EduMatch funcionando",
    login: "http://localhost:8000/Alumnos/html/Login.html",
    endpoints: ["GET /api/health", "POST /api/login", "POST /api/users", "GET /api/tutors"],
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
    const [rows] = await pool.query(
      "SELECT id, username, password_hash, role FROM users WHERE username = ? LIMIT 1",
      [username],
    );

    if (rows.length === 0 || !verifyPassword(password, rows[0].password_hash)) {
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
  const role = req.body.role === "admin" ? "admin" : "alumno";

  if (username.length < 3 || password.length < 6) {
    return res.status(400).json({ error: "El usuario debe tener 3 caracteres y la contraseña 6" });
  }

  try {
    const [result] = await pool.query(
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
    const subject = typeof req.query.subject === "string" ? req.query.subject.trim() : "";
    const query = subject
      ? `SELECT id, name, subject, experience, availability, rating, bio, is_available
         FROM tutors WHERE is_available = 1 AND subject LIKE ? ORDER BY rating DESC, name ASC`
      : `SELECT id, name, subject, experience, availability, rating, bio, is_available
         FROM tutors WHERE is_available = 1 ORDER BY rating DESC, name ASC`;
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
    const [rows] = await pool.query(
      `SELECT id, name, subject, experience, availability, rating, bio, is_available
       FROM tutors WHERE id = ? AND is_available = 1`,
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