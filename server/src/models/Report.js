const { Schema, model } = require('mongoose');

const reportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reporterNymbleId: { type: String, required: true },
    targetNymbleId: { type: String, required: true, index: true },
    post: { type: Schema.Types.ObjectId, ref: 'ServicePost', default: null },
    category: { type: String, enum: ['spam', 'harassment', 'abuse', 'illegal', 'other'], required: true },
    description: { type: String, required: true, maxlength: 500 },
    status: { type: String, enum: ['pending', 'dismissed', 'actioned'], default: 'pending', index: true },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    resolutionNote: { type: String, maxlength: 300 },
    blacklist: { type: Schema.Types.ObjectId, ref: 'Blacklist', default: null },
  },
  { timestamps: true }
);

module.exports = model('Report', reportSchema);
