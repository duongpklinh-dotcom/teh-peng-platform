## Development Guide
Interior design discovery and renovation matching platform. Find your feature below, open its files, and implement its TODOs according to your approved BCE/sequence diagrams.

1. Find your feature
Paths are relative to the repository root. Skeleton means the file exists but the feature is not implemented.
Feature	Frontend — work here	Backend — work here	Status
Add New Project (US05)	client/src/pages/designer/AddProject.jsx (create if absent)	server/controllers/AddProjectController.js, server/models/Project.js	Basic backend working; UI/full rules pending
Edit Project Details (US04)	client/src/pages/designer/EditProject.jsx	server/controllers/EditProjectController.js	Skeleton
Search Projects	client/src/pages/public/ExploreProjects.jsx	server/controllers/SearchProjectsController.js, server/models/SearchCriteria.js, server/models/SearchResult.js	Frontend demo + backend skeleton
View Project Details	client/src/pages/public/ProjectDetails.jsx	server/controllers/ViewProjectDetailsController.js	Frontend demo + backend skeleton
Compare Projects	client/src/pages/customer/CompareProjects.jsx	server/controllers/ComparisonController.js, server/routes/comparisons.js	Skeleton
Book Consultation	client/src/pages/customer/BookConsultation.jsx	server/controllers/ConsultationController.js, server/models/TimeSlot.js, server/models/ConsultationRequest.js	Frontend demo + backend skeleton
Create IDP Category	client/src/pages/management/Categories.jsx (check/create)	server/controllers/CategoryController.js (check/create)	To confirm / implement
Generate Weekly Report	client/src/pages/management/WeeklyReports.jsx (check/create)	server/controllers/ReportController.js (check/create)	To confirm / implement
View Login History	client/src/pages/admin/LoginHistory.jsx (check/create)	Admin controller to agree with feature owner	To confirm / implement
Unlock User Account	client/src/pages/admin/UserAccounts.jsx (check/create)	Admin controller to agree with feature owner	To confirm / implement


Only the files explicitly confirmed in our scaffolding work are guaranteed to exist. Entries marked check/create are proposed locations; don't assume they have been committed.

2. Shared files — coordinate changes
File	Purpose
server/models/Project.js	One shared Project entity for Add/Edit/Search/View/Compare
server/models/User.js	Existing roles and user accounts; no duplicate Customer/Designer models
server/routes/projects.js	Existing project API routes; coordinate additional GET/PATCH handlers
client/src/App.jsx	App routes, authentication and shared state
client/src/components/ProjectCard.jsx	Shared project card; Compare callback is a hook, not implemented logic
client/src/data/demo.js	Temporary example projects, not MongoDB records
client/src/styles/theme.css	Shared Figma-derived styling
server/index.js	Express wiring and database connection


Rule: Keep UML names in your feature classes exactly as approved; map them to existing shared MongoDB fields rather than creating duplicate Project/User collections. See [`docs/shared-data-and-api.md`](docs/shared-data-and-api.md).

3. Run locally
Prerequisites: Node.js/npm, access to the team's MongoDB Atlas database, and a local server/.env configured using the team's approved setup. Never commit .env or passwords.
# Terminal 1 — backend
cd server
npm install
node index.js

# Terminal 2 — frontend (from repository root)
cd client
npm install
npm run dev
Backend: http://localhost:3001 · Frontend: Vite's displayed local URL (usually http://localhost:5173). The frontend uses /api proxying to the backend.
# From repository root: existing backend tests
node --test server/tests/*.test.js

# Frontend build
cd client && npm run build
4. How to work on your feature

1. Open your feature's frontend + controller + models from the table.
2. Read its TODO comments and your approved BCE class and sequence diagrams. Skeleton methods intentionally throw Not implemented.
3. Reuse Project, User, the existing session/auth middleware, and the shared MongoDB connection.
4. Implement your feature and tests on your own branch. Coordinate edits to shared files before merging.
5. Update the API/status section in [`docs/shared-data-and-api.md`](docs/shared-data-and-api.md) when a route actually works.
Status reminder: A created file or passing existing tests does not mean that its feature, routes, or new tests are complete.