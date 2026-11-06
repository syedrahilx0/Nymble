const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    username: { type: String, required: true, trim: true, minlength: 3, maxlength: 30 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    nymbleId: { type: String, unique: true, sparse: true },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

// Case-insensitive unique usernames
userSchema.index({ username: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    nymbleId: this.nymbleId || null,
    createdAt: this.createdAt,
    lastLoginAt: this.lastLoginAt || null,
  };
};

module.exports = model('User', userSchema);
