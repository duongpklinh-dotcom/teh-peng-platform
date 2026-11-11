const test = require('node:test');
const assert = require('node:assert/strict');

const SearchProjectsController = require('../controllers/SearchProjectsController');

test('Accepts a valid search keyword', () => {
  const fakeDb = {
    collection: () => ({})
  };

  const controller = new SearchProjectsController(fakeDb);

  const result = controller.validateSearchCriteria('Modern kitchen');

  assert.equal(result, true);
});


test('Rejects a blank search keyword', () => {
  const fakeDb = {
    collection: () => ({})
  };

  const controller = new SearchProjectsController(fakeDb);

  const result = controller.validateSearchCriteria('   ');

  assert.equal(result, false);
});


test('Accepts filters without a search keyword', () => {
  const fakeDb = {
    collection: () => ({})
  };

  const controller = new SearchProjectsController(fakeDb);

  const criteria = {
    keyword: '',
    selectedStyles: ['Modern'],
    propertyType: 'HDB'
  };

  const result = controller.validateSearchCriteria(criteria);

  assert.equal(result, true);
});


test('Rejects an invalid keyword data type', () => {
  const fakeDb = {
    collection: () => ({})
  };

  const controller = new SearchProjectsController(fakeDb);

  const criteria = {
    keyword: 123
  };

  const result = controller.validateSearchCriteria(criteria);

  assert.equal(result, false);
});


test('Rejects completely empty search criteria', () => {
  const fakeDb = {
    collection: () => ({})
  };

  const controller = new SearchProjectsController(fakeDb);

  const result = controller.validateSearchCriteria({});

  assert.equal(result, false);
});


test('Searches published projects using a keyword', async () => {
  const fakeProjects = [
    {
      title: 'Modern Kitchen Renovation',
      description: 'A contemporary kitchen design',
      isPublished: true
    },
    {
      title: 'Scandinavian Bedroom Design',
      description: 'A minimalist bedroom',
      isPublished: true
    }
  ];

  const fakeDb = {
    collection: () => ({
      find: () => ({
        toArray: async () => fakeProjects
      })
    })
  };

  const controller = new SearchProjectsController(fakeDb);

  const results = await controller.searchProjects({
    keyword: 'kitchen'
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].title, 'Modern Kitchen Renovation');
});


test('Excludes unpublished projects from search results', async () => {
  const fakeProjects = [
    {
      title: 'Modern Kitchen Renovation',
      description: 'A modern kitchen',
      isPublished: true
    },
    {
      title: 'Private Kitchen Draft',
      description: 'An unfinished kitchen design',
      isPublished: false
    }
  ];

  const fakeDb = {
    collection: () => ({
      find: () => ({
        toArray: async () => fakeProjects
      })
    })
  };

  const controller = new SearchProjectsController(fakeDb);

  const results = await controller.searchProjects({
    keyword: 'kitchen'
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].title, 'Modern Kitchen Renovation');
});


test('Filters published projects by design style', async () => {
  const fakeProjects = [
    {
      title: 'Modern Kitchen Renovation',
      style: 'Modern',
      isPublished: true
    },
    {
      title: 'Scandinavian Bedroom',
      style: 'Scandinavian',
      isPublished: true
    },
    {
      title: 'Modern Living Room',
      style: 'Modern',
      isPublished: true
    }
  ];

  const fakeDb = {
    collection: () => ({
      find: () => ({
        toArray: async () => fakeProjects
      })
    })
  };

  const controller = new SearchProjectsController(fakeDb);

  const results = await controller.searchProjects({
    keyword: '',
    selectedStyles: ['Modern']
  });

  assert.equal(results.length, 2);
  assert.equal(results[0].title, 'Modern Kitchen Renovation');
  assert.equal(results[1].title, 'Modern Living Room');
});


test('Filters published projects by property type', async () => {
  const fakeProjects = [
    {
      title: 'Modern HDB Kitchen',
      propertyType: 'HDB',
      isPublished: true
    },
    {
      title: 'Contemporary Condo Living Room',
      propertyType: 'Condo',
      isPublished: true
    },
    {
      title: 'Scandinavian HDB Bedroom',
      propertyType: 'HDB',
      isPublished: true
    }
  ];

  const fakeDb = {
    collection: () => ({
      find: () => ({
        toArray: async () => fakeProjects
      })
    })
  };

  const controller = new SearchProjectsController(fakeDb);

  const results = await controller.searchProjects({
    keyword: '',
    propertyType: 'HDB'
  });

  assert.equal(results.length, 2);
  assert.equal(results[0].title, 'Modern HDB Kitchen');
  assert.equal(results[1].title, 'Scandinavian HDB Bedroom');
});


test('Filters published projects by room type', async () => {
  const fakeProjects = [
    {
      title: 'Modern Kitchen Renovation',
      roomType: 'Kitchen',
      isPublished: true
    },
    {
      title: 'Scandinavian Bedroom Design',
      roomType: 'Bedroom',
      isPublished: true
    },
    {
      title: 'Contemporary Kitchen Makeover',
      roomType: 'Kitchen',
      isPublished: true
    }
  ];

  const fakeDb = {
    collection: () => ({
      find: () => ({
        toArray: async () => fakeProjects
      })
    })
  };

  const controller = new SearchProjectsController(fakeDb);

  const results = await controller.searchProjects({
    keyword: '',
    roomType: 'Kitchen'
  });

  assert.equal(results.length, 2);
  assert.equal(results[0].title, 'Modern Kitchen Renovation');
  assert.equal(results[1].title, 'Contemporary Kitchen Makeover');
});


test('Filters published projects by project status', async () => {
  const fakeProjects = [
    {
      title: 'Modern Kitchen Renovation',
      projectStatus: 'completed',
      isPublished: true
    },
    {
      title: 'Scandinavian Bedroom Design',
      projectStatus: 'ongoing',
      isPublished: true
    },
    {
      title: 'Contemporary Living Room',
      projectStatus: 'completed',
      isPublished: true
    }
  ];

  const fakeDb = {
    collection: () => ({
      find: () => ({
        toArray: async () => fakeProjects
      })
    })
  };

  const controller = new SearchProjectsController(fakeDb);

  const results = await controller.searchProjects({
    keyword: '',
    projectStatus: 'completed'
  });

  assert.equal(results.length, 2);
  assert.equal(results[0].title, 'Modern Kitchen Renovation');
  assert.equal(results[1].title, 'Contemporary Living Room');
});


test('Applies multiple search filters together', async () => {
  const fakeProjects = [
    {
      title: 'Modern HDB Kitchen',
      style: 'Modern',
      propertyType: 'HDB',
      roomType: 'Kitchen',
      projectStatus: 'completed',
      isPublished: true
    },
    {
      title: 'Modern Condo Kitchen',
      style: 'Modern',
      propertyType: 'Condo',
      roomType: 'Kitchen',
      projectStatus: 'completed',
      isPublished: true
    },
    {
      title: 'Modern HDB Bedroom',
      style: 'Modern',
      propertyType: 'HDB',
      roomType: 'Bedroom',
      projectStatus: 'completed',
      isPublished: true
    },
    {
      title: 'Scandinavian HDB Kitchen',
      style: 'Scandinavian',
      propertyType: 'HDB',
      roomType: 'Kitchen',
      projectStatus: 'completed',
      isPublished: true
    },
    {
      title: 'Modern HDB Kitchen Ongoing',
      style: 'Modern',
      propertyType: 'HDB',
      roomType: 'Kitchen',
      projectStatus: 'ongoing',
      isPublished: true
    }
  ];

  const fakeDb = {
    collection: () => ({
      find: () => ({
        toArray: async () => fakeProjects
      })
    })
  };

  const controller = new SearchProjectsController(fakeDb);

  const results = await controller.searchProjects({
    keyword: '',
    selectedStyles: ['Modern'],
    propertyType: 'HDB',
    roomType: 'Kitchen',
    projectStatus: 'completed'
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].title, 'Modern HDB Kitchen');
});


test('Sorts search results by newest first', async () => {
  const fakeProjects = [
    {
      title: 'Older Kitchen Project',
      isPublished: true,
      createdAt: new Date('2024-01-10')
    },
    {
      title: 'Newest Kitchen Project',
      isPublished: true,
      createdAt: new Date('2026-03-15')
    },
    {
      title: 'Middle Kitchen Project',
      isPublished: true,
      createdAt: new Date('2025-06-20')
    }
  ];

  const fakeDb = {
    collection: () => ({
      find: () => ({
        toArray: async () => fakeProjects
      })
    })
  };

  const controller = new SearchProjectsController(fakeDb);

  const results = await controller.searchProjects({
    keyword: 'Kitchen',
    sortOption: 'newest'
  });

  assert.deepEqual(
    results.map(project => project.title),
    [
      'Newest Kitchen Project',
      'Middle Kitchen Project',
      'Older Kitchen Project'
    ]
  );
});


test('Sorts search results by oldest first', async () => {
  const fakeProjects = [
    {
      title: 'Middle Kitchen Project',
      isPublished: true,
      createdAt: new Date('2025-06-20')
    },
    {
      title: 'Newest Kitchen Project',
      isPublished: true,
      createdAt: new Date('2026-03-15')
    },
    {
      title: 'Older Kitchen Project',
      isPublished: true,
      createdAt: new Date('2024-01-10')
    }
  ];

  const fakeDb = {
    collection: () => ({
      find: () => ({
        toArray: async () => fakeProjects
      })
    })
  };

  const controller = new SearchProjectsController(fakeDb);

  const results = await controller.searchProjects({
    keyword: 'Kitchen',
    sortOption: 'oldest'
  });

  assert.deepEqual(
    results.map(project => project.title),
    [
      'Older Kitchen Project',
      'Middle Kitchen Project',
      'Newest Kitchen Project'
    ]
  );
});


test('Suggests matching published project titles', async () => {
  const fakeProjects = [
    {
      title: 'Modern Kitchen Renovation',
      isPublished: true
    },
    {
      title: 'Kitchen Makeover',
      isPublished: true
    },
    {
      title: 'Scandinavian Bedroom',
      isPublished: true
    },
    {
      title: 'Private Kitchen Design',
      isPublished: false
    }
  ];

  const fakeDb = {
    collection: () => ({
      find: () => ({
        toArray: async () => fakeProjects
      })
    })
  };

  const controller = new SearchProjectsController(fakeDb);

  const suggestions =
    await controller.getAutocompleteSuggestions('kit');

  assert.deepEqual(suggestions, [
    'Modern Kitchen Renovation',
    'Kitchen Makeover'
  ]);
});


test('Resets all search criteria', () => {
  const fakeDb = {
    collection: () => ({})
  };

  const controller = new SearchProjectsController(fakeDb);

  const criteria = {
    keyword: 'Kitchen',
    selectedStyles: ['Modern'],
    propertyType: 'HDB',
    roomType: 'Kitchen',
    projectStatus: 'completed',
    sortOption: 'newest'
  };

  const result = controller.resetSearch(criteria);

  assert.deepEqual(result, {
    keyword: '',
    selectedStyles: [],
    propertyType: '',
    roomType: '',
    projectStatus: '',
    sortOption: ''
  });
});


test('Removes one selected style without clearing other criteria', () => {
  const fakeDb = {
    collection: () => ({})
  };

  const controller = new SearchProjectsController(fakeDb);

  const criteria = {
    keyword: 'Kitchen',
    selectedStyles: ['Modern', 'Scandinavian'],
    propertyType: 'HDB',
    roomType: '',
    projectStatus: '',
    sortOption: 'newest'
  };

  const result = controller.removeSearchFilter(
    criteria,
    'selectedStyles',
    'Modern'
  );

  assert.deepEqual(result, {
    keyword: 'Kitchen',
    selectedStyles: ['Scandinavian'],
    propertyType: 'HDB',
    roomType: '',
    projectStatus: '',
    sortOption: 'newest'
  });
});


test('Removes property type without clearing other criteria', () => {
  const fakeDb = {
    collection: () => ({})
  };

  const controller = new SearchProjectsController(fakeDb);

  const criteria = {
    keyword: 'Kitchen',
    selectedStyles: ['Modern'],
    propertyType: 'HDB',
    roomType: 'Kitchen',
    projectStatus: 'completed',
    sortOption: 'newest'
  };

  const result = controller.removeSearchFilter(
    criteria,
    'propertyType',
    'HDB'
  );

  assert.deepEqual(result, {
    keyword: 'Kitchen',
    selectedStyles: ['Modern'],
    propertyType: '',
    roomType: 'Kitchen',
    projectStatus: 'completed',
    sortOption: 'newest'
  });

  // Verify that the original criteria remain unchanged.
  assert.equal(criteria.propertyType, 'HDB');
});


test('Removes room type without clearing other criteria', () => {
  const fakeDb = {
    collection: () => ({})
  };

  const controller = new SearchProjectsController(fakeDb);

  const criteria = {
    keyword: 'Kitchen',
    selectedStyles: ['Modern'],
    propertyType: 'HDB',
    roomType: 'Kitchen',
    projectStatus: 'completed',
    sortOption: 'newest'
  };

  const result = controller.removeSearchFilter(
    criteria,
    'roomType',
    'Kitchen'
  );

  assert.equal(result.roomType, '');
  assert.equal(result.keyword, 'Kitchen');
  assert.deepEqual(result.selectedStyles, ['Modern']);
  assert.equal(result.propertyType, 'HDB');
  assert.equal(result.projectStatus, 'completed');
  assert.equal(result.sortOption, 'newest');

  // Original criteria should remain unchanged.
  assert.equal(criteria.roomType, 'Kitchen');
});

test('Removes project status without clearing other criteria', () => {
  const fakeDb = {
    collection: () => ({})
  };

  const controller = new SearchProjectsController(fakeDb);

  const criteria = {
    keyword: 'Kitchen',
    selectedStyles: ['Modern'],
    propertyType: 'HDB',
    roomType: 'Kitchen',
    projectStatus: 'completed',
    sortOption: 'newest'
  };

  const result = controller.removeSearchFilter(
    criteria,
    'projectStatus',
    'completed'
  );

  assert.equal(result.projectStatus, '');
  assert.equal(result.keyword, 'Kitchen');
  assert.deepEqual(result.selectedStyles, ['Modern']);
  assert.equal(result.propertyType, 'HDB');
  assert.equal(result.roomType, 'Kitchen');
  assert.equal(result.sortOption, 'newest');

  // Original criteria should remain unchanged.
  assert.equal(criteria.projectStatus, 'completed');
});


test('Returns an empty list when no projects match', async () => {
  const fakeProjects = [
    {
      title: 'Modern Kitchen Renovation',
      description: 'A contemporary kitchen design',
      isPublished: true
    },
    {
      title: 'Scandinavian Bedroom',
      description: 'A minimalist bedroom design',
      isPublished: true
    }
  ];

  const fakeDb = {
    collection: () => ({
      find: () => ({
        toArray: async () => fakeProjects
      })
    })
  };

  const controller = new SearchProjectsController(fakeDb);

  const results = await controller.searchProjects({
    keyword: 'Underwater Palace'
  });

  assert.deepEqual(results, []);
});


test('Suggests broader criteria when no projects match', () => {
  const fakeDb = {
    collection: () => ({})
  };

  const controller = new SearchProjectsController(fakeDb);

  const criteria = {
    keyword: 'Modern Kitchen',
    selectedStyles: ['Modern'],
    propertyType: 'HDB',
    roomType: 'Kitchen',
    projectStatus: 'completed'
  };

  const suggestions = controller.suggestBroaderCriteria(criteria);

  assert.deepEqual(suggestions, [
    'Try using fewer or more general keywords.',
    'Try removing one or more filters.'
  ]);
});


test('Returns no autocomplete suggestions for invalid input', async () => {
  const fakeDb = {
    collection: () => ({
      find: () => ({
        toArray: async () => []
      })
    })
  };

  const controller = new SearchProjectsController(fakeDb);

  assert.deepEqual(
    await controller.getAutocompleteSuggestions(null),
    []
  );

  assert.deepEqual(
    await controller.getAutocompleteSuggestions(123),
    []
  );

  assert.deepEqual(
    await controller.getAutocompleteSuggestions('   '),
    []
  );
});


test('Ranks search results by keyword relevance', async () => {
  const fakeProjects = [
    {
      title: 'Contemporary Home Renovation',
      description: 'Includes a modern kitchen',
      isPublished: true
    },
    {
      title: 'Modern Kitchen Renovation',
      description: 'Beautiful kitchen with wooden cabinets',
      isPublished: true
    },
    {
      title: 'Kitchen Makeover',
      description: 'A complete home transformation',
      isPublished: true
    }
  ];

  const fakeDb = {
    collection: () => ({
      find: () => ({
        toArray: async () => fakeProjects
      })
    })
  };

  const controller = new SearchProjectsController(fakeDb);

  const results = await controller.searchProjects({
    keyword: 'kitchen',
    sortOption: 'relevance'
  });

  assert.deepEqual(
    results.map(project => project.title),
    [
      'Modern Kitchen Renovation',
      'Kitchen Makeover',
      'Contemporary Home Renovation'
    ]
  );
});
