/**
 * Workflow API Integration Tests
 *
 * Integration tests for workflow-related endpoints
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../index');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');

describe('Workflow API Integration Tests', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Create test user
    const user = await User.create({
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
    });

    userId = user._id;

    // Generate auth token
    authToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/workflows', () => {
    it('should create a new workflow', async () => {
      const workflowData = {
        name: 'Test Workflow',
        description: 'A test workflow',
        nodes: [
          {
            id: '1',
            type: 'action',
            position: { x: 0, y: 0 },
            data: { name: 'Checkout', repository: 'actions/checkout@v4' },
          },
        ],
        edges: [],
        yaml: 'name: Test\non: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4',
        tags: ['test'],
        isPublic: false,
      };

      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(workflowData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe('Test Workflow');
      expect(response.body.userId).toBe(userId.toString());
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/workflows')
        .send({ name: 'Test' })
        .expect(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' }) // Missing required fields
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/workflows', () => {
    it('should get user workflows', async () => {
      const response = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by tags', async () => {
      const response = await request(app)
        .get('/api/workflows?tags=test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('PUT /api/workflows/:id', () => {
    let workflowId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Update Test',
          description: 'Test',
          nodes: [],
          edges: [],
          yaml: 'test',
          tags: [],
        });

      workflowId = response.body._id;
    });

    it('should update workflow', async () => {
      const response = await request(app)
        .put(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
    });

    it('should not update other user\'s workflow', async () => {
      // Create another user
      const otherUser = await User.create({
        email: 'other@example.com',
        username: 'otheruser',
        password: 'password123',
      });

      const otherToken = jwt.sign(
        { userId: otherUser._id, email: otherUser.email },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1h' }
      );

      await request(app)
        .put(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked' })
        .expect(403);

      await User.deleteOne({ _id: otherUser._id });
    });
  });

  describe('DELETE /api/workflows/:id', () => {
    it('should delete workflow', async () => {
      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Delete Test',
          description: 'Test',
          nodes: [],
          edges: [],
          yaml: 'test',
          tags: [],
        });

      const workflowId = response.body._id;

      await request(app)
        .delete(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify deletion
      await request(app)
        .get(`/api/workflows/${workflowId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
