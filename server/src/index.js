const { port } = require('./config/env');
const connectDb = require('./config/db');
const app = require('./app');

(async () => {
  try {
    await connectDb();
  } catch (e) {
    console.error('\n[db] Could not connect to MongoDB:', e.message);
    console.error('     Start MongoDB locally, or set MONGODB_URI in server/.env (a free Atlas M0 cluster works too).\n');
    process.exit(1);
  }
  app.listen(port, () => console.log(`[api] listening on http://localhost:${port}/api`));
})();
