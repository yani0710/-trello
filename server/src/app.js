const path = require("path");
const express = require("express");
const helmet = require("helmet");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const { dbPath, sessionSecret } = require("./config/env");
const { hydrateUser, requireAuth } = require("./middleware/auth");
const { AppError } = require("./utils/errors");
const authRoutes = require("./routes/authRoutes");
const boardRoutes = require("./routes/boardRoutes");
const taskRoutes = require("./routes/taskRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(
  session({
    store: new SQLiteStore({
      db: path.basename(dbPath),
      dir: path.dirname(dbPath)
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);
app.use(hydrateUser);

app.use("/api/auth", authRoutes);
app.use("/api/boards", requireAuth, boardRoutes);
app.use("/api/tasks", requireAuth, taskRoutes);
app.use("/api/users", requireAuth, userRoutes);
app.use("/api/admin", requireAuth, adminRoutes);
app.use(express.static(path.join(__dirname, "..", "..", "client")));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "..", "client", "login.html"));
});

app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err instanceof AppError ? err.message : "Internal server error.";
  if (!(err instanceof AppError)) {
    console.error(err);
  }
  res.status(statusCode).json({ message });
});

module.exports = { app };
