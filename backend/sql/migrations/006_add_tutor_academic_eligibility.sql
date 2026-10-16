ALTER TABLE tutor_profiles
  ADD COLUMN career_id INT UNSIGNED NULL AFTER experience,
  ADD COLUMN current_semester SMALLINT UNSIGNED NULL AFTER career_id,
  ADD COLUMN average DECIMAL(5,2) NULL AFTER current_semester,
  ADD CONSTRAINT fk_tutor_profiles_career
    FOREIGN KEY (career_id) REFERENCES careers (id) ON DELETE RESTRICT,
  ADD CONSTRAINT chk_tutor_profiles_current_semester
    CHECK (current_semester IS NULL OR current_semester > 0),
  ADD CONSTRAINT chk_tutor_profiles_average
    CHECK (average IS NULL OR average BETWEEN 0 AND 100);

ALTER TABLE microsoft_registration_sessions
  ADD COLUMN role ENUM('alumno', 'tutor') NOT NULL DEFAULT 'alumno' AFTER microsoft_object_id;

CREATE TABLE career_subjects (
  career_id INT UNSIGNED NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  semester_number SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (career_id, subject_id),
  INDEX idx_career_subjects_semester (career_id, semester_number),
  CONSTRAINT fk_career_subjects_career
    FOREIGN KEY (career_id) REFERENCES careers (id) ON DELETE CASCADE,
  CONSTRAINT fk_career_subjects_subject
    FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
  CONSTRAINT chk_career_subjects_semester
    CHECK (semester_number > 0)
);
