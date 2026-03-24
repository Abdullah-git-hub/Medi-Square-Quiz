const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    answers: [{
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
        providedAnswer: { type: String },
        isCorrect: { type: Boolean }
    }],
    completedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Attempt', attemptSchema);
