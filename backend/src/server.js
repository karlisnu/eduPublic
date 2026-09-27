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
  {
    id: 1,
    username: "alumno",
    student_number: "20260000001",
    password_hash: hashPassword("AlumnoA1!"),
    role: "alumno",
    account_status: "approved",
  },
  {
    id: 2,
    username: "estudianteuno",
    student_number: "20260000002",
    password_hash: hashPassword("AlumnoB2!"),
    role: "alumno",
    account_status: "approved",
  },
  {
    id: 3,
    username: "estudiantedos",
    student_number: "20260000003",
    password_hash: hashPassword("AlumnoC3!"),
    role: "alumno",
    account_status: "approved",
  },
  {
    id: 4,
    username: "tutor",
    student_number: "20260000004",
    password_hash: hashPassword("TutorA1!"),
    role: "tutor",
    account_status: "approved",
  },
  {
    id: 5,
    username: "tutoruno",
    student_number: "20260000005",
    password_hash: hashPassword("TutorB2!"),
    role: "tutor",
    account_status: "approved",
  },
  {
    id: 6,
    username: "admin",
    student_number: "20260000006",
    password_hash: hashPassword("AdminA1!"),
    role: "admin",
    account_status: "approved",
  },
];

const fallbackTutors = [
  { id: 1, name: "Ana García", subject: "Matemáticas", experience: "5 años", rating: 4.9, bio: "Especialista en álgebra y cálculo.", is_available: true },
  { id: 2, name: "Luis Ramírez", subject: "Física", experience: "4 años", rating: 4.8, bio: "Apoya con ejercicios y teoría.", is_available: true },
  { id: 3, name: "Marina López", subject: "Programación", experience: "6 años", rating: 5.0, bio: "Clases prácticas de JavaScript y lógica.", is_available: true },
];

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

function isValidPassword(password) {
  return password.length >= 6 &&
    /\p{Lu}/u.test(password) &&
    /\p{N}/u.test(password) &&
    /[^\p{L}\p{N}]/u.test(password);
}

const prepareDatabase = async () => {
  const dbReady = await isDbAvailable();
  if (!dbReady) {
    console.warn("MySQL no disponible. Usando almacenamiento en memoria para usuarios y tutores.");
    return;
  }

  const [userColumns] = await pool.query("SHOW COLUMNS FROM users");
  const requiredColumns = ["email", "login_identifier", "account_status", "approved_at"];
  const availableColumns = new Set(userColumns.map((column) => column.Field));
  const missingColumns = requiredColumns.filter((column) => !availableColumns.has(column));

  if (missingColumns.length > 0) {
    throw new Error(`Database schema is missing required users columns: ${missingColumns.join(", ")}`);
  }
};

app.get("/", async (req, res) => {
  const dbReady = await isDbAvailable();
  res.json({
    message: "API EDU-EduMatch funcionando",
    login: "http://localhost:5173/",
    endpoints: ["GET /api/health", "POST /api/login", "POST /api/users", "GET /api/tutors"],
    database: dbReady ? "mysql" : "fallback-memory",
  });
});

app.get("/api/health", (req, res) => {
  res.json({ message: "Backend funcionando" });
});

app.post("/api/login", async (req, res, next) => {
  const identifier = typeof req.body.username === "string"
    ? req.body.username.trim()
    : typeof req.body.identifier === "string"
      ? req.body.identifier.trim()
      : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  const role = typeof req.body.role === "string" ? req.body.role : "";

  if (!identifier || !password) {
    return res.status(400).json({ error: "Matrícula o usuario y contraseña son obligatorios" });
  }
  if (role && !["alumno", "tutor", "admin"].includes(role)) {
    return res.status(400).json({ error: "El tipo de cuenta no es válido" });
  }

  try {
    const dbReady = await isDbAvailable();

    if (!dbReady) {
      const user = fallbackUsers.find((item) => (
        item.student_number === identifier && (!role || item.role === role)
      ));
      if (!user || user.account_status !== "approved" || !verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
      }

      return res.json({ id: user.id, username: user.username, role: user.role });
    }

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
        `SELECT u.id, u.username, u.password_hash, u.role, u.account_status
         FROM users u
         INNER JOIN tutor_profiles tp ON tp.user_id = u.id
         WHERE u.login_identifier = ? AND u.role = 'tutor'
           AND tp.application_status = 'approved'
         LIMIT 1`,
        [identifier],
      );
    } else if (role === "admin") {
      query = pool.query(
        `SELECT id, username, password_hash, role, account_status
         FROM users WHERE login_identifier = ? AND role = 'admin'
         LIMIT 1`,
        [identifier],
      );
    } else {
      query = pool.query(
        `SELECT id, username, password_hash, role, account_status
         FROM users WHERE login_identifier = ? LIMIT 1`,
        [identifier],
      );
    }
    const [rows] = await query;

    if (
      rows.length === 0 ||
      rows[0].account_status !== "approved" ||
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
  const usernameContainsOnlyLetters = /^\p{L}+$/u.test(username);
  const emailHasValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (username.length < 3 || !usernameContainsOnlyLetters || !emailHasValidFormat) {
    return res.status(400).json({ error: "El usuario o el correo tienen un formato inválido" });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({
      error: "La contraseña debe tener al menos 6 caracteres, una mayúscula, un número y un carácter especial",
    });
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

    const [result] = await pool.query(
      "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [username, email, hashPassword(password), role],
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
  res.status(500).json({ error: "Error interno del servidor" });
});

const PORT = process.env.PORT || 8000;

prepareDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend ejecutándose en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("No se pudieron preparar los usuarios iniciales", error);
    process.exitCode = 1;
  });