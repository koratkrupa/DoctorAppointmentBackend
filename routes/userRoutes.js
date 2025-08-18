const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// ✅ Register route
router.post("/register", async (req, res) => {
  try {

    const { name, email, password, gender, phone, address, dob, role } = req.body;

    // Email already exist check
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "❌ Email already registered" });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password, // bcrypt pre-save hook hash karega
      gender,
      phone,
      address,
      dob,
      role,
    });

    await user.save();

    res.status(201).json({ message: "✅ User registered successfully" });
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
               message: "✅ Login successful",
               token,
               user: {
                    role: user.rol,
                    userId: user._id,
               },
          });
     } catch (error) {
          console.error("❌ Login error:", err);
          res.status(500).json({ message: "❌ Server error" });
     }
});

module.exports = router;
