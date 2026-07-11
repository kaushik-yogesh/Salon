import request from 'supertest';
import app from '../src/app.js';

describe('Health Check API', () => {
  it('should return 200 OK for /health', async () => {
    const res = await request(app).get('/health');
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'OK');
    expect(res.body).toHaveProperty('timestamp');
  });
});
