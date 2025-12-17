const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2");

const app = express();
const PORT = 3000;

/* =======================
   MIDDLEWARE
======================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.use(session({
    secret: "secret_key",
    resave: false,
    saveUninitialized: false
}));

/* =======================
   MYSQL CONNECTION
======================= */
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",      // 👈 nếu có mật khẩu thì điền
    database: "todo_app"
});

db.connect(err => {
    if (err) {
        console.error("❌ MySQL error:", err.message);
        return;
    }
    console.log("✅ MySQL connected");
});

/* =======================
   TEST ROUTE
======================= */
app.get("/test", (req, res) => {
    res.send("Backend OK 🚀");
});

/* =======================
   START SERVER
======================= */
app.listen(PORT, () => {
    console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});
