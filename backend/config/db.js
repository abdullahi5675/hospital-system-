require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Abdullahi20%40@localhost:5432/clinic_db'
});

pool.on('error', (err) => {
  console.error('Unexpected database client crash prevented:', err.message);
});

module.exports = {
  query: async (text, params) => {
    try {
      return await pool.query(text, params);
    } catch (error) {
      console.error('Database Query Level Failure:', error.message);
      throw error;
    }
  }
};