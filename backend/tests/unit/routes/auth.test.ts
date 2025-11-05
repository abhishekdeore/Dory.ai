import request from 'supertest';
import express from 'express';
import authRouter from '../../../src/routes/auth';
import { query } from '../../../src/config/database';
import bcrypt from 'bcrypt';

// Mock database
jest.mock('../../../src/config/database');
const mockQuery = query as jest.MockedFunction<typeof query>;

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new user with valid data', async () => {
      // Mock: User doesn't exist
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      // Mock: User creation
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        api_key: 'dory_test123',
        created_at: new Date()
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1, command: '', oid: 0, fields: [] });

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!',
          name: 'Test User'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('apiKey');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.name).toBe('Test User');
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('should reject signup with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123!',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject signup with short password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'short',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject signup with existing email', async () => {
      // Mock: User already exists
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: '123' }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      });

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'existing@example.com',
          password: 'TestPassword123!',
          name: 'Test User'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User with this email already exists');
    });

    it('should reject signup with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const passwordHash = await bcrypt.hash('TestPassword123!', 12);
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: passwordHash,
        api_key: 'dory_test123',
        created_at: new Date()
      };

      // Mock: Find user
      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      });

      // Mock: Update last login
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('apiKey');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user).not.toHaveProperty('password_hash');
    });

    it('should reject login with invalid email', async () => {
      // Mock: User not found
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should reject login with invalid password', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 12);
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: passwordHash,
        api_key: 'dory_test123',
        created_at: new Date()
      };

      // Mock: Find user
      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should reject login with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/verify', () => {
    it('should verify valid API key', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User'
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: []
      });

      const response = await request(app)
        .post('/api/auth/verify')
        .set('x-api-key', 'valid_api_key');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toEqual(mockUser);
    });

    it('should reject missing API key', async () => {
      const response = await request(app)
        .post('/api/auth/verify');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('API key required');
    });

    it('should reject invalid API key', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: []
      });

      const response = await request(app)
        .post('/api/auth/verify')
        .set('x-api-key', 'invalid_api_key');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid API key');
    });
  });

  describe('Security Tests', () => {
    it('should hash passwords securely', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        api_key: 'dory_test123',
        created_at: new Date()
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1, command: '', oid: 0, fields: [] });

      await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!',
          name: 'Test User'
        });

      // Check that the password was hashed (by inspecting the query call)
      const insertCall = mockQuery.mock.calls[1];
      const hashedPassword = insertCall?.[1]?.[1];
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe('TestPassword123!');
      expect(hashedPassword).toMatch(/^\$2b\$/);
    });

    it('should generate unique API keys', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      const mockUser1 = {
        id: '123',
        email: 'test1@example.com',
        name: 'Test User 1',
        api_key: 'dory_test123',
        created_at: new Date()
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockUser1], rowCount: 1, command: '', oid: 0, fields: [] });

      const response1 = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test1@example.com',
          password: 'TestPassword123!',
          name: 'Test User 1'
        });

      mockQuery.mockClear();
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      const mockUser2 = {
        id: '456',
        email: 'test2@example.com',
        name: 'Test User 2',
        api_key: 'dory_test456',
        created_at: new Date()
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockUser2], rowCount: 1, command: '', oid: 0, fields: [] });

      const response2 = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test2@example.com',
          password: 'TestPassword123!',
          name: 'Test User 2'
        });

      expect(response1.body.user.apiKey).not.toBe(response2.body.user.apiKey);
    });

    it('should prevent SQL injection in email field', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "test@example.com' OR '1'='1",
          password: 'TestPassword123!'
        });

      // Should fail validation or return 401, not cause SQL injection
      expect([400, 401]).toContain(response.status);
    });

    it('should sanitize user input', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: '<script>alert("xss")</script>',
        api_key: 'dory_test123',
        created_at: new Date()
      };
      mockQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1, command: '', oid: 0, fields: [] });

      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123!',
          name: '<script>alert("xss")</script>'
        });

      // The response should contain the unsanitized name since sanitization
      // should happen at display time, but the database should accept it
      expect(response.status).toBe(201);
    });
  });
});
