const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

module.exports = async function prepareE2eDatabase() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || 'root';
  const database = process.env.DB_NAME || 'tekabiblio_test';
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  await connection.query(
    `DROP DATABASE IF EXISTS \`${database}\`; CREATE DATABASE \`${database}\`;`,
  );
  await connection.changeUser({ database });
  const schema = fs.readFileSync(
    path.join(__dirname, '../database/schema-v1.sql'),
    'utf8',
  );
  const seed = fs.readFileSync(path.join(__dirname, 'seed-e2e.sql'), 'utf8');
  await connection.query(schema);
  await connection.query(seed);
  await connection.end();
};
