const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  status: { type: String, default: "Pending" }
});

module.exports = mongoose.model("Appointment", appointmentSchema);
