const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.substring(0, process.env.DATABASE_URL.lastIndexOf('/'))
  : 'postgresql://postgres:Abdullahi20@localhost:5432';

const dbName = 'clinic_db';

async function init() {
  console.log("Connecting database server via:", connectionString);
  
  const clientSetup = new Client({ connectionString: `${connectionString}/postgres` });
  try {
    await clientSetup.connect();
    await clientSetup.query(`CREATE DATABASE ${dbName}`);
    console.log(`Database ${dbName} created successfully.`);
  } catch (err) {
    if (err.code === '42P04') {
      console.log(`Database ${dbName} already exists.`);
    } else {
      console.error("Error creating database:", err.message);
    }
  } finally {
    await clientSetup.end();
  }

  const clientSchema = new Client({ connectionString: process.env.DATABASE_URL || `${connectionString}/${dbName}` });
  try {
    await clientSchema.connect();
    console.log("Reading schema.sql...");
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    await clientSchema.query(sql);
    console.log("SUCCESS: Database schema loaded and seeded successfully.");
  } catch (err) {
    console.error("Error loading schema:", err);
    process.exit(1);
  } finally {
    await clientSchema.end();
  }
}

init();
