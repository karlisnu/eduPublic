const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ message: "Backend funcionando" });
});

app.get("/api/tutors", (req, res) => {
  res.json([]);
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Backend ejecutándose en http://localhost:${PORT}`);
});