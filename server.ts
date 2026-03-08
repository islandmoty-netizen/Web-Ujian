import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("exam.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT, -- 'admin' or 'user'
    duration INTEGER DEFAULT 60 -- in minutes
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT, -- 'kepribadian', 'ketelitian', 'kecerdasan'
    question TEXT,
    options TEXT, -- JSON string
    correct_answer TEXT
  );

  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    score INTEGER,
    total_questions INTEGER,
    details TEXT, -- JSON string of answers and correctness
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
if (!adminExists) {
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", "admin123", "admin");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth API
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
      res.json({ success: true, user: { id: user.id, username: user.username, role: user.role, duration: user.duration } });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });

  // User Management
  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT id, username, role, duration FROM users WHERE role = 'user'").all();
    res.json(users);
  });

  app.post("/api/users", (req, res) => {
    const { username, password, duration } = req.body;
    try {
      db.prepare("INSERT INTO users (username, password, role, duration) VALUES (?, ?, 'user', ?)").run(username, password, duration);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ success: false, message: "Username already exists" });
    }
  });

  app.delete("/api/users/:id", (req, res) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Question Management
  app.get("/api/questions", (req, res) => {
    const questions = db.prepare("SELECT * FROM questions").all();
    res.json(questions.map(q => ({ ...q, options: JSON.parse(q.options) })));
  });

  app.post("/api/questions", (req, res) => {
    const { category, question, options, correct_answer } = req.body;
    db.prepare("INSERT INTO questions (category, question, options, correct_answer) VALUES (?, ?, ?, ?)")
      .run(category, question, JSON.stringify(options), correct_answer);
    res.json({ success: true });
  });

  app.delete("/api/questions/:id", (req, res) => {
    db.prepare("DELETE FROM questions WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/questions/bulk", (req, res) => {
    const { questions } = req.body;
    try {
      const insert = db.prepare("INSERT INTO questions (category, question, options, correct_answer) VALUES (?, ?, ?, ?)");
      const transaction = db.transaction((qs) => {
        for (const q of qs) {
          insert.run(q.category, q.question, JSON.stringify(q.options), q.correct_answer);
        }
      });
      transaction(questions);
      res.json({ success: true, count: questions.length });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Failed to save questions" });
    }
  });

  // Results API
  app.post("/api/results", (req, res) => {
    const { user_id, score, total_questions, details } = req.body;
    db.prepare("INSERT INTO results (user_id, score, total_questions, details) VALUES (?, ?, ?, ?)")
      .run(user_id, score, total_questions, JSON.stringify(details));
    res.json({ success: true });
  });

  app.get("/api/results", (req, res) => {
    const results = db.prepare(`
      SELECT r.*, u.username 
      FROM results r 
      JOIN users u ON r.user_id = u.id 
      ORDER BY r.completed_at DESC
    `).all();
    res.json(results);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
