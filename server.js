const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_THIS_SECRET_FOR_PRODUCTION";

/* =====================
   MIDDLEWARE
===================== */
app.use(cors());
app.use(express.json());

// serve frontend (index.html, script.js, style.css)
app.use(express.static(path.join(__dirname)));

/* =====================
   AUTH MIDDLEWARE
===================== */
function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth)
    return res.status(401).json({ error: "Missing Authorization header" });

  const [type, token] = auth.split(" ");
  if (type !== "Bearer" || !token)
    return res.status(401).json({ error: "Invalid Authorization format" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { userId, email }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/* =====================
   ROOT
===================== */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* =====================
   REGISTER
===================== */
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Vui lòng nhập email và mật khẩu" });

  try {
    const exists = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (exists.rows.length > 0)
      return res.status(400).json({ error: "Email đã tồn tại" });

    const hash = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users(email, password_hash) VALUES($1, $2)",
      [email, hash]
    );

    res.json({ message: "Đăng ký thành công!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* =====================
   LOGIN
===================== */
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Vui lòng nhập email và mật khẩu" });

  try {
    const result = await db.query(
      "SELECT id, password_hash FROM users WHERE email = $1",
      [email]
    );
    if (result.rows.length === 0)
      return res.status(400).json({ error: "Không tìm thấy tài khoản" });

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: "Sai mật khẩu" });

    const token = jwt.sign(
      { userId: user.id, email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login error" });
  }
});

/* =====================
   GET TASKS
===================== */
app.get("/api/tasks", authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id,
              title,
              due_date AS deadline,
              completed
       FROM tasks
       WHERE user_id = $1
       ORDER BY id DESC`,
      [req.user.userId]
    );

    res.json({ tasks: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fetch tasks failed" });
  }
});

/* =====================
   CREATE TASK
===================== */
app.post("/api/tasks", authenticate, async (req, res) => {
  const { title, deadline } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO tasks(user_id, title, due_date)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [req.user.userId, title, deadline || null]
    );

    res.json({ id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Create task failed" });
  }
});

/* =====================
   UPDATE TASK
===================== */
app.put("/api/tasks/:id", authenticate, async (req, res) => {
  const { title, deadline, completed } = req.body;

  try {
    await db.query(
      `UPDATE tasks
       SET title = $1,
           due_date = $2,
           completed = $3
       WHERE id = $4 AND user_id = $5`,
      [title, deadline || null, completed, req.params.id, req.user.userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

/* =====================
   DELETE TASK
===================== */
app.delete("/api/tasks/:id", authenticate, async (req, res) => {
  try {
    await db.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

/* =====================
   NLP MOCK
===================== */
app.post("/api/nlp", authenticate, (req, res) => {
  const { text } = req.body;
  if (!text)
    return res.status(400).json({ error: "Text is required" });

  res.json({
    title: text.slice(0, 120),
    deadline: new Date(Date.now() + 86400000).toISOString()
  });
});

/* =====================
   START SERVER
===================== */
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
