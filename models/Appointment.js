const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  symptoms: { type: String, default: "" },
  notes: { type: String, default: "" },
  status: { type: String, default: "Pending" }
}, { timestamps: true });

module.exports = mongoose.model("Appointment", appointmentSchema);
