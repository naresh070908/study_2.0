require("dotenv").config();

const express = require("express");
const session = require("express-session");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { db, ensureAdmin } = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

ensureAdmin(
  process.env.ADMIN_EMAIL || "admin@studycampus.local",
  process.env.ADMIN_PASSWORD || "ChangeMe123!"
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "study-campus-development-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));
app.use(express.static(path.join(__dirname, "public")));

const allowedMimes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"
]);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomUUID() + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (!allowedMimes.has(file.mimetype)) {
      return cb(new Error("Unsupported file type."));
    }
    cb(null, true);
  }
});

function currentUser(req) {
  if (!req.session.userId) return null;
  return db.prepare(
    "SELECT id, name, email, role, created_at FROM users WHERE id = ?"
  ).get(req.session.userId) || null;
}

function requireAuth(req, res, next) {
  if (!currentUser(req)) return res.status(401).json({ error: "Login required." });
  next();
}

function requireAdmin(req, res, next) {
  const user = currentUser(req);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

function safeFileDelete(fileName) {
  const target = path.join(uploadDir, path.basename(fileName));
  if (fs.existsSync(target)) fs.unlinkSync(target);
}

app.get("/api/me", (req, res) => {
  res.json({ user: currentUser(req) });
});

app.post("/api/auth/register", (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (name.length < 2) return res.status(400).json({ error: "Enter a valid name." });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Enter a valid email." });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });

  try {
    const hash = bcrypt.hashSync(password, 12);
    const result = db.prepare(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)"
    ).run(name, email, hash);
    req.session.userId = result.lastInsertRowid;
    res.status(201).json({ user: currentUser(req) });
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    res.status(500).json({ error: "Could not create account." });
  }
});

app.post("/api/auth/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  req.session.userId = user.id;
  res.json({ user: currentUser(req) });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/subjects", (_, res) => {
  const subjects = db.prepare(`
    SELECT s.id, s.name, s.slug, COUNT(n.id) AS note_count
    FROM subjects s
    LEFT JOIN notes n ON n.subject_id = s.id AND n.status = 'approved'
    GROUP BY s.id
    ORDER BY s.name
  `).all();
  res.json({ subjects });
});

app.get("/api/stats", (_, res) => {
  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM notes WHERE status = 'approved') AS notes,
      (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
      (SELECT COUNT(*) FROM subjects) AS subjects,
      (SELECT COUNT(*) FROM notes WHERE status = 'approved' AND date(created_at) = date('now')) AS uploads_today
  `).get();
  res.json({ stats });
});

app.get("/api/notes", (req, res) => {
  const q = String(req.query.q || "").trim();
  const subject = String(req.query.subject || "").trim();
  const sort = req.query.sort === "popular" ? "n.downloads DESC, n.helpful DESC" : "n.created_at DESC";
  const params = [];
  const where = ["n.status = 'approved'"];

  if (q) {
    where.push("(n.title LIKE ? OR n.description LIKE ? OR s.name LIKE ? OR n.course LIKE ?)");
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  if (subject) {
    where.push("s.slug = ?");
    params.push(subject);
  }

  const notes = db.prepare(`
    SELECT n.id, n.title, n.description, n.course, n.semester, n.original_name,
           n.file_size, n.downloads, n.helpful, n.created_at,
           s.name AS subject, s.slug AS subject_slug,
           u.name AS uploader
    FROM notes n
    JOIN subjects s ON s.id = n.subject_id
    JOIN users u ON u.id = n.uploaded_by
    WHERE ${where.join(" AND ")}
    ORDER BY ${sort}
    LIMIT 100
  `).all(...params);

  res.json({ notes });
});

app.get("/api/notes/:id", (req, res) => {
  const note = db.prepare(`
    SELECT n.id, n.title, n.description, n.course, n.semester, n.original_name,
           n.file_size, n.downloads, n.helpful, n.created_at,
           s.name AS subject, u.name AS uploader
    FROM notes n
    JOIN subjects s ON s.id = n.subject_id
    JOIN users u ON u.id = n.uploaded_by
    WHERE n.id = ? AND n.status = 'approved'
  `).get(req.params.id);

  if (!note) return res.status(404).json({ error: "Note not found." });
  res.json({ note });
});

app.post("/api/notes/:id/helpful", requireAuth, (req, res) => {
  const result = db.prepare(
    "UPDATE notes SET helpful = helpful + 1 WHERE id = ? AND status = 'approved'"
  ).run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Note not found." });
  res.json({ ok: true });
});

app.post("/api/notes/:id/report", requireAuth, (req, res) => {
  const reason = String(req.body.reason || "Inappropriate or incorrect content").trim();
  const note = db.prepare("SELECT id FROM notes WHERE id = ? AND status = 'approved'").get(req.params.id);
  if (!note) return res.status(404).json({ error: "Note not found." });

  db.prepare(
    "INSERT INTO reports (note_id, user_id, reason) VALUES (?, ?, ?)"
  ).run(note.id, req.session.userId, reason);

  res.json({ ok: true });
});

app.get("/api/notes/:id/download", (req, res) => {
  const note = db.prepare(
    "SELECT file_name, original_name FROM notes WHERE id = ? AND status = 'approved'"
  ).get(req.params.id);

  if (!note) return res.status(404).json({ error: "Note not found." });

  const filePath = path.join(uploadDir, path.basename(note.file_name));
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File is missing from storage." });

  db.prepare("UPDATE notes SET downloads = downloads + 1 WHERE id = ?").run(req.params.id);
  res.download(filePath, note.original_name);
});

app.post("/api/notes/upload", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Please select a file." });

  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const course = String(req.body.course || "").trim();
  const semester = String(req.body.semester || "").trim();
  const subjectId = Number(req.body.subjectId);

  const subject = db.prepare("SELECT id FROM subjects WHERE id = ?").get(subjectId);

  if (title.length < 3 || !subject) {
    safeFileDelete(req.file.filename);
    return res.status(400).json({ error: "Title and a valid subject are required." });
  }

  const result = db.prepare(`
    INSERT INTO notes
      (title, description, subject_id, course, semester, file_name, original_name, mime_type, file_size, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title, description, subjectId, course, semester,
    req.file.filename, req.file.originalname, req.file.mimetype,
    req.file.size, req.session.userId
  );

  res.status(201).json({
    message: "Note uploaded. It will be visible after admin approval.",
    id: result.lastInsertRowid
  });
});

app.get("/api/my/notes", requireAuth, (req, res) => {
  const notes = db.prepare(`
    SELECT n.id, n.title, n.description, n.status, n.downloads, n.helpful, n.created_at,
           s.name AS subject
    FROM notes n
    JOIN subjects s ON s.id = n.subject_id
    WHERE n.uploaded_by = ?
    ORDER BY n.created_at DESC
  `).all(req.session.userId);
  res.json({ notes });
});

app.get("/api/admin/overview", requireAdmin, (_, res) => {
  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
      (SELECT COUNT(*) FROM notes) AS total_notes,
      (SELECT COUNT(*) FROM notes WHERE status = 'pending') AS pending,
      (SELECT COUNT(*) FROM reports) AS reports
  `).get();
  res.json({ stats });
});

app.get("/api/admin/notes", requireAdmin, (req, res) => {
  const status = ["pending", "approved", "rejected"].includes(req.query.status)
    ? req.query.status : "pending";

  const notes = db.prepare(`
    SELECT n.id, n.title, n.description, n.course, n.semester, n.original_name,
           n.file_size, n.status, n.downloads, n.helpful, n.created_at,
           s.name AS subject, u.name AS uploader, u.email AS uploader_email
    FROM notes n
    JOIN subjects s ON s.id = n.subject_id
    JOIN users u ON u.id = n.uploaded_by
    WHERE n.status = ?
    ORDER BY n.created_at DESC
  `).all(status);

  res.json({ notes });
});

app.patch("/api/admin/notes/:id", requireAdmin, (req, res) => {
  const status = String(req.body.status || "");
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const result = db.prepare(
    "UPDATE notes SET status = ? WHERE id = ?"
  ).run(status, req.params.id);

  if (!result.changes) return res.status(404).json({ error: "Note not found." });
  res.json({ ok: true });
});

app.delete("/api/admin/notes/:id", requireAdmin, (req, res) => {
  const note = db.prepare("SELECT file_name FROM notes WHERE id = ?").get(req.params.id);
  if (!note) return res.status(404).json({ error: "Note not found." });

  db.prepare("DELETE FROM notes WHERE id = ?").run(req.params.id);
  safeFileDelete(note.file_name);
  res.json({ ok: true });
});

app.get("/api/admin/reports", requireAdmin, (_, res) => {
  const reports = db.prepare(`
    SELECT r.id, r.reason, r.created_at, n.id AS note_id, n.title,
           u.name AS reporter
    FROM reports r
    JOIN notes n ON n.id = r.note_id
    LEFT JOIN users u ON u.id = r.user_id
    ORDER BY r.created_at DESC
    LIMIT 100
  `).all();
  res.json({ reports });
});

app.get("/admin", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === "Unsupported file type.") {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

app.listen(PORT, () => {
  console.log(`Study Campus running at http://localhost:${PORT}`);
});