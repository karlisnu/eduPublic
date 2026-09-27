ALTER TABLE users
  ADD COLUMN login_identifier CHAR(11) NULL AFTER username,
  ADD UNIQUE KEY uq_users_login_identifier (login_identifier),
  ADD CONSTRAINT chk_users_login_identifier_format
    CHECK (login_identifier IS NULL OR REGEXP_LIKE(login_identifier, '^[0-9]{11}$'));

UPDATE users u
JOIN student_profiles sp ON sp.user_id = u.id
SET u.login_identifier = sp.student_number
WHERE u.role = 'alumno';
