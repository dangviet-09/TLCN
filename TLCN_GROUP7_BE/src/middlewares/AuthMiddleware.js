const jwt = require("jsonwebtoken");
require("dotenv").config();

class AuthMiddleware {
  verifyToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(" ")[1];

      if (!token) {
        return res.status(401).json({
          status: "error",
          message: "Token không được cung cấp",
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // gắn thông tin user vào req để dùng tiếp
      next();
    } catch (error) {
      return res.status(401).json({
        status: "error",
        message: "Token không hợp lệ hoặc đã hết hạn",
      });
    }
    
  }

  // Optional token - không bắt buộc, chỉ parse nếu có
  optionalToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(" ")[1];

      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // gắn user nếu token hợp lệ
      }
      // Nếu không có token hoặc token invalid -> vẫn next (req.user = undefined)
      next();
    } catch (error) {
      // Token invalid nhưng vẫn cho qua (public route)
      next();
    }
  }

  optionalVerifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      req.user = null;
      return next();
    }
  }
}

module.exports = new AuthMiddleware();