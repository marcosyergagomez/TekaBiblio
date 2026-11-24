INSERT INTO organizations (id, name)
VALUES ('org_tekabiblio', 'TekaBiblio Network');

INSERT INTO branches (id, organization_id, name, city, timezone, active)
VALUES
  ('branch_centro', 'org_tekabiblio', 'Centro', 'Madrid', 'Europe/Madrid', 1),
  ('branch_norte', 'org_tekabiblio', 'Norte', 'Madrid', 'Europe/Madrid', 1),
  ('branch_sur', 'org_tekabiblio', 'Sur', 'Madrid', 'Europe/Madrid', 1),
  ('branch_este', 'org_tekabiblio', 'Este', 'Madrid', 'Europe/Madrid', 1),
  ('branch_oeste', 'org_tekabiblio', 'Oeste', 'Madrid', 'Europe/Madrid', 1);

INSERT INTO users (id, branch_id, email, password_hash, role, full_name, status)
VALUES
  ('u_admin_global', 'branch_centro', 'admin.global@tekabiblio.local', 'scrypt:a1b2c3d4e5f60718293a4b5c6d7e8f90:925463ddf3313a26df774e5391fadb3276325b1f37dca4825f926dacec80577c', 'admin_global', 'Admin Global', 'ACTIVE'),
  ('u_admin_norte', 'branch_norte', 'admin.norte@tekabiblio.local', 'scrypt:a1b2c3d4e5f60718293a4b5c6d7e8f90:925463ddf3313a26df774e5391fadb3276325b1f37dca4825f926dacec80577c', 'admin_sede', 'Admin Norte', 'ACTIVE'),
  ('u_biblio_norte', 'branch_norte', 'biblio.norte@tekabiblio.local', 'scrypt:a1b2c3d4e5f60718293a4b5c6d7e8f90:925463ddf3313a26df774e5391fadb3276325b1f37dca4825f926dacec80577c', 'bibliotecario', 'Bibliotecario Norte', 'ACTIVE'),
  ('u_member_bronce', 'branch_sur', 'socio.bronce@tekabiblio.local', 'scrypt:a1b2c3d4e5f60718293a4b5c6d7e8f90:925463ddf3313a26df774e5391fadb3276325b1f37dca4825f926dacec80577c', 'socio', 'Socio Bronce', 'ACTIVE'),
  ('u_member_plata', 'branch_este', 'socio.plata@tekabiblio.local', 'scrypt:a1b2c3d4e5f60718293a4b5c6d7e8f90:925463ddf3313a26df774e5391fadb3276325b1f37dca4825f926dacec80577c', 'socio', 'Socio Plata', 'ACTIVE'),
  ('u_member_oro', 'branch_oeste', 'socio.oro@tekabiblio.local', 'scrypt:a1b2c3d4e5f60718293a4b5c6d7e8f90:925463ddf3313a26df774e5391fadb3276325b1f37dca4825f926dacec80577c', 'socio', 'Socio Oro', 'ACTIVE');

INSERT INTO members (id, user_id, home_branch_id, membership_level, debt_total)
VALUES
  ('mbr_bronce_01', 'u_member_bronce', 'branch_sur', 'BRONCE', 0.00),
  ('mbr_plata_01', 'u_member_plata', 'branch_este', 'PLATA', 0.00),
  ('mbr_oro_01', 'u_member_oro', 'branch_oeste', 'ORO', 0.00);
