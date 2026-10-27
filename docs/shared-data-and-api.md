## Shared Data & API Contract
Purpose: One shared reference for frontend/backend integration. Read alongside README.md and your approved BCE class and sequence diagrams.

Status: Working means implemented and tested; Planned means a proposed interface, not yet implemented; Confirm means the feature owner must reconcile it with their approved diagrams before coding.

1. Shared conventions
Item	Convention
Stack	React (Vite), Express, MongoDB Atlas (native MongoDB driver)
API base	Frontend calls relative /api/...; Vite forwards to backend port 3001
Database	teh_peng_dev
MongoDB access	req.app.locals.db.collection('name') — do not create another connection
IDs	MongoDB ObjectId in database; strings in API JSON
Logged-in user	req.user.id, req.user.role after authentication middleware
Success response	{ "success": true, "data": { ... } }
Error response	{ "success": false, "error": "Message" }
Frontend sessions	Use credentials: 'include'
CSRF	Request /api/auth/csrf-token; send x-csrf-token for state-changing requests; refresh after login
Roles	customer, interior_designer, platform_management, user_admin


Rules: Reuse shared User/Project models, existing session middleware, and the single database connection. Owner/customer IDs come from authenticated sessions, not request bodies. Never expose passwords or database credentials to React.

2. Collections and shared fields
users — Working (authentication)
Field	Type / meaning
_id	ObjectId
name, email	String; email normalized to lowercase, unique index
passwordHash	String; bcrypt hash, never sent to frontend
role	One of four role names above
accountStatus	active or locked (current prototype)
failedLoginAttempts	Number; locks at 5 incorrect passwords (current rule)
companyId	ObjectId or null; planned link to company
designerProfile	Optional { profileDescription, specialisation }; planned
createdAt	Date


Public registration creates customer accounts only. Staff and designer accounts require authorized provisioning. Account locking exists; login-history persistence is separate and still planned.
companies — Planned
_id (ObjectId), name (String), description (String), contactEmail (String), contactPhone (String), address (String).

Confirm: Owner of company information management is not assigned in the current feature shortlist.
projects — Basic creation working; full US05 rules pending
Field	Type / meaning
_id	ObjectId
designerId	ObjectId → users._id
title, description	String
categoryId	ObjectId → categories._id (planned validation)
style, propertyType, roomType	String
projectStatus	ongoing / completed (proposed)
isPublished, featured	Boolean; default false
images	Array of { imageId, imagePath, imageEmbedding? }
viewCount	Number; default 0
createdAt, updatedAt	Date


Current Add Project endpoint saves projects with authenticated designer ownership, but full US05 validation, category/image rules, and complete diagram alignment remain unfinished. imageEmbedding is optional for later AI-image search. Featured limit, view/shortlist tracking, and publishing rules remain to be confirmed.
categories — Planned
_id (ObjectId), name (String), description (String), status (String). Management defines acceptable statuses and category validation.


### Compare Interior Design Projects — Skeleton Prepared

**Owner:** Comparison feature teammate

**BCE classes:**
- Boundary: `ComparisonGUI`
- Control: `ComparisonController`
- Entities: `Customer`, `InteriorDesignProject`,
  `InteriorDesigner`, `DesignerReview`

**Existing shared entities:**
- `users`
- `projects`

**Proposed dependency:**
- `designerReviews` (schema to be confirmed by feature owner)

**Files:**
- `server/controllers/ComparisonController.js`
- `server/routes/comparison.js`
- `client/src/pages/customer/CompareProjects.jsx`

**Planned API endpoints:**
- `POST /api/comparison/projects` — Add project
- `GET /api/comparison/projects` — Get selected projects
- `DELETE /api/comparison/projects/:projectId` — Remove project

**Business rules:**
- Maximum 3 projects per comparison.
- Prevent duplicate selections.
- Customers compare project details side by side.
- Display real designer ratings and reviews when available.

**Status:** Skeleton only. Not implemented or connected.

**Feature owner TODO:**
- Implement controller methods.
- Agree on temporary versus persistent comparison selections.
- Connect API routes and authentication.
- Build comparison interface.
- Write unit tests.
- Align implementation with approved sequence diagram.





Required operations per diagrams: create/rename/delete collection, save/remove project, retrieve collections and saved projects, validate collection names, prevent duplicate saved projects. Check collection ownership using req.user.id. Confirm duplicate-name validation rules with feature owner.
timeSlots — Planned (Book Consultation)
Field	Type / meaning
_id	ObjectId
designerId	ObjectId → users._id
startTime, endTime	Date
isAvailable	Boolean


The diagrams also show recommended slots and matchScore. Calculate scores when retrieving slots (rather than storing permanently), subject to owner confirmation. Availability creation and exact ranking formula are not yet specified; seeded demo time slots are an option.
consultations — Planned; revised for supplied diagrams
Field	Type / meaning
_id	ObjectId
customerId	ObjectId → users._id
designerId	ObjectId → users._id
slotId	ObjectId → timeSlots._id
renovationRequirements	String
requestStatus	pending, confirmed, cancelled (proposed values)
createdAt	Date


Difference from previous draft: Diagrams use slotId, renovationRequirements, requestStatus, rather than preferredDateTime, message, status. The old projectId is not shown in the consultation diagrams: don't require it unless the feature owner agrees.

Expected flow: list slots → exclude conflicts → rank → select → recheck availability → reserve slot → create pending request → view request status. Whether pending reserves the slot immediately needs owner confirmation. Prevent double booking with a reliable database operation.
loginHistory — Planned (User Admin)
_id (ObjectId), userId (ObjectId → users._id or null), attemptedEmail (String), loginAt (Date), status (String; agreed values pending).

Not automatically implemented merely because login and account locking work. Feature owner should integrate with existing authentication instead of creating a second login system.
sessions — Working (infrastructure)
Created/managed by connect-mongo. Do not treat this as a teammate-owned application entity.
3. API endpoints
Authentication — Working
Method	Endpoint	Purpose
GET	/api/auth/csrf-token	Get session-linked CSRF token
POST	/api/auth/register	Create customer account
POST	/api/auth/login	Verify credentials and start session
GET	/api/auth/me	Identify current user
POST	/api/auth/logout	End session


Feature APIs
Method	Endpoint	Role	Status / action
POST	/api/projects	Interior Designer	Working (basic) — create own project
PATCH	/api/projects/:id	Interior Designer	Planned — edit own project
GET	/api/projects	Public / Customer	Planned — search and filter
GET	/api/projects/:id	Public / Customer	Planned — view project details
POST	/api/favourite-collections	Customer	Planned — create collection
GET	/api/favourite-collections	Customer	Planned — list own collections
PATCH	/api/favourite-collections/:id	Customer	Planned — rename own collection
DELETE	/api/favourite-collections/:id	Customer	Planned — delete own collection
POST	/api/favourite-collections/:id/projects	Customer	Planned — save project
DELETE	/api/favourite-collections/:id/projects/:projectId	Customer	Planned — remove saved project
GET	/api/designers/:designerId/time-slots	Customer	Planned — available/recommended slots
POST	/api/consultations	Customer	Planned — submit request
GET	/api/consultations/:id	Customer	Planned — check own request status
POST	/api/categories	Platform Management	Planned — create category
GET	/api/reports/weekly	Platform Management	Planned — weekly report
GET	/api/admin/login-history	User Admin	Planned — view login history
PATCH	/api/admin/users/:id/unlock	User Admin	Planned — unlock account


Note: Planned endpoints are team integration suggestions, not existing working routes. Their owners should verify URL paths, input fields and controller method names against approved BCE/sequence diagrams before coding. Add necessary extra operations to this table as features evolve.
Example request bodies (planned APIs)

Create collection:
{ "name": "Living Room Ideas" }
Save a project inside a collection:
{ "projectId": "PROJECT_OBJECT_ID_STRING" }
Book consultation:
{
  "designerId": "DESIGNER_OBJECT_ID_STRING",
  "slotId": "SLOT_OBJECT_ID_STRING",
  "renovationRequirements": "Kitchen renovation"
}
Do not submit customerId or other ownership identifiers from the browser; the server derives them from the authenticated session.
4. How to call an API from React
// Read current logged-in user
const me = await fetch('/api/auth/me', { credentials: 'include' });

// For POST/PATCH/DELETE, first obtain a CSRF token
const tokenResponse = await fetch('/api/auth/csrf-token', {
  credentials: 'include'
});
const tokenResult = await tokenResponse.json();

const response = await fetch('/api/favourite-collections', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': tokenResult.data.csrfToken
  },
  body: JSON.stringify({ name: 'Living Room Ideas' })
});

The Favourites endpoint is a planned example, not an available endpoint yet. Fetch a new CSRF token after login because login regenerates the session.
5. Feature owner checklist
1. Check your assigned frontend and backend files in README.md.
2. Use your approved BCE class and sequence diagrams for entity/controller names and method signatures.
3. Confirm differences between the diagrams and this proposed contract before implementing them.
4. Reuse shared User, Project, authentication middleware and req.app.locals.db.
5. Authenticate and check roles and ownership for protected requests.
6. Match the Teh Peng Figma-derived CSS: DM Sans, cream canvas, brown actions, rounded white panels.
7. Write and run tests; document genuine test-first cases where required.
8. Use feature branches/PRs; coordinate shared-file changes.
Open decisions: Who owns company profiles and ID view/shortlist tracking; final Favourites persistence mapping; consultation availability source, ranking logic and reservation semantics; role-specific admin controller names; exact required fields in US05/US04. Record decisions here once agreed.