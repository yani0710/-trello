(async function initLogin() {
  try {
    const user = await MiniTrello.getCurrentUser({ redirect: false });
    if (user) {
      window.location.href = "/dashboard.html";
      return;
    }
  } catch (_error) {
  }

  document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    MiniTrello.clearNotice("loginNotice");

    const form = event.currentTarget;
    const payload = {
      email: form.email.value.trim(),
      password: form.password.value
    };

    try {
      await api.post("/api/auth/login", payload);
      MiniTrello.showToast("Успешен вход.");
      window.location.href = "/dashboard.html";
    } catch (error) {
      MiniTrello.showNotice("loginNotice", error.message, true);
    }
  });
})();
