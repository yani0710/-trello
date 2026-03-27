const { loginUser, registerUser } = require("../services/authService");

async function register(req, res) {
  const userId = await registerUser(req.body);
  req.session.userId = userId;
  res.status(201).json({ message: "Registration successful." });
}

async function login(req, res) {
  const user = await loginUser(req.body);
  req.session.userId = user.id;
  res.json({
    message: "Login successful.",
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
}

async function logout(req, res) {
  req.session.destroy(() => {
    res.json({ message: "Logged out." });
  });
}

function me(req, res) {
  res.json({ user: req.user || null });
}

module.exports = { login, logout, me, register };
