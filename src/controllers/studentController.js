const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Student = require('../models/Student');
const Attempt = require('../models/Attempt');

exports.startQuiz = async (req, res) => {
    try {
        const { name, phone } = req.body;
        const quizId = req.params.id;

        const quiz = await Quiz.findById(quizId);
        if (!quiz || !quiz.enabled) {
            return res.status(404).json({ message: 'Quiz not found or not active currently' });
        }

        let student = await Student.findOne({ name, phone });
        if (!student) {
            student = await Student.create({ name, phone });
        }

        const previousAttempts = await Attempt.countDocuments({ studentId: student._id, quizId });
        if (previousAttempts >= quiz.attemptLimit) {
            return res.status(403).json({ message: 'Attempt limit reached for this quiz' });
        }

        let questions = await Question.find({ quizId }).select('-correctAnswer');
        
        // Shuffle questions
        questions = questions.sort(() => Math.random() - 0.5);

        // Shuffle options for MCQ
        questions.forEach(q => {
            if (q.type === 'MCQ' && q.options && q.options.length > 0) {
                q.options = q.options.sort(() => Math.random() - 0.5);
            }
        });

        res.json({ quiz, student, questions });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.submitQuiz = async (req, res) => {
    try {
        const { studentId, answers } = req.body; 
        const quizId = req.params.id;

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        const questions = await Question.find({ quizId });
        let score = 0;
        
        const evaluatedAnswers = answers.map(ans => {
            const q = questions.find(qst => qst._id.toString() === ans.questionId);
            let isCorrect = false;
            if (q) {
                isCorrect = q.correctAnswer.toLowerCase().trim() === ans.providedAnswer.toLowerCase().trim();
                if (isCorrect) score++;
            }
            return {
                questionId: ans.questionId,
                providedAnswer: ans.providedAnswer,
                isCorrect
            };
        });

        const attempt = await Attempt.create({
            studentId,
            quizId,
            score,
            totalQuestions: questions.length,
            answers: evaluatedAnswers
        });

        if (quiz.showAnswersAfterSubmit) {
            res.json({ score, total: questions.length, attempt, questions });
        } else {
            res.json({ score, total: questions.length, attemptId: attempt._id });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAvailableQuizzes = async (req, res) => {
    try {
        const quizzes = await Quiz.find({ enabled: true }).select('-attemptLimit -enabled');
        res.json(quizzes);
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};
