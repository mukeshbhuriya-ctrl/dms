const cron = require('node-cron');
const DccService = require('../services/dcc.service');

/**
 * Initialize Scheduled Tasks
 */
const initScheduler = () => {
    console.log("[Scheduler] Initializing automated tasks...");

    // Run Daily Overdue Check at 08:30 AM every day
    // Pattern: minute hour day-of-month month day-of-week
    cron.schedule('30 8 * * *', async () => {
        try {
            await DccService.checkOverdueDocuments();
        } catch (error) {
            console.error("[Scheduler] Error in daily overdue check:", error);
        }
    });

    // Optional: Run every hour for testing or more frequent updates if needed
    // cron.schedule('0 * * * *', ...);

    console.log("[Scheduler] Daily overdue check scheduled for 08:30 AM");
};

module.exports = { initScheduler };
