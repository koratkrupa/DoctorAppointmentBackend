const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
     name: { type: String, required: true },
     email: { type: String, required: true, unique: true },
     password: { type: String, required: true },
     gender: { type: String, enum: ["Male", "Female", "Other"] },
     phone: { type: String },
     address: { type: String },
     dob: { type: Date },
     role: { type: String, enum: ["Patient", "Doctor", "Admin"], default: "Patient" },
});

// ✅ Pre-save hook to hash password
userSchema.pre("save", async function (next) {
     if (!this.isModified("password")) return next();
     const salt = await bcrypt.genSalt(10);
     this.password = await bcrypt.hash(this.password, salt);
     next();
});

module.exports = mongoose.model("User", userSchema);
