const express = require("express");
const router = express.Router();
const userModel = require("../models/User");
// const User = require("../models/User");

router.post('/register', async (req, res) => {

     try {
          const { name, email, password, gender, phone, address, dob, role } = req.body;

          const existingUser = await userModel.findOne({ email });

          if (existingUser) {
               return res.status(400).json({ Message: '❌ User already exists' });
          } else {
               const newUser = new userModel({
                    name, email, password, gender, phone, address, dob, role
               })

               newUser.save();

               res.status(201).json({
                    message: '✅ User registered successfully',
                    user: {
                         id: newUser._id,
                         name: newUser.name,
                         email: newUser.email,
                         role: newUser.role
                    }
               });
          }
     }
     catch(e){
          res.send({message : "error.."});
     }
     
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "❌ User not found" });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: "❌ Invalid password" });
    }

    res.status(200).json({
      message: "✅ Login successful",
      user: {
        id: user._id,
        name: user.name,
        role: user.rol,
        email: user.email
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "❌ Server error" });
  }
});


module.exports = router;