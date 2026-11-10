
const express = require('express');

const { requireAuth, requireRole } = require('../middleware/auth');

const AddProjectController = require('../controllers/AddProjectController');
const SearchProjectsController = require('../controllers/SearchProjectsController');
const ViewProjectDetailsController = require('../controllers/ViewProjectDetailsController');

const router = express.Router();

/*
 * US-01: Search autocomplete suggestions
 */
router.get('/search/suggestions', async (req, res) => {
  try {
    const controller = new SearchProjectsController(
      req.app.locals.db
    );

    const keyword = req.query.keyword;

    if (typeof keyword !== 'string' || !keyword.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid keyword.'
      });
    }

    const suggestions =
      await controller.getAutocompleteSuggestions(keyword);

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

/*
 * US-01: Search interior design projects
 */
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

    const suggestions = results.length === 0
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

/*
 * US-02: Retrieve published MongoDB projects
 */
router.get('/public', async (req, res) => {
  try {
    const controller = new ViewProjectDetailsController(
      req.app.locals.db
    );

    const projects = await controller.getPublishedProjects();

    return res.status(200).json({
      success: true,
      data: projects
    });

  } catch (error) {
    console.error('Published projects retrieval failed:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve published projects.'
    });
  }
});

/*
 * US-02: Retrieve the selected designer's portfolio
 */
router.get('/designers/:designerId', async (req, res) => {
  try {
    const controller = new ViewProjectDetailsController(
      req.app.locals.db
    );

    const portfolio = await controller.getDesignerPortfolio(
      req.params.designerId
    );

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Designer portfolio unavailable.'
      });
    }

    return res.status(200).json({
      success: true,
      data: portfolio
    });

  } catch (error) {
    console.error('Designer portfolio retrieval failed:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve designer portfolio.'
    });
  }
});

/*
 * Existing feature: Add an interior design project
 */
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

      return res.status(201).json({
        success: true,
        data: result
      });

    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/*
 * US-02: Retrieve the selected project's full details
 */
router.get('/:projectId', async (req, res) => {
  try {
    const controller = new ViewProjectDetailsController(
      req.app.locals.db
    );

    const projectId = req.params.projectId;

    const project = await controller.getProjectDetails(projectId);

    if (!controller.validateProjectAvailability(project)) {
      return res.status(404).json(
        controller.handleUnavailableProject()
      );
    }

    // Optional information should not prevent the main
    // project from being displayed.
    async function optionalData(operation, fallback) {
      try {
        return await operation();
      } catch (error) {
        console.error(
          'Optional project information failed:',
          error
        );

        return fallback;
      }
    }

    const [
      images,
      designer,
      company,
      relatedProjects
    ] = await Promise.all([
      optionalData(
        () => controller.getProjectImages(projectId),
        []
      ),
      optionalData(
        () => controller.getDesignerInfo(projectId),
        null
      ),
      optionalData(
        () => controller.getCompanyInfo(projectId),
        null
      ),
      optionalData(
        () => controller.getRelatedPortfolio(projectId),
        []
      )
    ]);

    return res.status(200).json({
      success: true,
      data: {
        project: controller.formatProject(project),

        images,

        designer: designer ? {
          id: designer._id.toString(),
          name: designer.name || '',
          profileDescription:
            designer.profileDescription || '',
          specialisation:
            designer.specialisation || ''
        } : null,

        company: company ? {
          id: company._id.toString(),
          companyName: company.companyName || '',
          companyDescription:
            company.companyDescription || '',
          specialisation:
            company.specialisation || '',
          location: company.location || '',
          address: company.address || '',
          contactInformation:
            company.contactInformation || ''
        } : null,

        relatedProjects: relatedProjects.map(
          relatedProject =>
            controller.formatProject(relatedProject)
        )
      }
    });

  } catch (error) {
    console.error('Project details retrieval failed:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve project details.'
    });
  }
});

module.exports = router;
