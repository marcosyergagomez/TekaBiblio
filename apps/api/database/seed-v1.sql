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

INSERT IGNORE INTO materials (id, title, material_type, release_date, home_branch_id, base_price)
VALUES
  ('mat_00001', 'Dune', 'LIBRO', '1965-08-01', 'branch_centro', 2.50),
  ('mat_00002', 'The Matrix', 'PELICULA', '1999-03-31', 'branch_sur', 3.50),
  ('mat_00003', 'The Witcher 3', 'JUEGO_PC', '2015-05-19', 'branch_oeste', 4.00),
  ('mat_00004', 'EA Sports FC 24', 'JUEGO_PLAYSTATION', '2023-09-29', 'branch_norte', 5.00),
  ('mat_00005', 'Halo Infinite', 'JUEGO_XBOX', '2021-12-08', 'branch_sur', 5.00);

INSERT IGNORE INTO copies (id, material_id, branch_id, inventory_code, status)
VALUES
  ('copy_00001', 'mat_00001', 'branch_centro', 'INV-COPY-00001', 'AVAILABLE'),
  ('copy_00002', 'mat_00001', 'branch_norte', 'INV-COPY-00002', 'AVAILABLE'),
  ('copy_00003', 'mat_00002', 'branch_sur', 'INV-COPY-00003', 'AVAILABLE'),
  ('copy_00004', 'mat_00003', 'branch_oeste', 'INV-COPY-00004', 'AVAILABLE'),
  ('copy_00005', 'mat_00004', 'branch_norte', 'INV-COPY-00005', 'AVAILABLE'),
  ('copy_00006', 'mat_00005', 'branch_sur', 'INV-COPY-00006', 'AVAILABLE');
