const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT_DIR = process.env.ROOT_DIR || 'C:/dms-data';
const TRACE_LOGS_DIR = path.join(ROOT_DIR, 'logs');

exports.getTraces = async (req, res) => {
    try {
        const { date, traceId, search } = req.query;
        // Default to today if no date provided
        const targetDate = date || new Date().toISOString().split('T')[0];
        const logFile = path.join(TRACE_LOGS_DIR, `trace-${targetDate}.log`);

        if (!fs.existsSync(logFile)) {
            return res.status(200).json({ success: true, data: [] });
        }

        const fileStream = fs.createReadStream(logFile);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        // Parse logs into grouped objects
        const traces = {};
        // Regex to parse: "2026-07-06T10:30:00Z INFO [TRC-a8b2c4d] Message here..."
        const logRegex = /^([^ ]+) ([A-Z]+) (?:\[TRC-([a-f0-9]+)\]\s*)?(.*)$/;

        for await (const line of rl) {
            const match = line.match(logRegex);
            if (!match) continue;

            const [_, timestamp, level, trcId, message] = match;
            
            // Only group traces with an ID
            if (!trcId) continue;

            if (traceId && trcId !== traceId && !traceId.includes(trcId)) {
                // If searching for a specific trace, skip others
                continue;
            }

            if (!traces[trcId]) {
                traces[trcId] = {
                    traceId: trcId,
                    startTime: timestamp,
                    endTime: timestamp,
                    status: 'SUCCESS', // default, changes to ERROR if any error is found
                    performer: 'System Process',
                    activity: 'Unknown Procedure',
                    isDetailed: false,
                    isNoise: false,
                    steps: [],
                    searchHit: false
                };
            }

            traces[trcId].endTime = timestamp;
            if (level === 'ERROR') {
                traces[trcId].status = 'FAILED';
            }

            if (message.startsWith('[Performer]')) {
                traces[trcId].performer = message.replace('[Performer] ', '').trim();
            } else if (message.startsWith('[Activity]')) {
                traces[trcId].activity = message.replace('[Activity] ', '').trim();
                traces[trcId].isDetailed = true;
            } else if (message.startsWith('[GenericActivity]')) {
                if (!traces[trcId].isDetailed) {
                    traces[trcId].activity = message.replace('[GenericActivity] ', '').trim();
                }
            } else if (message.startsWith('[REQ_START]')) {
                const reqString = message.replace('[REQ_START] ', '').trim();
                if (traces[trcId].activity === 'Unknown Procedure' && !traces[trcId].isDetailed) {
                    traces[trcId].activity = reqString;
                }
                
                // Flag simple read/preflight requests as noise to declutter the dashboard
                if (reqString.startsWith('OPTIONS') || reqString.startsWith('GET ')) {
                    traces[trcId].isNoise = true;
                }
            }

            if (search && message.toLowerCase().includes(search.toLowerCase())) {
                traces[trcId].searchHit = true;
            }

            traces[trcId].steps.push({
                timestamp,
                level,
                message
            });
        }

        let result = Object.values(traces);

        // Filter out noise (successful GET/OPTIONS requests) unless specifically searched for
        result = result.filter(t => {
            if (search) return true; // Show everything if they are searching
            if (t.status === 'FAILED') return true; // Always show errors
            return !t.isNoise; // Hide noise
        });

        // Filter if a search term was provided
        if (search) {
            result = result.filter(t => t.searchHit || t.performer.toLowerCase().includes(search.toLowerCase()) || t.activity.toLowerCase().includes(search.toLowerCase()));
        }

        // Sort newest first
        result.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Error reading trace logs:', error);
        res.status(500).json({ success: false, message: 'Failed to read trace logs' });
    }
};
