const ApiError = require('../utils/ApiError');
const { isProd } = require('../config/env');

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message, code: err.code, ...err.extra });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    const message = field === 'email' ? 'That email is already registered.'
      : field === 'username' ? 'That username is taken.'
      : `That ${field} is already in use.`;
    return res.status(409).json({ message, code: 'duplicate', fields: { [field]: message } });
  }
  if (err.name === 'CastError') return res.status(400).json({ message: 'That id is not valid.', code: 'bad_id' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: err.message, code: 'validation_error' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'The request body is not valid JSON.', code: 'bad_json' });

  console.error(err);
  res.status(500).json({ message: 'Something went wrong on our side.', code: 'server_error', ...(isProd ? {} : { detail: err.message }) });
};
