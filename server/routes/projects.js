const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const AddProjectController = require('../controllers/AddProjectController');
const SearchProjectsController = require('../controllers/SearchProjectsController');

const router = express.Router();

router.get('/search/suggestions', async (req, res) => {
  try {
    const controller = new SearchProjectsController(req.app.locals.db);
    const keyword = req.query.keyword;

    if (typeof keyword !== 'string' || !keyword.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid keyword.'
      });
    }

    const suggestions = await controller.getAutocompleteSuggestions(keyword);

    return res.status(200).json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Autocomplete suggestions failed:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve search suggestions.'
    });
  }
});

router.get('/search', async (req, res) => {
  try {
    const controller = new SearchProjectsController(
      req.app.locals.db
    );

    const criteria = {
      keyword: req.query.keyword ?? '',
      selectedStyles: req.query.selectedStyles
       ? String(req.query.selectedStyles).split(',')
       : [],
      propertyType: req.query.propertyType ?? '',
      roomType: req.query.roomType ?? '',
      projectStatus: req.query.projectStatus ?? '',
      sortOption: req.query.sortOption ?? ''
    };

    if (!controller.validateSearchCriteria(criteria)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid keyword or at least one filter.'
      });
    }

    const results = await controller.searchProjects(criteria);

    const suggestions =
      results.length === 0
      ? controller.suggestBroaderCriteria(criteria)
      : [];

    return res.status(200).json({
      success: true,
      data: results,
      suggestions
    });

  } catch (error) {
    console.error('Project search failed:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to search projects.'
    });
  }
});
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
