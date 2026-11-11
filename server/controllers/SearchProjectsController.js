/*
 * FEATURE: Search Projects
 * OWNER: Customer feature team
 *
 * BCE CONTROL CLASS: SearchProjectsController
 *
 * BCE BOUNDARY: SearchProjectsPage
 *
 * BCE ENTITIES:
 * - SearchCriteria
 * - SearchResult
 * - InteriorDesignProject
 * - ProjectImage
 *
 * EXISTING SHARED DATA:
 * - projects collection
 * - Project entity
 *
 * EXISTING FRONTEND:
 * - client/src/pages/public/ExploreProjects.jsx
 *
 * NOTE:
 * Method names follow the approved BCE class diagram.
 * Parameters and implementation belong to the feature owner.
 */

class SearchProjectsController {
  constructor(db) {
    this.projects = db.collection('projects');
  }

  validateSearchCriteria(criteria) {
    // Allow a keyword string, as used by the existing unit test.
    if (typeof criteria === 'string' ) {
      return criteria.trim().length > 0;
    }

    // Reject null, arrays, and other invalid inputs.
    if (
      criteria === null ||
      typeof criteria !== 'object' ||
      Array.isArray(criteria)
    ) {
      return false;
    }

    // Check whether the keyword is valid when supplied.
    if (
      criteria.keyword !== undefined &&
      typeof criteria.keyword !== 'string'
    ){
      return false;
    }

    // Check whether the optional selected styles are valid.
    if (
      criteria.selectedStyles !== undefined &&
      (
        !Array.isArray(criteria.selectedStyles) ||
        !criteria.selectedStyles.every(
          style => typeof style === 'string'
        )
      )
    ) {
      return false;
    }

    // Optional filters and sorting must be strings when supplied.
    const optionalFields = [
      'propertyType',
      'roomType',
      'projectStatus',
      'sortOption'
    ];

    for (const field of optionalFields) {
      if (
        criteria[field] !== undefined &&
        typeof criteria[field] !== 'string'
      ) {
        return false;
      }
    }

    // Check whether a meaningful keyword was entered.
    const hasKeyword =
      typeof criteria.keyword === 'string' &&
      criteria.keyword.trim().length > 0;

    // Check whether at least one design style was seletced.
    const hasStyleFilter =
      Array.isArray(criteria.selectedStyles) &&
      criteria.selectedStyles.some(
        style => style.trim().length > 0
      );

    // Check whether at least one other filter was selected.
    const hasOtherFilter = [
      'propertyType',
      'roomType',
      'projectStatus'
    ].some(
      field =>
        typeof criteria[field] === 'string' &&
        criteria[field].trim().length > 0
    );
    // A valid search must contain a keyword or at least one filter.
    return hasKeyword || hasStyleFilter || hasOtherFilter;
  }

  async getAutocompleteSuggestions(keyword) {
    // Step 1: Reject invalid or empty keywords.
    if (
      typeof keyword !== 'string' ||
      keyword.trim().length === 0
    ) {
      return [];
    }

    // Step 2: Normalize the keyword for case-insentive matching.
    const normalizedKeyword = keyword.trim().toLowerCase();

    // Step 3: Retrieve published projects from MongoDB.
    const projects = await this.projects
      .find({ isPublished: true })
      .toArray();

    // Step 4: Find matching titles from published projects.
    const matchingTitles = projects
      .filter(project =>
        project.isPublished === true &&
        typeof project.title === 'string' &&
        project.title.toLowerCase().includes(normalizedKeyword)
      )

      .map(project => project.title);

      // Step 5: Remove duplicate titles.
      return [...new Set(matchingTitles)];
  }

  async searchProjects(criteria) {
    // Step 1: Validate the customer's search criteria.
    if (!this.validateSearchCriteria(criteria)) {
      return [];
    }

    // Step 2: Convert a string keyword into a criteria object.
    const searchCriteria =
      typeof criteria === 'string'
      ? { keyword: criteria }
      : criteria;

    // Step 3: Retrieve published projects from MongoDB.
    const projects = await this.projects
      .find({ isPublished: true })
      .toArray();

    // Step 4: Extract and normalize the search keyword.
    const keyword = (searchCriteria.keyword || '')
      .trim()
      .toLowerCase();

    // Step 5: Return projects matching the keyword.
    const keywordMatches = projects.filter(project => {
      // Do not expose unpublished projects to customers.
      if (project.isPublished !== true) {
        return false;
      }

      const title = (project.title || '').toLowerCase();
      const description = (project.description || '').toLowerCase();

      return (
        title.includes(keyword) ||
        description.includes(keyword)
      );
    });

    // Step 6: Apply the customer's selected filters.
    const filteredProjects = this.applyFilters(
      keywordMatches,
      searchCriteria
    );

    // Step 7: Sort the filtered projects.
    const sortedProjects = this.applySorting(
      filteredProjects,
      searchCriteria.sortOption
    );

    // Step 8: Apply the relevance ranking when requested.
    if (searchCriteria.sortOption === 'relevance') {
      return this.rankResults(sortedProjects, keyword);
    }

    // Step 9: Return the results in their selected order.
    return sortedProjects;
  }

  applyFilters(projects, criteria) {
    return projects.filter(project => {

    // Step 1: Check selected design styles.
    const matchesStyle =
      !Array.isArray(criteria.selectedStyles) ||
      criteria.selectedStyles.length === 0 ||
      criteria.selectedStyles.some(
        selectedStyle =>
          typeof project.style === 'string' &&
        project.style.toLowerCase() ===
          selectedStyle.trim().toLowerCase()
      );

    // Step 2: Check property type.
    const matchesPropertyType =
      !criteria.propertyType ||
      (
        typeof project.propertyType === 'string' &&
        project.propertyType.toLowerCase() ===
          criteria.propertyType.trim().toLowerCase()
      );

    // Step 3: Check room type.
    const matchesRoomType =
      !criteria.roomType ||
      (
        typeof project.roomType === 'string' &&
        project.roomType.toLowerCase() ===
          criteria.roomType.trim().toLowerCase()
      );

    // Step 4: Check project status.
    const matchesProjectStatus =
      !criteria.projectStatus ||
      (
        typeof project.projectStatus === 'string' &&
        project.projectStatus.toLowerCase() ===
          criteria.projectStatus.trim().toLowerCase()
      );

    // Step 5: Include only projects matching all conditions.
    return matchesStyle && matchesPropertyType && matchesRoomType && matchesProjectStatus;
    });
  }

  applySorting(projects, sortOption) {
    // Create a copy to avoid changing the original array.
    const sortedProjects = [...projects];

   // Sort projects by creation date, newest first.
   if (sortOption === 'newest') {
     sortedProjects.sort((a, b) =>
       new Date(b.createdAt) - new Date (a.createdAt)
     );
   }

   // Sort projects by creation date, oldest first.
   else if (sortOption === 'oldest') {
    sortedProjects.sort((a ,b) =>
      new Date(a.createdAt) - new Date(b.createdAt)
    );
   }

   return sortedProjects;
  }

  rankResults(projects, keyword) {
    // Normalize the keyword for case-insensitive matching.
    if (typeof keyword !== 'string' || keyword.trim() === '') {
      return [...projects];
    }

    const normalizedKeyword = keyword.trim().toLowerCase();

    // Calculate a relevance score for an individual project.
    const calculateScore = project => {
      let score = 0;

      const title = (project.title || '').toLowerCase();
      const description = (project.description || '').toLowerCase();

      if (title.includes(normalizedKeyword)) {
        score += 2;
      }

      if (description.includes(normalizedKeyword)) {
        score += 1;
      }

      return score;
    };

    // Return a new array ordered by highest relevance first.
    return [...projects].sort(
      (a,b) => calculateScore(b) - calculateScore(a)
    );
  }

  suggestBroaderCriteria() {
    return [
      'Try using fewer or more general keywords.',
      'Try removing one or more filters.'
    ];
  }

  resetSearch(criteria) {
    // Return a new object with all search criteria cleared.
    return {
      keyword: '',
      selectedStyles: [],
      propertyType: '',
      roomType: '',
      projectStatus: '',
      sortOption: ''
    };
  }

  removeSearchFilter(criteria, filterType, value) {
    // Create a copy of the original criteria is not modified.
    const updatedCriteria = {
      ...criteria,
      selectedStyles: [...(criteria.selectedStyles || [])]
    };

    // Remove only the specified design style.
    if (filterType === 'selectedStyles') {
      updatedCriteria.selectedStyles =
        updatedCriteria.selectedStyles.filter(
          style => style !== value
        );
    }

    // Clear an individual string-based filter.
    else if (
      ['propertyType', 'roomType', 'projectStatus']
         .includes(filterType)
    ) {
      updatedCriteria[filterType] = '';
    }

    return updatedCriteria;
  }
}
module.exports = SearchProjectsController;