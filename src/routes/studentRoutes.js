const express = require('express');
const router = express.Router();
const { startQuiz, submitQuiz, getAvailableQuizzes } = require('../controllers/studentController');

router.get('/quizzes', getAvailableQuizzes);
router.post('/quiz/:id/start', startQuiz);
router.post('/quiz/:id/submit', submitQuiz);

module.exports = router;
