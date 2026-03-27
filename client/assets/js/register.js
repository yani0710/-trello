(async function initRegister() {
  try {
    const user = await MiniTrello.getCurrentUser({ redirect: false });
    if (user) {
      window.location.href = "/dashboard.html";
      return;
    }
  } catch (_error) {
  }

  document.getElementById("registerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    MiniTrello.clearNotice("registerNotice");

    const form = event.currentTarget;
    const payload = {
      username: form.username.value.trim(),
      email: form.email.value.trim(),
      password: form.password.value
    };

    try {
      await api.post("/api/auth/register", payload);
      MiniTrello.showToast("Профилът е създаден.");
      window.location.href = "/dashboard.html";
    } catch (error) {
      MiniTrello.showNotice("registerNotice", error.message, true);
    }
  });
})();
