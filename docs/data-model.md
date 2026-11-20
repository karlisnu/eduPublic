# EduMatch Data Model

## Purpose

This document describes the relational data model used by EduMatch. The executable
MySQL schema is available in [`backend/sql/schema.sql`](../backend/sql/schema.sql).
The approved domain requirements are in
[`business-rules.md`](./business-rules.md); this model describes their current
database representation.

EduMatch connects approved students and tutors, supports academic file delivery,
and separates tutor ratings from tutor evaluations of students. The platform does
not include internal messaging or chat.

## Entity relationship diagram

```mermaid
erDiagram
    USERS ||--o| STUDENT_PROFILES : has
    USERS ||--o| TUTOR_PROFILES : has
    USERS ||--o{ APPROVAL_EVENTS : receives
    USERS ||--o{ APPROVAL_EVENTS : reviews
    CAREERS ||--o{ STUDENT_PROFILES : selected_for
    CAMPUSES ||--o{ STUDENT_PROFILES : selected_for
    CAREERS ||--o{ TUTOR_PROFILES : studies
    CAREERS ||--o{ CAREER_SUBJECTS : defines
    SUBJECTS ||--o{ CAREER_SUBJECTS : scheduled_as
    TUTOR_PROFILES }o--o{ SUBJECTS : teaches
    TUTOR_PROFILES ||--o{ CONNECTIONS : manages
    STUDENT_PROFILES ||--o{ CONNECTIONS : requests
    CONNECTIONS ||--o{ TUTOR_RATINGS : receives
    CONNECTIONS ||--o{ STUDENT_EVALUATIONS : contains
    CONNECTIONS ||--o{ ACADEMIC_FILES : authorizes
    TUTOR_PROFILES ||--o{ TUTOR_RATINGS : receives
    STUDENT_PROFILES ||--o{ TUTOR_RATINGS : writes
    TUTOR_PROFILES ||--o{ STUDENT_EVALUATIONS : writes
    STUDENT_PROFILES ||--o{ STUDENT_EVALUATIONS : receives
    TUTOR_PROFILES ||--o{ ACADEMIC_FILES : sends
    STUDENT_PROFILES ||--o{ ACADEMIC_FILES : receives

    USERS {
        int id PK
        string username UK
        string login_identifier UK "11-digit student/tutor number"
        string email UK
        string password_hash
        enum role
        enum account_status
        datetime approved_at
        timestamp created_at
        timestamp updated_at
    }

    CAREERS {
        int id PK
        string name UK
        boolean is_active
    }

    CAMPUSES {
        int id PK
        string name UK
        boolean is_active
    }

    STUDENT_PROFILES {
        int user_id PK, FK
        string first_name
        string last_name
        string student_number UK
        enum student_number_verification_status
        datetime student_number_verified_at
        int career_id FK
        int campus_id FK
        string phone
    }

    TUTOR_PROFILES {
        int user_id PK, FK
        string first_name
        string last_name
        string bio "max 100 characters"
        string experience "max 100 characters"
        int career_id FK
        int current_semester
        decimal average "0-100"
        boolean is_available
        enum application_status
    }

    SUBJECTS {
        int id PK
        string name UK
        text description "max 100 words"
    }

    CAREER_SUBJECTS {
        int career_id PK, FK
        int subject_id PK, FK
        int semester_number
    }

    CONNECTIONS {
        int id PK
        int tutor_id FK
        int student_id FK
        enum requested_by
        enum status
        datetime requested_at
        datetime responded_at
        datetime ended_at
    }

    TUTOR_RATINGS {
        int id PK
        int connection_id FK
        int student_id FK
        int tutor_id FK
        int rating
        string review "max 50 characters"
        timestamp created_at
    }

    STUDENT_EVALUATIONS {
        int id PK
        int connection_id FK
        int tutor_id FK
        int student_id FK
        decimal score
        string comments "max 50 characters"
        timestamp evaluated_at
    }

    ACADEMIC_FILES {
        int id PK
        int connection_id FK
        int tutor_id FK
        int student_id FK
        string original_name
        string storage_key UK
        string mime_type
        bigint size_bytes
        timestamp created_at
    }

    APPROVAL_EVENTS {
        bigint id PK
        int user_id FK
        int reviewer_id FK
        enum decision
        string reason
        timestamp created_at
    }
```

## Tables and responsibilities

| Table | Responsibility |
| --- | --- |
| `users` | Authentication, role, account approval state, username, and email |
| `careers`, `campuses` | Authoritative catalogs used by student profiles; only active entries are selectable |
| `student_profiles` | Student-specific academic/contact information and enrollment verification state |
| `tutor_profiles` | Tutor career, semester, reported average, biography, experience, availability, and application state |
| `subjects` | Catalog of academic subjects; names are preserved and descriptions are limited to 100 words |
| `career_subjects` | Official subject-to-semester mapping for each career |
| `tutor_subjects` | Many-to-many relationship between tutors and subjects |
| `tutor_student_connections` | Student-tutor requests and accepted relationships |
| `tutor_ratings` | Student ratings assigned to tutors, from 1 to 5 |
| `student_evaluations` | Tutor evaluations assigned to students, from 0 to 100 |
| `academic_files` | Metadata for files sent by tutors to accepted students |
| `approval_events` | Administrator history for approval and account decisions |

## Main business rules

1. Only approved accounts can access their full role capabilities.
2. A tutor must have an approved tutor profile and can be shown in search only when
   `is_available = TRUE`.
3. A file can only be sent from a tutor to a student through their connection.
4. A student rating evaluates a tutor; it is not the same as a student evaluation.
5. Ratings, evaluations, and files must be authorized in the backend against the
   correct student-tutor connection, its participants, and its status. A foreign
   key or an existing connection row alone does not authorize an operation.
6. EduMatch stores only password hashes for application-managed accounts such as administrators. Institutional credentials are validated by Microsoft and are never received or stored by EduMatch.
7. The database has no message, conversation, or chat entity.
8. Usernames and profile names contain letters only; emails must have a valid structure, contain no whitespace, and remain unique.
9. Student numbers and phone numbers contain exactly 11 digits. Number uniqueness does not prove enrollment: verification must use an authoritative Universidad de Sonora source, and new numbers remain pending until that verification succeeds.
10. Career and campus selections reference active catalog entries. Legacy catalog values are retained as inactive until checked against official university data; catalog imports must not invent official values.
11. Tutor subject selections must be mapped to their career at or before the tutor's current semester in `career_subjects`. New tutor applications include a reported average from 0 to 100 and remain pending administrative review. Do not add guessed curriculum rows; tutor signup stays blocked until the official mapping is loaded.
12. Tutor bio and experience are each limited to 100 characters. Tutor ratings and student evaluation comments are limited to 50 characters. Tutor ratings retain `created_at` but have no automatic update timestamp.
13. Administrator accounts use `users.role = 'admin'`; there is no separate password-bearing administrator table or public administrator registration. Provision the initial administrator through a controlled process outside the public application. Only authenticated administrators may modify student/tutor data or create approval events, enforced by backend authorization.
14. Connection statuses are stored as `pending`, `accepted`, `rejected`, and `ended`. The business rules describe the completed relationship as `Finished`; `ended` is the database value. The backend must apply the status appropriate to each operation.
15. Prevent duplicate tutoring requests while an equivalent request is pending or an active connection exists, following the conditions defined by the business rules.
16. Academic files must satisfy the allowed format and size limits and remain protected by backend authorization. Do not expose downloads through unprotected public links.
17. Account decisions are recorded in `approval_events` with the affected user, reviewing administrator, decision, and time. Important administrative changes to profiles and catalogs also require an auditable record; do not assume the approval table covers those changes.

## Why there are both Markdown and SQL files

- This Markdown file explains the model for the team, documentation, reviews, and
  presentations.
- [`backend/sql/schema.sql`](../backend/sql/schema.sql) creates the actual MySQL
  tables, indexes, foreign keys, and constraints.

[`backend/sql/migrations/002_apply_profile_data_rules.sql`](../backend/sql/migrations/002_apply_profile_data_rules.sql) upgrades an existing database. Migration 006 adds tutor academic eligibility and the `career_subjects` mapping; load that mapping only from official curriculum data. The migration preserves legacy career/campus values as inactive catalog rows. Existing invalid student numbers, phone numbers, names, or overlength text must be reviewed and corrected before their new database constraints can be applied; never silently fabricate a verified enrollment number.

The documentation and SQL files should be updated together whenever the data model changes.