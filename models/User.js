
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },

    matkhau: {
      type: String,
      required: true
    },

    hoten: {
      type: String,
      required: true,
      trim: true
    },

    hinhanh: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

module.exports = mongoose.model("User", userSchema);
