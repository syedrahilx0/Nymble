const mongoose = require('mongoose');
const { mongoUri } = require('./env');

module.exports = async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 6000 });
  console.log(`[db] connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
};
