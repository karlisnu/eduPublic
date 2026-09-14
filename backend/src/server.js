const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "API EDU-EduMatch funcionando",
    endpoints: ["GET /api/health", "GET /api/tutors", "GET /api/tutors/:id"],
  });
});

app.get("/api/health", (req, res) => {
  res.json({ message: "Backend funcionando" });
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

app.listen(PORT, () => {
  console.log(`Backend ejecutándose en http://localhost:${PORT}`);
});