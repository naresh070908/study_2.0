const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "study-campus.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student','admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  subject_id INTEGER NOT NULL,
  course TEXT DEFAULT '',
  semester TEXT DEFAULT '',
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  uploaded_by INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  downloads INTEGER NOT NULL DEFAULT 0,
  helpful INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
  FOREIGN KEY(uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id INTEGER NOT NULL,
  user_id INTEGER,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);
`);

const defaultSubjects = [
  ["Computer Science", "computer-science"],
  ["Electronics", "electronics"],
  ["Mechanical", "mechanical"],
  ["Mathematics", "mathematics"],
  ["Physics", "physics"],
  ["Chemistry", "chemistry"],
  ["Civil Engineering", "civil-engineering"],
  ["English", "english"],
  ["Programming", "programming"]
];

const insertSubject = db.prepare(
  "INSERT OR IGNORE INTO subjects (name, slug) VALUES (?, ?)"
);
const seedSubjects = db.transaction(() => {
  for (const subject of defaultSubjects) insertSubject.run(subject[0], subject[1]);
});
seedSubjects();

function ensureAdmin(email, password) {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (!existing) {
    const hash = bcrypt.hashSync(password, 12);
    db.prepare(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')"
    ).run("Study Campus Admin", email, hash);
  }
}

module.exports = { db, ensureAdmin };