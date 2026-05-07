// Integration tests: Communication log + lastEvent rollup + offer redaction.

const request = require('supertest');
const { startTestDb, stopTestDb, clearDb, buildApp, makeUser } = require('./testApp');

let app;

beforeAll(async () => {
  await startTestDb();
  app = buildApp();
});
afterEach(clearDb);
afterAll(stopTestDb);

async function setup() {
  const { token: studentToken, user: student } = await makeUser({ role: 'student' });
  const created = await request(app)
    .post('/api/job-search/applications')
    .set('Authorization', `Bearer ${studentToken}`)
    .send({ dealerName: 'A' });
  return { studentToken, student, application: created.body };
}

describe('POST /applications/:id/communications', () => {
  test('rejects unknown communication type', async () => {
    const { studentToken, application } = await setup();
    const res = await request(app)
      .post(`/api/job-search/applications/${application._id}/communications`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ type: 'nonsense' });
    expect(res.status).toBe(400);
  });

  test('creates a communication and rolls up application.lastEvent', async () => {
    const { studentToken, application } = await setup();
    const ts = new Date('2026-04-15T10:00:00Z').toISOString();
    const res = await request(app)
      .post(`/api/job-search/applications/${application._id}/communications`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ type: 'phone', occurredAt: ts, summary: 'Spoke with SM' });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('phone');

    const refreshed = await request(app)
      .get(`/api/job-search/applications/${application._id}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(refreshed.body.lastEventType).toBe('phone');
    expect(new Date(refreshed.body.lastEventAt).toISOString()).toBe(ts);
  });

  test('application_submitted flips applicationSubmitted=true', async () => {
    const { studentToken, application } = await setup();
    await request(app)
      .post(`/api/job-search/applications/${application._id}/communications`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ type: 'application_submitted' });
    const refreshed = await request(app)
      .get(`/api/job-search/applications/${application._id}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(refreshed.body.applicationSubmitted).toBe(true);
    expect(refreshed.body.applicationSubmittedAt).toBeTruthy();
  });

  test('offer_received: owner sees offerAmount, other student does not, staff does', async () => {
    const { studentToken, application } = await setup();
    await request(app)
      .post(`/api/job-search/applications/${application._id}/communications`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ type: 'offer_received', offerAmount: 52000, summary: 'verbal' });

    const ownComms = await request(app)
      .get(`/api/job-search/applications/${application._id}/communications`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(ownComms.body[0].offerAmount).toBe(52000);

    const { token: peer } = await makeUser({ role: 'student' });
    const peerComms = await request(app)
      .get(`/api/job-search/applications/${application._id}/communications`)
      .set('Authorization', `Bearer ${peer}`);
    expect(peerComms.body[0].offerAmount).toBeNull();

    const { token: inst } = await makeUser({ role: 'instructor' });
    const instComms = await request(app)
      .get(`/api/job-search/applications/${application._id}/communications`)
      .set('Authorization', `Bearer ${inst}`);
    expect(instComms.body[0].offerAmount).toBe(52000);
  });

  test('non-offer types ignore offerAmount', async () => {
    const { studentToken, application } = await setup();
    const res = await request(app)
      .post(`/api/job-search/applications/${application._id}/communications`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ type: 'phone', offerAmount: 99999 });
    expect(res.body.offerAmount).toBeNull();
  });

  test('peer cannot post communications on someone else\'s app', async () => {
    const { application } = await setup();
    const { token: peer } = await makeUser({ role: 'student' });
    const res = await request(app)
      .post(`/api/job-search/applications/${application._id}/communications`)
      .set('Authorization', `Bearer ${peer}`)
      .send({ type: 'phone' });
    expect(res.status).toBe(403);
  });
});

describe('Edit / delete communications and rollup', () => {
  test('deleting latest re-rolls lastEvent to next-most-recent', async () => {
    const { studentToken, application } = await setup();
    const c1 = await request(app)
      .post(`/api/job-search/applications/${application._id}/communications`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ type: 'application_submitted', occurredAt: '2026-04-01T00:00:00Z' });
    const c2 = await request(app)
      .post(`/api/job-search/applications/${application._id}/communications`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ type: 'phone', occurredAt: '2026-04-15T00:00:00Z' });

    await request(app)
      .delete(`/api/job-search/communications/${c2.body._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    const refreshed = await request(app)
      .get(`/api/job-search/applications/${application._id}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(refreshed.body.lastEventType).toBe('application_submitted');
  });

  test('deleting only communication clears lastEvent', async () => {
    const { studentToken, application } = await setup();
    const c1 = await request(app)
      .post(`/api/job-search/applications/${application._id}/communications`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ type: 'phone' });
    await request(app)
      .delete(`/api/job-search/communications/${c1.body._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    const refreshed = await request(app)
      .get(`/api/job-search/applications/${application._id}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(refreshed.body.lastEventType).toBe('none');
    expect(refreshed.body.lastEventAt).toBeNull();
  });
});
