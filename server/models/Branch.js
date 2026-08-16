const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  timings: { type: String, default: '' },
  hours: { type: String, default: '9 AM - 6 PM' },
  mapLink: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Branch', branchSchema);
