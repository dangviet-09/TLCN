// routes/careerTestRoutes.js
const express = require('express');
const router = express.Router();
const CareerTestController = require('../controllers/careerTestController');
const AuthMiddleware = require('../middlewares/AuthMiddleware');
const RoleMiddleware = require('../middlewares/RoleMiddleware');
// Không cần xác thực — ai cũng có thể xem bài test
router.get('/', CareerTestController.getTest);

// Người dùng phải đăng nhập mới được nộp bài
router.use(AuthMiddleware.verifyToken);
router.use(RoleMiddleware.checkRole(["ADMIN", "STUDENT"]));
router.post('/submit', CareerTestController.submitTest);
router.put('/major', CareerTestController.updatemajor);

module.exports = router;
