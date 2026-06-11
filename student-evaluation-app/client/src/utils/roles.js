// student-evaluation-app/client/src/utils/roles.js
//
// Centralized role helpers so role checks stay consistent across components.
//
// Roles:
//  - admin / instructor    → "full" instructors: can do everything.
//  - electrical_instructor → second-tier: manage quizzes (own + shared) and a
//    roster of electrical students they created; nothing else.
//  - electrical_student    → restricted student: only quizzes assigned to their
//    roster + their own results. No other site access.
//  - student               → regular student (existing behavior).

export const ROLES = {
  ADMIN: 'admin',
  INSTRUCTOR: 'instructor',
  ELECTRICAL_INSTRUCTOR: 'electrical_instructor',
  STUDENT: 'student',
  ELECTRICAL_STUDENT: 'electrical_student',
};

// Full instructors can do everything in the app.
export const isFullInstructor = (role) =>
  role === ROLES.ADMIN || role === ROLES.INSTRUCTOR;

export const isElectricalInstructor = (role) =>
  role === ROLES.ELECTRICAL_INSTRUCTOR;

// Anyone who can manage quizzes (full instructors + electrical instructors).
export const isInstructorTier = (role) =>
  isFullInstructor(role) || isElectricalInstructor(role);

export const isElectricalStudent = (role) =>
  role === ROLES.ELECTRICAL_STUDENT;

export const isRegularStudent = (role) => role === ROLES.STUDENT;

// Anyone who takes quizzes as a student.
export const isAnyStudent = (role) =>
  isRegularStudent(role) || isElectricalStudent(role);
