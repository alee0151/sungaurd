const reminderData = require("../data/reminderData");

const getReminderData = (req, res) => {
  res.status(200).json(reminderData);
};

module.exports = {
  getReminderData,
};