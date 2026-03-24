const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { protect } = require('../middleware/authMiddleware');
const { 
    loginAdmin, createQuiz, getQuizzes, getQuiz, updateQuiz, deleteQuiz,
    addQuestion, getQuestions, deleteQuestion, importQuestionsCSV,
    getAnalytics, getLeaderboard, exportResultsCSV
} = require('../controllers/adminController');

router.post('/login', loginAdmin);

// Protected routes
router.route('/quizzes')
    .post(protect, createQuiz)
    .get(protect, getQuizzes);

router.route('/quizzes/:id')
    .get(protect, getQuiz)
    .put(protect, updateQuiz)
    .delete(protect, deleteQuiz);

router.route('/quizzes/:quizId/questions')
    .post(protect, addQuestion)
    .get(protect, getQuestions);

router.delete('/questions/:id', protect, deleteQuestion);

router.post('/quizzes/:quizId/questions/import', protect, upload.single('file'), importQuestionsCSV);

router.get('/analytics', protect, getAnalytics);
router.get('/quizzes/:quizId/leaderboard', protect, getLeaderboard);
router.get('/quizzes/:quizId/export', protect, exportResultsCSV);

module.exports = router;
