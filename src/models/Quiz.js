const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    timerMinutes: { type: Number, default: 0 }, // 0 means no timer
    attemptLimit: { type: Number, default: 1 }, 
    enabled: { type: Boolean, default: false },
    showAnswersAfterSubmit: { type: Boolean, default: true },
    category: { type: String, default: 'General' },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' }
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
