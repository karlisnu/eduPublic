-- Local-only Safe Requests fixtures for the pre-existing demo student and tutors.
-- This seed updates academic test profiles and weekly availability only and does
-- not modify users, password hashes, sessions, or the authentication flow.

UPDATE tutor_profiles tp
INNER JOIN users u ON u.id = tp.user_id
INNER JOIN careers c ON c.name = 'Ingeniería en software'
SET tp.career_id = c.id,
    tp.current_semester = 8,
    tp.average = 92
WHERE u.username IN ('tutor', 'tutoruno')
  AND u.role = 'tutor';

INSERT INTO career_subjects (career_id, subject_id, semester_number)
SELECT c.id, s.id, 1
FROM careers c
CROSS JOIN subjects s
WHERE c.name = 'Ingeniería en software'
  AND s.name IN ('Matematicas', 'Programacion', 'Fisica')
ON DUPLICATE KEY UPDATE semester_number = VALUES(semester_number);

INSERT INTO tutor_availability (tutor_id, week_start, weekday, start_hour)
SELECT u.id,
       DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY),
       slots.weekday,
       slots.start_hour
FROM (
  SELECT 'tutor' AS username, 1 AS weekday, 10 AS start_hour
  UNION ALL SELECT 'tutor', 3, 12
  UNION ALL SELECT 'tutoruno', 2, 11
  UNION ALL SELECT 'tutoruno', 4, 14
) slots
INNER JOIN users u ON u.username = slots.username AND u.role = 'tutor'
WHERE NOT EXISTS (
  SELECT 1
  FROM tutor_availability existing
  WHERE existing.tutor_id = u.id
    AND existing.week_start = DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
    AND existing.weekday = slots.weekday
    AND existing.start_hour = slots.start_hour
);
