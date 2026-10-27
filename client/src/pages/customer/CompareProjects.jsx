import React from 'react';

/*
 * FEATURE: Compare Interior Design Projects
 * OWNER: Comparison feature teammate
 *
 * BCE Boundary Class: ComparisonGUI
 *
 * Shared data:
 * - Project: title, description, style, propertyType,
 *   numRooms, areaSqm, estimatedBudget, designerId
 *
 * Responsibilities:
 * - Display selected projects side by side
 * - Allow users to remove projects from comparison
 * - Display designer ratings and reviews when available
 * - Show a maximum of 3 projects
 *
 * Integration:
 * - ProjectCard.jsx provides the onCompare callback
 * - ExploreProjects.jsx forwards comparison props
 * - ComparisonController.js handles backend logic
 *
 * Reference: docs/shared-data-and-api.md
 */

export default function CompareProjects({
  selectedProjects = [],
  onRemoveProject
}) {
  // TODO: Implement comparison interface.
  // TODO: Display shared project attributes.
  // TODO: Handle empty comparison state.
  // TODO: Show designer ratings and reviews.

  return (
    <div className="page section compare-page">
      <span className="eyebrow">Discover</span>
      <h1>Compare Projects</h1>

      {/* TODO: Teammate implements comparison UI here. */}
    </div>
  );
}
