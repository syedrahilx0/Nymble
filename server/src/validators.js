const { z } = require('zod');
const SERVICES = require('./utils/services');

const password = z
  .string({ required_error: 'Enter a password' })
  .min(8, 'Use at least 8 characters')
  .max(72, 'Use 72 characters or fewer')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

const nymbleId = z
  .string({ required_error: 'Enter a Nymble ID' })
  .trim()
  .toUpperCase()
  .regex(/^NYM(-[0-9A-F]{4}){4}$/, 'Nymble IDs look like NYM-XXXX-XXXX-XXXX-XXXX');

const reason = z.string({ required_error: 'Give a reason' }).trim().min(5, 'Give a reason (at least 5 characters)').max(300, 'Keep the reason under 300 characters');
const durationHours = z.number().int().positive().max(24 * 365).nullable().default(null);
const resource = z.enum(SERVICES.map((s) => s.id), { errorMap: () => ({ message: 'Choose one of the available services' }) });
const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

exports.registerSchema = z.object({
  username: z.string({ required_error: 'Enter a username' }).trim().min(3, 'Use at least 3 characters').max(30, 'Use 30 characters or fewer')
    .regex(/^[A-Za-z0-9_.-]+$/, 'Use letters, numbers, dot, dash or underscore'),
  email: z.string({ required_error: 'Enter your email' }).trim().toLowerCase().email('Enter a valid email address'),
  password,
});

exports.loginSchema = z.object({
  email: z.string({ required_error: 'Enter your email' }).trim().toLowerCase().email('Enter a valid email address'),
  password: z.string({ required_error: 'Enter your password' }).min(1, 'Enter your password'),
});

exports.accessSchema = z.object({ resource, token: z.string().trim().max(200).optional() });
exports.postSchema = z.object({ resource, token: z.string().trim().max(200).optional(), body: z.string({ required_error: 'Write something to post' }).trim().min(1, 'Write something to post').max(280, 'Keep it under 280 characters') });

exports.reportSchema = z.object({
  targetNymbleId: nymbleId,
  category: z.enum(['spam', 'harassment', 'abuse', 'illegal', 'other'], { errorMap: () => ({ message: 'Choose a category' }) }),
  description: z.string({ required_error: 'Describe what happened' }).trim().min(10, 'Describe what happened (at least 10 characters)').max(500, 'Keep it under 500 characters'),
  postId: objectId.optional(),
});

exports.blacklistSchema = z.object({ nymbleId, reason, durationHours });

exports.reportActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('dismiss'), note: z.string().trim().max(300).optional() }),
  z.object({ action: z.literal('blacklist'), reason, durationHours }),
]);

exports.pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(60).optional(),
  status: z.string().trim().max(20).optional(),
  outcome: z.enum(['granted', 'denied']).optional(),
});
