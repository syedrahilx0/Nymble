const { Schema, model } = require('mongoose');

const tokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    nymbleId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true }, // SHA-256 of the raw token. The raw token is never stored.
    prefix: { type: String, required: true },
    status: { type: String, enum: ['active', 'expired', 'revoked'], default: 'active' },
    issuedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
    revokedReason: { type: String, enum: ['rotated', 'user', 'blacklisted', 'admin'] },
  },
  { timestamps: false }
);

tokenSchema.methods.effectiveStatus = function effectiveStatus() {
  return this.status === 'active' && this.expiresAt <= new Date() ? 'expired' : this.status;
};

tokenSchema.methods.toView = function toView() {
  return {
    id: this._id,
    prefix: this.prefix,
    status: this.effectiveStatus(),
    issuedAt: this.issuedAt,
    expiresAt: this.expiresAt,
    revokedAt: this.revokedAt || null,
    revokedReason: this.revokedReason || null,
  };
};

module.exports = model('NymbleToken', tokenSchema);
