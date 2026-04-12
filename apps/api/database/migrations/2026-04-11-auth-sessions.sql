CREATE TABLE IF NOT EXISTS auth_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  role ENUM('admin_global', 'admin_sede', 'bibliotecario', 'socio', 'invitado') NOT NULL,
  branch_id VARCHAR(36) NULL,
  member_id VARCHAR(36) NULL,
  refresh_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_auth_sessions_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_auth_sessions_member FOREIGN KEY (member_id) REFERENCES members(id),
  INDEX idx_auth_sessions_user (user_id),
  INDEX idx_auth_sessions_expires (expires_at),
  INDEX idx_auth_sessions_revoked (revoked_at)
);
