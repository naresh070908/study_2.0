# Study Campus

A complete student notes-sharing website built with HTML/CSS/JavaScript, Node.js/Express and SQLite.

## Included

- Responsive Study Campus UI
- Student registration and login
- Notes upload with PDF/image/DOC/DOCX/PPT/PPTX support
- Admin approval/rejection workflow
- Public notes search and filtering
- Subject-wise browsing
- Student dashboard
- Admin dashboard
- Download counter
- Helpful/report actions
- SQLite SQL database
- Session authentication
- Render-friendly Node/Express structure

## Run locally

Requirements:
- Node.js 18+
- VS Code

1. Extract this ZIP.
2. Open the extracted folder in VS Code.
3. Open Terminal in VS Code.
4. Run:

```bash
npm install
```

5. Copy `.env.example` to `.env`.
6. Start:

```bash
npm start
```

7. Open:

`http://localhost:3000`

The database is created automatically in `data/study-campus.db`.

## Admin login

The first run creates the admin account from `.env`:

- Email: `admin@studycampus.local`
- Password: `ChangeMe123!`

Change these values in `.env` before putting the website online.

## Important production note

SQLite is excellent for local development and a simple first version. Render's ordinary filesystem is not a permanent database store. Before a production deployment where users upload real notes, move the database to PostgreSQL or another persistent database and use persistent storage for uploaded files.

The application is intentionally built without a paid AI API. AI features are not required for this version and can be added later as a separate module.

## Project structure

- `server.js` - Express server and API routes
- `db.js` - SQLite schema and database helpers
- `public/` - frontend pages, styles and browser JavaScript
- `uploads/` - uploaded notes
- `data/` - SQLite database
- `.env.example` - environment configuration

## Branding update
- Added a clean, light transparent Study Campus logo at `public/assets/study-campus-logo.svg`.
- Updated the shared header branding across the main pages and admin panel.
- Kept the existing functionality unchanged; only branding and a subtle light background refinement were changed.
