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
