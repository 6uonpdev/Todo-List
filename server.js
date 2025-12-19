const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.use(session({
    secret: "secret_key",
    resave: false,
    saveUninitialized: false
}));

const db = new Pool({
    host: "localhost",
    user: "postgres",
    password: "123456",
    database: "todo_app",
    port: 5432
});

db.connect()
    .then(client => {
        console.log("PostgreSQL connected");
        client.release();
    })
    .catch(err => console.error("PostgreSQL error:", err.message));

app.get("/test", (req, res) => {
    res.send("Backend OK");
});

app.listen(PORT, () => {
    console.log(`Server chạy tại http://localhost:${PORT}`);
});
