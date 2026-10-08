ALTER TABLE users
  MODIFY COLUMN password_hash VARCHAR(255) NULL,
  ADD COLUMN microsoft_object_id VARCHAR(36) NULL AFTER password_hash,
  ADD UNIQUE KEY uq_users_microsoft_object_id (microsoft_object_id);

CREATE TABLE microsoft_registration_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash CHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL,
  microsoft_object_id VARCHAR(36) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_microsoft_registration_token_hash (token_hash),
  UNIQUE KEY uq_microsoft_registration_object_id (microsoft_object_id),
  INDEX idx_microsoft_registration_expiry (expires_at)
);
