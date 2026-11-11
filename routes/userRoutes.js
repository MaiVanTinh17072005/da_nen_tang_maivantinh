const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const express = require("express");

const router = express.Router();

// GET - Lấy danh sách người dùng
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-matkhau");
    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: "Lỗi lấy danh sách người dùng"
    });
  }
});

// POST - Thêm người dùng
router.post("/", async (req, res) => {
  try {
    const { email, matkhau, hoten, hinhanh } = req.body;

    if (!email || !matkhau || !hoten) {
      return res.status(400).json({
        message: "Vui lòng nhập đầy đủ thông tin"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email đã tồn tại"
      });
    }

    const hashedPassword = await bcrypt.hash(matkhau, 10);

    const user = await User.create({
      email: normalizedEmail,
      matkhau: hashedPassword,
      hoten,
      hinhanh: hinhanh || ""
    });

    res.status(201).json({
      message: "Thêm người dùng thành công",
      user: {
        _id: user._id,
        email: user.email,
        hoten: user.hoten,
        hinhanh: user.hinhanh
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email đã tồn tại"
      });
    }

    res.status(500).json({
      message: "Lỗi thêm người dùng"
    });
  }
});


 // PUT - Cập nhật thông tin người dùng
router.put("/:id", async (req, res) => {
  try {
    const { email, matkhau, hoten, hinhanh } = req.body;

    const updateData = {};

    if (email !== undefined) {
      updateData.email = email.trim().toLowerCase();
    }

    if (hoten !== undefined) {
      updateData.hoten = hoten.trim();
    }

    if (hinhanh !== undefined) {
      updateData.hinhanh = hinhanh;
    }

    if (matkhau !== undefined && matkhau !== "") {
      updateData.matkhau = await bcrypt.hash(matkhau, 10);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).select("-matkhau");

    if (!user) {
      return res.status(404).json({
        message: "Không tìm thấy người dùng"
      });
    }

    res.json({
      message: "Cập nhật người dùng thành công",
      user
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "ID người dùng không hợp lệ"
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email đã tồn tại"
      });
    }

    res.status(500).json({
      message: "Lỗi cập nhật người dùng"
    });
  }
});


 // DELETE - Xóa người dùng theo ID
router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "Không tìm thấy người dùng"
      });
    }

    res.json({
      message: "Xóa người dùng thành công",
      user: {
        _id: user._id,
        email: user.email,
        hoten: user.hoten,
        hinhanh: user.hinhanh
      }
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "ID người dùng không hợp lệ"
      });
    }

    console.error("Delete user error:", error.message);

    res.status(500).json({
      message: "Lỗi xóa người dùng"
    });
  }
});


 // POST - Đăng nhập
router.post("/login", async (req, res) => {
  try {
    const { email, matkhau } = req.body;

    if (!email || !matkhau) {
      return res.status(400).json({
        message: "Vui lòng nhập email và mật khẩu"
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user) {
      return res.status(401).json({
        message: "Email hoặc mật khẩu không đúng"
      });
    }

    const isMatch = await bcrypt.compare(
      matkhau,
      user.matkhau
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Email hoặc mật khẩu không đúng"
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        _id: user._id,
        email: user.email,
        hoten: user.hoten,
        hinhanh: user.hinhanh
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      message: "Lỗi đăng nhập"
    });
  }
});


module.exports = router;
