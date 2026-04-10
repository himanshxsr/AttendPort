const request = require('supertest');
const app = require('../server');
const { connectTestDB, closeTestDB, clearDatabase } = require('./testHelper');
const User = require('../models/User');

let adminToken;
let employeeId;

beforeAll(async () => {
  await connectTestDB();
  await clearDatabase();
  
  // Create an admin user
  const adminRes = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'adminpassword'
    });
  
  // Manually promote to admin
  await User.findByIdAndUpdate(adminRes.body._id, { role: 'Admin' });
  adminToken = adminRes.body.token;

  // Create a regular employee for testing admin actions
  const emp = await User.create({
    name: 'Regular Employee',
    email: 'employee@example.com',
    password: 'password123',
    role: 'Employee',
    employeeCode: 'EMP999'
  });
  employeeId = emp._id;
});

afterAll(async () => {
  await closeTestDB();
});

describe('Admin API', () => {
  describe('GET /api/admin/users', () => {
    it('should return all users for admin', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 401 for non-admin users', async () => {
        // Create a regular user token
        const userRes = await request(app)
            .post('/api/auth/register')
            .send({ name: 'User', email: 'user@example.com', password: 'password' });
        const userToken = userRes.body.token;

        const res = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.statusCode).toBe(403); // Forbidden
    });
  });

  describe('Post /api/admin/holiday', () => {
      it('should add a new holiday', async () => {
          const res = await request(app)
              .post('/api/admin/holiday')
              .set('Authorization', `Bearer ${adminToken}`)
              .send({
                  date: '2026-12-25',
                  name: 'Christmas'
              });

          expect(res.statusCode).toBe(201);
          expect(res.body.name).toBe('Christmas');
      });
  });

  describe('PUT /api/admin/update-role/:id', () => {
      it('should update user role', async () => {
          const res = await request(app)
              .put(`/api/admin/update-role/${employeeId}`)
              .set('Authorization', `Bearer ${adminToken}`)
              .send({ role: 'Admin' });

          expect(res.statusCode).toBe(200);
          expect(res.body.role).toBe('Admin');
      });
  });
});
