import React from 'react';

/* Course list from the official "MB Drive JC Transcript.pdf" addendum.
   Edit here when the program updates equivalencies.
   Section headers correspond 1:1 with the original PDF layout. */

const INSTRUCTOR_LED = [
  'Introduction to Mercedes-Benz',
  'Information Systems T0001F-US.TP3',
  'Workshop Processes',
  'Career Development',
  'Electrical Systems Fundamentals X0006F-US.TT4',
  'Intermediate Electrical X0014F-US.TT2',
  'Diagnostic Strategy 1 T0004F-US.TT4',
  'Suspension Systems T0258F-US.TT2',
  'Alignment Certification X0025F-US.TT2',
  'Brakes & Control Systems T0344F-US.TT2',
  'Gasoline Engine Mechanical T1005F-US.TT2',
  'Engine Management X0010F-US.TT4',
  'Automatic Transmission X0011F-US.TT4',
  'Climate Control Fundamentals X0024F-US.TT2',
  'High Voltage Qualification for PLUG-IN HYBRID Series-Gen 3 X0015F-US.TT4',
];

const E_LEARNING_PAGE_1 = [
  {
    title: '1. Introduction to Mercedes-Benz',
    courses: [
      'X0039E-US.SSB The Best or Nothing: The Mercedes-Benz Story',
      'X0040E-US-SSB Driven to Delight: A Culture of Excellence',
      'T0724E-US.TTC Fundamentals of Automotive Engineering, Part 1A',
      'T1140E-US.TTC Fundamentals of Automotive Engineering, Part 1B',
      'T0725E-US.TTC Fundamentals of Automotive Engineering, Part 2A',
      'T1141E-US.TTD Fundamentals of Automotive Engineering, Part 2B',
      'T0628E-US.TTC Fundamentals of Electrical Systems, Part 1',
      'T0637E-US.TTC Fundamentals of Motor Vehicle Electricity Part 1',
      'Fundamentals of Motor Vehicle Electricity Part 2',
    ],
  },
  {
    title: '2. Information Systems T0001F-US.TP3',
    courses: [
      'X0010E-US.TTB Introduction to WIS for Technicians',
      'X0002E-US.TPB Xentry Diagnostics',
      'X0003E-US.TPC Information Systems',
    ],
  },
  {
    title: '3. Workshop Processes',
    courses: [
      'X0014E-US.TTA General Shop Practices',
      'X0027E-US.PPB Introduction to Mercedes-Benz Warranty',
      'X0003E-US.TTB Maintenance',
      'X0001E-US.PDC Service Matters: Effective RO Writing',
    ],
  },
  {
    title: '4. Career Development',
    courses: [
      'T0103E-US.TTD High-Voltage Awareness',
      'X0007E-US.TTA Single-use Fasteners',
      'X0055E-US.SSB Survey Integrity',
      'T0589-US.TTC Passenger Car Seats: Basic Principles',
    ],
  },
  {
    title: '5. Electrical Systems Fundamentals X0006F-US.TT4',
    courses: [
      'X0001E-US.TTE Electrical Fundamentals',
      'X0004E-US.TTB Chassis Electrics',
    ],
  },
  {
    title: '6. Intermediate Electrical X0014F-US.TT2',
    courses: [
      'T1217E-US.TTC Networking Part I',
      'T1218E-US.TTC Networking Part II',
      'T0628E-US.TTC Fundamentals of Electrical Systems, Part 1',
      'T0629E-US.TTC Fundamentals of Electrical Systems, Part 2',
    ],
  },
];

const E_LEARNING_PAGE_2 = [
  {
    title: '7. Diagnostic Strategy 1 T0004F-US.TT4',
    courses: [
      'T0582E-US.TTB Hybrid Drives, Part 1, The Parallel Hybrid',
      'T0584E-US.TTB Hybrid Drives, Part 2: Power-Split Hybrid',
      'X0011E-US.TTB Introduction to Diagnostic Strategy',
      'T1219E-US.TTC SRS: Basic Principles',
      'TECH854 Noise Diagnosis',
    ],
  },
  {
    title: '8. Suspension Systems T0258F-US.TT2',
    courses: [
      'T0592E-US.TTB Suspension and Damping Systems Part 2',
      'T1210E-US.TTB Suspension and Damping Systems Part 3',
      'T1570E-US.TTC Suspension and Damping Systems Part 5',
      'X0002E-US.MTA Installation of MOE tires',
      'X0015E-US.TTA Pre-Delivery Inspection (PDI) Overview',
    ],
  },
  {
    title: '9. Alignment Certification X0025F-US.TT2',
    courses: [
      'X0006E-US.SPB Certified Pre-owned: Profit Center and Brand Builder',
      'T0581E-US.TTB Principles of Steering: Optimized and Electric',
      'X0001E-US.TTD Fundamentals of Wheel Alignment',
      'X0012E-US.TTB Assist Systems',
    ],
  },
  {
    title: '10. Brakes & Control Systems T0344F-US.TT2',
    courses: [
      'T0937E-US.TTC All-wheel Drive Technology',
      'X0016E-US.TTA Tire Mounting and Wheel Balancing',
      'T0569E-US.TTC Adaptive Brake, Part 1',
      'T0571E-US.TTC Adaptive Brake, Part 2',
    ],
  },
  {
    title: '11. Gasoline Engine Mechanical T1005F-US.TT2',
    courses: [
      'X0070E-US.PPA Express Service for Technicians',
      'T0841E-US.TTC The M276 and M278 Gasoline Engines',
      'T0873E-US.TTC M270 & M274 - 4 Cylinder Gasoline Engines',
    ],
  },
  {
    title: '12. Engine Management X0010F-US.TT4',
    courses: [
      'X0005E-US.TTC Engine Management Basics - Gasoline',
      'X0008E-US.TTB Engine Management Basics - Diesel',
      'T1622E-US.TTB Gasoline Engine M176 & M177 V8 Engines',
      'T1682E-US.TTB Mercedes-Benz M264 & M256 Gasoline Engines',
      'T0931E-US.TTC Mercedes-Benz Intelligent Drive: Part 1',
      'T1214E-US.TTB Mercedes-Benz Intelligent Drive: Part 2',
    ],
  },
  {
    title: '13. Automatic Transmission X0011F-US.TT4',
    courses: [
      'X0013E-US.TTB 4MATIC Fundamentals',
      'T0888E-US.TTB 9-speed Automatic Transmission',
      'T0100E-US.TTC Automatic Transmission 7G-DCT (724.0)',
      'TECH841 Dual Clutch Transmission in the SLS AMG',
      'TECH840 Dual Clutch Transmission: Design & Operation',
    ],
  },
  {
    title: '14. Climate Control Fundamentals X0024F-US.TT2',
    courses: ['X0007E-US.TTB A/C Systems'],
  },
  {
    title: '15. High Voltage Qualification for PLUG-IN HYBRID Series-Gen 3 X0015F-US.TT4',
    courses: [],
  },
];

/* ---- Helpers ---- */

// Split items into two columns the way CSS `columns: 2` does (top→bottom, fill col1 first).
const splitColumnFirst = (items) => {
  const half = Math.ceil(items.length / 2);
  return [items.slice(0, half), items.slice(half)];
};

const TwoColCells = ({ items }) => {
  const [left, right] = splitColumnFirst(items);
  return (
    <div className="transcript-two-col">
      <div className="transcript-col">
        {left.map((t, i) => (
          <div className="transcript-cell" key={`l-${i}`}>{t}</div>
        ))}
      </div>
      <div className="transcript-col">
        {right.map((t, i) => (
          <div className="transcript-cell" key={`r-${i}`}>{t}</div>
        ))}
      </div>
    </div>
  );
};

const ELearningSection = ({ section }) => (
  <>
    <div className="transcript-subheader">{section.title}</div>
    {section.courses.length > 0 && <TwoColCells items={section.courses} />}
  </>
);

const TranscriptPage = ({ children, pageLabel }) => (
  <div className="transcript-page" data-page={pageLabel}>
    <div className="transcript-logo-row">
      <img
        src={`${process.env.PUBLIC_URL}/mbdrivejcLogo.png`}
        alt="MB Drive JC"
        className="transcript-logo"
      />
    </div>
    {children}
  </div>
);

/* ---- Component ---- */

const TranscriptAddendum = () => {
  // Numbered courses for the instructor-led table, formatted exactly like the original.
  const numbered = INSTRUCTOR_LED.map((name, i) => `${i + 1}. ${name}`);

  return (
    <>
      <TranscriptPage pageLabel="instructor-led">
        <div className="transcript-table">
          <div className="transcript-header">
            MB-Drive JC Instructor-Led Courses Equivalencies Completed
          </div>
          <TwoColCells items={numbered} />
        </div>

        <div className="transcript-table">
          <div className="transcript-header">
            MB-Drive JC e-Learning Courses Completed
          </div>
          {E_LEARNING_PAGE_1.map((section, i) => (
            <ELearningSection key={i} section={section} />
          ))}
        </div>
      </TranscriptPage>

      <TranscriptPage pageLabel="elearning-cont">
        <div className="transcript-table">
          <div className="transcript-header">
            MB-Drive JC e-Learning Courses Completed Cont&apos;d
          </div>
          {E_LEARNING_PAGE_2.map((section, i) => (
            <ELearningSection key={i} section={section} />
          ))}
        </div>
      </TranscriptPage>
    </>
  );
};

export default TranscriptAddendum;
