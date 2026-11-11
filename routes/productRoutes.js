
const express = require("express");
const mongoose = require("mongoose");

const Product = require("../models/Product");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

const allowedFields = [
  "name",
  "price",
  "soluong",
  "image",
];

function validateProduct(body, isCreate = false) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return "Dữ liệu sản phẩm không hợp lệ";
  }

  const keys = Object.keys(body);

  if (keys.some((key) => !allowedFields.includes(key))) {
    return "Sản phẩm chỉ được có 4 trường: name, price, soluong, image";
  }

  if (isCreate) {
    if (
      !allowedFields.every((field) =>
        Object.prototype.hasOwnProperty.call(body, field)
      )
    ) {
      return "Vui lòng nhập đủ 4 trường sản phẩm";
    }
  }

  if ("name" in body) {
    if (
      typeof body.name !== "string" ||
      !body.name.trim()
    ) {
      return "Tên sản phẩm không hợp lệ";
    }
  }

  if ("price" in body) {
    if (
      typeof body.price !== "number" ||
      !Number.isFinite(body.price) ||
      body.price < 0
    ) {
      return "Giá sản phẩm phải là số không âm";
    }
  }

  if ("soluong" in body) {
    if (
      !Number.isInteger(body.soluong) ||
      body.soluong < 0
    ) {
      return "Số lượng phải là số nguyên không âm";
    }
  }

  if ("image" in body) {
    if (typeof body.image !== "string") {
      return "Hình ảnh phải là chuỗi URL";
    }

    if (body.image.trim()) {
      try {
        const url = new URL(body.image);

        if (url.protocol !== "https:") {
          return "URL hình ảnh phải sử dụng HTTPS";
        }
      } catch {
        return "URL hình ảnh không hợp lệ";
      }
    }
  }

  return null;
}

// GET /api/products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ _id: -1 });

    res.json(products);
  } catch (error) {
    console.error("Get products:", error.message);

    res.status(500).json({
      message: "Lỗi lấy danh sách sản phẩm",
    });
  }
});

// POST /api/products
router.post("/", async (req, res) => {
  try {
    const errorMessage = validateProduct(
      req.body,
      true
    );

    if (errorMessage) {
      return res.status(400).json({
        message: errorMessage,
      });
    }

    const product = await Product.create({
      name: req.body.name.trim(),
      price: req.body.price,
      soluong: req.body.soluong,
      image: req.body.image.trim(),
    });

    res.status(201).json({
      message: "Thêm sản phẩm thành công",
      product,
    });
  } catch (error) {
    console.error("Create product:", error.message);

    res.status(500).json({
      message: "Lỗi thêm sản phẩm",
    });
  }
});

// PUT /api/products/:id
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "ID sản phẩm không hợp lệ",
      });
    }

    const errorMessage = validateProduct(req.body);

    if (errorMessage) {
      return res.status(400).json({
        message: errorMessage,
      });
    }

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message: "Không có dữ liệu cần cập nhật",
      });
    }

    const updateData = { ...req.body };

    if (updateData.name !== undefined) {
      updateData.name = updateData.name.trim();
    }

    if (updateData.image !== undefined) {
      updateData.image = updateData.image.trim();
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return res.status(404).json({
        message: "Không tìm thấy sản phẩm",
      });
    }

    res.json({
      message: "Cập nhật sản phẩm thành công",
      product,
    });
  } catch (error) {
    console.error("Update product:", error.message);

    res.status(500).json({
      message: "Lỗi cập nhật sản phẩm",
    });
  }
});

// DELETE /api/products/:id
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "ID sản phẩm không hợp lệ",
      });
    }

    const product = await Product.findByIdAndDelete(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        message: "Không tìm thấy sản phẩm",
      });
    }

    res.json({
      message: "Xóa sản phẩm thành công",
    });
  } catch (error) {
    console.error("Delete product:", error.message);

    res.status(500).json({
      message: "Lỗi xóa sản phẩm",
    });
  }
});

module.exports = router;
