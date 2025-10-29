const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// Test DB connection
pool.connect()
  .then(() => console.log('Connected to Database'))
  .catch((err) => console.error('Database connection failed:', err.message));

module.exports = pool;
