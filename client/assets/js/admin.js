(async function initAdmin() {
  const user = await MiniTrello.requireAuth();
  if (user.role !== "Administrator") {
    window.location.href = "/dashboard.html";
    return;
  }

  MiniTrello.attachLogout();

  async function loadPage() {
    const [overview, usersData, memberships] = await Promise.all([
      api.get("/api/admin/overview"),
      api.get("/api/admin/users"),
      api.get("/api/admin/memberships")
    ]);

    renderStats(overview.counts);
    renderUsers(usersData.users);
    renderMembershipSelectors(memberships);
    renderActivity(overview.recentActivity);
  }

  function renderStats(counts) {
    const cards = [
      ["Потребители", counts.users_count],
      ["Бордове", counts.boards_count],
      ["Задачи", counts.tasks_count],
      ["Коментари", counts.comments_count]
    ];

    document.getElementById("adminStats").innerHTML = cards.map(([label, value]) => `
      <article class="stats-card">
        <div class="muted small">${label}</div>
        <div class="stats-number">${value}</div>
      </article>
    `).join("");
  }

  function renderUsers(users) {
    const tbody = document.getElementById("usersTable");
    tbody.innerHTML = users.map((entry) => `
      <tr>
        <td>
          <strong>${entry.username}</strong><br />
          <span class="muted small">${entry.email}</span>
        </td>
        <td>${entry.role}</td>
        <td>${entry.is_active ? "Активен" : "Неактивен"}</td>
        <td>${entry.boards_count}</td>
        <td>${entry.last_activity ? MiniTrello.formatDate(entry.last_activity) : "Няма"}</td>
        <td>
          <button class="btn ${entry.is_active ? "btn-danger" : "btn-secondary"}" data-toggle-user="${entry.id}" data-next-state="${entry.is_active ? 0 : 1}">
            ${entry.is_active ? "Деактивирай" : "Активирай"}
          </button>
        </td>
      </tr>
    `).join("");
  }

  function renderMembershipSelectors(data) {
    document.getElementById("membershipUser").innerHTML = data.users.map((entry) =>
      `<option value="${entry.id}">${entry.username} (${entry.email})</option>`
    ).join("");

    document.getElementById("membershipBoard").innerHTML = data.boards.map((entry) =>
      `<option value="${entry.id}">${entry.title}</option>`
    ).join("");
  }

  function renderActivity(items) {
    const list = document.getElementById("activityList");
    list.innerHTML = items.map((item) => `
      <article class="history-item">
        <strong>${item.action}</strong>
        <p>${item.details}</p>
        <div class="small muted">${item.username || "System"} • ${MiniTrello.formatDate(item.created_at)}</div>
      </article>
    `).join("");
  }

  document.getElementById("usersTable").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-toggle-user]");
    if (!button) return;

    await api.patch(`/api/admin/users/${button.dataset.toggleUser}/status`, {
      isActive: Number(button.dataset.nextState) === 1
    });
    MiniTrello.showToast("Статусът е обновен.");
    await loadPage();
  });

  document.querySelectorAll("[data-membership]").forEach((button) => {
    button.addEventListener("click", async () => {
      MiniTrello.clearNotice("membershipNotice");
      try {
        await api.post("/api/admin/memberships", {
          userId: document.getElementById("membershipUser").value,
          boardId: document.getElementById("membershipBoard").value,
          addMember: button.dataset.membership === "add"
        });
        MiniTrello.showToast("Достъпът е обновен.");
        await loadPage();
      } catch (error) {
        MiniTrello.showNotice("membershipNotice", error.message, true);
      }
    });
  });

  await loadPage();
})();
