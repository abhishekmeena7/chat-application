const express = require("express");
const router = express.Router();
const User = require("../model/users");



// Register new user
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: "Username already exists" });
    }
    const user = new User({ username, password });
    await user.save();
    res.status(201).json({ user: { id: user._id, username: user.username } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    const user = await User.findOne({ username, password });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json({ user: { id: user._id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: "Login failed: " + err.message });
  }
});


router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users: " + err.message });
  }
});

module.exports = router;
