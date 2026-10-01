-- Normalize student catalogs and apply the approved field constraints.
-- Existing catalog values are retained as inactive until they are verified
-- against the official Universidad de Sonora catalogs.

CREATE TABLE IF NOT EXISTS careers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_careers_name (name)
);

CREATE TABLE IF NOT EXISTS campuses (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_campuses_name (name)
);

INSERT IGNORE INTO careers (name, is_active)
SELECT DISTINCT TRIM(career), FALSE
FROM student_profiles
WHERE career IS NOT NULL AND TRIM(career) <> '';

INSERT IGNORE INTO careers (name, is_active)
SELECT 'Legacy: carrera no especificada', FALSE
WHERE EXISTS (SELECT 1 FROM student_profiles WHERE career IS NULL OR TRIM(career) = '');

INSERT IGNORE INTO campuses (name, is_active)
SELECT DISTINCT TRIM(campus), FALSE
FROM student_profiles
WHERE campus IS NOT NULL AND TRIM(campus) <> '';

INSERT IGNORE INTO campuses (name, is_active)
SELECT 'Legacy: campus no especificado', FALSE
WHERE EXISTS (SELECT 1 FROM student_profiles WHERE campus IS NULL OR TRIM(campus) = '');

ALTER TABLE student_profiles
  ADD COLUMN career_id INT UNSIGNED NULL AFTER student_number,
  ADD COLUMN campus_id INT UNSIGNED NULL AFTER career_id,
  ADD COLUMN student_number_verification_status
    ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending' AFTER student_number,
  ADD COLUMN student_number_verified_at DATETIME NULL AFTER student_number_verification_status;

UPDATE student_profiles sp
JOIN careers c ON c.name = TRIM(sp.career)
SET sp.career_id = c.id;

UPDATE student_profiles sp
JOIN careers c ON c.name = 'Legacy: carrera no especificada'
SET sp.career_id = c.id
WHERE sp.career IS NULL OR TRIM(sp.career) = '';

UPDATE student_profiles sp
JOIN campuses c
  ON c.name = CASE
    WHEN sp.campus IS NULL OR TRIM(sp.campus) = ''
      THEN 'Legacy: campus no especificado'
    ELSE TRIM(sp.campus)
  END
SET sp.campus_id = c.id;

ALTER TABLE student_profiles
  MODIFY career_id INT UNSIGNED NOT NULL,
  MODIFY campus_id INT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_student_profiles_career
    FOREIGN KEY (career_id) REFERENCES careers (id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_student_profiles_campus
    FOREIGN KEY (campus_id) REFERENCES campuses (id) ON DELETE RESTRICT,
  ADD CONSTRAINT chk_student_profiles_first_name
    CHECK (REGEXP_LIKE(first_name, '^[[:alpha:]]+$')),
  ADD CONSTRAINT chk_student_profiles_last_name
    CHECK (REGEXP_LIKE(last_name, '^[[:alpha:]]+$')),
  ADD CONSTRAINT chk_student_profiles_number
    CHECK (REGEXP_LIKE(student_number, '^[0-9]{11}$')),
  ADD CONSTRAINT chk_student_profiles_number_verification
    CHECK (
      (student_number_verification_status = 'verified' AND student_number_verified_at IS NOT NULL)
      OR
      (student_number_verification_status <> 'verified' AND student_number_verified_at IS NULL)
    ),
  ADD CONSTRAINT chk_student_profiles_phone
    CHECK (REGEXP_LIKE(phone, '^[0-9]{11}$'));

ALTER TABLE student_profiles
  DROP COLUMN career,
  DROP COLUMN campus,
  MODIFY student_number VARCHAR(11) NOT NULL,
  MODIFY phone VARCHAR(11) NOT NULL;

ALTER TABLE users
  ADD CONSTRAINT chk_users_username_letters
    CHECK (REGEXP_LIKE(username, '^[[:alpha:]]+$')),
  ADD CONSTRAINT chk_users_email_format
    CHECK (REGEXP_LIKE(email, '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'));

ALTER TABLE tutor_profiles
  MODIFY bio VARCHAR(100) NULL,
  MODIFY experience VARCHAR(100) NOT NULL,
  ADD CONSTRAINT chk_tutor_profiles_first_name
    CHECK (REGEXP_LIKE(first_name, '^[[:alpha:]]+$')),
  ADD CONSTRAINT chk_tutor_profiles_last_name
    CHECK (REGEXP_LIKE(last_name, '^[[:alpha:]]+$'));

ALTER TABLE subjects
  MODIFY description TEXT NULL,
  ADD CONSTRAINT chk_subjects_description_words
    CHECK (
      description IS NULL
      OR CHAR_LENGTH(TRIM(description)) = 0
      OR CHAR_LENGTH(REGEXP_REPLACE(TRIM(description), '[[:space:]]+', ' '))
         - CHAR_LENGTH(REPLACE(REGEXP_REPLACE(TRIM(description), '[[:space:]]+', ' '), ' ', '')) < 100
    );

ALTER TABLE tutor_ratings
  MODIFY review VARCHAR(50) NULL;

ALTER TABLE student_evaluations
  MODIFY comments VARCHAR(50) NULL;
