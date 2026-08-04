// Migration: make appointment_date and appointment_time nullable
// Run: node database/migrate_nullable_appt.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const client = await pool.connect();
  try {
    console.log('Running migration: making appointment_date and appointment_time nullable...');
    await client.query(`
      ALTER TABLE appointments
        ALTER COLUMN appointment_date DROP NOT NULL,
        ALTER COLUMN appointment_time DROP NOT NULL;
    `);
    console.log('✅ Migration complete. appointment_date and appointment_time are now nullable.');
  } catch (err) {
    if (err.message.includes('cannot alter type') || err.message.includes('already nullable') || err.code === '42P16') {
      console.log('ℹ️  Columns are already nullable — no change needed.');
    } else {
      console.error('❌ Migration failed:', err.message);
      process.exit(1);
    }
  } finally {
    client.release();
    pool.end();
  }
})();
