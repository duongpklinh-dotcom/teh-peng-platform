# Teh Peng — Shared Data Contract

**Status:** Proposed Data Schema  
**Database:** `teh_peng_dev`  
**Database Type:** MongoDB Atlas

## 1. Collections & Fields

### users

| Field | Type |
| `_id` | ObjectId |
| `name` | String |
| `email` | String |
| `passwordHash` | String |
| `role` | String |
| `accountStatus` | String |
| `failedLoginAttempts` | Number |
| `companyId` | ObjectId, optional |
| `designerProfile` | Object, optional |
| `createdAt` | Date |

**designerProfile**
- `profileDescription`: String
- `specialisation`: Array of Strings

### companies

| Field | Type |
| `_id` | ObjectId |
| `name` | String |
| `description` | String |
| `contactEmail` | String |
| `contactPhone` | String |
| `address` | String |

### projects

| Field | Type |
| `_id` | ObjectId |
| `designerId` | ObjectId |
| `title` | String |
| `description` | String |
| `categoryId` | ObjectId |
| `style` | String |
| `propertyType` | String |
| `roomType` | String |
| `projectStatus` | String |
| `isPublished` | Boolean |
| `images` | Array of Objects |
| `featured` | Boolean |
| `viewCount` | Number |
| `createdAt` | Date |
| `updatedAt` | Date |

**images[]**
- `imageId`: String
- `imagePath`: String
- `imageEmbedding`: Array of Numbers, optional

### categories

| Field | Type |
| `_id` | ObjectId |
| `name` | String |
| `description` | String |
| `status` | String |

### favouriteCollections

| Field | Type |
| `_id` | ObjectId |
| `customerId` | ObjectId |
| `name` | String |
| `projectIds` | Array of ObjectIds |
| `createdAt` | Date |

### consultations

| Field | Type |
| `_id` | ObjectId |
| `customerId` | ObjectId |
| `designerId` | ObjectId |
| `projectId` | ObjectId, optional |
| `preferredDateTime` | Date |
| `message` | String |
| `status` | String |
| `createdAt` | Date |

### loginHistory

| Field | Type |
| `_id` | ObjectId |
| `userId` | ObjectId, optional |
| `attemptedEmail` | String |
| `loginAt` | Date |
| `status` | String |

## 2. Collection Relationships

| Reference Field | References |
| `users.companyId` | `companies._id` |
| `projects.designerId` | `users._id` |
| `projects.categoryId` | `categories._id` |
| `favouriteCollections.customerId` | `users._id` |
| `favouriteCollections.projectIds[]` | `projects._id` |
| `consultations.customerId` | `users._id` |
| `consultations.designerId` | `users._id` |
| `consultations.projectId` | `projects._id` |
| `loginHistory.userId` | `users._id` |

## 3. Standard Field Values

| Field | Values |
| `users.role` | `customer`, `designer`, `management`, `admin` |
| `users.accountStatus` | `active`, `locked` |
| `projects.projectStatus` | `ongoing`, `completed` |
| `projects.isPublished` | `true`, `false` |
| `projects.featured` | `true`, `false` |
| `categories.status` | `active`, `inactive` |
| `consultations.status` | `pending` (initial value) |
| `loginHistory.status` | `success`, `failed` |

## 4. Naming & Data Format

| Item | Format |
| MongoDB record ID | `_id` (ObjectId) |
| API record ID | `id` (String) |
| Field naming | `camelCase` |
| Collection naming | Exact names in Section 1 |
| Cross-collection references | ObjectId |
| Date/time | MongoDB Date; ISO 8601 in JSON APIs |
| Images | Embedded objects within `projects.images` |

**Customer and Designer identifiers:** `customerId` and `designerId` both reference `users._id`, distinguished by account role.

## 5. API Endpoints

| Method | Endpoint | Feature | Owner |
|---|---|---|---|
| POST | /projects | Add New Project | Linh |
| PATCH | /projects/:id | Edit Project Details | Linh |
| GET | /projects | Search Projects | Customer team |
| GET | /projects/:id | View Project Details | Customer team |
| POST | /favourite-collections | Create Collection | Customer team |
| POST | /consultations | Book Consultation | Customer team |
| POST | /categories | Create IDP Category | Vaish |
| GET | /reports/weekly | Generate Weekly Report | Vaish |
| GET | /admin/login-history | View Login History | User Admin team |
| PATCH | /admin/users/:id/unlock | Unlock User Account | User Admin team |

## 6. Response Format

Success:
{
  "success": true,
  "data": {}
}

Error:
{
  "success": false,
  "error": "Error message"
}

## 7. Conventions

- All endpoints begin with /api.
- Use camelCase for JSON fields.
- IDs are strings in API requests/responses.
- GET: retrieve; POST: create; PATCH: update; DELETE: remove.
- Use HTTP 200 for successful retrieval/update.
- Use HTTP 201 for successful creation.
- Use HTTP 400 for invalid input.
- Use HTTP 401 for unauthenticated requests.
- Use HTTP 403 for forbidden operations.
- Use HTTP 404 for missing resources.
- Use HTTP 409 for conflicting operations.
- Use HTTP 500 for unexpected server errors.
- Protected endpoints require role and ownership checks.

## 8. Shared API Ownership

- Each endpoint has one feature owner.
- Shared endpoint changes require coordination.
- Feature owners define additional operations as required by their use cases.
- Backend business logic must use object-oriented design.