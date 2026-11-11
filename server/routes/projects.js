const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, requireRole } = require('../middleware/auth');
const AddProjectController = require('../controllers/AddProjectController');
const EditProjectController = require('../controllers/EditProjectController');
const SearchProjectsController = require('../controllers/SearchProjectsController');
const ViewProjectDetailsController = require('../controllers/ViewProjectDetailsController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');


const router = express.Router();


/* CUSTOMER — SEARCH AUTOCOMPLETE */
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

/* CUSTOMER — SEARCH PROJECTS */
router.get('/search', async (req, res) => {
  try {
    const controller = new SearchProjectsController(req.app.locals.db);

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

    return res.status(200).json({
      success: true,
      data: results,
      suggestions: results.length === 0
        ? controller.suggestBroaderCriteria(criteria)
        : []
    });
  } catch (error) {
    console.error('Project search failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Unable to search projects.'
    });
  }
});


/* CUSTOMER — VIEW PUBLISHED PROJECTS */
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

/* CUSTOMER — VIEW DESIGNER PORTFOLIO */
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

      res.status(201).json({
        success: true,
        data: result
      });

    } catch (error) {
      // Remove uploaded files if project creation fails.
      await Promise.all(
        (req.files || []).map(file =>
          fs.promises.unlink(file.path).catch(() => {})
        )
      );

      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);


/* =========================================
   EDIT PROJECT — GET EXISTING DETAILS
   ========================================= */

router.get(
  '/mine/:id',
  requireAuth,
  requireRole('interior_designer'),
  async (req, res) => {
    try {
      const controller = new EditProjectController(
        req.app.locals.db
      );

      const project = await controller.getProjectDetails(
        req.params.id,
        req.user.id
      );

      res.json({
        success: true,
        data: {
          ...project,
          id: project._id.toString()
        }
      });

    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/* =========================================
   EDIT PROJECT — SAVE CHANGES
   ========================================= */

router.patch(
  '/mine/:id',
  requireAuth,
  requireRole('interior_designer'),
  (req, res, next) => {
    upload.array('images', 5)(req, res, error => {
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      next();
    });
  },
  async (req, res) => {
    const uploadedFiles = req.files || [];

    async function removeUploadedFiles() {
      await Promise.all(
        uploadedFiles.map(file =>
          fs.promises.unlink(file.path).catch(() => {})
        )
      );
    }

    try {
      const controller = new EditProjectController(
        req.app.locals.db
      );

      // Retrieve the original project.
      const original = await controller.getProjectDetails(
        req.params.id,
        req.user.id
      );

      // Read the images the designer wants to keep.
      const existingImages = JSON.parse(
        req.body.existingImages || '[]'
      );

      if (
        !Array.isArray(existingImages) ||
        existingImages.some(image => typeof image !== 'string')
      ) {
        throw new Error('Invalid existing image selection');
      }

      const originalImages = (original.images || [])
        .map(image =>
          typeof image === 'string' ? image : image?.url
        )
        .filter(Boolean);

      // Prevent using image paths from another project.
      if (
        new Set(existingImages).size !== existingImages.length ||
        existingImages.some(
          image => !originalImages.includes(image)
        )
      ) {
        throw new Error('Invalid project image selection');
      }

      // Generate paths for newly uploaded images.
      const newUploadPaths = uploadedFiles.map(
        file => `/uploads/projects/${file.filename}`
      );

      const images = [
        ...existingImages,
        ...newUploadPaths
      ];

      if (images.length > 5) {
        throw new Error('Maximum 5 project images allowed');
      }

      // Save edited information through the controller.
      const updatedProject =
        await controller.editProjectDetails(
          req.params.id,
          req.user.id,
          {
            ...req.body,
            images,
            newUploadPaths
          }
        );

      // Delete old image files removed from the project.
      const removedImages = originalImages.filter(
        image => !images.includes(image)
      );

      await Promise.all(
        removedImages.map(async image => {
          if (!image.startsWith('/uploads/projects/')) {
            return;
          }

          const filename = path.basename(image);

          const filePath = path.join(
            uploadDirectory,
            filename
          );

          await fs.promises.unlink(filePath).catch(error => {
            console.error(
              'Unable to remove old project image:',
              error
            );
          });
        })
      );

      res.json({
        success: true,
        data: {
          ...updatedProject,
          id: updatedProject._id.toString()
        },
        message: 'Project updated successfully'
      });

    } catch (error) {
      // Remove newly uploaded files if saving fails.
      await removeUploadedFiles();

      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);


/* =========================================
   MY PROJECTS — PUBLISH / UNPUBLISH
   ========================================= */

router.patch(
  '/mine/:id/publication',
  requireAuth,
  requireRole('interior_designer'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const designerId = req.user.id;
      const { isPublished } = req.body || {};

      // Validate project and designer IDs
      if (
        !ObjectId.isValid(id) ||
        !ObjectId.isValid(designerId)
      ) {
        return res.status(400).json({
          success: false,
          error: 'Invalid project ID'
        });
      }

      // Only accept a Boolean
      if (typeof isPublished !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Invalid publication status'
        });
      }

      // Update only a project owned by this designer
      const result = await req.app.locals.db
        .collection('projects')
        .updateOne(
          {
            _id: new ObjectId(id),
            designerId: new ObjectId(designerId)
          },
          {
            $set: {
              isPublished,
              updatedAt: new Date()
            }
          }
        );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or access denied'
        });
      }

      res.json({
        success: true,
        data: {
          id,
          isPublished
        },
        message: isPublished
          ? 'Project published successfully'
          : 'Project unpublished successfully'
      });

    } catch (error) {
      console.error('Publication update failed:', error);

      res.status(500).json({
        success: false,
        error: 'Unable to update publication status'
      });
    }
  }
);

router.get('/:id', async (req, res) => {
  try {
    const controller = new ViewProjectDetailsController(req.app.locals.db);
    const id = req.params.id;

    const project = await controller.getProjectDetails(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project unavailable'
      });
    }

    const [designer, company, relatedProjects, images] = await Promise.all([
      controller.getDesignerInfo(id),
      controller.getCompanyInfo(id),
      controller.getRelatedPortfolio(id),
      controller.getProjectImages(id)
    ]);

    return res.json({
      success: true,
      data: {
        project: controller.formatProject(project),
        designer,
        company,
        relatedProjects: relatedProjects.map(p => controller.formatProject(p)),
        images
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve project details'
    });
  }
});

module.exports = router;
