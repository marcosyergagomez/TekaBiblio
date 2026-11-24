CREATE TABLE organizations (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE branches (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  city VARCHAR(120) NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Madrid',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_branches_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  branch_id VARCHAR(36) NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin_global', 'admin_sede', 'bibliotecario', 'socio', 'invitado') NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  status ENUM('ACTIVE', 'BLOCKED', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE members (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  home_branch_id VARCHAR(36) NOT NULL,
  membership_level ENUM('BRONCE', 'PLATA', 'ORO') NOT NULL,
  debt_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  blocked_until DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_members_home_branch FOREIGN KEY (home_branch_id) REFERENCES branches(id)
);

CREATE TABLE materials (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(220) NOT NULL,
  material_type ENUM('LIBRO', 'PELICULA', 'JUEGO_PC', 'JUEGO_PLAYSTATION', 'JUEGO_XBOX') NOT NULL,
  release_date DATE NOT NULL,
  home_branch_id VARCHAR(36) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_materials_home_branch FOREIGN KEY (home_branch_id) REFERENCES branches(id)
);

CREATE TABLE copies (
  id VARCHAR(36) PRIMARY KEY,
  material_id VARCHAR(36) NOT NULL,
  branch_id VARCHAR(36) NOT NULL,
  inventory_code VARCHAR(80) NOT NULL UNIQUE,
  status ENUM('AVAILABLE', 'ON_LOAN', 'IN_TRANSFER', 'LOST', 'DAMAGED') NOT NULL DEFAULT 'AVAILABLE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_copies_material FOREIGN KEY (material_id) REFERENCES materials(id),
  CONSTRAINT fk_copies_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE loans (
  id VARCHAR(36) PRIMARY KEY,
  member_id VARCHAR(36) NOT NULL,
  copy_id VARCHAR(36) NOT NULL,
  source_branch_id VARCHAR(36) NOT NULL,
  target_branch_id VARCHAR(36) NOT NULL,
  membership_level ENUM('BRONCE', 'PLATA', 'ORO') NOT NULL,
  material_type ENUM('LIBRO', 'PELICULA', 'JUEGO_PC', 'JUEGO_PLAYSTATION', 'JUEGO_XBOX') NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  level_adjustment DECIMAL(5,2) NOT NULL,
  final_price DECIMAL(10,2) NOT NULL,
  shipment_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  status ENUM('ACTIVE', 'RETURNED', 'CANCELLED', 'LOST') NOT NULL DEFAULT 'ACTIVE',
  renewal_count INT NOT NULL DEFAULT 0,
  starts_at DATETIME NOT NULL,
  due_at DATETIME NOT NULL,
  returned_at DATETIME NULL,
  late_fee_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_loans_member FOREIGN KEY (member_id) REFERENCES members(id),
  CONSTRAINT fk_loans_copy FOREIGN KEY (copy_id) REFERENCES copies(id),
  CONSTRAINT fk_loans_source_branch FOREIGN KEY (source_branch_id) REFERENCES branches(id),
  CONSTRAINT fk_loans_target_branch FOREIGN KEY (target_branch_id) REFERENCES branches(id)
);

CREATE TABLE reservations (
  id VARCHAR(36) PRIMARY KEY,
  member_id VARCHAR(36) NOT NULL,
  material_id VARCHAR(36) NOT NULL,
  source_branch_id VARCHAR(36) NOT NULL,
  pickup_branch_id VARCHAR(36) NOT NULL,
  status ENUM('QUEUED', 'READY_FOR_PICKUP', 'FULFILLED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'QUEUED',
  queue_position INT NOT NULL DEFAULT 1,
  ready_for_pickup_at DATETIME NULL,
  expires_at DATETIME NULL,
  expire_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reservations_member FOREIGN KEY (member_id) REFERENCES members(id),
  CONSTRAINT fk_reservations_material FOREIGN KEY (material_id) REFERENCES materials(id),
  CONSTRAINT fk_reservations_source_branch FOREIGN KEY (source_branch_id) REFERENCES branches(id),
  CONSTRAINT fk_reservations_pickup_branch FOREIGN KEY (pickup_branch_id) REFERENCES branches(id)
);

CREATE TABLE shipments (
  id VARCHAR(36) PRIMARY KEY,
  reservation_id VARCHAR(36) NULL,
  loan_id VARCHAR(36) NULL,
  copy_id VARCHAR(36) NOT NULL,
  from_branch_id VARCHAR(36) NOT NULL,
  to_branch_id VARCHAR(36) NOT NULL,
  status ENUM('REQUESTED', 'PREPARING', 'IN_TRANSIT', 'ARRIVED', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED', 'LOST') NOT NULL DEFAULT 'REQUESTED',
  base_fee DECIMAL(10,2) NOT NULL,
  charged_fee DECIMAL(10,2) NOT NULL,
  requested_at DATETIME NOT NULL,
  delivered_at DATETIME NULL,
  sla_target_at DATETIME NOT NULL,
  sla_deadline_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_shipments_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id),
  CONSTRAINT fk_shipments_loan FOREIGN KEY (loan_id) REFERENCES loans(id),
  CONSTRAINT fk_shipments_copy FOREIGN KEY (copy_id) REFERENCES copies(id),
  CONSTRAINT fk_shipments_from_branch FOREIGN KEY (from_branch_id) REFERENCES branches(id),
  CONSTRAINT fk_shipments_to_branch FOREIGN KEY (to_branch_id) REFERENCES branches(id)
);

CREATE TABLE penalties (
  id VARCHAR(36) PRIMARY KEY,
  member_id VARCHAR(36) NOT NULL,
  loan_id VARCHAR(36) NULL,
  reservation_id VARCHAR(36) NULL,
  penalty_type ENUM('LATE_RETURN', 'RESERVATION_EXPIRE', 'LOST_COPY', 'DAMAGE') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('PENDING', 'PAID', 'WAIVED') NOT NULL DEFAULT 'PENDING',
  reason VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_penalties_member FOREIGN KEY (member_id) REFERENCES members(id),
  CONSTRAINT fk_penalties_loan FOREIGN KEY (loan_id) REFERENCES loans(id),
  CONSTRAINT fk_penalties_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id)
);

CREATE TABLE payments (
  id VARCHAR(36) PRIMARY KEY,
  member_id VARCHAR(36) NOT NULL,
  loan_id VARCHAR(36) NULL,
  penalty_id VARCHAR(36) NULL,
  amount DECIMAL(10,2) NOT NULL,
  method ENUM('CASH', 'CARD', 'SIMULATED') NOT NULL DEFAULT 'SIMULATED',
  status ENUM('PAID', 'REFUNDED') NOT NULL DEFAULT 'PAID',
  paid_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_member FOREIGN KEY (member_id) REFERENCES members(id),
  CONSTRAINT fk_payments_loan FOREIGN KEY (loan_id) REFERENCES loans(id),
  CONSTRAINT fk_payments_penalty FOREIGN KEY (penalty_id) REFERENCES penalties(id)
);

CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  actor_user_id VARCHAR(36) NOT NULL,
  branch_id VARCHAR(36) NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id),
  CONSTRAINT fk_audit_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE TABLE auth_sessions (
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

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_members_level ON members(membership_level);
CREATE INDEX idx_materials_type ON materials(material_type);
CREATE INDEX idx_copies_status ON copies(status);
CREATE INDEX idx_loans_status_due_at ON loans(status, due_at);
CREATE INDEX idx_reservations_status_expires ON reservations(status, expires_at);
CREATE INDEX idx_shipments_status_sla ON shipments(status, sla_deadline_at);
CREATE INDEX idx_penalties_status ON penalties(status);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);
CREATE INDEX idx_loans_member_status ON loans (member_id, status);
CREATE INDEX idx_loans_starts_at ON loans (starts_at);
CREATE INDEX idx_penalties_member_status ON penalties (member_id, status);
CREATE INDEX idx_payments_member ON payments (member_id);
CREATE INDEX idx_reservations_member ON reservations (member_id);
CREATE INDEX idx_copies_material_branch_status ON copies (material_id, branch_id, status);
