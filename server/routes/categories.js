const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const CategoryController = require('../controllers/CategoryController');

const router = express.Router();

router.use(requireAuth, requireRole('platform_management'));

// US-PM01: create an IDP category
router.post('/', async (req, res) => {
  try {
    const controller = new CategoryController(req.app.locals.db);
    const result = await controller.createCategory(req.body, req.user.id);

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    sendError(res, error);
  }
});

// List categories (needed by the Manage IDP Categories page)
router.get('/', async (req, res) => {
  try {
    const controller = new CategoryController(req.app.locals.db);
    res.json({ success: true, data: await controller.getCategories() });
  } catch (error) {
    sendError(res, error);
  }
});

function sendError(res, error) {
  const status = error.status || 500;

  if (status === 500) {
    console.error('Category route error:', error);
    return res.status(500).json({ success: false, error: 'Unable to process category request' });
  }

  res.status(status).json({ success: false, error: error.message });
}

module.exports = router;
