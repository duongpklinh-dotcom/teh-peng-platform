## Tools Required

Install these before starting:

- Visual Studio Code
- Git
- Node.js 24.16.0, which includes npm
- A GitHub account with access to this repository

## Clone the Project Using VS Code

1. Accept the GitHub repository invitation.
2. Open VS Code.
3. Open the Command Palette:
   - Mac: Command + Shift + P
   - Windows: Ctrl + Shift + P
4. Search for `Git: Clone`.
5. Paste this repository URL:

   https://github.com/duongpklinh-dotcom/teh-peng-platform.git

6. Choose a folder on your computer to save the project.
7. Sign in to GitHub if prompted.
8. Click Open when cloning finishes.
9. Trust the project folder if prompted.

To reopen the project later:
File → Open Folder → select `teh-peng-platform`.

Always open the whole project folder.

## Project Folders

- `client` — React frontend.
- `server` — Express backend.
- `.gitignore` — excludes private settings and generated files from Git.
- `README.md` — team setup instructions.

## First-Time Setup

Open Terminal → New Terminal in VS Code.

The terminal should start in the main `teh-peng-platform` folder.

### Frontend

Run these commands one at a time:

```bash
cd client
npm ci
npm run dev
```

Open the address printed in the terminal, usually:

http://localhost:5173

Leave this terminal running.

### Backend

Open Terminal → New Terminal again.

Make sure this second terminal starts in `teh-peng-platform`.
If it starts inside `client`, run `cd ..` first.

Run:

```bash
cd server
npm ci
node index.js
```

Expected output:

```text
Backend running at http://localhost:3001
```

Leave this terminal running too.

## Check That Everything Works

1. Open the frontend at http://localhost:5173.
2. Click Check backend.
3. Confirm that this message appears:

```text
Backend is running
```

You can also check the backend directly:

http://localhost:3001/api/health

These localhost addresses run on your own computer.
They are not shared, deployed website links.

## Starting the Project Next Time

Open the project folder in VS Code.

In a terminal starting from the main project folder:

```bash
cd client
npm run dev
```

In a second terminal starting from the main project folder:

```bash
cd server
node index.js
```

You do not need to run `npm ci` every time.
Run it in the relevant folder after pulling changes to its
package.json or package-lock.json.

To stop either server, click its terminal and press Control + C.

## Team GitHub Workflow Using VS Code

### Start a New Feature

Start with your previous work committed.

1. Click the branch name at the bottom-left of VS Code.
2. Select `main`.
3. Open the Command Palette and select Git: Pull.
4. Open the Command Palette and select Git: Create Branch.
5. Enter a descriptive branch name, for example:
   `feature/edit-project-details`

Work on your feature branch.

### Save Your Work to GitHub

1. Save your edited files.
2. Open Source Control in the left sidebar.
3. Review your changed files.
4. Click the + beside the files you want to include.
5. Enter a clear commit message.
6. Click Commit.
7. Click Publish Branch for a new branch, or use Git: Push
   for an existing published branch.

Saving a file, committing and pushing are separate actions:
- Save updates the file on your computer.
- Commit records a version locally.
- Push uploads your commits to GitHub.

### Request a Review

1. Open the repository on GitHub.
2. Open Pull requests → New pull request.
3. Set the base branch to `main`.
4. Select your feature branch as the compare branch.
5. Describe your changes and how you tested them.
6. Create the pull request.
7. Ask a teammate to review it before merging.

## Team Rules

- Use a separate branch for each feature.
- Coordinate before changing shared files or data structures.
- Keep both package-lock.json files in Git.
- Never upload passwords, tokens or .env files.
- Do not upload node_modules.
- Record relevant work and progress in Taiga.
- Keep implementation consistent with the agreed design.