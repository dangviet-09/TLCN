const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const AuthMiddleware = require('../middlewares/AuthMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');

// Khóa an toàn: Chỉ user đã đăng nhập mới được upload
router.use(AuthMiddleware.verifyToken);

// Endpoint: POST /upload/image
// uploadMiddleware.uploadSingle('file') dùng để hứng file có field name là 'file'
router.post('/image', uploadMiddleware.uploadSingle('file'), uploadController.uploadImage);

module.exports = router;
