const request = require('supertest');
const app = require('../server');
const { connectTestDB, closeTestDB, clearDatabase } = require('./testHelper');
const User = require('../models/User');
const Leave = require('../models/Leave');

let token;
let user;

beforeAll(async () => {
  await connectTestDB();
  await clearDatabase();
  
  const testUser = {
    name: 'Leave User',
    email: 'leave@example.com',
    password: 'password123'
  };
  
  const res = await request(app)
    .post('/api/auth/register')
    .send(testUser);
  
  token = res.body.token;
  user = res.body;

  // Manually give user some balance for testing
  await User.findByIdAndUpdate(user._id, { casualLeaveBalance: 10, sickLeaveBalance: 10 });
});

afterAll(async () => {
  await closeTestDB();
});

describe('Leave API', () => {
  let leaveId;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  describe('POST /api/attendance/apply-leave', () => {
    it('should apply for leave successfully', async () => {
      const res = await request(app)
        .post('/api/attendance/apply-leave')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'Sick',
          startDate: tomorrowStr,
          endDate: tomorrowStr,
          reason: 'Fever'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.type).toBe('Sick');
      leaveId = res.body._id;
    });

    it('should return 400 if start date is after end date', async () => {
      const res = await request(app)
        .post('/api/attendance/apply-leave')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'Sick',
          startDate: '2026-12-31',
          endDate: '2026-01-01',
          reason: 'Broken time machine'
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/attendance/my-leaves', () => {
    it('should return user\'s leave history and balances', async () => {
      const res = await request(app)
        .get('/api/attendance/my-leaves')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.leaves.length).toBeGreaterThan(0);
      expect(res.body.balances).toHaveProperty('casual');
    });
  });

  describe('PUT /api/attendance/cancel-leave/:id', () => {
    it('should cancel a pending leave request', async () => {
      const res = await request(app)
        .put(`/api/attendance/cancel-leave/${leaveId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.leave.status).toBe('Cancelled');
    });

    it('should not cancel a leave already cancelled', async () => {
      const res = await request(app)
        .put(`/api/attendance/cancel-leave/${leaveId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('already Cancelled');
    });
  });
});
