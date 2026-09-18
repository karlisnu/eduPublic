CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'alumno') NOT NULL DEFAULT 'alumno',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
);

CREATE TABLE IF NOT EXISTS tutors (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  subject VARCHAR(120) NOT NULL,
  experience TEXT NOT NULL,
  availability VARCHAR(255) NOT NULL,
  rating DECIMAL(2,1) NOT NULL DEFAULT 0.0,
  bio TEXT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_tutors_subject (subject),
  INDEX idx_tutors_rating (rating)
);

INSERT INTO tutors (name, subject, experience, availability, rating, bio)
SELECT
  'Ana Lopez',
  'Matematicas',
  'Tutoria universitaria',
  'Lunes y miercoles por la tarde',
  4.8,
  'Apoyo en algebra y calculo.'
WHERE NOT EXISTS (
  SELECT 1 FROM tutors WHERE name = 'Ana Lopez' AND subject = 'Matematicas'
);
