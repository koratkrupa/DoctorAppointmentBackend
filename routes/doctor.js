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

// ===== UPDATE Doctor Profile =====
// PUT /doctor/profile  (auth required)
// Accepts multipart/form-data for optional profile_pic
router.put("/profile", auth, upload.single("profile_pic"), async (req, res) => {
  try {
    // Update doctor fields
    const { specialization, qualification, experience, fees } = req.body;

    const doctor = await Doctor.findOne({ userId: req.userId });
    if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });

    if (specialization !== undefined) doctor.specialization = specialization;
    if (qualification !== undefined) doctor.qualification = qualification;
    if (experience !== undefined) doctor.experience = Number(experience);
    if (fees !== undefined) doctor.fees = Number(fees);
    if (req.file) doctor.profile_pic = `/uploads/${req.file.filename}`;

    await doctor.save();

    // Optionally update user fields if provided
    const { name, email, phone, address } = req.body;
    let user;
    if (name !== undefined || email !== undefined || phone !== undefined || address !== undefined) {
      user = await User.findById(req.userId);
      if (user) {
        if (name !== undefined) user.name = name;
        if (email !== undefined) user.email = email;
        if (phone !== undefined) user.phone = phone;
        if (address !== undefined) user.address = address;
        await user.save();
      }
    }

    return res.json({
      message: "✅ Profile updated successfully",
      doctor: {
        id: doctor._id,
        specialization: doctor.specialization,
        qualification: doctor.qualification,
        experience: doctor.experience,
        fees: doctor.fees,
        profile_pic: doctor.profile_pic,
      },
      user: user
        ? { id: user._id, name: user.name, email: user.email, phone: user.phone, address: user.address }
        : undefined,
    });
  } catch (e) {
    console.error("Update profile error:", e);
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

    // Stats (0 if Appointment model not present)
    let todayCount = 0;
    let totalPatients = 0;
    let upcomingAppointments = 0;
    let earnings = 0;

    if (Appointment) {
      const start = new Date(); start.setHours(0,0,0,0);
      const end = new Date();   end.setHours(23,59,59,999);

      // today count
      todayCount = await Appointment.countDocuments({
        doctor_id: doctor._id,
        date: { $gte: start, $lte: end },
        status: { $ne: "Cancelled" }
      });

      // total unique patients seen by this doctor
      const uniquePatients = await Appointment.distinct("user_id", { doctor_id: doctor._id });
      totalPatients = uniquePatients.length;

      // upcoming appointments from now (status pending/confirmed)
      upcomingAppointments = await Appointment.countDocuments({
        doctor_id: doctor._id,
        date: { $gte: new Date() },
        status: { $in: ["Pending", "Confirmed"] }
      });

      // simple earnings estimate = total completed appointments * fees
      const completedCount = await Appointment.countDocuments({
        doctor_id: doctor._id,
        status: { $in: ["Completed", "Done", "Approved"] }
      });
      earnings = completedCount * (doctor.fees || 0);
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
        todayAppointments: todayCount,
        totalPatients,
        upcomingAppointments,
        earnings
      }
    });
  } catch (e) {
    console.error("Dashboard error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// ===== GET Doctor Appointments =====
// GET /doctor/appointments  -> All appointments for this doctor
router.get("/appointments", auth, async (req, res) => {
  try {
    // Find doctor profile
    const doctor = await Doctor.findOne({ userId: req.userId }).lean();
    if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });

    // Get all appointments for this doctor
    let appointments = [];
    if (Appointment) {
      appointments = await Appointment.find({ doctor_id: doctor._id })
        .populate('user_id', 'name email phone')
        .sort({ date: 1, time: 1 })
        .lean();
    }

    // Format appointments for frontend
    const formattedAppointments = appointments.map(appt => ({
      id: appt._id,
      patient: appt.user_id?.name || "Unknown Patient",
      patientEmail: appt.user_id?.email || "",
      patientPhone: appt.user_id?.phone || "",
      date: new Date(appt.date).toISOString().split('T')[0],
      time: appt.time,
      status: appt.status,
      createdAt: appt.createdAt
    }));

    res.json({
      appointments: formattedAppointments,
      total: formattedAppointments.length
    });
  } catch (e) {
    console.error("Appointments error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// ===== GET All Doctors (Public) =====
// GET /doctor/all  -> Get all doctors for public listing
router.get("/all", async (req, res) => {
  try {
    const { specialization, search } = req.query;
    
    // Build query
    let query = {};
    
    // Filter by specialization if provided
    if (specialization && specialization !== 'all') {
      query.specialization = { $regex: specialization, $options: 'i' };
    }
    
    // Get all doctors with populated user data
    let doctors = await Doctor.find(query)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();
    
    // Apply search filter if provided
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      doctors = doctors.filter(doctor => 
        doctor.userId?.name?.match(searchRegex) ||
        doctor.specialization?.match(searchRegex) ||
        doctor.qualification?.match(searchRegex)
      );
    }
    
    // Format for frontend
    const formattedDoctors = doctors.map(doctor => ({
      id: doctor._id,
      name: doctor.userId?.name || "Dr. Unknown",
      email: doctor.userId?.email || "",
      phone: doctor.userId?.phone || "",
      specialization: doctor.specialization,
      qualification: doctor.qualification,
      experience: doctor.experience,
      fees: doctor.fees,
      profile_pic: doctor.profile_pic,
      rating: 4.5, // You can add rating system later
      available: true
    }));
    
    res.json({
      doctors: formattedDoctors,
      total: formattedDoctors.length
    });
  } catch (e) {
    console.error("Get all doctors error:", e);
    res.status(500).json({ message: "Server error" });
  }
});

// ===== POST Book Appointment =====
router.post("/book-appointment", auth, async (req, res) => {
  try {
    const { doctor_id, date, time, symptoms, notes } = req.body;

    if (!doctor_id || !date || !time) {
      return res.status(400).json({ message: "Doctor ID, date, and time are required" });
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(doctor_id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Check if appointment already exists for this time slot
    const existingAppointment = await Appointment.findOne({
      doctor_id,
      date,
      time,
      status: { $in: ["Pending", "Upcoming"] }
    });

    if (existingAppointment) {
      return res.status(400).json({ message: "This time slot is already booked" });
    }

    // Create new appointment
    const appointment = new Appointment({
      patient_id: req.userId,
      doctor_id,
      date,
      time,
      symptoms: symptoms || "",
      notes: notes || "",
      status: "Pending"
    });

    await appointment.save();

    res.status(201).json({
      message: "Appointment booked successfully",
      appointment: {
        id: appointment._id,
        doctor_id: appointment.doctor_id,
        date: appointment.date,
        time: appointment.time,
        status: appointment.status
      }
    });
  } catch (error) {
    console.error("Error booking appointment:", error);
    res.status(500).json({ message: "Failed to book appointment" });
  }
});

module.exports = router;