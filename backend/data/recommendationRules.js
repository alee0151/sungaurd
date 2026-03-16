/**
 * Sunscreen recommendation rules.
 * Australian/WHO guidelines:
 *   UV 0-2 (Low):    No sunscreen required.
 *   UV 3+  (Mod+):   SPF 50+ required at ALL levels from 3 and above.
 */
module.exports = [
  {
    max: 2,
    riskLevel: "Low",
    spfLevel: "No sunscreen required",
    advice:
      "UV index is low — sun protection is generally not needed. You can enjoy time outdoors without sunscreen, though a hat is still a good habit."
  },
  {
    max: 5,
    riskLevel: "Moderate",
    spfLevel: "SPF 50+",
    advice:
      "Apply SPF 50+ sunscreen 20 minutes before going outside and reapply every 2 hours. Wear a broad-brimmed hat and UV-protective sunglasses."
  },
  {
    max: 7,
    riskLevel: "High",
    spfLevel: "SPF 50+",
    advice:
      "SPF 50+ is essential. Apply generously 20 minutes before sun exposure and reapply every 2 hours or after swimming/sweating. Seek shade during peak hours and cover up with sun-protective clothing."
  },
  {
    max: 10,
    riskLevel: "Very High",
    spfLevel: "SPF 50+",
    advice:
      "Maximum protection required. Apply SPF 50+ liberally, wear long sleeves, a broad-brimmed hat, and UV-wrap sunglasses. Minimise time outdoors between 10 am and 3 pm and reapply sunscreen every 2 hours."
  },
  {
    max: Infinity,
    riskLevel: "Extreme",
    spfLevel: "SPF 50+",
    advice:
      "Extreme UV — avoid outdoor exposure where possible. If you must go outside, apply SPF 50+ to all exposed skin, wear full-coverage sun-protective clothing, a broad-brimmed hat, and UV-wrap sunglasses. Reapply sunscreen every 2 hours."
  }
];
