/**
 * Re-capture only the student-perspective screenshots.
 *
 * Assumes the API + static client are still running from the previous orchestrator,
 * OR boots a fresh in-process Mongo + servers if not.
 *
 * The previous run's student shots ended up showing the login page because the
 * login form uses SPA navigation (navigate('/')) so puppeteer's waitForNavigation
 * never resolved. Here we wait on a localStorage signal and then hard-reload.
 */

const path = require('path');
const fs = require('fs');
const http = require('http');

const SERVER_DIR = path.join(__dirname, '..', 'server');
const CLIENT_BUILD_DIR = path.join(__dirname, '..', 'client', 'build');

process.env.AWS_STORAGE_BUCKET_NAME = 'demo-bucket';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'AKIAFAKEFAKEFAKEFAKE';
process.env.AWS_SECRET_ACCESS_KEY = 'fakefakefakefakefakefakefakefakefakefake';
process.env.JWT_SECRET = 'demo-jwt-secret-portfolio-capture';
process.env.PORT = '5000';

const { MongoMemoryServer } = require(path.join(SERVER_DIR, 'node_modules', 'mongodb-memory-server'));
const puppeteer = require(path.join(SERVER_DIR, 'node_modules', 'puppeteer-core'));
const mongoose = require(path.join(SERVER_DIR, 'node_modules', 'mongoose'));
const express = require(path.join(SERVER_DIR, 'node_modules', 'express'));
const bcrypt = require(path.join(SERVER_DIR, 'node_modules', 'bcrypt'));

const RAW_DIR = 'C:\\Users\\zotte\\OneDrive\\Documents\\GitHub\\Git-Portfolio\\assets\\images\\screenshots\\_raw_group-evals';
fs.mkdirSync(RAW_DIR, { recursive: true });

const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startMongo() {
  const mongo = await MongoMemoryServer.create({ instance: { dbName: 'group-evals-portfolio' } });
  process.env.MONGODB_URI = mongo.getUri();
  return mongo;
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require(path.join(SERVER_DIR, 'models', 'User'));
  const Cohort = require(path.join(SERVER_DIR, 'models', 'Cohort'));
  const Course = require(path.join(SERVER_DIR, 'models', 'Course'));
  const Quiz = require(path.join(SERVER_DIR, 'models', 'Quiz'));
  const QuizQuestion = require(path.join(SERVER_DIR, 'models', 'QuizQuestion'));
  const QuizSubmission = require(path.join(SERVER_DIR, 'models', 'QuizSubmission'));
  const EvaluationArea = require(path.join(SERVER_DIR, 'models', 'EvaluationArea'));

  const cohort = await Cohort.create({ name: 'Spring 2026 Cohort', gradDate: new Date('2026-01-15'), isActive: true });
  const hash = (pw) => bcrypt.hash(pw, 10);
  const instructor = await User.create({
    username: 'instructor', password: await hash('demo'), role: 'instructor',
    firstName: 'Zack', lastName: 'Otterstrom', subject: 'Automotive Diagnostics',
  });
  const studentSeeds = [
    { username: 'amaya.r',  firstName: 'Amaya',   lastName: 'Reyes',     team: 'Alpha' },
    { username: 'devon.k',  firstName: 'Devon',   lastName: 'Kowalski',  team: 'Alpha' },
    { username: 'priya.s',  firstName: 'Priya',   lastName: 'Singh',     team: 'Bravo' },
    { username: 'marcus.t', firstName: 'Marcus',  lastName: 'Tanaka',    team: 'Bravo' },
    { username: 'lena.b',   firstName: 'Lena',    lastName: 'Bauer',     team: 'Charlie' },
    { username: 'noah.f',   firstName: 'Noah',    lastName: 'Fischer',   team: 'Charlie' },
  ];
  const students = [];
  for (const s of studentSeeds) {
    students.push(await User.create({
      username: s.username, password: await hash('demo'), role: 'student',
      firstName: s.firstName, lastName: s.lastName, teamName: s.team, cohort: cohort._id,
    }));
  }
  await Cohort.updateOne({ _id: cohort._id }, { $set: { students: students.map((u) => u._id) } });

  const course = await Course.create({
    title: 'Engine Performance & Diagnostics',
    description: 'Foundations of OBD-II diagnostics, sensor analysis, and ignition systems.',
    cohort: cohort._id,
    weightingFactors: { quiz: 0.4, assignment: 0.4, evaluation: 0.2 },
  });
  await EvaluationArea.create({
    area1: 'Technical accuracy', area2: 'Teamwork & communication',
    area3: 'Tool & safety discipline', area4: 'Problem-solving approach',
  });

  const q1 = await QuizQuestion.create({
    questionText: 'Which sensor reports engine load to the ECU based on intake airflow?',
    options: ['MAF Sensor', 'Knock Sensor', 'Crankshaft Position Sensor', 'O2 Sensor'],
    correctAnswer: 'MAF Sensor', questionType: 'multiple-choice',
  });
  const q2 = await QuizQuestion.create({
    questionText: 'A P0420 code most directly indicates an issue with which subsystem?',
    options: ['Catalyst efficiency', 'Fuel injector pulse width', 'Ignition coil', 'EVAP purge valve'],
    correctAnswer: 'Catalyst efficiency', questionType: 'multiple-choice',
  });
  const q3 = await QuizQuestion.create({
    questionText: 'Briefly describe how you would isolate a misfire to a single cylinder.',
    options: [], correctAnswer: '', questionType: 'open-ended',
  });
  const quiz = await Quiz.create({
    title: 'OBD-II Fundamentals Quiz 1',
    questions: [q1._id, q2._id, q3._id], instructor: instructor._id,
    isPublished: true, cohort: cohort._id, course: course._id,
    dueDate: new Date('2026-05-15'), allowLateSubmissions: true, latePenalty: 5,
  });

  // Submission for amaya only — so /quiz-gradebook for amaya shows her own grade.
  await QuizSubmission.create({
    quiz: quiz._id, student: students[0]._id,
    answers: [
      { question: q1._id, answer: 'MAF Sensor' },
      { question: q2._id, answer: 'Catalyst efficiency' },
      { question: q3._id, answer: 'Pull plug wires one at a time and watch for RPM drop.' },
    ],
    score: 95, submittedAt: new Date(),
  }).catch(() => null);

  await mongoose.disconnect();
}

async function startBackend() {
  await mongoose.connect(process.env.MONGODB_URI);
  const app = express();
  const cors = require(path.join(SERVER_DIR, 'node_modules', 'cors'));
  app.use(cors({ origin: true }));
  app.use(express.json());
  const r = (p) => require(path.join(SERVER_DIR, 'routes', p));
  app.use('/api/auth', r('auth'));
  app.use('/api/evaluations', r('evaluations'));
  app.use('/api/users', r('users'));
  app.use('/api/areas', r('areas'));
  app.use('/api/quizzes', r('quizzes'));
  app.use('/api/grades', r('grades'));
  app.use('/api/cohorts', r('cohorts'));
  app.use('/api/courses', r('courses'));
  app.use('/api/assignments', r('assignments'));
  await new Promise((resolve) => app.listen(5000, resolve));
}

function startStaticClient() {
  const root = CLIENT_BUILD_DIR;
  const mime = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.map': 'application/json',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain',
  };
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/' || !path.extname(urlPath)) urlPath = '/index.html';
    const filePath = path.join(root, urlPath);
    if (!filePath.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        fs.readFile(path.join(root, 'index.html'), (e2, idx) => {
          if (e2) { res.writeHead(404); return res.end('not found'); }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(idx);
        });
        return;
      }
      res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(3000, () => resolve(server)));
}

async function shoot(page, slug, opts = {}) {
  await sleep(opts.wait || 800);
  await page.screenshot({ path: path.join(RAW_DIR, `${slug}.png`), fullPage: !!opts.fullPage });
  console.log('[shot]', slug);
}

async function loginAndReload(page, username, password) {
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input', { timeout: 10000 });
  const inputs = await page.$$('input');
  await inputs[0].click({ clickCount: 3 }); await inputs[0].type(username);
  await inputs[1].click({ clickCount: 3 }); await inputs[1].type(password);
  await page.click('button[type="submit"]');
  // Wait for the token to appear in localStorage, then hard-reload to /home.
  await page.waitForFunction(() => !!localStorage.getItem('token'), { timeout: 10000 });
}

async function captureStudent() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    defaultViewport: VIEWPORT,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();

  await loginAndReload(page, 'amaya.r', 'demo');

  // Hard reload at /home so React state is rebuilt from localStorage.
  await page.goto('http://localhost:3000/home', { waitUntil: 'networkidle2' });
  await sleep(1200);
  await shoot(page, '16-student-home', { fullPage: true });

  await page.goto('http://localhost:3000/take-quiz', { waitUntil: 'networkidle2' });
  await sleep(1200);
  await shoot(page, '17-take-quiz', { fullPage: true });

  await page.goto('http://localhost:3000/quiz-gradebook', { waitUntil: 'networkidle2' });
  await sleep(1200);
  await shoot(page, '18-student-quiz-gradebook', { fullPage: true });

  await browser.close();
}

(async () => {
  let mongo;
  try {
    mongo = await startMongo();
    await seed();
    await startBackend();
    await startStaticClient();
    await captureStudent();
    console.log('[done]');
  } catch (err) {
    console.error('[fatal]', err && err.stack || err);
  } finally {
    try { if (mongo) await mongo.stop(); } catch {}
    process.exit(0);
  }
})();
