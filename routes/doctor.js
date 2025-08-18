const express = require("express");
const multer = require("multer");
const path = require("path");
const Doctor = require("../models/Doctor");

const router = express.Router();

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

module.exports = router;
