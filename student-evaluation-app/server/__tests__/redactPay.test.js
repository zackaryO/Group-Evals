// __tests__/redactPay.test.js
const {
  isStaff,
  canSeePayFor,
  redactApplication,
  redactCommunication,
  redactBoardEntry,
} = require('../utils/redactPay');

const STUDENT_A = { id: 'student-a', role: 'student' };
const STUDENT_B = { id: 'student-b', role: 'student' };
const INSTRUCTOR = { id: 'inst-1', role: 'instructor' };
const ADMIN = { id: 'admin-1', role: 'admin' };

describe('isStaff / canSeePayFor', () => {
  test('isStaff is true for instructor and admin', () => {
    expect(isStaff(INSTRUCTOR)).toBe(true);
    expect(isStaff(ADMIN)).toBe(true);
  });
  test('isStaff is false for student or null', () => {
    expect(isStaff(STUDENT_A)).toBe(false);
    expect(isStaff(null)).toBe(false);
  });
  test('canSeePayFor allows owner', () => {
    expect(canSeePayFor(STUDENT_A, 'student-a')).toBe(true);
    expect(canSeePayFor(STUDENT_A, 'student-b')).toBe(false);
  });
  test('canSeePayFor allows staff for any owner', () => {
    expect(canSeePayFor(INSTRUCTOR, 'student-a')).toBe(true);
    expect(canSeePayFor(ADMIN, 'student-b')).toBe(true);
  });
});

describe('redactApplication', () => {
  const app = {
    student: 'student-a',
    benefits: {
      startingWage: 22.5,
      wageRange: { min: 18, max: 25 },
      shopCulture: 'Great team',
    },
    notes: 'visited last week',
  };

  test('owner sees full pay', () => {
    const out = redactApplication(STUDENT_A, app);
    expect(out.benefits.startingWage).toBe(22.5);
    expect(out.benefits.wageRange).toEqual({ min: 18, max: 25 });
  });

  test('other student is redacted', () => {
    const out = redactApplication(STUDENT_B, app);
    expect(out.benefits.startingWage).toBeNull();
    expect(out.benefits.wageRange).toEqual({ min: null, max: null });
    expect(out.benefits.shopCulture).toBe('Great team'); // non-pay fields preserved
    expect(out.notes).toBe('visited last week');
  });

  test('instructor sees full pay', () => {
    const out = redactApplication(INSTRUCTOR, app);
    expect(out.benefits.startingWage).toBe(22.5);
  });

  test('handles missing benefits gracefully', () => {
    const noBenefits = { student: 'student-a' };
    const out = redactApplication(STUDENT_B, noBenefits);
    expect(out.benefits).toBeUndefined();
  });

  test('null/undefined input passes through', () => {
    expect(redactApplication(STUDENT_A, null)).toBeNull();
    expect(redactApplication(STUDENT_A, undefined)).toBeUndefined();
  });

  test('handles populated student object (with _id)', () => {
    const populated = {
      ...app,
      student: { _id: 'student-a', firstName: 'Theo' },
    };
    expect(redactApplication(STUDENT_A, populated).benefits.startingWage).toBe(22.5);
    expect(redactApplication(STUDENT_B, populated).benefits.startingWage).toBeNull();
  });
});

describe('redactCommunication', () => {
  const comm = {
    student: 'student-a',
    type: 'offer_received',
    offerAmount: 50000,
    summary: 'verbal offer',
  };

  test('owner sees offer', () => {
    expect(redactCommunication(STUDENT_A, comm).offerAmount).toBe(50000);
  });
  test('other student does not see offer', () => {
    expect(redactCommunication(STUDENT_B, comm).offerAmount).toBeNull();
  });
  test('staff sees offer', () => {
    expect(redactCommunication(INSTRUCTOR, comm).offerAmount).toBe(50000);
    expect(redactCommunication(ADMIN, comm).offerAmount).toBe(50000);
  });
  test('summary always visible', () => {
    expect(redactCommunication(STUDENT_B, comm).summary).toBe('verbal offer');
  });
});

describe('redactBoardEntry', () => {
  const entry = {
    studentId: 'student-a',
    studentName: 'Smith, J.',
    activeCount: 5,
    stagnantCount: 1,
    latestOfferAmount: 48000,
    highestStartingWage: 21,
  };

  test('owner sees pay', () => {
    const out = redactBoardEntry(STUDENT_A, entry);
    expect(out.latestOfferAmount).toBe(48000);
    expect(out.highestStartingWage).toBe(21);
  });
  test('other student does not', () => {
    const out = redactBoardEntry(STUDENT_B, entry);
    expect(out.latestOfferAmount).toBeNull();
    expect(out.highestStartingWage).toBeNull();
    expect(out.activeCount).toBe(5);
  });
  test('staff sees pay', () => {
    expect(redactBoardEntry(INSTRUCTOR, entry).latestOfferAmount).toBe(48000);
  });
});
