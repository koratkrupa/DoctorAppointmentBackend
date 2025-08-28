const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const auth = require("../middleware/auth");
const Appointment = require("../models/Appointment")
// try { 
//   Appointment =  
//   console.log("Appointment model loaded successfully");
// } catch (error) {
//   console.log("Error loading Appointment model:", error.message);
// }

// ✅ Register route
router.post("/register", async (req, res) => {
     try {
          console.log("Register API called", req.body);

          const { name, email, password, gender, phone, address, dob, role } = req.body;

          // Email already exist check
          const existingUser = await User.findOne({ email });
          if (existingUser) {
               return res.status(400).json({ message: "❌ Email already registered" });
          }

          // User create
          const user = new User({
               name,
               email,
               password, // bcrypt hook handle karega
               gender,
               phone,
               address,
               dob,
               role,
          });

          await user.save();

          // If user is Admin, create Admin record
          if (role === "Admin") {
            const admin = new Admin({
              user_id: user._id,
              permissions: ["view_appointments", "manage_appointments", "view_users", "view_doctors"]
            });
            await admin.save();
          }

          //user object bhi bhejna hai
          res.status(201).json({
               message: "✅ User registered successfully",
               user: user
          });

     } catch (error) {
          console.error("❌ Register error:", error);
          res.status(500).json({ message: "Server error" });
     }
});


router.post("/login", async (req, res) => {
     try {
          const { email, password } = req.body;

          // Find User
          const user = await User.findOne({ email });

          if (!user) {
               return res.status(404).json({ message: "❌ User not found" });
          }

          // Check the password
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
               return res.status(400).json({ message: "❌ Invalid password" });
          }

          // Generate JWT Token
          const token = jwt.sign(
               { id: user._id, role: user.role },
               process.env.JWT_SECRET || "secretKey",
               { expiresIn: "1d" }
          );

          res.json({
               token,
               user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
               }
          });

     } catch (error) {
          console.error("❌ Login error:", error);
          res.status(500).json({ message: "❌ Server error" });
     }
});

// ===== GET Patient Dashboard =====
router.get("/dashboard", auth, async (req, res) => {
  try {
    // Check if user is a patient
    if (req.userRole !== "Patient") {
      return res.status(403).json({ message: "Only patients can access this endpoint" });
    }

    // Get user details
    const user = await User.findById(req.userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get patient statistics
    let totalVisits = 0;
    let upcomingAppointments = 0;
    let totalBills = 0;
    let recentAppointments = [];

    if (Appointment) {
      // Get all appointments for this patient to see what statuses exist
      const allAppointments = await Appointment.find({ user_id: req.userId }).lean();
      // console.log("Patient appointments statuses:", allAppointments.map(a => a.status));
      
      // Total completed appointments (visits) - using more realistic statuses
      totalVisits = await Appointment.countDocuments({
        user_id: req.userId,
        status: { $in: ["Completed", "Done", "Approved", "Finished", "Attended"] }
      });

      // Upcoming appointments - using more realistic statuses
      upcomingAppointments = await Appointment.countDocuments({
        user_id: req.userId,
        date: { $gte: new Date() },
        status: { $in: ["Pending", "Confirmed", "Scheduled", "Booked"] }
      });

      // Calculate total bills (all appointments * doctor fees for now)
      const allAppointmentsWithFees = await Appointment.find({
        user_id: req.userId
      }).populate('doctor_id', 'fees').lean();

      totalBills = allAppointmentsWithFees.reduce((total, appt) => {
        return total + (appt.doctor_id?.fees || 0);
      }, 0);

      // If no appointments found, set default values for testing
      if (allAppointmentsWithFees.length === 0) {
         totalVisits = 0;
        upcomingAppointments = 0;
        totalBills = 0;
      } 
      
      // Get recent appointments
      recentAppointments = await Appointment.find({
        user_id: req.userId
      })
        .populate('doctor_id', 'specialization fees')
        .sort({ date: -1 })
        .limit(5)
        .lean();
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      stats: {
        totalVisits,
        upcomingAppointments,
        totalBills
      },
      recentAppointments: recentAppointments.map(appt => ({
        id: appt._id,
        date: new Date(appt.date).toISOString().split('T')[0],
        time: appt.time,
        status: appt.status,
        specialization: appt.doctor_id?.specialization || "Unknown",
        fees: appt.doctor_id?.fees || 0
      }))
    });
  } catch (error) {
    console.error("Patient dashboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ===== GET Patient Appointments =====
router.get("/appointments", auth, async (req, res) => {
  try {
    // Check if user is a patient
    if (req.userRole !== "Patient") {
      return res.status(403).json({ message: "Only patients can access this endpoint" });
    }

    let appointments = [];
    if (Appointment) {
      appointments = await Appointment.find({ user_id: req.userId })
        .populate('doctor_id', 'specialization fees')
        .sort({ date: 1, time: 1 })
        .lean();
    }

    // Format appointments for frontend
    const formattedAppointments = appointments.map(appt => ({
      id: appt._id,
      date: new Date(appt.date).toISOString().split('T')[0],
      time: appt.time,
      status: appt.status,
      symptoms: appt.symptoms,
      notes: appt.notes,
      specialization: appt.doctor_id?.specialization || "Unknown",
      fees: appt.doctor_id?.fees || 0,
      createdAt: appt.createdAt
    }));

    res.json({
      appointments: formattedAppointments,
      total: formattedAppointments.length
    });
  } catch (error) {
    console.error("Patient appointments error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ===== GET Patient Profile =====
router.get("/profile", auth, async (req, res) => {
  try {
    // Check if user is a patient
    if (req.userRole !== "Patient") {
      return res.status(403).json({ message: "Only patients can access this endpoint" });
    }

    const user = await User.findById(req.userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : user.dob,
        gender: user.gender,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Patient profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ===== UPDATE Patient Profile =====
router.put("/profile", auth, async (req, res) => {
  try {
    // Check if user is a patient
    if (req.userRole !== "Patient") {
      return res.status(403).json({ message: "Only patients can access this endpoint" });
    }

    const { name, phone, address, dob, gender } = req.body;

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { name, phone, address, dob, gender },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        dob: updatedUser.dob ? new Date(updatedUser.dob).toISOString().split('T')[0] : updatedUser.dob,
        gender: updatedUser.gender,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error("Patient profile update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
