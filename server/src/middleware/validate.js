const ApiError = require('../utils/ApiError');

exports.validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const fields = {};
    result.error.issues.forEach((i) => {
      const key = i.path.join('.') || '_';
      if (!fields[key]) fields[key] = i.message;
    });
    const first = Object.values(fields)[0];
    return next(new ApiError(400, first || 'Check the highlighted fields.', 'validation_error', { fields }));
  }
  req[source] = result.data;
  next();
};
