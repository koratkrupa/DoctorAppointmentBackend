// back-end/routes/doctor.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Doctor = require("../models/Doctor");
const User = require("../models/User");
const multer = require("multer");
const path = require("path");
let Appointment;
try { Appointment = require("../models/Appointment"); } catch {}

// ===== Multer setup for file upload =====
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // uploads/ folder root me hona chahiye
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ===== POST Doctor Details =====
router.post("/details", upload.single("profile_pic"), async (req, res) => {
  try {
    const { userId, specialization, qualification, experience, fees } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "❌ userId is required" });
    }

    const doctor = new Doctor({
      userId,
      specialization,
      qualification,
      experience,
      fees,
      profile_pic: req.file ? `/uploads/${req.file.filename}` : null,
    });

    await doctor.save();

    res.status(201).json({
      message: "✅ Doctor details saved successfully",
      doctor,
    });
  } catch (error) {
    console.error("❌ Doctor details error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /doctor/dashboard  -> Doctor + today's appointments count
router.get("/dashboard", auth, async (req, res) => {
  try {
    // Doctor profile (linked by userId)
    const doctor = await Doctor.findOne({ userId: req.userId }).lean();
    if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });

    // linked user for name/email
    const user = await User.findById(req.userId).lean();

    // Today's appointments count (0 if model not present)
    let todayCount = 0;
    if (Appointment) {
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date();   end.setHours(23,59,59,999);
      todayCount = await Appointment.countDocuments({
        doctorId: doctor._id,
        time: { $gte: start, $lte: end },
        status: { $ne: "cancelled" }
      });
    }

    res.json({
      doctor: {
        id: doctor._id,
        name: user?.name || "Doctor",
        email: user?.email || "",
        specialization: doctor.specialization,
        qualification: doctor.qualification,
        experience: doctor.experience,
        fees: doctor.fees,
        profile_pic: doctor.profile_pic // e.g. "/uploads/xyz.png"
      },
      stats: {
        todayAppointments: todayCount
      }
    });
  } catch (e) {
    console.error("Dashboard error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;