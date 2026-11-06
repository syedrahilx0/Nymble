const ActivityLog = require('../models/ActivityLog');

// Audit trail. Never let a logging failure break the request.
exports.logActivity = async (type, message, severity = 'info') => {
  try {
    await ActivityLog.create({ type, message, severity });
  } catch (e) {
    console.error('[activity] failed to write log:', e.message);
  }
};
