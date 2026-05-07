// Integration tests: DealerApplication CRUD, reorder, and pay redaction.

const request = require('supertest');
const { startTestDb, stopTestDb, clearDb, buildApp, makeUser } = require('./testApp');

let app;

beforeAll(async () => {
  await startTestDb();
  app = buildApp();
});
afterEach(clearDb);
afterAll(stopTestDb);

async function createApp(token, payload) {
  return request(app).post('/api/job-search/applications').set('Authorization', `Bearer ${token}`).send(payload);
}

describe('POST /api/job-search/applications', () => {
  test('rejects missing dealerName', async () => {
    const { token } = await makeUser({ role: 'student' });
    const res = await createApp(token, {});
    expect(res.status).toBe(400);
  });

  test('creates an application with denormalized dealer info', async () => {
    const { token } = await makeUser({ role: 'student' });
    const res = await createApp(token, {
      dealerName: 'MB of Salt Lake City',
      dealerCity: 'Salt Lake City',
      benefits: { startingWage: 22, shopCulture: 'Great' },
    });
    expect(res.status).toBe(201);
    expect(res.body.dealerName).toBe('MB of Salt Lake City');
    expect(res.body.benefits.startingWage).toBe(22);
    expect(res.body.benefits.shopCulture).toBe('Great');
    // Server should auto-create + link the shared Dealership.
    expect(res.body.linkedDealership).toBeTruthy();
  });

  test('two students applying to same dealer end up linked to ONE Dealership', async () => {
    const Dealership = require('../../models/Dealership');
    const { token: a } = await makeUser({ role: 'student' });
    const { token: b } = await makeUser({ role: 'student' });
    const ra = await createApp(a, { dealerName: 'MB of Boise', dealerCity: 'Boise' });
    const rb = await createApp(b, { dealerName: 'MB of Boise', dealerCity: 'Boise' });
    expect(ra.body.linkedDealership).toBeTruthy();
    expect(rb.body.linkedDealership).toBeTruthy();
    // Both applications should reference the same shared Dealership doc.
    const linkedA = ra.body.linkedDealership._id || ra.body.linkedDealership;
    const linkedB = rb.body.linkedDealership._id || rb.body.linkedDealership;
    expect(String(linkedA)).toBe(String(linkedB));
    const count = await Dealership.countDocuments({ name: /MB of Boise/i });
    expect(count).toBe(1);
  });

  test('case-insensitive dedup ("MB of Sandy" matches "mb of sandy")', async () => {
    const Dealership = require('../../models/Dealership');
    const { token: a } = await makeUser({ role: 'student' });
    const { token: b } = await makeUser({ role: 'student' });
    await createApp(a, { dealerName: 'MB of Sandy' });
    await createApp(b, { dealerName: 'mb of sandy' });
    const count = await Dealership.countDocuments({ name: /sandy/i });
    expect(count).toBe(1);
  });

  test('appends with increasing sortIndex', async () => {
    const { token } = await makeUser({ role: 'student' });
    const a = await createApp(token, { dealerName: 'A' });
    const b = await createApp(token, { dealerName: 'B' });
    const c = await createApp(token, { dealerName: 'C' });
    expect(a.body.sortIndex).toBe(0);
    expect(b.body.sortIndex).toBe(1);
    expect(c.body.sortIndex).toBe(2);
  });
});

describe('GET /api/job-search/applications  with pay redaction', () => {
  test('owner sees own pay; another student does not; staff does', async () => {
    const { user: studentA, token: tokenA } = await makeUser({ role: 'student' });
    const { token: tokenB } = await makeUser({ role: 'student' });
    const { token: tokenInst } = await makeUser({ role: 'instructor' });

    await createApp(tokenA, { dealerName: 'A', benefits: { startingWage: 25, wageRange: { min: 20, max: 30 } } });

    const ownRes = await request(app)
      .get('/api/job-search/applications')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(ownRes.body[0].benefits.startingWage).toBe(25);
    expect(ownRes.body[0].benefits.wageRange).toEqual({ min: 20, max: 30 });

    const otherRes = await request(app)
      .get(`/api/job-search/applications?student=${studentA._id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(otherRes.status).toBe(403); // students cannot pull other students' lists

    // Other student gets to view via the board+detail flow:
    const detailFromOther = await request(app)
      .get(`/api/job-search/applications/${ownRes.body[0]._id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(detailFromOther.body.benefits.startingWage).toBeNull();
    expect(detailFromOther.body.benefits.wageRange).toEqual({ min: null, max: null });

    const instRes = await request(app)
      .get(`/api/job-search/applications?student=${studentA._id}`)
      .set('Authorization', `Bearer ${tokenInst}`);
    expect(instRes.status).toBe(200);
    expect(instRes.body[0].benefits.startingWage).toBe(25);
  });
});

describe('Shared dealer-info propagation', () => {
  test('editing dealer fields on one student\'s app updates the master AND every other linked app', async () => {
    const { token: a } = await makeUser({ role: 'student' });
    const { token: b } = await makeUser({ role: 'student' });
    // Both students apply to the same dealer (same name → same linked Dealership)
    const ra = await createApp(a, { dealerName: 'MB of Farmington' });
    const rb = await createApp(b, { dealerName: 'MB of Farmington' });
    expect(String(ra.body.linkedDealership._id || ra.body.linkedDealership))
      .toBe(String(rb.body.linkedDealership._id || rb.body.linkedDealership));

    // Student A edits the dealer's address on their application
    await request(app)
      .put(`/api/job-search/applications/${ra.body._id}`)
      .set('Authorization', `Bearer ${a}`)
      .send({ dealerAddress: '123 Main St', dealerCity: 'Farmington', dealerState: 'NM' });

    // Student B re-fetches their application — the address should be there now
    const refreshedB = await request(app)
      .get(`/api/job-search/applications/${rb.body._id}`)
      .set('Authorization', `Bearer ${b}`);
    expect(refreshedB.body.dealerAddress).toBe('123 Main St');
    expect(refreshedB.body.dealerCity).toBe('Farmington');
    expect(refreshedB.body.dealerState).toBe('NM');
  });
});

describe('PUT /api/job-search/applications/:id', () => {
  test('owner can edit', async () => {
    const { token } = await makeUser({ role: 'student' });
    const created = await createApp(token, { dealerName: 'A' });
    const res = await request(app)
      .put(`/api/job-search/applications/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'updated', stillInterested: false });
    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('updated');
    expect(res.body.stillInterested).toBe(false);
  });

  test('non-owner student cannot edit', async () => {
    const { token: tokenA } = await makeUser({ role: 'student' });
    const { token: tokenB } = await makeUser({ role: 'student' });
    const created = await createApp(tokenA, { dealerName: 'A' });
    const res = await request(app)
      .put(`/api/job-search/applications/${created.body._id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ notes: 'mwahaha' });
    expect(res.status).toBe(403);
  });

  test('instructor can edit any', async () => {
    const { token: tokenA } = await makeUser({ role: 'student' });
    const { token: tokenInst } = await makeUser({ role: 'instructor' });
    const created = await createApp(tokenA, { dealerName: 'A' });
    const res = await request(app)
      .put(`/api/job-search/applications/${created.body._id}`)
      .set('Authorization', `Bearer ${tokenInst}`)
      .send({ notes: 'instructor note' });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/job-search/applications/reorder', () => {
  test('reorders priority for owner', async () => {
    const { token } = await makeUser({ role: 'student' });
    const a = await createApp(token, { dealerName: 'A' });
    const b = await createApp(token, { dealerName: 'B' });
    const c = await createApp(token, { dealerName: 'C' });

    const res = await request(app)
      .post('/api/job-search/applications/reorder')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderedIds: [c.body._id, a.body._id, b.body._id] });
    expect(res.status).toBe(200);
    expect(res.body.map((x) => x.dealerName)).toEqual(['C', 'A', 'B']);
    expect(res.body.map((x) => x.sortIndex)).toEqual([0, 1, 2]);
  });

  test('cannot reorder another student\'s ids', async () => {
    const { token: tokenA } = await makeUser({ role: 'student' });
    const { token: tokenB } = await makeUser({ role: 'student' });
    const a1 = await createApp(tokenA, { dealerName: 'A1' });
    const b1 = await createApp(tokenB, { dealerName: 'B1' });
    const res = await request(app)
      .post('/api/job-search/applications/reorder')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ orderedIds: [a1.body._id, b1.body._id] });
    expect(res.status).toBe(403);
  });
});

describe('Archive (park as stagnant)', () => {
  test('owner can archive and un-archive; row stays intact', async () => {
    const { token } = await makeUser({ role: 'student' });
    const created = await createApp(token, { dealerName: 'A' });
    const archived = await request(app)
      .put(`/api/job-search/applications/${created.body._id}/archive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ archived: true });
    expect(archived.body.archivedAsStagnant).toBe(true);

    // Row is still listed.
    const list = await request(app)
      .get('/api/job-search/applications')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.length).toBe(1);

    const unarchived = await request(app)
      .put(`/api/job-search/applications/${created.body._id}/archive`)
      .set('Authorization', `Bearer ${token}`)
      .send({ archived: false });
    expect(unarchived.body.archivedAsStagnant).toBe(false);
  });
});

describe('DELETE /api/job-search/applications/:id', () => {
  test('owner can hard-delete; communications cascade', async () => {
    const { token } = await makeUser({ role: 'student' });
    const created = await createApp(token, { dealerName: 'A' });
    await request(app)
      .post(`/api/job-search/applications/${created.body._id}/communications`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'application_submitted' });

    const del = await request(app)
      .delete(`/api/job-search/applications/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const Communication = require('../../models/Communication');
    const remaining = await Communication.countDocuments({ application: created.body._id });
    expect(remaining).toBe(0);
  });
});
