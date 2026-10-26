
const test = require('node:test');
const assert = require('node:assert/strict');
const Project = require('../models/Project');

test('Creates a project with valid details', () => {
  const project = new Project({
    designerId: 'designer123',
    title: 'Modern HDB',
    description: 'Minimalist interior'
  });

  assert.doesNotThrow(() => project.validate());
  assert.equal(project.title, 'Modern HDB');
  assert.equal(project.isPublished, false);
  assert.equal(project.featured, false);
});

test('Rejects a project without a title', () => {
  const project = new Project({
    designerId: 'designer123',
    title: ''
  });

  assert.throws(
    () => project.validate(),
    /Designer and project title are required/
  );
});
