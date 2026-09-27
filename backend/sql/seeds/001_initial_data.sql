-- Local development accounts only. Passwords are stored as scrypt hashes.

INSERT INTO users (username, email, password_hash, role, account_status, approved_at)
VALUES
  ('admin', 'admin@example.com', 'admin-local-01:df2609cbcd8be303e55dde6297b69fe0ee95b705994a292687c3587ac5439a1f1d03cabeb7af11af80ea7cc917f8f63a3f5bc382e5015b6694604e5fd3d4ee49', 'admin', 'approved', CURRENT_TIMESTAMP),
  ('alumno', 'alumno@example.com', 'student-local-01:4c8feb9dc18c5a1d8837e25de42993aca7a9b04971bfa1913e2fd42911c915bc56e7d8d787fb58a566a576d90c2ba60c3d17bc449ced3e1e75f548534305b010', 'alumno', 'approved', CURRENT_TIMESTAMP),
  ('estudianteuno', 'estudianteuno@example.com', 'student-one-01:e85c5c20f4062a162393d9cd9f7e01c7805bc35f1ce50a4b14f999de132106e0e3bce7763175662ba11e2e2f7a05043d6d8b697f20559ac16a92add820fd7b7b', 'alumno', 'approved', CURRENT_TIMESTAMP),
  ('estudiantedos', 'estudiantedos@example.com', 'student-two-01:54ed75666bba5bec58319e125128315ca2ce03738b7c519c5eb70b2fb3b93e948e8c4f0258227da3f3b11825cfc86e6e336d0a0c4510dd7b40d233b387eb2874', 'alumno', 'approved', CURRENT_TIMESTAMP),
  ('tutor', 'tutor@example.com', 'tutor-local-01:eef34eb9b64fb45a428d5bafdf02d4518dd50269d68ec2a3a7e619298c7e01800c418ff1dbefc92c605e611ddeb4c8e55cc3d72655f897c24bfa338a33732cee', 'tutor', 'approved', CURRENT_TIMESTAMP),
  ('tutoruno', 'tutoruno@example.com', 'tutor-one-01:f432bd715be5adc54bc257f228fd9ba58423e78a37fcae1ffce01dfc233a65fb7ff06ed945562dfdcb533cb07d919c35e0f4fff314a65579237bbfd8b0fb40f2', 'tutor', 'approved', CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  role = VALUES(role),
  account_status = VALUES(account_status),
  approved_at = VALUES(approved_at);

UPDATE users
SET login_identifier = CASE username
  WHEN 'tutor' THEN '20260000004'
  WHEN 'tutoruno' THEN '20260000005'
  WHEN 'admin' THEN '20260000006'
END
WHERE username IN ('tutor', 'tutoruno', 'admin');

INSERT INTO careers (name, is_active)
SELECT 'Carrera de prueba', TRUE
WHERE NOT EXISTS (SELECT 1 FROM careers WHERE is_active = TRUE)
ON DUPLICATE KEY UPDATE is_active = TRUE;

INSERT INTO campuses (name, is_active)
SELECT 'Campus de prueba', TRUE
WHERE NOT EXISTS (SELECT 1 FROM campuses WHERE is_active = TRUE)
ON DUPLICATE KEY UPDATE is_active = TRUE;

INSERT INTO student_profiles
  (user_id, first_name, last_name, student_number, career_id, campus_id, phone)
SELECT u.id, profiles.first_name, profiles.last_name, profiles.student_number,
       career.id, campus.id, profiles.phone
FROM (
  SELECT 'alumno' AS username, 'Laura' AS first_name, 'Hernandez' AS last_name,
         '20260000001' AS student_number, '66212345678' AS phone
  UNION ALL
  SELECT 'estudianteuno', 'Sofia', 'Ramirez', '20260000002', '66212345679'
  UNION ALL
  SELECT 'estudiantedos', 'Diego', 'Martinez', '20260000003', '66212345670'
) profiles
JOIN users u ON u.username = profiles.username AND u.role = 'alumno'
CROSS JOIN (SELECT id FROM careers WHERE is_active = TRUE ORDER BY id LIMIT 1) career
CROSS JOIN (SELECT id FROM campuses WHERE is_active = TRUE ORDER BY id LIMIT 1) campus
WHERE TRUE
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  student_number = VALUES(student_number),
  career_id = VALUES(career_id),
  campus_id = VALUES(campus_id),
  phone = VALUES(phone);

UPDATE users u
JOIN student_profiles sp ON sp.user_id = u.id
SET u.login_identifier = sp.student_number
WHERE u.role = 'alumno';

INSERT INTO tutor_profiles
  (user_id, first_name, last_name, bio, experience, is_available, application_status)
SELECT u.id, profiles.first_name, profiles.last_name, profiles.bio, profiles.experience,
       TRUE, 'approved'
FROM (
  SELECT 'tutor' AS username, 'Ana' AS first_name, 'Lopez' AS last_name,
         'Apoyo en algebra y calculo.' AS bio, '5 anos de tutoria universitaria' AS experience
  UNION ALL
  SELECT 'tutoruno', 'Carlos', 'Ruiz', 'Apoyo en programacion y fisica.',
         '3 anos de tutoria universitaria'
) profiles
JOIN users u ON u.username = profiles.username AND u.role = 'tutor'
WHERE TRUE
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  bio = VALUES(bio),
  experience = VALUES(experience),
  is_available = VALUES(is_available),
  application_status = VALUES(application_status);

INSERT INTO subjects (name, description) VALUES
  ('Matematicas', 'Algebra, calculo y estadistica'),
  ('Programacion', 'Fundamentos de programacion y JavaScript'),
  ('Fisica', 'Mecanica y fundamentos de fisica')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO tutor_subjects (tutor_id, subject_id)
SELECT u.id, s.id FROM users u CROSS JOIN subjects s
WHERE u.username = 'tutor' AND s.name IN ('Matematicas', 'Programacion')
ON DUPLICATE KEY UPDATE tutor_id = VALUES(tutor_id);

INSERT INTO tutor_subjects (tutor_id, subject_id)
SELECT u.id, s.id FROM users u CROSS JOIN subjects s
WHERE u.username = 'tutoruno' AND s.name IN ('Programacion', 'Fisica')
ON DUPLICATE KEY UPDATE tutor_id = VALUES(tutor_id);

INSERT INTO tutor_student_connections
  (tutor_id, student_id, requested_by, status, responded_at)
SELECT tutor.user_id, student.user_id, 'student', 'accepted', CURRENT_TIMESTAMP
FROM tutor_profiles tutor CROSS JOIN student_profiles student
JOIN users tutor_user ON tutor_user.id = tutor.user_id
JOIN users student_user ON student_user.id = student.user_id
WHERE tutor_user.username = 'tutor' AND student_user.username = 'alumno'
  AND NOT EXISTS (
    SELECT 1 FROM tutor_student_connections c
    WHERE c.tutor_id = tutor.user_id AND c.student_id = student.user_id AND c.status <> 'ended'
  );
