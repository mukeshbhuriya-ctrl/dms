const cron = require('node-cron');
const DccService = require('../services/dcc.service');
const InstrumentService = require('../services/instrument.service');

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

    // Run Daily Instrument Expiry Check at 12:30 AM (00:30) every day
    cron.schedule('30 0 * * *', async () => {
        try {
            await InstrumentService.checkExpiringInstruments();
        } catch (error) {
            console.error("[Scheduler] Error in instrument expiry check:", error);
        }
    });

    console.log("[Scheduler] Daily overdue & instrument expiry checks scheduled.");
};

module.exports = { initScheduler };
