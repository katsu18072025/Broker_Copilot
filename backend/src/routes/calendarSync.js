// backend/src/routes/calendarSync.js
import express from 'express';
import { syncRenewalsToCalendar } from '../../scripts/syncRenewalsToCalendar.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * POST /api/calendar-sync/renewals
 * Sync renewals from CSV to Google Calendar
 * 
 * Body (optional):
 * {
 *   "dryRun": true,          // Preview only (default: false)
 *   "maxRecords": 10,        // Limit number of records (default: all)
 *   "csvPath": "./custom.csv" // Custom CSV path (default: data/renewals.csv)
 * }
 */
router.post('/renewals', async (req, res) => {
  try {
    const { dryRun = false, maxRecords = null, csvPath: customPath } = req.body;

    // Find CSV file
    const possiblePaths = [
      customPath,
      path.join(__dirname, '../../data/renewals.csv'),
      path.join(process.cwd(), 'data/renewals.csv')
    ].filter(Boolean);

    let csvPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        csvPath = p;
        break;
      }
    }

    if (!csvPath) {
      return res.status(404).json({
        success: false,
        error: 'CSV file not found',
        message: 'Please upload renewals.csv to backend/data/ directory'
      });
    }

    console.log(`\n📅 API: Starting calendar sync...`);
    console.log(`   CSV: ${csvPath}`);
    console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`   Max Records: ${maxRecords || 'ALL'}`);
    
    // Check CSV format
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const firstLine = csvContent.split('\n')[0];
    console.log(`   Delimiter: ${firstLine.includes('\t') ? 'TAB' : 'COMMA'}`);
    console.log(`   Columns: ${firstLine.split(firstLine.includes('\t') ? '\t' : ',').length}`);
    console.log();

    // Capture console output
    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => {
      const message = args.join(' ');
      logs.push(message);
      originalLog(...args);
    };

    try {
      // Run the sync
      await syncRenewalsToCalendar(csvPath, { dryRun, maxRecords });

      // Restore console
      console.log = originalLog;

      // Parse results from logs
      const summary = parseSyncResults(logs);

      res.json({
        success: true,
        mode: dryRun ? 'preview' : 'live',
        summary,
        logs: logs.slice(-20), // Last 20 log lines
        message: dryRun 
          ? 'Preview completed successfully. No events were created.' 
          : 'Calendar events created successfully!'
      });

    } catch (error) {
      console.log = originalLog;
      throw error;
    }

  } catch (error) {
    console.error('❌ Calendar sync API error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/calendar-sync/status
 * Check if CSV file exists and is ready for sync
 */
router.get('/status', (req, res) => {
  const csvPath = path.join(__dirname, '../../data/renewals.csv');
  const exists = fs.existsSync(csvPath);

  if (exists) {
    const stats = fs.statSync(csvPath);
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').length - 1; // Subtract header

    res.json({
      ready: true,
      csvPath,
      fileSize: stats.size,
      recordCount: lines,
      lastModified: stats.mtime
    });
  } else {
    res.json({
      ready: false,
      message: 'CSV file not found. Upload renewals.csv to backend/data/ directory',
      expectedPath: csvPath
    });
  }
});

/**
 * POST /api/calendar-sync/upload
 * Upload CSV file for sync
 */
router.post('/upload', express.text({ limit: '50mb', type: 'text/csv' }), (req, res) => {
  try {
    const csvContent = req.body;
    
    if (!csvContent || csvContent.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No CSV content provided'
      });
    }

    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Save CSV file
    const csvPath = path.join(dataDir, 'renewals.csv');
    fs.writeFileSync(csvPath, csvContent, 'utf-8');

    // Count records
    const lines = csvContent.split('\n').length - 1;

    res.json({
      success: true,
      message: 'CSV uploaded successfully',
      path: csvPath,
      recordCount: lines
    });

  } catch (error) {
    console.error('❌ CSV upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper: Parse sync results from logs
 */
function parseSyncResults(logs) {
  const summary = {
    processed: 0,
    created: 0,
    skipped: 0,
    errors: 0,
    specialists: [],
    schedules: []
  };

  for (const log of logs) {
    if (log.includes('Records Processed:')) {
      summary.processed = parseInt(log.split(':')[1].trim()) || 0;
    }
    if (log.includes('Events Created:')) {
      summary.created = parseInt(log.split(':')[1].trim()) || 0;
    }
    if (log.includes('Skipped:')) {
      summary.skipped = parseInt(log.split(':')[1].trim()) || 0;
    }
    if (log.includes('Errors:')) {
      summary.errors = parseInt(log.split(':')[1].trim()) || 0;
    }
    if (log.includes('Processing') && log.includes('records for:')) {
      const specialist = log.split('for:')[1].trim();
      if (specialist) summary.specialists.push(specialist);
    }
    if (log.includes('on 20') && log.includes('events')) {
      summary.schedules.push(log.trim());
    }
  }

  return summary;
}

export default router;