const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cfg = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: cfg.clientOrigin.split(',').map((s) => s.trim()) }));
app.use(express.json({ limit: '20kb' }));
app.use(morgan(cfg.isProd ? 'combined' : 'dev'));
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pseudonym', require('./routes/pseudonym'));
app.use('/api/service', require('./routes/service'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));

app.use((req, res) => res.status(404).json({ message: `No route for ${req.method} ${req.originalUrl}`, code: 'not_found' }));
app.use(errorHandler);

module.exports = app;
