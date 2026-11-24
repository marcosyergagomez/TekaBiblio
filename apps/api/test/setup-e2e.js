process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'root';
process.env.DB_NAME = process.env.DB_NAME || 'tekabiblio_test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'tekabiblio-e2e-jwt-secret-32-characters';
