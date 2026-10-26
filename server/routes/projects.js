const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const AddProjectController = require('../controllers/AddProjectController');

const router = express.Router();

router.post(
  '/',
  requireAuth,
  requireRole('interior_designer'),
  async (req, res) => {
    try {
      const controller = new AddProjectController(
        req.app.locals.db
      );

      const result = await controller.addProject(
        req.body,
        req.user.id
      );

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;
