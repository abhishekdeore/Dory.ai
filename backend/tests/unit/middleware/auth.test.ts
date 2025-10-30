import { Request, Response, NextFunction } from 'express';
import { authenticateApiKey, rateLimit } from '../../../src/middleware/auth';
import * as database from '../../../src/config/database';
import { mockUser, mockApiKey } from '../../fixtures/test-data';

jest.mock('../../../src/config/database');

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  const mockQuery = database.query as jest.MockedFunction<typeof database.query>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      headers: {},
      user: undefined,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('authenticateApiKey', () => {
    it('should authenticate valid API key', async () => {
      mockReq.headers = { 'x-api-key': mockApiKey };
      mockQuery.mockResolvedValue({ rows: [mockUser] } as any);

      await authenticateApiKey(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT id, email FROM users WHERE api_key = $1',
        [mockApiKey]
      );
      expect(mockReq.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without API key', async () => {
      mockReq.headers = {};

      await authenticateApiKey(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'API key required. Include x-api-key header.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid API key', async () => {
      mockReq.headers = { 'x-api-key': 'invalid_key' };
      mockQuery.mockResolvedValue({ rows: [] } as any);

      await authenticateApiKey(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid API key'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockReq.headers = { 'x-api-key': mockApiKey };
      mockQuery.mockRejectedValue(new Error('Database error'));

      await authenticateApiKey(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication failed'
      });
    });
  });

  describe('rateLimit', () => {
    beforeEach(() => {
      // Clear rate limit map between tests
      jest.clearAllMocks();
    });

    it('should allow requests within limit', () => {
      const middleware = rateLimit(100, 60000);
      mockReq.user = mockUser;

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block requests exceeding limit', () => {
      const middleware = rateLimit(2, 60000);
      mockReq.user = mockUser;

      // First two requests should pass
      middleware(mockReq as Request, mockRes as Response, mockNext);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Third request should be blocked
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Too many requests. Please try again later.'
      });
    });

    it('should reset limit after time window', () => {
      const middleware = rateLimit(1, 100); // 100ms window
      mockReq.user = mockUser;

      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Wait for window to expire
      jest.advanceTimersByTime(150);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('should use IP when user not authenticated', () => {
      const middleware = rateLimit(100, 60000);
      const reqWithIp = { ...mockReq, ip: '127.0.0.1' };

      middleware(reqWithIp as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
