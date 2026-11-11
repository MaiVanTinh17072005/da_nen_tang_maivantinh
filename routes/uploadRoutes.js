
const express = require("express");
const multer = require("multer");
const { Readable } = require("stream");

const cloudinary = require("../config/cloudinary");
const auth = require("../middleware/auth");

const {
  addImageToCollection,
} = require("../services/cloudinaryCollection");

const router = express.Router();

// =============================
// MULTER CONFIG
// =============================

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

// =============================
// UPLOAD IMAGE
// =============================

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
      // 1. Upload ảnh lên Cloudinary
      const result = await new Promise(
        (resolve, reject) => {
          const stream =
            cloudinary.uploader.upload_stream(
              {
                folder: "midterm_crossplatform/products",
                resource_type: "image",
              },
              (error, uploadResult) => {
                if (error) {
                  reject(error);
                } else if (!uploadResult) {
                  reject(
                    new Error(
                      "Cloudinary không trả về kết quả"
                    )
                  );
                } else {
                  resolve(uploadResult);
                }
              }
            );

          Readable.from([
            req.file.buffer,
          ]).pipe(stream);
        }
      );

      console.log(
        "Upload Cloudinary thành công:",
        result.public_id
      );

      // 2. Tự động thêm ảnh vào Collection
      let addedToCollection = false;

      if (process.env.CLOUDINARY_COLLECTION_ID) {
        try {
          await addImageToCollection(
            result.asset_id
          );

          addedToCollection = true;

          console.log(
            "Đã thêm ảnh vào Collection:",
            process.env.CLOUDINARY_COLLECTION_ID
          );
        } catch (collectionError) {
          console.error(
            "Không thể thêm ảnh vào Collection:",
            collectionError.message
          );
        }
      } else {
        console.warn(
          "Chưa cấu hình CLOUDINARY_COLLECTION_ID"
        );
      }

      // 3. Trả URL ảnh cho Frontend
      // Giữ nguyên cấu trúc response cũ
      return res.json({
        message: addedToCollection
          ? "Upload ảnh và thêm vào Collection thành công"
          : "Upload ảnh thành công, nhưng chưa thêm vào Collection",
        image: result.secure_url,
      });

    } catch (error) {
      console.error(
        "Cloudinary upload error:",
        error.message
      );

      return res.status(500).json({
        message: "Không thể upload hình ảnh",
      });
    }
  });
});

module.exports = router;
