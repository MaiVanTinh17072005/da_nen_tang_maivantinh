
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/upload", uploadRoutes);

// Kiểm tra Backend
app.get("/", (req, res) => {
  res.json({
    message: "Backend is running!",
  });
});

// MongoDB Atlas
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI, {
    dbName: "midterm_crossplatform",
  })
  .then(() => {
    console.log(
      "MongoDB Atlas connected successfully!"
    );

    console.log(
      "Database name:",
      mongoose.connection.name
    );

    console.log(
      "Host:",
      mongoose.connection.host
    );

    app.listen(PORT, () => {
      console.log(
        `Server running on port ${PORT}`
      );
    });
  })
  .catch((error) => {
    console.error(
      "MongoDB connection failed:",
      error.message
    );

    process.exit(1);
  });
