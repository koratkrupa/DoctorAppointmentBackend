const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema({
  test_name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true }
});

module.exports = mongoose.model("LabTest", labTestSchema);
