const cloudinary = require('../configs/cloudinary');

class UploadController {
  async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Không tìm thấy file' });
      }

      const uploadPromise = new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'editor_images', // Lưu vào thư mục riêng cho Bài học/Blog
            transformation: [
              { width: 1200, crop: 'limit' }, // Tự động thu nhỏ nếu ảnh quá lớn
              { quality: 'auto:good', fetch_format: 'auto' } // Tối ưu hóa dung lượng
            ],
            resource_type: 'image'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      const result = await uploadPromise;

      // Trả về đúng định dạng mà Frontend mong đợi
      return res.status(200).json({
        success: true,
        data: { url: result.secure_url }
      });

    } catch (error) {
      console.error('[UploadController] Lỗi upload:', error);
      return res.status(500).json({ success: false, message: 'Lỗi server khi upload ảnh', error: error.message });
    }
  }
}

module.exports = new UploadController();
