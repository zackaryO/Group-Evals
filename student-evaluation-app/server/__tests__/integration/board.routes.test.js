// Integration tests: class summary board with pay redaction and stagnation counts.

const request = require('supertest');
const { startTestDb, stopTestDb, clearDb, buildApp, makeUser } = require('./testApp');

let app;

beforeAll(async () => {
  await startTestDb();
  app = buildApp();
});
afterEach(clearDb);
afterAll(stopTestDb);

describe('GET /api/job-search/board', () => {
  test('every student appears in the board', async () => {
    const { token: viewer } = await makeUser({ role: 'student' });
    await makeUser({ role: 'student', firstName: 'Sam' });
    await makeUser({ role: 'student', firstName: 'Pat' });

    const res = await request(app).get('/api/job-search/board').set('Authorization', `Bearer ${viewer}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
  });

  test('counts active vs parked correctly', async () => {
    const { user: a, token: tokenA } = await makeUser({ role: 'student', firstName: 'A' });
    // 2 active, 1 parked
    await request(app).post('/api/job-search/applications').set('Authorization', `Bearer ${tokenA}`).send({ dealerName: 'd1' });
    await request(app).post('/api/job-search/applications').set('Authorization', `Bearer ${tokenA}`).send({ dealerName: 'd2' });
    const parked = await request(app).post('/api/job-search/applications').set('Authorization', `Bearer ${tokenA}`).send({ dealerName: 'd3' });
    await request(app)
      .put(`/api/job-search/applications/${parked.body._id}/archive`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ archived: true });

    const board = await request(app).get('/api/job-search/board').set('Authorization', `Bearer ${tokenA}`);
    const entry = board.body.find((b) => String(b.studentId) === String(a._id));
    expect(entry.activeCount).toBe(2);
    expect(entry.parkedCount).toBe(1);
  });

  test('redacts offerAmount and highest wage from peers, but not from owner or staff', async () => {
    const { user: studentA, token: tokenA } = await makeUser({ role: 'student' });
    const created = await request(app)
      .post('/api/job-search/applications')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ dealerName: 'd1', benefits: { startingWage: 24 } });
    await request(app)
      .post(`/api/job-search/applications/${created.body._id}/communications`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'offer_received', offerAmount: 60000 });

    const ownView = await request(app).get('/api/job-search/board').set('Authorization', `Bearer ${tokenA}`);
    const ownEntry = ownView.body.find((b) => String(b.studentId) === String(studentA._id));
    expect(ownEntry.latestOfferAmount).toBe(60000);
    expect(ownEntry.highestStartingWage).toBe(24);

    const { token: peerToken } = await makeUser({ role: 'student' });
    const peerView = await request(app).get('/api/job-search/board').set('Authorization', `Bearer ${peerToken}`);
    const peerEntry = peerView.body.find((b) => String(b.studentId) === String(studentA._id));
    expect(peerEntry.latestOfferAmount).toBeNull();
    expect(peerEntry.highestStartingWage).toBeNull();
    // Non-pay fields stay visible
    expect(peerEntry.activeCount).toBe(1);

    const { token: instToken } = await makeUser({ role: 'instructor' });
    const instView = await request(app).get('/api/job-search/board').set('Authorization', `Bearer ${instToken}`);
    const instEntry = instView.body.find((b) => String(b.studentId) === String(studentA._id));
    expect(instEntry.latestOfferAmount).toBe(60000);
    expect(instEntry.highestStartingWage).toBe(24);
  });
});
