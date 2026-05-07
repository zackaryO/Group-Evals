// Integration tests: dealership directory routes.
// Reads: any authenticated user. Writes (incl. alumni): staff only.

const request = require('supertest');
const { startTestDb, stopTestDb, clearDb, buildApp, makeUser } = require('./testApp');

let app;

beforeAll(async () => {
  await startTestDb();
  app = buildApp();
});
afterEach(clearDb);
afterAll(stopTestDb);

describe('GET /api/dealerships', () => {
  test('rejects unauthenticated', async () => {
    const res = await request(app).get('/api/dealerships');
    expect(res.status).toBe(401);
  });

  test('students can read', async () => {
    const { token } = await makeUser({ role: 'student' });
    const res = await request(app).get('/api/dealerships').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('search filter works (case-insensitive substring)', async () => {
    const { token: instructor } = await makeUser({ role: 'instructor' });
    await request(app)
      .post('/api/dealerships')
      .set('Authorization', `Bearer ${instructor}`)
      .send({ name: 'MB of Salt Lake City', city: 'Salt Lake City', state: 'UT' });
    await request(app)
      .post('/api/dealerships')
      .set('Authorization', `Bearer ${instructor}`)
      .send({ name: 'MB of Boise', city: 'Boise', state: 'ID' });

    const res = await request(app)
      .get('/api/dealerships?search=salt')
      .set('Authorization', `Bearer ${instructor}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toMatch(/Salt Lake/);
  });
});

describe('POST /api/dealerships', () => {
  test('students CAN create (directory is shared, students contribute)', async () => {
    const { token } = await makeUser({ role: 'student' });
    const res = await request(app)
      .post('/api/dealerships')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'MB of Anywhere' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('MB of Anywhere');
  });

  test('instructors can create', async () => {
    const { token } = await makeUser({ role: 'instructor' });
    const res = await request(app)
      .post('/api/dealerships')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'MB of Park City', state: 'UT' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('MB of Park City');
  });

  test('admins can create', async () => {
    const { token } = await makeUser({ role: 'admin' });
    const res = await request(app)
      .post('/api/dealerships')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'MB of Ogden' });
    expect(res.status).toBe(201);
  });

  test('rejects missing name', async () => {
    const { token } = await makeUser({ role: 'instructor' });
    const res = await request(app)
      .post('/api/dealerships')
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'Nowhere' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/dealerships/:id', () => {
  test('any authenticated student can edit (directory is for student benefit)', async () => {
    const { token: tokenA } = await makeUser({ role: 'student' });
    const created = await request(app)
      .post('/api/dealerships')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'MB of Provo', city: 'Provo' });

    const { token: tokenB } = await makeUser({ role: 'student' });
    const res = await request(app)
      .put(`/api/dealerships/${created.body._id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ city: 'Provo, UT' });
    expect(res.status).toBe(200);
    expect(res.body.city).toBe('Provo, UT');
  });

  test('instructor can edit', async () => {
    const { token: tokenStudent } = await makeUser({ role: 'student' });
    const created = await request(app)
      .post('/api/dealerships')
      .set('Authorization', `Bearer ${tokenStudent}`)
      .send({ name: 'MB of Layton' });
    const { token: tokenInst } = await makeUser({ role: 'instructor' });
    const res = await request(app)
      .put(`/api/dealerships/${created.body._id}`)
      .set('Authorization', `Bearer ${tokenInst}`)
      .send({ mainPhone: '801-555-1234' });
    expect(res.status).toBe(200);
    expect(res.body.mainPhone).toBe('801-555-1234');
  });
});

describe('DELETE /api/dealerships/:id', () => {
  test('students cannot delete (would orphan applications)', async () => {
    const { token } = await makeUser({ role: 'student' });
    const created = await request(app)
      .post('/api/dealerships')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'MB of Murray' });
    const res = await request(app)
      .delete(`/api/dealerships/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('instructor can delete', async () => {
    const { token } = await makeUser({ role: 'instructor' });
    const created = await request(app)
      .post('/api/dealerships')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'MB of Sandy' });
    const res = await request(app)
      .delete(`/api/dealerships/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe('Alumni sub-resource', () => {
  test('students cannot add alumni', async () => {
    const { token: instructor } = await makeUser({ role: 'instructor' });
    const dealer = await request(app)
      .post('/api/dealerships')
      .set('Authorization', `Bearer ${instructor}`)
      .send({ name: 'MB of Provo' });

    const { token: student } = await makeUser({ role: 'student' });
    const res = await request(app)
      .post(`/api/dealerships/${dealer.body._id}/alumni`)
      .set('Authorization', `Bearer ${student}`)
      .send({ firstName: 'Alex', lastName: 'Alum' });
    expect(res.status).toBe(403);
  });

  test('instructor can add, edit, and delete alumni', async () => {
    const { token } = await makeUser({ role: 'instructor' });
    const dealer = await request(app)
      .post('/api/dealerships')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'MB of Layton' });

    const added = await request(app)
      .post(`/api/dealerships/${dealer.body._id}/alumni`)
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Jamie', lastName: 'Alum', currentlyEmployed: true, role: 'Tech' });
    expect(added.status).toBe(201);
    expect(added.body.alumni.length).toBe(1);
    const alumniId = added.body.alumni[0]._id;

    const edited = await request(app)
      .put(`/api/dealerships/${dealer.body._id}/alumni/${alumniId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'Senior Tech', currentlyEmployed: false });
    expect(edited.status).toBe(200);
    expect(edited.body.alumni[0].role).toBe('Senior Tech');
    expect(edited.body.alumni[0].currentlyEmployed).toBe(false);

    const deleted = await request(app)
      .delete(`/api/dealerships/${dealer.body._id}/alumni/${alumniId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleted.status).toBe(200);
    expect(deleted.body.alumni.length).toBe(0);
  });
});
