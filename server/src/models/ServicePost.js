const { Schema, model } = require('mongoose');

const postSchema = new Schema(
  {
    resource: { type: String, required: true, index: true },
    nymbleId: { type: String, required: true },
    body: { type: String, required: true, maxlength: 280 },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

module.exports = model('ServicePost', postSchema);
