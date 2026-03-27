(async function initProfile() {
  const user = await MiniTrello.requireAuth();
  MiniTrello.attachLogout();

  const form = document.getElementById("profileForm");
  form.username.value = user.username;
  form.email.value = user.email;
  document.getElementById("profileMeta").innerHTML = `
    <div class="user-item">
      <p><strong>Роля:</strong> ${user.role}</p>
      <p><strong>Статус:</strong> ${user.is_active ? "Активен" : "Неактивен"}</p>
      <p><strong>Създаден:</strong> ${MiniTrello.formatDate(user.created_at)}</p>
    </div>
  `;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    MiniTrello.clearNotice("profileNotice");

    try {
      await api.patch("/api/users/me", {
        username: form.username.value.trim(),
        email: form.email.value.trim()
      });
      MiniTrello.showToast("Профилът е обновен.");
      MiniTrello.showNotice("profileNotice", "Промените са записани.");
    } catch (error) {
      MiniTrello.showNotice("profileNotice", error.message, true);
    }
  });
})();
