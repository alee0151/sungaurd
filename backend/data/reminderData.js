const reminderData = {
  uvAlert: {
    active: true,
    uvIndex: 8.7,
    level: "High",
    message: "Ensure you've applied SPF 50+ and stay in the shade."
  },

  streak: {
    currentStreak: 5,
    longestStreak: 12,
    weeklyConsistency: [
      { day: "Mon", completed: true },
      { day: "Tue", completed: true },
      { day: "Wed", completed: true },
      { day: "Thu", completed: true },
      { day: "Fri", completed: true },
      { day: "Sat", completed: false },
      { day: "Sun", completed: false }
    ]
  },

  timer: {
    reapplyHours: 2,
    nextApplicationIn: "01:59:38",
    isRunning: true
  },

  stats: {
    applicationsToday: 6,
    hoursProtected: 12
  },

  recentActivity: [
    { id: 1, action: "Applied sunscreen", time: "09:21 pm" },
    { id: 2, action: "Applied sunscreen", time: "09:20 pm" },
    { id: 3, action: "Applied sunscreen", time: "09:20 pm" }
  ]
};

module.exports = reminderData;