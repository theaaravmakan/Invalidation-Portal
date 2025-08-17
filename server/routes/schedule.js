// routes/schedule.js
const express = require("express");
const router = express.Router();
const ScheduledInvalidation = require("../models/ScheduledInvalidation");

router.post("/schedule-invalidation", async (req, res) => {
  try {
    const { paths, scheduleTime, createdBy } = req.body;

    const newSchedule = await ScheduledInvalidation.create({
      paths,
      scheduleTime: new Date(scheduleTime),
      createdBy,
    });

    res.json({
      message: "Invalidation scheduled successfully!",
      data: newSchedule,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error scheduling invalidation" });
  }
});

module.exports = router;
