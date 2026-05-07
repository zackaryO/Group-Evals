// server/utils/redactPay.js
//
// Single choke point for stripping pay-related fields from API responses.
// A field is visible only when:
//   - the requesting user is staff ('instructor' | 'admin'), OR
//   - the requesting user is the student who owns the record.
//
// Pay-restricted fields:
//   - DealerApplication.benefits.startingWage
//   - DealerApplication.benefits.wageRange.{min,max}
//   - Communication.offerAmount
//
// Every route that returns these objects MUST shape its response through these
// helpers. This is the only place pay-redaction logic should live.

const STAFF_ROLES = new Set(['instructor', 'admin']);

function isStaff(viewer) {
  return !!viewer && STAFF_ROLES.has(viewer.role);
}

function canSeePayFor(viewer, ownerStudentId) {
  if (!viewer) return false;
  if (isStaff(viewer)) return true;
  // viewer.id is the JWT-decoded user id. ownerStudentId may be ObjectId or string.
  return String(viewer.id) === String(ownerStudentId);
}

// Returns a deep-ish copy with restricted fields nulled when the viewer can't see them.
// Accepts either a Mongoose doc or a plain object.
function redactApplication(viewer, application) {
  if (!application) return application;
  const obj = typeof application.toObject === 'function' ? application.toObject() : { ...application };

  const ownerId = obj.student && obj.student._id ? obj.student._id : obj.student;
  if (canSeePayFor(viewer, ownerId)) return obj;

  if (obj.benefits) {
    obj.benefits = {
      ...obj.benefits,
      startingWage: null,
      wageRange: { min: null, max: null },
    };
  }
  return obj;
}

function redactCommunication(viewer, comm) {
  if (!comm) return comm;
  const obj = typeof comm.toObject === 'function' ? comm.toObject() : { ...comm };
  const ownerId = obj.student && obj.student._id ? obj.student._id : obj.student;
  if (canSeePayFor(viewer, ownerId)) return obj;
  return { ...obj, offerAmount: null };
}

function redactBoardEntry(viewer, entry) {
  if (!entry) return entry;
  const obj = { ...entry };
  if (canSeePayFor(viewer, obj.studentId)) return obj;
  return {
    ...obj,
    latestOfferAmount: null,
    highestStartingWage: null,
  };
}

module.exports = {
  isStaff,
  canSeePayFor,
  redactApplication,
  redactCommunication,
  redactBoardEntry,
};
