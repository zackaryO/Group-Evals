// Seed (or refresh) the "Mechanical Aptitude Test" quiz.
//
// This is a template-driven quiz: the student take-quiz UI recognizes
// `template: 'mechanical-aptitude'` and launches a custom staged flow
// (AptitudeTest.jsx) with two timed service-manual study phases, an in-app 3x5
// note card, scenario free-response, a gear-train diagram, and mechanical
// reasoning. The questions themselves live here so the gradebook, single-
// attempt logic, and manual grading all work through the normal Quiz pipeline.
//
// Idempotent: questions are matched/updated by their stable `key`, so re-running
// preserves question _ids (and therefore existing student submissions). New
// questions are added; questions whose key is no longer in this file are
// removed from the quiz.
//
// Usage:  node scripts/seedAptitudeTest.js
//
// The quiz owner is the first admin/instructor found. Set ALLOW_RETAKES=false
// to seed it as a single-attempt test (default leaves retakes ON for setup).

require('dotenv').config();
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const QuizQuestion = require('../models/QuizQuestion');
const User = require('../models/User');

const TEMPLATE = 'mechanical-aptitude';
const TITLE = 'Mechanical Aptitude Test';
const ALLOW_RETAKES = process.env.ALLOW_RETAKES !== 'false';

const MC = 'multiple-choice';
const OPEN = 'open-ended';

// Shared option sets for the rotation questions.
const ROTATION = ['Clockwise', 'Counter-clockwise', 'It will not rotate', 'Cannot determine from the diagram'];
const PULLEY = ['Clockwise', 'Counter-clockwise', 'It alternates direction', 'Cannot determine'];

// The full question set, in flow order. correctAnswer holds the full option
// TEXT for multiple-choice (matching how the rest of the app stores it).
const QUESTIONS = [
  // ── System 1: HydroTronic Guardian (timed manual + notes, then scenarios) ──
  {
    key: 's1q1', section: 'system1', questionType: OPEN,
    questionText:
      'System 1, Scenario 1: You notice the indicator light turns yellow while operating the system. Describe the steps you should take in response to this indication. What does this color signify, and why is it important to move the master control lever to the standby position?',
  },
  {
    key: 's1q2', section: 'system1', questionType: OPEN,
    questionText:
      "System 1, Scenario 2: During operation, the system's pressure gauge suddenly rises to 102 psi, and the temperature indicator reads 130 degrees Fahrenheit. The indicator light turns red. Explain the immediate actions required in this scenario. Why is it critical to adjust the pressure valve in addition to moving the safety lever to the emergency shut-down position?",
  },
  {
    key: 's1q3', section: 'system1', questionType: OPEN,
    questionText:
      'System 1, Scenario 3: The system is operating with the green indicator light on. Suddenly, the pressure drops to 28 psi, but the temperature remains stable at 110 degrees Fahrenheit, and the indicator light turns yellow. What would be the appropriate response to this change in system status, and why is it necessary to adjust the master control lever even though the temperature is within a safe range?',
  },

  // ── System 2: AquaLogic FlowMaster (timed manual, no notes, then scenarios) ──
  {
    key: 's2q1', section: 'system2', questionType: OPEN,
    questionText:
      'System 2, Scenario 1: The Flow Rate Indicator shows an orange light, and the Pressure Balance Dial reads 30 psi. Describe the immediate steps you should take in response to this indicator. Why is it important to adjust the flow rate when it drops below the optimal range?',
  },
  {
    key: 's2q2', section: 'system2', questionType: OPEN,
    questionText:
      'System 2, Scenario 2: The system starts showing a red light on the Purity Level Gauge, indicating critical impurity levels, while the temperature is at a stable 70 degrees Fahrenheit. What actions are required in this scenario, considering the purity level and the normal temperature reading?',
  },
  {
    key: 's2q3', section: 'system2', questionType: OPEN,
    questionText:
      'System 2, Scenario 3: During operation, the Flow Rate Indicator suddenly turns red, showing 550 gpm, and the Pressure Balance Dial indicates a pressure of 50 psi. Explain the necessary steps to safely bring the system back to its optimal operating parameters.',
  },

  // ── System 3: Gear Train Rotation and Direction (multiple choice + diagram) ──
  {
    key: 's3q1', section: 'system3', questionType: MC,
    questionText: 'System 3, Question 1: Gear A is the drive gear and rotates clockwise. Which direction does gear F rotate?',
    options: ROTATION, correctAnswer: 'Counter-clockwise',
  },
  {
    key: 's3q2', section: 'system3', questionType: MC,
    questionText: 'System 3, Question 2: Gear A is the drive gear and rotates clockwise. Which direction does gear L rotate?',
    options: ROTATION, correctAnswer: 'Clockwise',
  },
  {
    key: 's3q3', section: 'system3', questionType: MC,
    questionText: 'System 3, Question 3: In this gear train, gears F and L rotate in which relationship?',
    options: ['Same direction', 'Opposite directions', 'Neither gear rotates', 'Cannot determine'],
    correctAnswer: 'Opposite directions',
  },
  {
    key: 's3q4', section: 'system3', questionType: MC,
    questionText:
      'System 3, Question 4: If gear B is smaller than gear A, what is true about gear B compared with gear A, assuming normal gear mesh and no slipping?',
    options: [
      'It turns slower and produces less torque',
      'It turns faster and produces less torque',
      'It turns at the same speed',
      'It turns faster and produces more torque',
    ],
    correctAnswer: 'It turns faster and produces less torque',
  },

  // ── System 4: Mechanical Reasoning (multiple choice) ──
  {
    key: 's4q5', section: 'system4', questionType: MC,
    questionText:
      'System 4, Question 5: A motor pulley drives a second pulley with an uncrossed belt. The motor pulley rotates counter-clockwise. Which direction does the driven pulley rotate?',
    options: PULLEY, correctAnswer: 'Counter-clockwise',
  },
  {
    key: 's4q6', section: 'system4', questionType: MC,
    questionText:
      'System 4, Question 6: The same two pulleys are now connected with a crossed belt. The motor pulley rotates counter-clockwise. Which direction does the driven pulley rotate?',
    options: PULLEY, correctAnswer: 'Clockwise',
  },
  {
    key: 's4q7', section: 'system4', questionType: MC,
    questionText:
      'System 4, Question 7: Two levers lift the same load. Lever 1 has the handle 24 inches from the pivot and the load 6 inches from the pivot. Lever 2 has the handle 12 inches from the pivot and the load 6 inches from the pivot. Which lever requires less effort at the handle?',
    options: ['Lever 1', 'Lever 2', 'They require the same effort', 'Neither can lift the load'],
    correctAnswer: 'Lever 1',
  },
  {
    key: 's4q8', section: 'system4', questionType: MC,
    questionText:
      'System 4, Question 8: Two hoists lift the same weight. Hoist A uses one fixed pulley. Hoist B uses one movable pulley with two rope sections supporting the load. Ignoring friction, which hoist requires less pull force?',
    options: ['Hoist A', 'Hoist B', 'Both require the same force', 'Neither changes the required force'],
    correctAnswer: 'Hoist B',
  },
  {
    key: 's4q9', section: 'system4', questionType: MC,
    questionText:
      'System 4, Question 9: A hydraulic actuator moves slowly. Pressure is high before the filter and much lower after the filter. Fluid level and temperature are normal. What is the most likely fault?',
    options: ['Restricted filter or line', 'Failed pressure gauge only', 'Low fluid level', 'The actuator is moving too fast'],
    correctAnswer: 'Restricted filter or line',
  },
  {
    key: 's4q10', section: 'system4', questionType: MC,
    questionText:
      'System 4, Question 10: A 12-volt motor is commanded ON but does not run. Battery voltage is 12.6 V. Voltage measured across the motor terminals is only 3.1 V. Voltage drop on the ground side is 0.1 V. What is the most likely problem?',
    options: ['High resistance on the power feed side', 'Open motor ground', 'Battery overcharging', 'Motor spinning too fast'],
    correctAnswer: 'High resistance on the power feed side',
  },
  {
    key: 's4q11', section: 'system4', questionType: MC,
    questionText:
      'System 4, Question 11: A machine becomes noisy after a belt replacement. Vibration increases with shaft speed and the bearing nearest the belt becomes hotter than the others. What should be checked first?',
    options: ['Belt alignment and belt tension', 'Paint color on the housing', 'Fluid purity', 'The direction of the room fan'],
    correctAnswer: 'Belt alignment and belt tension',
  },

  // ── System 5: Diagnostic Aptitude (short answer, free response) ──
  {
    key: 's5q12', section: 'system5', questionType: OPEN,
    questionText:
      'System 5, Question 12: A powered lift will not raise a normal load. The reservoir is full and the pump motor runs. System pressure is 500 psi when trying to lift, but specification is 1,500 psi. When the outlet line is capped for a brief test, pressure quickly reaches 1,500 psi. What does this indicate, and what area should be inspected next?',
  },
  {
    key: 's5q13', section: 'system5', questionType: OPEN,
    questionText:
      'System 5, Question 13: A small 12-volt actuator works when power and ground are applied directly at the actuator. The control switch sends 12 V to the relay coil and the relay clicks, but the relay output terminal stays at 0 V under load. What is the most likely fault?',
  },
  {
    key: 's5q14', section: 'system5', questionType: OPEN,
    questionText:
      'System 5, Question 14: An air-operated clamp is weak and slow. Supply pressure at the compressor is normal. Pressure at the clamp drops sharply only while the clamp is moving. A hiss is heard near one fitting and soapy water bubbles at that fitting. What fault is most likely and what repair should be made before replacing the clamp?',
  },
  {
    key: 's5q15', section: 'system5', questionType: OPEN,
    questionText:
      'System 5, Question 15: A rotating shaft was serviced and reassembled. It now turns freely by hand with no load, but under load it overheats and current draw is higher than normal. Name two likely mechanical causes that should be checked before replacing the motor.',
  },
];

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI in environment. Aborting.');
    process.exit(1);
  }
  await mongoose.connect(uri);

  // The quiz needs an owner (instructor). Use the first admin/instructor found.
  const owner = await User.findOne({ role: { $in: ['admin', 'instructor'] } }).select('_id username role');
  if (!owner) {
    console.error('No admin/instructor user found to own the quiz. Create one first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  // Find or create the quiz by template.
  let quiz = await Quiz.findOne({ template: TEMPLATE }).populate('questions');
  if (!quiz) {
    quiz = new Quiz({ title: TITLE, template: TEMPLATE, instructor: owner._id });
    console.log('Creating new quiz.');
  } else {
    console.log(`Updating existing quiz ${quiz._id}.`);
  }

  // Index existing questions by key so re-runs reuse their _ids.
  const existingByKey = new Map();
  for (const q of quiz.questions || []) {
    if (q && q.key) existingByKey.set(q.key, q);
  }

  const orderedIds = [];
  const keptKeys = new Set();
  for (const def of QUESTIONS) {
    keptKeys.add(def.key);
    const fields = {
      questionText: def.questionText,
      options: def.options || [],
      correctAnswer: def.correctAnswer || '',
      questionType: def.questionType,
      key: def.key,
      section: def.section,
    };
    const existing = existingByKey.get(def.key);
    if (existing) {
      await QuizQuestion.findByIdAndUpdate(existing._id, fields);
      orderedIds.push(existing._id);
    } else {
      const created = await QuizQuestion.create(fields);
      orderedIds.push(created._id);
    }
  }

  // Remove stale questions (keys no longer present) from the quiz and the DB.
  const staleIds = [];
  for (const [key, q] of existingByKey.entries()) {
    if (!keptKeys.has(key)) staleIds.push(q._id);
  }
  if (staleIds.length) {
    await QuizQuestion.deleteMany({ _id: { $in: staleIds } });
    console.log(`Removed ${staleIds.length} stale question(s).`);
  }

  quiz.title = TITLE;
  quiz.template = TEMPLATE;
  quiz.questions = orderedIds;
  quiz.isPublished = true;
  quiz.allowMultipleSubmissions = ALLOW_RETAKES;
  if (!quiz.instructor) quiz.instructor = owner._id;
  await quiz.save();

  console.log(`Seeded "${TITLE}" (${quiz._id}) with ${orderedIds.length} questions.`);
  console.log(`  owner: ${owner.username} (${owner.role})`);
  console.log(`  published: ${quiz.isPublished}, retakes allowed: ${quiz.allowMultipleSubmissions}`);
  console.log('  Toggle retakes off in Manage Quizzes (or ALLOW_RETAKES=false) for a single-attempt test.');

  await mongoose.disconnect();
  process.exit(0);
})().catch(async (err) => {
  console.error('Seed error:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
