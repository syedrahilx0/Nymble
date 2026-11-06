const { Schema, model } = require('mongoose');

const blacklistSchema = new Schema(
  {
    nymbleId: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, maxlength: 300 },
    durationHours: { type: Number, default: null }, // null = permanent
    expiresAt: { type: Date, default: null },
    status: { type: String, enum: ['active', 'lifted', 'expired'], default: 'active' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    report: { type: Schema.Types.ObjectId, ref: 'Report', default: null },
    liftedAt: Date,
    liftedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Only one live blacklist entry per pseudonym
blacklistSchema.index({ nymbleId: 1 }, { unique: true, name: 'one_active_per_nymble_id', partialFilterExpression: { status: 'active' } });
blacklistSchema.index({ nymbleId: 1, createdAt: -1 });

blacklistSchema.methods.state = function state() {
  if (this.status === 'active' && this.expiresAt && this.expiresAt <= new Date()) return 'expired';
  return this.status;
};

module.exports = model('Blacklist', blacklistSchema);
