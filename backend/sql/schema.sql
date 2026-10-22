-- EduMatch relational data model for MySQL 8.
-- The schema deliberately models file delivery and connections, not messaging.

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(80) NOT NULL,
  login_identifier CHAR(11) NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NULL,
  microsoft_object_id VARCHAR(36) NULL,
  role ENUM('admin', 'alumno', 'tutor') NOT NULL,
  account_status ENUM('pending', 'approved', 'rejected', 'suspended') NOT NULL DEFAULT 'pending',
  approved_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_login_identifier (login_identifier),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_microsoft_object_id (microsoft_object_id),
  INDEX idx_users_role_status (role, account_status),
  CONSTRAINT chk_users_username_letters
    CHECK (REGEXP_LIKE(username, '^[[:alpha:]]+$')),
  CONSTRAINT chk_users_login_identifier_format
    CHECK (login_identifier IS NULL OR REGEXP_LIKE(login_identifier, '^[0-9]{11}$')),
  CONSTRAINT chk_users_email_format
    CHECK (REGEXP_LIKE(email, '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')),
  CONSTRAINT chk_users_approval_date
    CHECK (account_status <> 'approved' OR approved_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_sessions_token_hash (token_hash),
  INDEX idx_auth_sessions_user_expiry (user_id, expires_at),
  CONSTRAINT fk_auth_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS microsoft_registration_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash CHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL,
  microsoft_object_id VARCHAR(36) NOT NULL,
  role ENUM('alumno', 'tutor') NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_microsoft_registration_token_hash (token_hash),
  UNIQUE KEY uq_microsoft_registration_object_id (microsoft_object_id),
  INDEX idx_microsoft_registration_expiry (expires_at)
);

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

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id INT UNSIGNED NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  student_number VARCHAR(11) NOT NULL,
  student_number_verification_status ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  student_number_verified_at DATETIME NULL,
  career_id INT UNSIGNED NOT NULL,
  campus_id INT UNSIGNED NOT NULL,
  phone VARCHAR(11) NOT NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_student_profiles_number (student_number),
  CONSTRAINT chk_student_profiles_first_name
    CHECK (REGEXP_LIKE(first_name, '^[[:alpha:]]+$')),
  CONSTRAINT chk_student_profiles_last_name
    CHECK (REGEXP_LIKE(last_name, '^[[:alpha:]]+$')),
  CONSTRAINT chk_student_profiles_number
    CHECK (REGEXP_LIKE(student_number, '^[0-9]{11}$')),
  CONSTRAINT chk_student_profiles_number_verification
    CHECK (
      (student_number_verification_status = 'verified' AND student_number_verified_at IS NOT NULL)
      OR
      (student_number_verification_status <> 'verified' AND student_number_verified_at IS NULL)
    ),
  CONSTRAINT chk_student_profiles_phone
    CHECK (REGEXP_LIKE(phone, '^[0-9]{11}$')),
  CONSTRAINT fk_student_profiles_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_student_profiles_career
    FOREIGN KEY (career_id) REFERENCES careers (id) ON DELETE RESTRICT,
  CONSTRAINT fk_student_profiles_campus
    FOREIGN KEY (campus_id) REFERENCES campuses (id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS tutor_profiles (
  user_id INT UNSIGNED NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  bio VARCHAR(100) NULL,
  experience VARCHAR(100) NOT NULL,
  career_id INT UNSIGNED NULL,
  current_semester SMALLINT UNSIGNED NULL,
  average DECIMAL(5,2) NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  application_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  PRIMARY KEY (user_id),
  INDEX idx_tutor_profiles_available (application_status, is_available),
  CONSTRAINT fk_tutor_profiles_career
    FOREIGN KEY (career_id) REFERENCES careers (id) ON DELETE RESTRICT,
  CONSTRAINT chk_tutor_profiles_first_name
    CHECK (REGEXP_LIKE(first_name, '^[[:alpha:]]+$')),
  CONSTRAINT chk_tutor_profiles_last_name
    CHECK (REGEXP_LIKE(last_name, '^[[:alpha:]]+$')),
  CONSTRAINT chk_tutor_profiles_current_semester
    CHECK (current_semester IS NULL OR current_semester > 0),
  CONSTRAINT chk_tutor_profiles_average
    CHECK (average IS NULL OR average BETWEEN 0 AND 100),
  CONSTRAINT fk_tutor_profiles_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subjects (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subjects_name (name),
  CONSTRAINT chk_subjects_description_words
    CHECK (
      description IS NULL
      OR CHAR_LENGTH(TRIM(description)) = 0
      OR CHAR_LENGTH(REGEXP_REPLACE(TRIM(description), '[[:space:]]+', ' '))
         - CHAR_LENGTH(REPLACE(REGEXP_REPLACE(TRIM(description), '[[:space:]]+', ' '), ' ', '')) < 100
    )
);

CREATE TABLE IF NOT EXISTS career_subjects (
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
  review VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
  comments VARCHAR(50) NULL,
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

CREATE TABLE IF NOT EXISTS tutor_availability (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tutor_id INT UNSIGNED NOT NULL,
  week_start DATE NOT NULL,
  weekday TINYINT UNSIGNED NOT NULL,
  start_hour TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tutor_availability_slot (tutor_id, week_start, weekday, start_hour),
  CONSTRAINT fk_tutor_availability_tutor
    FOREIGN KEY (tutor_id) REFERENCES tutor_profiles (user_id) ON DELETE CASCADE,
  CONSTRAINT chk_tutor_availability_day CHECK (weekday BETWEEN 1 AND 5),
  CONSTRAINT chk_tutor_availability_hour CHECK (start_hour BETWEEN 7 AND 19)
);

CREATE TABLE IF NOT EXISTS tutoring_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tutor_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  week_start DATE NOT NULL,
  subject VARCHAR(120) NOT NULL,
  topic VARCHAR(500) NOT NULL,
  school_shift ENUM('matutino', 'vespertino', 'nocturno') NOT NULL,
  preferred_weekday TINYINT UNSIGNED NULL,
  preferred_start_hour TINYINT UNSIGNED NULL,
  status ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME NULL,
  PRIMARY KEY (id),
  INDEX idx_tutoring_requests_tutor_week_status (tutor_id, week_start, status),
  CONSTRAINT fk_tutoring_requests_tutor
    FOREIGN KEY (tutor_id) REFERENCES tutor_profiles (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_tutoring_requests_student
    FOREIGN KEY (student_id) REFERENCES student_profiles (user_id) ON DELETE CASCADE,
  CONSTRAINT chk_tutoring_requests_day
    CHECK (preferred_weekday IS NULL OR preferred_weekday BETWEEN 1 AND 5),
  CONSTRAINT chk_tutoring_requests_hour
    CHECK (preferred_start_hour IS NULL OR preferred_start_hour BETWEEN 7 AND 19),
  CONSTRAINT chk_tutoring_requests_preference
    CHECK ((preferred_weekday IS NULL) = (preferred_start_hour IS NULL))
);

CREATE TABLE IF NOT EXISTS tutor_weekly_students (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tutor_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  week_start DATE NOT NULL,
  request_id BIGINT UNSIGNED NOT NULL,
  accepted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tutor_weekly_student (tutor_id, student_id, week_start),
  UNIQUE KEY uq_tutor_weekly_request (request_id),
  CONSTRAINT fk_tutor_weekly_students_tutor
    FOREIGN KEY (tutor_id) REFERENCES tutor_profiles (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_tutor_weekly_students_student
    FOREIGN KEY (student_id) REFERENCES student_profiles (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_tutor_weekly_students_request
    FOREIGN KEY (request_id) REFERENCES tutoring_requests (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tutor_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  weekly_student_id BIGINT UNSIGNED NOT NULL,
  tutor_id INT UNSIGNED NOT NULL,
  week_start DATE NOT NULL,
  weekday TINYINT UNSIGNED NULL,
  start_hour TINYINT UNSIGNED NULL,
  status ENUM('pending', 'scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  PRIMARY KEY (id),
  UNIQUE KEY uq_tutor_session_weekly_student (weekly_student_id),
  INDEX idx_tutor_sessions_slot (tutor_id, week_start, weekday, start_hour, status),
  CONSTRAINT fk_tutor_sessions_student
    FOREIGN KEY (weekly_student_id) REFERENCES tutor_weekly_students (id) ON DELETE CASCADE,
  CONSTRAINT fk_tutor_sessions_tutor
    FOREIGN KEY (tutor_id) REFERENCES tutor_profiles (user_id) ON DELETE CASCADE,
  CONSTRAINT chk_tutor_sessions_day
    CHECK (weekday IS NULL OR weekday BETWEEN 1 AND 5),
  CONSTRAINT chk_tutor_sessions_hour
    CHECK (start_hour IS NULL OR start_hour BETWEEN 7 AND 19),
  CONSTRAINT chk_tutor_sessions_slot_pair
    CHECK ((weekday IS NULL) = (start_hour IS NULL)),
  CONSTRAINT chk_tutor_sessions_scheduled_slot
    CHECK (status IN ('pending', 'cancelled') OR weekday IS NOT NULL)
);
