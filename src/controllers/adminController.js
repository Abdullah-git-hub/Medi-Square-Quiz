const Admin = require('../models/Admin');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Student = require('../models/Student');
const Attempt = require('../models/Attempt');
const jwt = require('jsonwebtoken');
const csv = require('csvtojson');
const { Parser } = require('json2csv');

// Auth: Login admin
exports.loginAdmin = async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await Admin.findOne({ username });
        if (admin && (await admin.matchPassword(password))) {
            const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
            res.json({ _id: admin._id, username: admin.username, token });
        } else {
            res.status(401).json({ message: 'Invalid username or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Quiz CRUD
exports.createQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.create(req.body);
        res.status(201).json(quiz);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getQuizzes = async (req, res) => {
    try {
        const quizzes = await Quiz.find({}).sort({ createdAt: -1 });
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (quiz) res.json(quiz);
        else res.status(404).json({ message: 'Quiz not found' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateQuiz = async (req, res) => {
    try {
        const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(quiz);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteQuiz = async (req, res) => {
    try {
        await Quiz.findByIdAndDelete(req.params.id);
        await Question.deleteMany({ quizId: req.params.id }); 
        res.json({ message: 'Quiz removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Questions CRUD & Import
exports.addQuestion = async (req, res) => {
    try {
        const question = await Question.create({ ...req.body, quizId: req.params.quizId });
        res.status(201).json(question);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getQuestions = async (req, res) => {
    try {
        const questions = await Question.find({ quizId: req.params.quizId });
        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteQuestion = async (req, res) => {
    try {
        await Question.findByIdAndDelete(req.params.id);
        res.json({ message: 'Question removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Import CSV
exports.importQuestionsCSV = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Please upload a CSV file' });
        
        const jsonArray = await csv().fromFile(req.file.path);
        const questions = jsonArray.map(row => ({
            quizId: req.params.quizId,
            text: row.text,
            type: row.type || 'MCQ',
            options: row.options ? row.options.split('|').map(o=>o.trim()) : [],
            correctAnswer: row.correctAnswer
        }));

        await Question.insertMany(questions);
        res.json({ message: 'Questions imported successfully', count: questions.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Analytics & Leaderboard
exports.getAnalytics = async (req, res) => {
    try {
        const quizzesCount = await Quiz.countDocuments();
        const studentsCount = await Student.countDocuments();
        const attemptsCount = await Attempt.countDocuments();
        res.json({ quizzesCount, studentsCount, attemptsCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getLeaderboard = async (req, res) => {
    try {
        const { quizId } = req.params;
        const attempts = await Attempt.find({ quizId })
            .populate('studentId', 'name phone')
            .sort({ score: -1, completedAt: 1 })
            .limit(100);
        res.json(attempts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.exportResultsCSV = async (req, res) => {
    try {
        const { quizId } = req.params;
        const attempts = await Attempt.find({ quizId }).populate('studentId', 'name phone').sort({ score: -1, completedAt: 1 });
        
        const data = attempts.map(a => ({
            StudentName: a.studentId ? a.studentId.name : 'Unknown',
            StudentPhone: a.studentId ? a.studentId.phone : 'Unknown',
            Score: a.score,
            TotalQuestions: a.totalQuestions,
            CompletedAt: new Date(a.completedAt).toLocaleString()
        }));

        if (data.length === 0) {
            return res.status(404).json({ message: 'No attempts found' });
        }

        const json2csvParser = new Parser();
        const csvData = json2csvParser.parse(data);

        res.header('Content-Type', 'text/csv');
        res.attachment(`quiz_${quizId}_results.csv`);
        res.send(csvData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
