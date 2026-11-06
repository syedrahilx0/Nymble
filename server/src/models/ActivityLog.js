const { Schema, model } = require('mongoose');

const activitySchema = new Schema(
  {
    type: { type: String, required: true, index: true },
    message: { type: String, required: true },
    severity: { type: String, enum: ['info', 'success', 'warning', 'danger'], default: 'info' },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

module.exports = model('ActivityLog', activitySchema);
