const { Schema, model } = require('mongoose');

// The service side only ever sees the pseudonym, never the account.
const accessLogSchema = new Schema(
  {
    nymbleId: { type: String, default: null, index: true },
    resource: { type: String, required: true },
    action: { type: String, enum: ['access', 'post'], default: 'access' },
    outcome: { type: String, enum: ['granted', 'denied'], required: true },
    reason: {
      type: String,
      enum: ['ok', 'missing_token', 'invalid_token', 'expired_token', 'revoked_token', 'blacklisted'],
      required: true,
    },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

module.exports = model('AccessLog', accessLogSchema);
