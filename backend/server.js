const express = require("express");
const cors = require("cors");

const uvRoutes = require("./routes/uvRoutes");
const statsRoutes = require("./routes/statsRoutes");
const userRoutes = require("./routes/userRoutes");
const reminderRoutes = require("./routes/reminderRoutes");// Importing routes

const app = express();

app.use(cors());
app.use(express.json());

app.use("/uv", uvRoutes);
app.use("/stats", statsRoutes);
app.use("/users", userRoutes);
app.use("/reminders", reminderRoutes);// Health check endpoint

app.get("/health", (req, res) => {
  res.json({ status: "Backend running" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});