const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function createAdmin() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'memory_llm',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    const email = 'admin@dory.ai';
    const password = 'admin@123';
    const name = 'Admin User';

    // Check if admin user already exists
    const existingUser = await client.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.log('Admin user already exists. Updating password...');

      // Hash the new password
      const passwordHash = await bcrypt.hash(password, 12);

      // Update the existing user
      await client.query(
        'UPDATE users SET password_hash = $1, name = $2 WHERE email = $3',
        [passwordHash, name, email]
      );

      console.log('✅ Admin user password updated successfully!');
      console.log('Email:', email);
      console.log('Password:', password);
    } else {
      console.log('Creating new admin user...');

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Generate API key
      const apiKey = `dory_${uuidv4().replace(/-/g, '')}`;

      // Create user
      const result = await client.query(
        `INSERT INTO users (email, password_hash, name, api_key)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, name, api_key`,
        [email, passwordHash, name, apiKey]
      );

      console.log('✅ Admin user created successfully!');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('API Key:', result.rows[0].api_key);
    }

  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createAdmin();
