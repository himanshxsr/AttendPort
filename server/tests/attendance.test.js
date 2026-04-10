const request = require('supertest');
const app = require('../server');
const { connectTestDB, closeTestDB, clearDatabase } = require('./testHelper');
const User = require('../models/User');

let token;
let user;

beforeAll(async () => {
  await connectTestDB();
  await clearDatabase();
  
  // Create a test user and get token
  const testUser = {
    name: 'Attendance User',
    email: 'attendance@example.com',
    password: 'password123'
  };
  
  const res = await request(app)
    .post('/api/auth/register')
    .send(testUser);
  
  token = res.body.token;
  user = res.body;
});

afterAll(async () => {
  await closeTestDB();
});

describe('Attendance API', () => {
  describe('POST /api/attendance/check-in', () => {
    it('should create a new check-in record and session', async () => {
      const res = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('attendance');
      expect(res.body).toHaveProperty('workSession');
      expect(res.body.workSession.startTime).toBeDefined();
    });
  });

  describe('GET /api/attendance/today', () => {
    it('should return today\'s attendance status', async () => {
      const res = await request(app)
        .get('/api/attendance/today')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.attendance).toBeDefined();
      expect(res.body.workSessions.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/attendance/check-out', () => {
    it('should close the current work session', async () => {
      const res = await request(app)
        .put('/api/attendance/check-out')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.workSession.endTime).toBeDefined();
    });

    it('should return 400 if no active session exists', async () => {
       const res = await request(app)
        .put('/api/attendance/check-out')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('No active work session found');
    });
  });
});
