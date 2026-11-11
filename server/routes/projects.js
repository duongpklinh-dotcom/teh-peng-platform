
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

const AddProjectController = require('../controllers/AddProjectController');

const router = express.Router();


router.get(
  '/mine',
  requireAuth,
  requireRole('interior_designer'),
  async (req, res) => {
    try {
      const designerId = req.user.id;

      if (!ObjectId.isValid(designerId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid designer ID'
        });
      }

      const projects = await req.app.locals.db
        .collection('projects')
        .find({
          designerId: new ObjectId(designerId)
        })
        .sort({ createdAt: -1 })
        .toArray();

      res.json({
        success: true,
        data: projects.map(project => ({
          ...project,
          id: project._id.toString()
        }))
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Unable to retrieve projects'
      });
    }
  }
);


/*
 * PUBLIC: View published projects
 * Used by the Explore Projects page.
 */
router.get('/', async (req, res) => {
  try {
    const projects = await req.app.locals.db
      .collection('projects')
      .find({ isPublished: true })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      data: projects.map(project => ({
        ...project,
        id: project._id.toString()
      }))
    });

  } catch (error) {
    console.error('Failed to retrieve projects:', error);

    res.status(500).json({
      success: false,
      error: 'Unable to retrieve projects'
    });
  }
});

const uploadDirectory = path.join(__dirname, '../uploads/projects');

fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedImageTypes = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDirectory);
    },
    filename: (req, file, cb) => {
      cb(null, randomUUID() + allowedImageTypes[file.mimetype]);
    }
  }),
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 5
  },
  fileFilter: (req, file, cb) => {
    if (!allowedImageTypes[file.mimetype]) {
      return cb(new Error('Only JPG, PNG and WebP images are allowed'));
    }

    cb(null, true);
  }
});

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
  upload.array('images', 5),
  async (req, res) => {
    try {
      const projectData = {
        ...req.body,

        numRooms: req.body.numRooms
          ? Number(req.body.numRooms)
          : null,

        areaSqm: req.body.areaSqm
          ? Number(req.body.areaSqm)
          : null,

        estimatedBudget: req.body.estimatedBudget
          ? Number(req.body.estimatedBudget)
          : null,

        images: (req.files || []).map(file =>
          `/uploads/projects/${file.filename}`
        )
      };

      const controller = new AddProjectController(
        req.app.locals.db
      );

      const result = await controller.addProject(
        projectData,
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

module.exports = router;
