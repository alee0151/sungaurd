const rules = require("../data/recommendationRules");

exports.getRecommendation = (req, res) => {
  const uvLevel = parseFloat(req.query.uvLevel);

  if (isNaN(uvLevel)) {
    return res.status(400).json({ error: "Invalid uvLevel" });
  }

  const rule = rules.find(r => uvLevel <= r.max);

  if (!rule) {
    return res.status(500).json({ error: "No recommendation rule found" });
  }

  res.json(rule);
};