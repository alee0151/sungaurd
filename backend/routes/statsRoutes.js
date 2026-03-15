const express = require("express");
const router = express.Router();

router.get("/skin-cancer", (req, res) => {
  res.json([
    {
      statId: 1,
      year: 2024,
      region: "Victoria",
      cases: 100,
      deaths: 5
    }
  ]);
});

module.exports = router;