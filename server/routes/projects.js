const express = require('express');
const { ObjectId } = require('mongodb');
const { requireAuth, requireRole } = require('../middleware/auth');
const AddProjectController = require('../controllers/AddProjectController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');


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


module.exports = router;
