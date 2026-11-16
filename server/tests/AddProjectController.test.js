
const test = require('node:test');
const assert = require('node:assert/strict');
const { ObjectId } = require('mongodb');
const AddProjectController = require('../controllers/AddProjectController');

test('Saves a new project with valid details', async () => {
  const designerId = new ObjectId();
  const projectId = new ObjectId();
  let savedProject;

  const fakeDb = {
    collection: (name) => {
      assert.equal(name, 'projects');

      return {
        insertOne: async (project) => {
          savedProject = project;
          return { insertedId: projectId };
        }
      };
    }
  };

  const controller = new AddProjectController(fakeDb);

  const result = await controller.addProject(
    { title: 'Modern HDB', description: 'Minimalist design' },
    designerId.toString()
  );

  assert.equal(result.id, projectId.toString());
  assert.equal(savedProject.title, 'Modern HDB');
  assert.deepEqual(savedProject.designerId, designerId);
});

test('Rejects an invalid designer ID', async () => {
  const fakeDb = {
    collection: () => ({
      insertOne: async () => {
        throw new Error('Should not insert');
      }
    })
  };

  const controller = new AddProjectController(fakeDb);

  await assert.rejects(
    controller.addProject({ title: 'Modern HDB' }, 'invalid-id'),
    /Invalid designer ID/
  );
});


