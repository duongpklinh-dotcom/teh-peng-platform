
const { ObjectId } = require('mongodb');

/*
 * US-02: View Interior Design Project Details
 *
 * Supports:
 * - Registered interior designers with user accounts
 * - Fictional demo studios with public profiles only
 * - Published project details and images
 * - Designer and company information
 * - Related portfolio projects
 * - MongoDB-backed project listings
 */

class ViewProjectDetailsController {
  constructor(db) {
    this.projects = db.collection('projects');
    this.users = db.collection('users');
    this.companies = db.collection('companies');
    this.designerProfiles = db.collection('designerProfiles');
  }

  toObjectId(id) {
    if (id instanceof ObjectId) {
      return id;
    }

    if (
      typeof id !== 'string' ||
      !/^[0-9a-fA-F]{24}$/.test(id)
    ) {
      return null;
    }

    return new ObjectId(id);
  }

  // Retrieve a published project by its MongoDB ID.
  async getProjectDetails(projectId) {
    const objectId = this.toObjectId(projectId);

    if (!objectId) {
      return null;
    }

    return await this.projects.findOne({
      _id: objectId,
      isPublished: true
    });
  }

  // Retrieve images belonging to a project.
  async getProjectImages(projectId) {
    const project = await this.getProjectDetails(projectId);

    if (!project || !Array.isArray(project.images)) {
      return [];
    }

    return project.images;
  }

  /*
   * Internal helper:
   * Resolve a designer using either:
   * 1. The existing users collection, or
   * 2. The public designerProfiles collection.
   *
   * Demo studios can exist without authentication accounts.
   */
  async resolveDesigner(designerId) {
    const objectId = this.toObjectId(designerId);

    if (!objectId) {
      return null;
    }

    const user = await this.users.findOne(
      {
        _id: objectId,
        role: 'interior_designer'
      },
      {
        projection: {
          name: 1,
          role: 1,
          companyId: 1
        }
      }
    );

    let profile = null;

    try {
      profile = await this.designerProfiles.findOne({
        designerId: objectId
      });
    } catch (error) {
      console.error('Designer profile retrieval failed:', error);
    }

    if (!user && !profile) {
      return null;
    }

    return {
      _id: objectId,
      name:
        profile?.displayName ||
        user?.name ||
        'Designer unavailable',
      profileDescription:
        profile?.profileDescription || '',
      specialisation:
        profile?.specialisation || '',
      companyId:
        profile?.companyId ||
        user?.companyId ||
        null,
      isDemo: profile?.isDemo === true
    };
  }

  // Retrieve designer information for a selected project.
  async getDesignerInfo(projectId) {
    const project = await this.getProjectDetails(projectId);

    if (!project?.designerId) {
      return null;
    }

    return await this.resolveDesigner(project.designerId);
  }

  // Retrieve the company associated with a project designer.
  async getCompanyInfo(projectId) {
    const designer = await this.getDesignerInfo(projectId);

    if (!designer?.companyId) {
      return null;
    }

    const companyId = this.toObjectId(designer.companyId);

    if (!companyId) {
      return null;
    }

    return await this.companies.findOne(
      { _id: companyId },
      {
        projection: {
          companyName: 1,
          companyDescription: 1,
          specialisation: 1,
          location: 1,
          address: 1,
          contactInformation: 1,
          isDemo: 1
        }
      }
    );
  }

  // Retrieve other published projects by the same designer.
  async getRelatedPortfolio(projectId) {
    const project = await this.getProjectDetails(projectId);

    if (!project?.designerId) {
      return [];
    }

    const designerId = this.toObjectId(project.designerId);

    if (!designerId) {
      return [];
    }

    return await this.projects.find({
      designerId,
      _id: { $ne: project._id },
      isPublished: true
    })
      .limit(8)
      .toArray();
  }

  // Check whether the selected project is published.
  validateProjectAvailability(project) {
    return Boolean(
      project &&
      project.isPublished === true
    );
  }

  // Handle unavailable or unpublished projects.
  handleUnavailableProject() {
    return {
      success: false,
      error: 'This project is unavailable or could not be retrieved.'
    };
  }

  // Retrieve another selected portfolio project.
  async navigateToRelatedProject(projectId) {
    return await this.getProjectDetails(projectId);
  }

  // Format a project for React.
  formatProject(project) {
    if (!project) {
      return null;
    }

    const images = Array.isArray(project.images)
      ? project.images
      : [];

    const firstImage = images[0];

    const image = typeof firstImage === 'string'
      ? firstImage
      : firstImage?.imagePath ||
        firstImage?.url ||
        firstImage?.src ||
        null;

    return {
      id: project._id.toString(),

      // Preserves the original sample ID for US-01
      // image similarity mapping.
      legacySampleId: project.legacySampleId || null,

      title: project.title || '',
      description: project.description || '',
      category: project.category || '',
      style: project.style || '',
      propertyType: project.propertyType || '',
      roomType: project.roomType || '',
      numRooms: project.numRooms ?? null,
      areaSqm: project.areaSqm ?? null,
      estimatedBudget: project.estimatedBudget ?? null,
      projectStatus: project.projectStatus || '',

      images,
      image,

      designerId:
        project.designerId?.toString() || null,

      createdAt: project.createdAt || null,
      featured: project.featured === true,
      isSample: project.isSample === true
    };
  }

  // Retrieve all published projects from MongoDB.
  async getPublishedProjects() {
    const projects = await this.projects.find({
      isPublished: true
    })
      .limit(200)
      .toArray();

    return await Promise.all(
      projects.map(async (project) => {
        const formatted = this.formatProject(project);

        let designer = null;

        try {
          designer = await this.resolveDesigner(
            project.designerId
          );
        } catch (error) {
          console.error(
            'Project designer retrieval failed:',
            error
          );
        }

        return {
          ...formatted,
          designer:
            designer?.name ||
            'Designer unavailable'
        };
      })
    );
  }

  // Retrieve a designer's complete published portfolio.
  async getDesignerPortfolio(designerId) {
    const objectId = this.toObjectId(designerId);

    if (!objectId) {
      return null;
    }

    const designer = await this.resolveDesigner(objectId);

    if (!designer) {
      return null;
    }

    let company = null;

    const companyId = this.toObjectId(
      designer.companyId
    );

    if (companyId) {
      try {
        company = await this.companies.findOne(
          { _id: companyId },
          {
            projection: {
              companyName: 1,
              companyDescription: 1,
              specialisation: 1,
              location: 1,
              address: 1,
              contactInformation: 1,
              isDemo: 1
            }
          }
        );
      } catch (error) {
        console.error(
          'Company retrieval failed:',
          error
        );
      }
    }

    const projects = await this.projects.find({
      designerId: objectId,
      isPublished: true
    }).toArray();

    return {
      designer: {
        id: designer._id.toString(),
        name: designer.name,
        profileDescription:
          designer.profileDescription,
        specialisation:
          designer.specialisation,
        isDemo: designer.isDemo
      },

      company: company ? {
        id: company._id.toString(),
        companyName:
          company.companyName || '',
        companyDescription:
          company.companyDescription || '',
        specialisation:
          company.specialisation || '',
        location:
          company.location || '',
        address:
          company.address || '',
        contactInformation:
          company.contactInformation || '',
        isDemo:
          company.isDemo === true
      } : null,

      projects: projects.map(project =>
        this.formatProject(project)
      )
    };
  }
}

module.exports = ViewProjectDetailsController;