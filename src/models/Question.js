const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    text: { type: String, required: true },
    type: { type: String, enum: ['MCQ', 'TF', 'ShortAnswer'], required: true },
    options: [{ type: String }], // Used for MCQ
    correctAnswer: { type: String, required: true } // Stores the correct option text or true/false or short string
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
