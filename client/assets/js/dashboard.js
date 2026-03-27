(async function initDashboard() {
  const user = await MiniTrello.requireAuth();
  MiniTrello.attachLogout();

  document.getElementById("dashboardGreeting").textContent = `Здравей, ${user.username}. Управлявай своите бордове и задачи.`;
  if (user.role === "Administrator") {
    document.getElementById("adminLink").style.display = "inline-flex";
  }

  async function loadBoards() {
    const { boards } = await api.get("/api/boards");
    renderStats(boards);
    renderBoards(boards);
  }

  function renderStats(boards) {
    const taskCount = boards.reduce((sum, board) => sum + Number(board.task_count || 0), 0);
    const stats = [
      { label: "Бордове", value: boards.length },
      { label: "Общо задачи", value: taskCount },
      { label: "Архивирани", value: boards.filter((board) => board.is_archived).length },
      { label: "Твоя роля", value: user.role }
    ];

    document.getElementById("statsGrid").innerHTML = stats.map((item) => `
      <article class="stats-card">
        <div class="muted small">${item.label}</div>
        <div class="stats-number">${item.value}</div>
      </article>
    `).join("");
  }

  function renderBoards(boards) {
    const container = document.getElementById("boardsList");
    if (!boards.length) {
      container.innerHTML = '<div class="empty-state">Все още няма бордове. Създай първия от формата вдясно.</div>';
      return;
    }

    container.innerHTML = boards.map((board) => `
      <article class="board-card">
        <div>
          <h3>${board.title}</h3>
          <p class="muted">${board.description || "Без описание"}</p>
        </div>
        <div class="tag">Owner: ${board.owner_name}</div>
        <div class="list-row small muted">
          <span>${board.member_count} members</span>
          <span>${board.task_count} tasks</span>
        </div>
        <footer>
          <span class="small muted">${MiniTrello.formatDate(board.created_at)}</span>
          <a class="btn btn-primary" href="/board.html?id=${board.id}">Отвори</a>
        </footer>
      </article>
    `).join("");
  }

  document.getElementById("createBoardForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    MiniTrello.clearNotice("boardNotice");
    const form = event.currentTarget;

    try {
      await api.post("/api/boards", {
        title: form.title.value.trim(),
        description: form.description.value.trim()
      });
      form.reset();
      MiniTrello.showToast("Бордът е създаден.");
      await loadBoards();
    } catch (error) {
      MiniTrello.showNotice("boardNotice", error.message, true);
    }
  });

  await loadBoards();
})();
