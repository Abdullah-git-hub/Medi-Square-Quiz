const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true }
}, { timestamps: true });

// Prevent duplicate student registrations based on name+phone combo
studentSchema.index({ name: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
