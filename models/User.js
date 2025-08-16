const { type } = require('@testing-library/user-event/dist/type');
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({

     name: {
          type: String,
          required: true,
          trim: true
     },
     email: {
          type: String,
          required: true,
          unique: true,
          lowercase: true
     },
     password: {
          type: String,
          required: true
     },
     phone: {
          type: String,
          required: true
     },
     address: {
          type: String,
          required: true
     },
     role: {
          type: String,
          enum: ['Patient', 'Doctor', 'Admin'],
          default: 'Patient'
     },
     gender: {
          type: String,
          enum: ['Male', 'Female', 'Other'],
          required: true
     },
     dob: {
          type: Date,
          required: true
     }
}, {
     timestamps: true
});

module.exports = mongoose.model('User', userSchema);
