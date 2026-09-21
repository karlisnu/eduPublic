-- Development data only. Passwords use the same scrypt format as the backend.

INSERT INTO users (username, email, password_hash, role, account_status, approved_at)
VALUES
  ('admin', 'admin@example.com', '035578c0e19a10861d742b362dc273ee:a30c87e158e4473f5d669b05679e32dcb2e073dd3bff8170349922013d46c6ba9d1eafe604738a195750e7383150a941d6881038d1919b65cdfc40fb54b16264', 'admin', 'approved', CURRENT_TIMESTAMP),
  ('alumno', 'alumno@example.com', 'f1f79295c81c617615629d9e1c95226f:7c1f9b3b5d4fd3d31b865d7bd8578ef00da825e8a0f34bcc0901b40d0107780eb0afe0623dbc3fda4e7038d045c0cb1500ed695fefa40ba015999dbe89bc6ea9', 'alumno', 'approved', CURRENT_TIMESTAMP),
  ('tutor', 'tutor@example.com', '19ff2d5b4056c551c496c815db672ef9:61ee984e3fb31d129f07fa1794a5fc056c587d210e21eafbe7987f5c580af1ed7e643ec6fda541c6203d430e738f74fedc7549e2d6fb2ec3fbf100f11a6a407c', 'tutor', 'approved', CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  role = VALUES(role),
  account_status = VALUES(account_status),
  approved_at = VALUES(approved_at);

INSERT INTO student_profiles (user_id, first_name, last_name, student_number, career, campus, phone)
SELECT id, 'Laura', 'Hernandez', 'EDU-0001', 'Ingenieria de Software', 'Campus Central', '555-0101'
FROM users WHERE username = 'alumno'
ON DUPLICATE KEY UPDATE career = VALUES(career), campus = VALUES(campus);

INSERT INTO tutor_profiles (user_id, first_name, last_name, bio, experience, availability, is_available, application_status)
SELECT id, 'Ana', 'Lopez', 'Apoyo en algebra y calculo.', '5 anos de tutoria universitaria',
       'Lunes y miercoles por la tarde', TRUE, 'approved'
FROM users WHERE username = 'tutor'
ON DUPLICATE KEY UPDATE bio = VALUES(bio), is_available = VALUES(is_available), application_status = VALUES(application_status);

INSERT INTO subjects (name, description) VALUES
  ('Matematicas', 'Algebra, calculo y estadistica'),
  ('Programacion', 'Fundamentos de programacion y JavaScript'),
  ('Fisica', 'Mecanica y fundamentos de fisica')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO tutor_subjects (tutor_id, subject_id)
SELECT u.id, s.id FROM users u CROSS JOIN subjects s
WHERE u.username = 'tutor' AND s.name IN ('Matematicas', 'Programacion')
ON DUPLICATE KEY UPDATE tutor_id = VALUES(tutor_id);

INSERT INTO tutor_student_connections
  (tutor_id, student_id, requested_by, status, responded_at)
SELECT tutor.id, student.id, 'student', 'accepted', CURRENT_TIMESTAMP
FROM users tutor CROSS JOIN users student
WHERE tutor.username = 'tutor' AND student.username = 'alumno'
  AND NOT EXISTS (
    SELECT 1 FROM tutor_student_connections c
    WHERE c.tutor_id = tutor.id AND c.student_id = student.id AND c.status <> 'ended'
  );
