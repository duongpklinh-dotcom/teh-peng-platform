
const test = require('node:test');
const assert = require('node:assert/strict');
const { ObjectId } = require('mongodb');

const ViewProjectDetailsController = require(
  '../controllers/ViewProjectDetailsController'
);

// ----------------------------------------------------
// TEST DATA
// ----------------------------------------------------

const projectId = new ObjectId();
const designerId = new ObjectId();
const companyId = new ObjectId();
const relatedProjectId = new ObjectId();

const sampleProject = {
  _id: projectId,
  designerId,
  title: 'Modern HDB',
  description: 'Minimalist interior design',
  style: 'Minimalist',
  propertyType: 'HDB',
  roomType: 'Living Room',
  projectStatus: 'ongoing',
  isPublished: true,
  images: [
    '/projects/living-room.jpg',
    '/projects/kitchen.jpg'
  ]
};

const sampleDesigner = {
  _id: designerId,
  name: 'Test Designer',
  role: 'interior_designer',
  companyId
};

const sampleProfile = {
  designerId,
  displayName: 'Alex Tan',
  profileDescription: 'Demo designer profile',
  specialisation: 'Residential and commercial interiors',
  companyId
};

const sampleCompany = {
  _id: companyId,
  companyName: 'Test Design Company',
  companyDescription: 'Interior design company'
};

const relatedProject = {
  _id: relatedProjectId,
  designerId,
  title: 'Modern Kitchen',
  isPublished: true,
  images: []
};

// ----------------------------------------------------
// MOCK DATABASE
// ----------------------------------------------------

function createMockDb({
  project = sampleProject,
  designer = sampleDesigner,
  profile = sampleProfile,
  company = sampleCompany,
  related = [relatedProject]
} = {}) {
  return {
    collection(name) {

      if (name === 'projects') {
        return {
          async findOne(query) {
            if (
              !project ||
              query._id.toString() !==
                project._id.toString() ||
              project.isPublished !== true
            ) {
              return null;
            }

            return project;
          },

          find(query) {
            let results = [];

            if (query._id?.$ne) {
              results = related.filter(item =>
                item.designerId?.toString() ===
                  query.designerId?.toString() &&
                item._id.toString() !==
                  query._id.$ne.toString() &&
                item.isPublished === true
              );

            } else if (query.designerId) {
              results = [
                ...(project?.isPublished ? [project] : []),
                ...related
              ].filter(item =>
                item.designerId?.toString() ===
                  query.designerId.toString() &&
                item.isPublished === true
              );

            } else {
              results = project?.isPublished
                ? [project]
                : [];
            }

            return {
              limit() {
                return this;
              },

              async toArray() {
                return results;
              }
            };
          }
        };
      }

      if (name === 'users') {
        return {
          async findOne(query) {
            if (
              !designer ||
              query._id.toString() !==
                designer._id.toString() ||
              designer.role !== 'interior_designer'
            ) {
              return null;
            }

            return designer;
          }
        };
      }

      if (name === 'designerProfiles') {
        return {
          async findOne(query) {
            if (
              !profile ||
              query.designerId.toString() !==
                profile.designerId.toString()
            ) {
              return null;
            }

            return profile;
          }
        };
      }

      if (name === 'companies') {
        return {
          async findOne(query) {
            if (
              !company ||
              query._id.toString() !==
                company._id.toString()
            ) {
              return null;
            }

            return company;
          }
        };
      }

      throw new Error(
        `Unexpected collection: ${name}`
      );
    }
  };
}

// ----------------------------------------------------
// PROJECT RETRIEVAL TESTS
// ----------------------------------------------------

// TEST 1
test('Retrieves a published project by ID', async () => {
  const controller = new ViewProjectDetailsController(
    createMockDb()
  );

  const result = await controller.getProjectDetails(
    projectId.toString()
  );

  assert.equal(result.title, 'Modern HDB');
  assert.equal(result.isPublished, true);
});

// TEST 2
test('Returns null for an invalid project ID', async () => {
  const controller = new ViewProjectDetailsController(
    createMockDb()
  );

  const result = await controller.getProjectDetails(
    'invalid-id'
  );

  assert.equal(result, null);
});

// TEST 3
test('Returns null when a project does not exist', async () => {
  const controller = new ViewProjectDetailsController(
    createMockDb({
      project: null
    })
  );

  const result = await controller.getProjectDetails(
    projectId.toString()
  );

  assert.equal(result, null);
});

// TEST 4
test('Does not retrieve unpublished projects', async () => {
  const controller = new ViewProjectDetailsController(
    createMockDb({
      project: {
        ...sampleProject,
        isPublished: false
      }
    })
  );

  const result = await controller.getProjectDetails(
    projectId.toString()
  );

  assert.equal(result, null);
});

// ----------------------------------------------------
// PROJECT IMAGE TESTS
// ----------------------------------------------------

// TEST 5
test('Retrieves multiple project images', async () => {
  const controller = new ViewProjectDetailsController(
    createMockDb()
  );

  const images = await controller.getProjectImages(
    projectId.toString()
  );

  assert.equal(images.length, 2);

  assert.equal(
    images[0],
    '/projects/living-room.jpg'
  );
});

// TEST 6
test('Handles missing project images', async () => {
  const controller = new ViewProjectDetailsController(
    createMockDb({
      project: {
        ...sampleProject,
        images: null
      }
    })
  );

  const images = await controller.getProjectImages(
    projectId.toString()
  );

  assert.deepEqual(images, []);
});

// ----------------------------------------------------
// DESIGNER INFORMATION TESTS
// ----------------------------------------------------

// TEST 7
test('Retrieves the associated interior designer', async () => {
  const controller = new ViewProjectDetailsController(
    createMockDb()
  );

  const designer = await controller.getDesignerInfo(
    projectId.toString()
  );

  assert.equal(designer.name, 'Alex Tan');
});

// TEST 8
test('Handles unavailable designer information', async () => {
  const controller = new ViewProjectDetailsController(
    createMockDb({
      designer: null,
      profile: null
    })
  );

  const designer = await controller.getDesignerInfo(
    projectId.toString()
  );

  assert.equal(designer, null);
});

// ----------------------------------------------------
// COMPANY INFORMATION TESTS
// ----------------------------------------------------

// TEST 9
test('Retrieves the associated company', async () => {
  const controller = new ViewProjectDetailsController(
    createMockDb()
  );

  const company = await controller.getCompanyInfo(
    projectId.toString()
  );

  assert.equal(
    company.companyName,
    'Test Design Company'
  );
});

// TEST 10
test('Handles a designer without a company', async () => {
  const controller = new ViewProjectDetailsController(
    createMockDb({
      designer: {
        ...sampleDesigner,
        companyId: null
      },

      profile: {
        ...sampleProfile,
        companyId: null
      }
    })
  );

  const company = await controller.getCompanyInfo(
    projectId.toString()
  );

  assert.equal(company, null);
});

// ----------------------------------------------------
// RELATED PORTFOLIO TESTS
// ----------------------------------------------------

// TEST 11
test('Retrieves other published portfolio projects', async () => {
  const controller = new ViewProjectDetailsController(
    createMockDb()
  );

  const related = await controller.getRelatedPortfolio(
    projectId.toString()
  );

  assert.equal(related.length, 1);

  assert.equal(
    related[0].title,
    'Modern Kitchen'
  );
});

// TEST 12
test('Handles an empty related portfolio', async () => {
  const controller = new ViewProjectDetailsController(
    createMockDb({
      related: []
    })
  );

  const related = await controller.getRelatedPortfolio(
    projectId.toString()
  );

  assert.deepEqual(related, []);
});

// ----------------------------------------------------
// PROJECT AVAILABILITY TESTS
// ----------------------------------------------------

// TEST 13
test('Validates project availability', () => {
  const controller = new ViewProjectDetailsController(
    createMockDb()
  );

  assert.equal(
    controller.validateProjectAvailability(sampleProject),
    true
  );

  assert.equal(
    controller.validateProjectAvailability({
      ...sampleProject,
      isPublished: false
    }),
    false
  );
});

// TEST 14
test('Returns an unavailable-project message', () => {
  const controller = new ViewProjectDetailsController(
    createMockDb()
  );

  const result = controller.handleUnavailableProject();

  assert.equal(result.success, false);

  assert.match(
    result.error,
    /unavailable/
  );
});

// ----------------------------------------------------
// PROJECT FORMATTING AND LISTING TESTS
// ----------------------------------------------------

// TEST 15
test('Formats a project for the frontend', () => {
  const controller = new ViewProjectDetailsController(
    createMockDb()
  );

  const result = controller.formatProject(
    sampleProject
  );

  assert.equal(
    result.id,
    projectId.toString()
  );

  assert.equal(
    result.title,
    'Modern HDB'
  );

  assert.equal(
    result.images.length,
    2
  );

  assert.equal(
    result.designerId,
    designerId.toString()
  );
});

// TEST 16
test('Retrieves published projects for the listing', async () => {
  const controller = new ViewProjectDetailsController(
    createMockDb()
  );

  const results = await controller.getPublishedProjects();

  assert.equal(results.length, 1);

  assert.equal(
    results[0].title,
    'Modern HDB'
  );

  assert.equal(
    results[0].designer,
    'Alex Tan'
  );
});

// ----------------------------------------------------
// RELATED PROJECT NAVIGATION
// ----------------------------------------------------

// TEST 17
test('Retrieves another portfolio project by ID', async () => {
  const controller = new ViewProjectDetailsController(
    createMockDb({
      project: relatedProject
    })
  );

  const result = await controller.navigateToRelatedProject(
    relatedProjectId.toString()
  );

  assert.equal(
    result.title,
    'Modern Kitchen'
  );
});

// ----------------------------------------------------
// PUBLIC DESIGNER PROFILE TESTS
// ----------------------------------------------------

// TEST 18
test('Retrieves a designer public profile', async () => {
  const controller = new ViewProjectDetailsController(
    createMockDb()
  );

  const result = await controller.getDesignerInfo(
    projectId.toString()
  );

  assert.equal(result.name, 'Alex Tan');

  assert.equal(
    result.profileDescription,
    'Demo designer profile'
  );
});

// TEST 19
test('Retrieves the designer portfolio and company', async () => {
  const controller = new ViewProjectDetailsController(
    createMockDb()
  );

  const result = await controller.getDesignerPortfolio(
    designerId.toString()
  );

  assert.equal(
    result.designer.name,
    'Alex Tan'
  );

  assert.equal(
    result.company.companyName,
    'Test Design Company'
  );

  assert.equal(
    result.projects.length,
    2
  );
});

// TEST 20
test('Rejects an invalid designer portfolio ID', async () => {
  const controller = new ViewProjectDetailsController(
    createMockDb()
  );

  const result = await controller.getDesignerPortfolio(
    'invalid-designer-id'
  );

  assert.equal(result, null);
});

// ----------------------------------------------------
// MIGRATED SAMPLE STUDIO TESTS
// ----------------------------------------------------

// TEST 21
test('Retrieves a sample studio without a login account', async () => {
  const demoProfile = {
    ...sampleProfile,
    displayName: 'Sample Design Studio 1',
    isDemo: true
  };

  const controller = new ViewProjectDetailsController(
    createMockDb({
      designer: null,
      profile: demoProfile
    })
  );

  const result = await controller.getDesignerInfo(
    projectId.toString()
  );

  assert.equal(
    result.name,
    'Sample Design Studio 1'
  );

  assert.equal(
    result.isDemo,
    true
  );
});

// TEST 22
test('Retrieves a migrated sample studio portfolio', async () => {
  const demoProfile = {
    ...sampleProfile,
    displayName: 'Sample Design Studio 1',
    isDemo: true
  };

  const controller = new ViewProjectDetailsController(
    createMockDb({
      designer: null,
      profile: demoProfile
    })
  );

  const result = await controller.getDesignerPortfolio(
    designerId.toString()
  );

  assert.equal(
    result.designer.name,
    'Sample Design Studio 1'
  );

  assert.equal(
    result.designer.isDemo,
    true
  );

  assert.equal(
    result.projects.length,
    2
  );

  assert.equal(
    result.company.companyName,
    'Test Design Company'
  );
});
