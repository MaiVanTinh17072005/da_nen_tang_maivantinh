
const express = require("express");
const multer = require("multer");
const { Readable } = require("stream");

const cloudinary = require("../config/cloudinary");
const auth = require("../middleware/auth");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(
        new Error("Chỉ hỗ trợ JPG, PNG, WEBP")
      );
    }

    cb(null, true);
  },
});

router.post("/", auth, (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        message: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Vui lòng chọn hình ảnh",
      });
    }

    try {
      const result = await new Promise(
        (resolve, reject) => {
          const stream =
            cloudinary.uploader.upload_stream(
              {
                folder: "midterm_crossplatform/products",
                resource_type: "image",
              },
              (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  resolve(result);
                }
              }
            );

          Readable.from([
            req.file.buffer,
          ]).pipe(stream);
        }
      );

      res.json({
        message: "Upload ảnh sản phẩm thành công",
        image: result.secure_url,
      });
    } catch (error) {
      console.error(
        "Cloudinary upload error:",
        error.message
      );

      res.status(500).json({
        message: "Không thể upload hình ảnh",
      });
    }
  });
});

module.exports = router;
