/**
 * Portfolio capture orchestrator.
 *
 * - Boots an in-process MongoDB via mongodb-memory-server.
 * - Seeds an instructor + a couple of students plus a small amount of demo data.
 * - Starts the existing Express API on http://localhost:5000.
 * - Statically serves the existing React build on http://localhost:3000.
 * - Drives a headless Chrome via puppeteer-core to log in and screenshot
 *   several routes for use in a portfolio.
 *
 * This is a one-off dev script; it does not modify any production code paths.
 */

const path = require('path');
const fs = require('fs');
const http = require('http');

const SERVER_DIR = path.join(__dirname, '..', 'server');
const CLIENT_BUILD_DIR = path.join(__dirname, '..', 'client', 'build');

// Pretend AWS is configured so any S3 helpers don't hard-crash on import.
// Image upload features won't be exercised in screenshots.
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

const SCREENSHOTS_OUT = 'C:\\Users\\zotte\\OneDrive\\Documents\\GitHub\\Git-Portfolio\\assets\\images\\screenshots';
const RAW_DIR = path.join(SCREENSHOTS_OUT, '_raw_group-evals');
fs.mkdirSync(RAW_DIR, { recursive: true });

const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startMongo() {
  const mongo = await MongoMemoryServer.create({ instance: { dbName: 'group-evals-portfolio' } });
  process.env.MONGODB_URI = mongo.getUri();
  console.log('[mongo] up at', process.env.MONGODB_URI);
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
  const Tool = require(path.join(SERVER_DIR, 'models', 'Tool'));
  const Consumable = require(path.join(SERVER_DIR, 'models', 'Consumable'));
  const SparePart = require(path.join(SERVER_DIR, 'models', 'SparePart'));
  const FacilityNeed = require(path.join(SERVER_DIR, 'models', 'FacilityNeed'));
  const TrainingVehicle = require(path.join(SERVER_DIR, 'models', 'TrainingVehicle'));
  const LoanerToolbox = require(path.join(SERVER_DIR, 'models', 'LoanerToolbox'));

  const cohort = await Cohort.create({
    name: 'Spring 2026 Cohort',
    gradDate: new Date('2026-01-15'),
    isActive: true,
  });

  const hash = (pw) => bcrypt.hash(pw, 10);

  const instructor = await User.create({
    username: 'instructor',
    password: await hash('demo'),
    role: 'instructor',
    firstName: 'Zack',
    lastName: 'Otterstrom',
    subject: 'Automotive Diagnostics',
  });

  const students = [];
  const studentSeeds = [
    { username: 'amaya.r',  firstName: 'Amaya',   lastName: 'Reyes',     team: 'Alpha' },
    { username: 'devon.k',  firstName: 'Devon',   lastName: 'Kowalski',  team: 'Alpha' },
    { username: 'priya.s',  firstName: 'Priya',   lastName: 'Singh',     team: 'Bravo' },
    { username: 'marcus.t', firstName: 'Marcus',  lastName: 'Tanaka',    team: 'Bravo' },
    { username: 'lena.b',   firstName: 'Lena',    lastName: 'Bauer',     team: 'Charlie' },
    { username: 'noah.f',   firstName: 'Noah',    lastName: 'Fischer',   team: 'Charlie' },
  ];
  for (const s of studentSeeds) {
    const u = await User.create({
      username: s.username,
      password: await hash('demo'),
      role: 'student',
      firstName: s.firstName,
      lastName: s.lastName,
      teamName: s.team,
      cohort: cohort._id,
    });
    students.push(u);
  }
  await Cohort.updateOne({ _id: cohort._id }, { $set: { students: students.map((u) => u._id) } });

  const course = await Course.create({
    title: 'Engine Performance & Diagnostics',
    description: 'Foundations of OBD-II diagnostics, sensor analysis, and ignition systems.',
    cohort: cohort._id,
    weightingFactors: { quiz: 0.4, assignment: 0.4, evaluation: 0.2 },
  });

  await EvaluationArea.create({
    area1: 'Technical accuracy',
    area2: 'Teamwork & communication',
    area3: 'Tool & safety discipline',
    area4: 'Problem-solving approach',
  });

  // Quiz with a couple of questions
  const q1 = await QuizQuestion.create({
    questionText: 'Which sensor reports engine load to the ECU based on intake airflow?',
    options: ['MAF Sensor', 'Knock Sensor', 'Crankshaft Position Sensor', 'O2 Sensor'],
    correctAnswer: 'MAF Sensor',
    questionType: 'multiple-choice',
  });
  const q2 = await QuizQuestion.create({
    questionText: 'A P0420 code most directly indicates an issue with which subsystem?',
    options: ['Catalyst efficiency', 'Fuel injector pulse width', 'Ignition coil', 'EVAP purge valve'],
    correctAnswer: 'Catalyst efficiency',
    questionType: 'multiple-choice',
  });
  const q3 = await QuizQuestion.create({
    questionText: 'Briefly describe how you would isolate a misfire to a single cylinder.',
    options: [],
    correctAnswer: '',
    questionType: 'open-ended',
  });
  const quiz = await Quiz.create({
    title: 'OBD-II Fundamentals Quiz 1',
    questions: [q1._id, q2._id, q3._id],
    instructor: instructor._id,
    isPublished: true,
    cohort: cohort._id,
    course: course._id,
    dueDate: new Date('2026-05-15'),
    allowLateSubmissions: true,
    latePenalty: 5,
  });

  // A few quiz submissions for the gradebook
  const subs = [
    { student: students[0], answers: ['MAF Sensor', 'Catalyst efficiency', 'Pull plug wires one at a time and watch for RPM drop.'], score: 95 },
    { student: students[1], answers: ['MAF Sensor', 'Fuel injector pulse width', 'Use a scan tool to view live misfire counters by cylinder.'], score: 78 },
    { student: students[2], answers: ['MAF Sensor', 'Catalyst efficiency', 'Compression test followed by injector balance test.'], score: 88 },
    { student: students[3], answers: ['Knock Sensor', 'Catalyst efficiency', 'Swap coils and observe whether the misfire follows the coil.'], score: 72 },
    { student: students[4], answers: ['MAF Sensor', 'Catalyst efficiency', 'Mode 06 data plus a relative compression test.'], score: 91 },
  ];
  for (const s of subs) {
    await QuizSubmission.create({
      quiz: quiz._id,
      student: s.student._id,
      answers: s.answers.map((a, i) => ({ question: [q1._id, q2._id, q3._id][i], answer: a })),
      score: s.score,
      submittedAt: new Date(Date.now() - Math.floor(Math.random() * 7) * 86400000),
    }).catch(() => null); // schema might differ, ignore if it does
  }

  await Tool.create([
    { name: '3/8" Drive Ratchet', partnum: 'GW-81210', quantityOnHand: 12, expectedQuantity: 12, location: { room: 'Bay 2', shelf: 'A1' }, repairStatus: 'Good', purchasePriority: 'None' },
    { name: 'Digital Multimeter (Fluke 88V)', partnum: 'FL-88V', quantityOnHand: 4, expectedQuantity: 6, location: { room: 'Bay 2', shelf: 'B3' }, repairStatus: 'Good', purchasePriority: 'High' },
    { name: 'Compression Tester Kit', partnum: 'OTC-5605', quantityOnHand: 2, expectedQuantity: 3, location: { room: 'Bay 1', shelf: 'C2' }, repairStatus: 'Needs Repair', purchasePriority: 'Medium' },
    { name: 'Torque Wrench 1/2" 30-250 ft-lb', partnum: 'CDI-2503MFRPH', quantityOnHand: 5, expectedQuantity: 5, location: { room: 'Bay 1', shelf: 'A4' }, repairStatus: 'Good', purchasePriority: 'None' },
    { name: 'Smoke Machine (EVAP)', partnum: 'RTI-EV1', quantityOnHand: 1, expectedQuantity: 2, location: { room: 'Bay 3', shelf: 'D1' }, repairStatus: 'Under Repair', purchasePriority: 'High' },
  ]);

  await Consumable.create([
    { name: 'Brake Cleaner (14 oz)', quantityOnHand: 18, desiredQuantity: 24, location: { room: 'Storage', shelf: 'S2' } },
    { name: 'Nitrile Gloves (Box 100)', quantityOnHand: 6, desiredQuantity: 12, location: { room: 'Storage', shelf: 'S1' } },
    { name: 'Shop Towels (Roll)', quantityOnHand: 9, desiredQuantity: 20, location: { room: 'Storage', shelf: 'S3' } },
    { name: 'Dielectric Grease', quantityOnHand: 4, desiredQuantity: 6, location: { room: 'Storage', shelf: 'S4' } },
  ]);

  await SparePart.create([
    { partName: 'Bosch Oxygen Sensor (Universal)', partNumber: '15717', quantityOnHand: 3, repairStatus: 'Good', purchasePriority: 'Medium', location: { room: 'Parts', shelf: 'P2' } },
    { partName: 'Spark Plug NGK Iridium', partNumber: 'IZFR6K-11', quantityOnHand: 24, repairStatus: 'Good', purchasePriority: 'None', location: { room: 'Parts', shelf: 'P1' } },
    { partName: 'MAF Sensor (Bosch)', partNumber: '0280218060', quantityOnHand: 1, repairStatus: 'Good', purchasePriority: 'High', location: { room: 'Parts', shelf: 'P3' } },
  ]);

  await FacilityNeed.create([
    { description: 'Bay 3 lift hydraulic line slow leak', priority: 'High', status: 'In Progress' },
    { description: 'Replace overhead lighting in classroom', priority: 'Medium', status: 'Pending' },
    { description: 'Repaint shop floor safety lines', priority: 'Low', status: 'Pending' },
  ]);

  await TrainingVehicle.create([
    { year: 2014, make: 'Toyota', model: 'Camry', vin: '4T1BF1FK7EU000111', mileage: 142000, engineCode: '2AR-FE', transmissionCode: 'U760E', repairsNeeded: 'Misfire cyl 3', partsNeeded: 'Coil pack, plugs' },
    { year: 2016, make: 'Ford',   model: 'F-150', vin: '1FTEW1EP7GFA00222', mileage: 98000,  engineCode: '2.7L EcoBoost', transmissionCode: '6R80', repairsNeeded: 'EVAP small leak', partsNeeded: 'Purge valve' },
    { year: 2012, make: 'Honda',  model: 'Civic', vin: '2HGFB2F50CH000333', mileage: 178000, engineCode: 'R18Z1', transmissionCode: '5AT', repairsNeeded: 'Rough idle, lean code', partsNeeded: 'MAF sensor' },
  ]);

  const toolbox = await LoanerToolbox.create({ toolboxName: 'Loaner Box A' });
  console.log('[seed] complete. instructor/demo, students/demo. cohort:', cohort.name);

  await mongoose.disconnect();
  return { instructor, students, course, cohort, quiz };
}

async function startBackend() {
  // Defer requiring server.js until env is fully prepared.
  // We re-implement the minimal mounting here so we don't process.exit on connect issues.
  await mongoose.connect(process.env.MONGODB_URI);

  const app = express();
  app.use((req, _res, next) => { next(); });
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
  app.use('/api/tools', r('toolRoutes'));
  app.use('/api/loaner-toolboxes', r('loanerToolboxRoutes'));
  app.use('/api/spare-parts', r('sparePartRoutes'));
  app.use('/api/instructor-tools', r('instructorToolRoutes'));
  app.use('/api/consumables', r('consumableRoutes'));
  app.use('/api/facility-needs', r('facilityNeedRoutes'));
  app.use('/api/training-vehicles', r('trainingVehicleRoutes'));
  app.use('/api/reports', r('reportRoutes'));

  await new Promise((resolve) => app.listen(5000, () => { console.log('[api] http://localhost:5000'); resolve(); }));
  return app;
}

function startStaticClient() {
  // Minimal static server for the React build.
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
        // SPA fallback
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
  return new Promise((resolve) => server.listen(3000, () => { console.log('[web] http://localhost:3000'); resolve(server); }));
}

async function shoot(page, slug, opts = {}) {
  await sleep(opts.wait || 700);
  const file = path.join(RAW_DIR, `${slug}.png`);
  await page.screenshot({ path: file, fullPage: !!opts.fullPage });
  console.log('[shot]', slug, '->', file);
}

async function login(page, username, password) {
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input', { timeout: 10000 });
  // The login form has username + password inputs; type into the first two text/password inputs.
  const inputs = await page.$$('input');
  await inputs[0].click({ clickCount: 3 }); await inputs[0].type(username);
  await inputs[1].click({ clickCount: 3 }); await inputs[1].type(password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null),
    page.click('button[type="submit"], button'),
  ]);
  await sleep(800);
}

async function logout(page) {
  await page.evaluate(() => localStorage.clear());
}

async function captureAll() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    defaultViewport: VIEWPORT,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();

  // 1) Login page (blank, before submit)
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await sleep(600);
  await shoot(page, '01-login');

  // 2) Instructor home (full-feature)
  await login(page, 'instructor', 'demo');
  await page.goto('http://localhost:3000/home', { waitUntil: 'networkidle2' });
  await shoot(page, '02-instructor-home', { fullPage: true });

  // 3) Manage users
  await page.goto('http://localhost:3000/manage-users', { waitUntil: 'networkidle2' });
  await shoot(page, '03-manage-users', { fullPage: true });

  // 4) Manage cohorts
  await page.goto('http://localhost:3000/manage-cohorts', { waitUntil: 'networkidle2' });
  await shoot(page, '04-manage-cohorts', { fullPage: true });

  // 5) Manage courses
  await page.goto('http://localhost:3000/manage-courses', { waitUntil: 'networkidle2' });
  await shoot(page, '05-manage-courses', { fullPage: true });

  // 6) Manage quizzes
  await page.goto('http://localhost:3000/manage-quizzes', { waitUntil: 'networkidle2' });
  await shoot(page, '06-manage-quizzes', { fullPage: true });

  // 7) Quiz Gradebook
  await page.goto('http://localhost:3000/quiz-gradebook', { waitUntil: 'networkidle2' });
  await shoot(page, '07-quiz-gradebook', { fullPage: true });

  // 8) Define areas (Evaluation rubric)
  await page.goto('http://localhost:3000/define-areas', { waitUntil: 'networkidle2' });
  await shoot(page, '08-define-areas', { fullPage: true });

  // 9) Tools inventory
  await page.goto('http://localhost:3000/tools', { waitUntil: 'networkidle2' });
  await shoot(page, '09-tools', { fullPage: true });

  // 10) Consumables
  await page.goto('http://localhost:3000/consumables', { waitUntil: 'networkidle2' });
  await shoot(page, '10-consumables', { fullPage: true });

  // 11) Spare parts
  await page.goto('http://localhost:3000/spare-parts', { waitUntil: 'networkidle2' });
  await shoot(page, '11-spare-parts', { fullPage: true });

  // 12) Training vehicles
  await page.goto('http://localhost:3000/training-vehicles', { waitUntil: 'networkidle2' });
  await shoot(page, '12-training-vehicles', { fullPage: true });

  // 13) Facility needs
  await page.goto('http://localhost:3000/facility-needs', { waitUntil: 'networkidle2' });
  await shoot(page, '13-facility-needs', { fullPage: true });

  // 14) Inventory reports
  await page.goto('http://localhost:3000/inventory-reports', { waitUntil: 'networkidle2' });
  await shoot(page, '14-inventory-reports', { fullPage: true });

  // 15) Resume builder
  await page.goto('http://localhost:3000/resume-builder', { waitUntil: 'networkidle2' });
  await shoot(page, '15-resume-builder', { fullPage: true });

  // 16) Student perspective
  await logout(page);
  await login(page, 'amaya.r', 'demo');
  await page.goto('http://localhost:3000/home', { waitUntil: 'networkidle2' });
  await shoot(page, '16-student-home', { fullPage: true });

  // 17) Take quiz
  await page.goto('http://localhost:3000/take-quiz', { waitUntil: 'networkidle2' });
  await shoot(page, '17-take-quiz', { fullPage: true });

  // 18) Student quiz gradebook
  await page.goto('http://localhost:3000/quiz-gradebook', { waitUntil: 'networkidle2' });
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
    await captureAll();
    console.log('[done] screenshots in', RAW_DIR);
  } catch (err) {
    console.error('[fatal]', err && err.stack || err);
  } finally {
    try { if (mongo) await mongo.stop(); } catch {}
    process.exit(0);
  }
})();
