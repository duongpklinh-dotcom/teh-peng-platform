const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const ReportController = require('../controllers/ReportController');

const router = express.Router();

router.use(requireAuth, requireRole('platform_management'));

// US-PM07: weekly report. GET /api/reports/weekly?weekStart=YYYY-MM-DD
router.get('/weekly', async (req, res) => {
  try {
    const controller = new ReportController(req.app.locals.db);
    const report = await controller.generateWeeklyReport(String(req.query.weekStart || ''));

    res.json({ success: true, data: report });
  } catch (error) {
    const status = error.status || 500;

    if (status === 500) {
      console.error('Weekly report failed:', error);
      return res.status(500).json({ success: false, error: 'Unable to generate the weekly report' });
    }

    res.status(status).json({ success: false, error: error.message });
  }
});

module.exports = router;
