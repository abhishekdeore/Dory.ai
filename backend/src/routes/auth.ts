import express from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  name: z.string().min(1, 'Name is required').max(255)
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

// Generate a secure random API key
function generateApiKey(): string {
  return `dory_${uuidv4().replace(/-/g, '')}`;
}

/**
 * POST /api/auth/signup - Create a new user account
 */
router.post('/signup', async (req, res) => {
  try {
    // Validate input
    const validation = signupSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const { email, password, name } = validation.data;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate API key
    const apiKey = generateApiKey();

    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, name, api_key)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, api_key, created_at`,
      [email, passwordHash, name, apiKey]
    );

    const user = result.rows[0];

    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        apiKey: user.api_key,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create account'
    });
  }
});

/**
 * POST /api/auth/login - Authenticate user and return API key
 */
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const { email, password } = validation.data;

    // Find user
    const result = await query(
      `SELECT id, email, name, password_hash, api_key, created_at
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        apiKey: user.api_key,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
});

/**
 * POST /api/auth/verify - Verify API key is valid
 */
router.post('/verify', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required'
      });
    }

    const result = await query(
      'SELECT id, email, name FROM users WHERE api_key = $1',
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    return res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Verify error:', error);
    return res.status(500).json({
      success: false,
      error: 'Verification failed'
    });
  }
});

export default router;
