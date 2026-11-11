
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/users", userRoutes);
const uploadRoutes = require("./routes/uploadRoutes");
app.use("/api/upload", uploadRoutes);
app.get("/", (req, res) => {
  res.json({ message: "Backend is running!" });
});

// MongoDB Atlas connection
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI, {
    dbName: "midterm_crossplatform"
  })
  .then(() => {
    console.log("MongoDB Atlas connected successfully!");
    console.log("Database name:", mongoose.connection.name);
    console.log("Host:", mongoose.connection.host);

    // Chỉ khởi động server sau khi kết nối MongoDB thành công
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });
