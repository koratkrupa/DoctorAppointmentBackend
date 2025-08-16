const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  specialization: {
    type: String,
    required: true
  },
  qualification: {
    type: String,
    required: true
  },
  experience: {
    type: Number,
    required: true
  },
  fees: {
    type: Number,
    required: true
  },
  profile_pic: {
    type: String // Store file path or URL
  }
}, { timestamps: true });

const Doctor = mongoose.model("Doctor", doctorSchema);
module.exports = Doctor;
