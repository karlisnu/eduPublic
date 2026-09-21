-- EduMatch relational data model for MySQL 8.
-- The schema deliberately models file delivery and connections, not messaging.

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(80) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'alumno', 'tutor') NOT NULL,
  account_status ENUM('pending', 'approved', 'rejected', 'suspended') NOT NULL DEFAULT 'pending',
  approved_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_role_status (role, account_status),
  CONSTRAINT chk_users_approval_date
    CHECK (account_status <> 'approved' OR approved_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id INT UNSIGNED NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  student_number VARCHAR(50) NOT NULL,
  career VARCHAR(120) NOT NULL,
  campus VARCHAR(120) NULL,
  phone VARCHAR(30) NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_student_profiles_number (student_number),
  CONSTRAINT fk_student_profiles_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tutor_profiles (
  user_id INT UNSIGNED NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  bio TEXT NULL,
  experience TEXT NOT NULL,
  availability VARCHAR(255) NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  application_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  PRIMARY KEY (user_id),
  INDEX idx_tutor_profiles_available (application_status, is_available),
  CONSTRAINT fk_tutor_profiles_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subjects (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subjects_name (name)
);

CREATE TABLE IF NOT EXISTS tutor_subjects (
  tutor_id INT UNSIGNED NOT NULL,
  subject_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (tutor_id, subject_id),
  CONSTRAINT fk_tutor_subjects_tutor
    FOREIGN KEY (tutor_id) REFERENCES tutor_profiles (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_tutor_subjects_subject
    FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS tutor_student_connections (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tutor_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  requested_by ENUM('student', 'tutor') NOT NULL,
  status ENUM('pending', 'accepted', 'rejected', 'ended') NOT NULL DEFAULT 'pending',
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME NULL,
  ended_at DATETIME NULL,
  PRIMARY KEY (id),
  INDEX idx_connections_student_status (student_id, status),
  INDEX idx_connections_tutor_status (tutor_id, status),
  CONSTRAINT fk_connections_tutor
    FOREIGN KEY (tutor_id) REFERENCES tutor_profiles (user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_connections_student
    FOREIGN KEY (student_id) REFERENCES student_profiles (user_id) ON DELETE RESTRICT,
  CONSTRAINT chk_connections_different_users CHECK (tutor_id <> student_id)
);

CREATE TABLE IF NOT EXISTS tutor_ratings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  connection_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  tutor_id INT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  review VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rating_connection_student (connection_id, student_id),
  CONSTRAINT fk_ratings_connection
    FOREIGN KEY (connection_id) REFERENCES tutor_student_connections (id) ON DELETE CASCADE,
  CONSTRAINT fk_ratings_student
    FOREIGN KEY (student_id) REFERENCES student_profiles (user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_ratings_tutor
    FOREIGN KEY (tutor_id) REFERENCES tutor_profiles (user_id) ON DELETE RESTRICT,
  CONSTRAINT chk_ratings_value CHECK (rating BETWEEN 1 AND 5)
);

CREATE TABLE IF NOT EXISTS student_evaluations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  connection_id INT UNSIGNED NOT NULL,
  tutor_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  comments VARCHAR(1000) NULL,
  evaluated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_evaluation_connection_tutor (connection_id, tutor_id),
  CONSTRAINT fk_evaluations_connection
    FOREIGN KEY (connection_id) REFERENCES tutor_student_connections (id) ON DELETE CASCADE,
  CONSTRAINT fk_evaluations_tutor
    FOREIGN KEY (tutor_id) REFERENCES tutor_profiles (user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_evaluations_student
    FOREIGN KEY (student_id) REFERENCES student_profiles (user_id) ON DELETE RESTRICT,
  CONSTRAINT chk_evaluations_score CHECK (score BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS academic_files (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  connection_id INT UNSIGNED NOT NULL,
  tutor_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  storage_key VARCHAR(512) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_academic_files_storage_key (storage_key),
  INDEX idx_academic_files_student (student_id, created_at),
  INDEX idx_academic_files_tutor (tutor_id, created_at),
  CONSTRAINT fk_academic_files_connection
    FOREIGN KEY (connection_id) REFERENCES tutor_student_connections (id) ON DELETE CASCADE,
  CONSTRAINT fk_academic_files_tutor
    FOREIGN KEY (tutor_id) REFERENCES tutor_profiles (user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_academic_files_student
    FOREIGN KEY (student_id) REFERENCES student_profiles (user_id) ON DELETE RESTRICT,
  CONSTRAINT chk_academic_files_size CHECK (size_bytes > 0)
);

CREATE TABLE IF NOT EXISTS approval_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  reviewer_id INT UNSIGNED NOT NULL,
  decision ENUM('approved', 'rejected', 'suspended', 'reinstated') NOT NULL,
  reason VARCHAR(1000) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_approval_events_user (user_id, created_at),
  CONSTRAINT fk_approval_events_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_approval_events_reviewer
    FOREIGN KEY (reviewer_id) REFERENCES users (id) ON DELETE RESTRICT
);
