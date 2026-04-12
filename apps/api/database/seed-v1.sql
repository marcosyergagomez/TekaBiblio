INSERT IGNORE INTO organizations (id, name)
VALUES ('org_tekabiblio', 'TekaBiblio Network');

INSERT IGNORE INTO branches (id, organization_id, name, city, timezone, active)
VALUES
  ('branch_centro', 'org_tekabiblio', 'Centro', 'Madrid', 'Europe/Madrid', 1),
  ('branch_norte', 'org_tekabiblio', 'Norte', 'Madrid', 'Europe/Madrid', 1),
  ('branch_sur', 'org_tekabiblio', 'Sur', 'Madrid', 'Europe/Madrid', 1),
  ('branch_este', 'org_tekabiblio', 'Este', 'Madrid', 'Europe/Madrid', 1),
  ('branch_oeste', 'org_tekabiblio', 'Oeste', 'Madrid', 'Europe/Madrid', 1);

INSERT IGNORE INTO users (id, branch_id, email, password_hash, role, full_name, status)
VALUES
  ('u_admin_global', 'branch_centro', 'admin.global@tekabiblio.local', 'demo_hash', 'admin_global', 'Admin Global', 'ACTIVE'),
  ('u_admin_norte', 'branch_norte', 'admin.norte@tekabiblio.local', 'demo_hash', 'admin_sede', 'Admin Norte', 'ACTIVE'),
  ('u_biblio_norte', 'branch_norte', 'biblio.norte@tekabiblio.local', 'demo_hash', 'bibliotecario', 'Bibliotecario Norte', 'ACTIVE'),
  ('u_member_bronce', 'branch_sur', 'socio.bronce@tekabiblio.local', 'demo_hash', 'socio', 'Socio Bronce', 'ACTIVE'),
  ('u_member_plata', 'branch_este', 'socio.plata@tekabiblio.local', 'demo_hash', 'socio', 'Socio Plata', 'ACTIVE'),
  ('u_member_oro', 'branch_oeste', 'socio.oro@tekabiblio.local', 'demo_hash', 'socio', 'Socio Oro', 'ACTIVE');

INSERT IGNORE INTO members (id, user_id, home_branch_id, membership_level, debt_total)
VALUES
  ('mbr_bronce_01', 'u_member_bronce', 'branch_sur', 'BRONCE', 0.00),
  ('mbr_plata_01', 'u_member_plata', 'branch_este', 'PLATA', 0.00),
  ('mbr_oro_01', 'u_member_oro', 'branch_oeste', 'ORO', 0.00);

DROP PROCEDURE IF EXISTS seed_catalog;

DELIMITER $$
CREATE PROCEDURE seed_catalog()
BEGIN
  DECLARE i INT DEFAULT 1;
  DECLARE home_branch VARCHAR(36);
  DECLARE material_id VARCHAR(36);
  DECLARE copy_id VARCHAR(36);

  WHILE i <= 15 DO
    SET home_branch = ELT(
      ((i - 1) MOD 5) + 1,
      'branch_centro',
      'branch_norte',
      'branch_sur',
      'branch_este',
      'branch_oeste'
    );

    SET material_id = CONCAT('mat_lib_', LPAD(i, 3, '0'));
    INSERT IGNORE INTO materials (id, title, material_type, release_date, home_branch_id, base_price)
    VALUES (
      material_id,
      CONCAT('Book Demo ', LPAD(i, 2, '0')),
      'LIBRO',
      DATE_ADD('2010-01-01', INTERVAL i DAY),
      home_branch,
      2.50
    );
    SET copy_id = CONCAT('copy_lib_', LPAD(i, 3, '0'));
    INSERT IGNORE INTO copies (id, material_id, branch_id, inventory_code, status)
    VALUES (copy_id, material_id, home_branch, CONCAT('INV-', UPPER(copy_id)), 'AVAILABLE');

    SET material_id = CONCAT('mat_mov_', LPAD(i, 3, '0'));
    INSERT IGNORE INTO materials (id, title, material_type, release_date, home_branch_id, base_price)
    VALUES (
      material_id,
      CONCAT('Movie Demo ', LPAD(i, 2, '0')),
      'PELICULA',
      DATE_ADD('2012-01-01', INTERVAL i DAY),
      home_branch,
      3.50
    );
    SET copy_id = CONCAT('copy_mov_', LPAD(i, 3, '0'));
    INSERT IGNORE INTO copies (id, material_id, branch_id, inventory_code, status)
    VALUES (copy_id, material_id, home_branch, CONCAT('INV-', UPPER(copy_id)), 'AVAILABLE');

    SET material_id = CONCAT('mat_pc_', LPAD(i, 3, '0'));
    INSERT IGNORE INTO materials (id, title, material_type, release_date, home_branch_id, base_price)
    VALUES (
      material_id,
      CONCAT('PC Game Demo ', LPAD(i, 2, '0')),
      'JUEGO_PC',
      DATE_ADD('2014-01-01', INTERVAL i DAY),
      home_branch,
      4.00
    );
    SET copy_id = CONCAT('copy_pc_', LPAD(i, 3, '0'));
    INSERT IGNORE INTO copies (id, material_id, branch_id, inventory_code, status)
    VALUES (copy_id, material_id, home_branch, CONCAT('INV-', UPPER(copy_id)), 'AVAILABLE');

    SET material_id = CONCAT('mat_ps_', LPAD(i, 3, '0'));
    INSERT IGNORE INTO materials (id, title, material_type, release_date, home_branch_id, base_price)
    VALUES (
      material_id,
      CONCAT('PlayStation Game Demo ', LPAD(i, 2, '0')),
      'JUEGO_PLAYSTATION',
      DATE_ADD('2016-01-01', INTERVAL i DAY),
      home_branch,
      5.00
    );
    SET copy_id = CONCAT('copy_ps_', LPAD(i, 3, '0'));
    INSERT IGNORE INTO copies (id, material_id, branch_id, inventory_code, status)
    VALUES (copy_id, material_id, home_branch, CONCAT('INV-', UPPER(copy_id)), 'AVAILABLE');

    SET material_id = CONCAT('mat_xb_', LPAD(i, 3, '0'));
    INSERT IGNORE INTO materials (id, title, material_type, release_date, home_branch_id, base_price)
    VALUES (
      material_id,
      CONCAT('Xbox Game Demo ', LPAD(i, 2, '0')),
      'JUEGO_XBOX',
      DATE_ADD('2018-01-01', INTERVAL i DAY),
      home_branch,
      5.00
    );
    SET copy_id = CONCAT('copy_xb_', LPAD(i, 3, '0'));
    INSERT IGNORE INTO copies (id, material_id, branch_id, inventory_code, status)
    VALUES (copy_id, material_id, home_branch, CONCAT('INV-', UPPER(copy_id)), 'AVAILABLE');

    SET i = i + 1;
  END WHILE;
END$$
DELIMITER ;

CALL seed_catalog();
DROP PROCEDURE IF EXISTS seed_catalog;
