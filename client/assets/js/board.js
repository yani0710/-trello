(async function initBoard() {
  const user = await MiniTrello.requireAuth();
  MiniTrello.attachLogout();

  const boardId = MiniTrello.qs("id");
  if (!boardId) {
    window.location.href = "/dashboard.html";
    return;
  }

  if (user.role === "Administrator") {
    document.getElementById("adminLink").style.display = "inline-flex";
  }

  const state = {
    board: null,
    members: [],
    columns: [],
    filters: {
      sortBy: "position",
      assignee: ""
    }
  };

  const WORKFLOW_META = {
    not_started: { label: "Not Started", description: "Нови и планирани задачи" },
    in_progress: { label: "In Progress", description: "Задачи, по които се работи" },
    done: { label: "Done", description: "Завършени задачи" }
  };

  const elements = {
    boardTitle: document.getElementById("boardTitle"),
    boardDescription: document.getElementById("boardDescription"),
    boardMeta: document.getElementById("boardMeta"),
    boardStats: document.getElementById("boardStats"),
    membersList: document.getElementById("membersList"),
    columnsContainer: document.getElementById("columnsContainer"),
    sortSelect: document.getElementById("sortSelect"),
    assigneeFilter: document.getElementById("assigneeFilter"),
    taskForm: document.getElementById("taskForm")
  };

  function fillMemberSelects() {
    const memberOptions = ['<option value="">Без отговорник</option>']
      .concat(state.members.map((member) => `<option value="${member.id}">${member.username}</option>`));
    document.getElementById("taskAssignee").innerHTML = memberOptions.join("");

    const filterOptions = ['<option value="">Всички участници</option>']
      .concat(state.members.map((member) => `<option value="${member.id}">${member.username}</option>`));
    elements.assigneeFilter.innerHTML = filterOptions.join("");
    elements.assigneeFilter.value = state.filters.assignee;
  }

  function fillColumnSelect() {
    document.getElementById("taskColumn").innerHTML = state.columns
      .map((column) => `<option value="${column.id}">${column.title}</option>`)
      .join("");
  }

  function renderSidebar(stats) {
    elements.boardStats.innerHTML = `
      <div class="user-item">
        <p><strong>Owner:</strong> ${state.board.owner_name}</p>
        <p><strong>Създаден:</strong> ${MiniTrello.formatDate(state.board.created_at)}</p>
        <p><strong>Общо задачи:</strong> ${stats.total_tasks || 0}</p>
        <p><strong>High priority:</strong> ${stats.high_priority || 0}</p>
        <p><strong>Със срок:</strong> ${stats.with_due_date || 0}</p>
      </div>
    `;

    elements.membersList.innerHTML = state.members.map((member) => `
      <span class="member-chip">${member.username} • ${member.role}</span>
    `).join("");

    const canDeleteBoard = user.role === "Administrator" || Number(state.board.owner_id) === Number(user.id);
    document.getElementById("deleteBoardBtn").style.display = canDeleteBoard ? "inline-flex" : "none";
  }

  function renderTaskCard(task) {
    return `
      <article class="task-card" draggable="true" data-task-id="${task.id}">
        <div class="task-card-header">
          <span class="tag ${MiniTrello.priorityClass(task.priority)}">${task.priority}</span>
          <span class="tag" style="background:${task.label_color}22; color:${task.label_color};">label</span>
        </div>
        <h4>${task.title}</h4>
        <p class="muted small">${task.description ? task.description.slice(0, 110) : "Без описание"}</p>
        <div class="task-card-footer small muted">
          <span>${task.assignee_name || "Unassigned"}</span>
          <span>${MiniTrello.formatDate(task.due_date)}</span>
        </div>
        <div class="inline-actions" style="margin-top: 10px;">
          <button class="btn btn-secondary" data-edit-task="${task.id}">Редакция</button>
          <button class="btn" data-view-task="${task.id}">Детайли</button>
        </div>
      </article>
    `;
  }

  function getColumnMeta(column) {
    return WORKFLOW_META[column.workflow_key] || null;
  }

  function attachDragAndDrop() {
    let draggedId = null;
    document.querySelectorAll(".task-card").forEach((card) => {
      card.addEventListener("dragstart", () => {
        draggedId = card.dataset.taskId;
        card.classList.add("dragging");
      });
      card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
      });
    });

    document.querySelectorAll("[data-dropzone]").forEach((zone) => {
      zone.addEventListener("dragover", (event) => event.preventDefault());
      zone.addEventListener("drop", async (event) => {
        event.preventDefault();
        if (!draggedId) return;
        await moveTask(draggedId, zone.dataset.dropzone);
      });
    });
  }

  function renderColumns() {
    if (!state.columns.length) {
      elements.columnsContainer.innerHTML = '<div class="empty-state">Няма колони в този борд.</div>';
      return;
    }

    elements.columnsContainer.innerHTML = state.columns.map((column, index) => {
      const meta = getColumnMeta(column);
      return `
        <section class="column ${column.workflow_key ? `column-${column.workflow_key}` : ""}" data-column-id="${column.id}">
          <div class="column-header">
            <div>
              <h3>${column.title}</h3>
              ${meta ? `<div class="column-subtitle small muted">${meta.description}</div>` : ""}
              <div class="small muted">${column.tasks.length} задачи</div>
            </div>
            <div class="inline-actions">
              <button class="btn btn-ghost small" data-column-move="left" data-column-order-id="${column.id}" ${index === 0 ? "disabled" : ""}><</button>
              <button class="btn btn-ghost small" data-column-move="right" data-column-order-id="${column.id}" ${index === state.columns.length - 1 ? "disabled" : ""}>></button>
              <button class="btn btn-secondary small" data-create-task-in-column="${column.id}">+ Задача</button>
              ${column.is_system ? "" : `<button class="btn btn-ghost small" data-column-rename="${column.id}">Rename</button>`}
              ${column.is_system ? "" : `<button class="btn btn-ghost small" data-column-delete="${column.id}">Delete</button>`}
            </div>
          </div>
          <div class="task-list" data-dropzone="${column.id}">
            ${column.tasks.map((task) => renderTaskCard(task)).join("") || '<div class="empty-state">Празна колона</div>'}
          </div>
        </section>
      `;
    }).join("");

    attachDragAndDrop();
  }

  async function loadBoard() {
    const query = new URLSearchParams({
      sortBy: state.filters.sortBy,
      assignee: state.filters.assignee
    });

    const data = await api.get(`/api/boards/${boardId}?${query.toString()}`);
    state.board = data.board;
    state.members = data.members;
    state.columns = data.columns;
    state.filters = data.filters;

    elements.boardTitle.textContent = data.board.title;
    elements.boardDescription.textContent = data.board.description || "Без описание";
    elements.boardMeta.textContent = `Owner: ${data.board.owner_name} • ${state.members.length} участници`;
    elements.sortSelect.value = state.filters.sortBy || "position";
    renderSidebar(data.stats || {});
    fillMemberSelects();
    fillColumnSelect();
    renderColumns();
  }

  function resetTaskForm() {
    if (elements.taskForm) {
      elements.taskForm.reset();
    }
    document.getElementById("taskId").value = "";
    document.getElementById("originalColumnId").value = "";
    document.getElementById("taskColor").value = "#2563eb";
    document.getElementById("deleteTaskBtn").style.display = "none";
    document.getElementById("taskDialogTitle").textContent = "Нова задача";
  }

  function openCreateTask(preferredColumnId = "") {
    resetTaskForm();
    document.getElementById("taskColumn").value = preferredColumnId || state.columns[0]?.id || "";
    MiniTrello.clearNotice("taskNotice");
    MiniTrello.openDialog("taskDialog");
  }

  async function openEditTask(taskId) {
    MiniTrello.clearNotice("taskNotice");
    const { task } = await api.get(`/api/tasks/${taskId}`);
    document.getElementById("taskId").value = task.id;
    document.getElementById("originalColumnId").value = task.column_id;
    document.getElementById("taskTitle").value = task.title;
    document.getElementById("taskDescription").value = task.description || "";
    document.getElementById("taskColumn").value = task.column_id;
    document.getElementById("taskAssignee").value = task.assigned_to || "";
    document.getElementById("taskDueDate").value = task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : "";
    document.getElementById("taskPriority").value = task.priority;
    document.getElementById("taskColor").value = task.label_color || "#2563eb";
    document.getElementById("deleteTaskBtn").style.display = "inline-flex";
    document.getElementById("taskDialogTitle").textContent = "Редакция на задача";
    MiniTrello.openDialog("taskDialog");
  }

  async function openTaskDetails(taskId) {
    const data = await api.get(`/api/tasks/${taskId}`);
    document.getElementById("commentTaskId").value = taskId;
    document.getElementById("taskDetailsContent").innerHTML = `
      <article class="user-item">
        <h3>${data.task.title}</h3>
        <p>${data.task.description || "Без описание"}</p>
        <div class="grid-2">
          <div>
            <p><strong>Колона:</strong> ${data.task.column_title}</p>
            <p><strong>Приоритет:</strong> ${data.task.priority}</p>
            <p><strong>Срок:</strong> ${MiniTrello.formatDate(data.task.due_date)}</p>
          </div>
          <div>
            <p><strong>Автор:</strong> ${data.task.author_name}</p>
            <p><strong>Отговорник:</strong> ${data.task.assignee_name || "Няма"}</p>
            <p><strong>Създадена:</strong> ${MiniTrello.formatDate(data.task.created_at)}</p>
          </div>
        </div>
      </article>
      <div class="grid-2" style="margin-top: 18px; align-items: start;">
        <section>
          <h3>Коментари</h3>
          <div class="comment-list">
            ${data.comments.map((comment) => `
              <article class="comment-item">
                <strong>${comment.username}</strong>
                <p>${comment.content}</p>
                <div class="small muted">${MiniTrello.formatDate(comment.created_at)}</div>
              </article>
            `).join("") || '<div class="empty-state">Няма коментари.</div>'}
          </div>
        </section>
        <section>
          <h3>История на преместванията</h3>
          <div class="history-list">
            ${data.history.map((item) => `
              <article class="history-item">
                <strong>${item.moved_by_name}</strong>
                <p>${item.from_column_title || "Начало"} > ${item.to_column_title}</p>
                <div class="small muted">${MiniTrello.formatDate(item.moved_at)}</div>
              </article>
            `).join("") || '<div class="empty-state">Няма история.</div>'}
          </div>
        </section>
      </div>
    `;
    MiniTrello.openDialog("taskDetailsDialog");
  }

  async function moveTask(taskId, toColumnId) {
    await api.post(`/api/tasks/${taskId}/move`, { toColumnId });
    MiniTrello.showToast("Задачата е преместена.");
    await loadBoard();
  }

  document.getElementById("createTaskBtn").addEventListener("click", () => openCreateTask());

  elements.sortSelect.addEventListener("change", async (event) => {
    state.filters.sortBy = event.target.value;
    await loadBoard();
  });

  elements.assigneeFilter.addEventListener("change", async (event) => {
    state.filters.assignee = event.target.value;
    await loadBoard();
  });

  document.getElementById("inviteForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    MiniTrello.clearNotice("inviteNotice");
    try {
      await api.post(`/api/boards/${boardId}/members`, {
        email: document.getElementById("inviteEmail").value.trim()
      });
      form?.reset();
      MiniTrello.showToast("Потребителят е добавен в борда.");
      await loadBoard();
    } catch (error) {
      MiniTrello.showNotice("inviteNotice", error.message, true);
    }
  });

  document.getElementById("columnForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    MiniTrello.clearNotice("columnNotice");
    try {
      await api.post(`/api/boards/${boardId}/columns`, {
        title: document.getElementById("columnTitle").value.trim()
      });
      form?.reset();
      MiniTrello.showToast("Колоната е създадена.");
      await loadBoard();
    } catch (error) {
      MiniTrello.showNotice("columnNotice", error.message, true);
    }
  });

  elements.taskForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    MiniTrello.clearNotice("taskNotice");

    const taskId = document.getElementById("taskId").value;
    const payload = {
      title: document.getElementById("taskTitle").value.trim(),
      description: document.getElementById("taskDescription").value.trim(),
      columnId: document.getElementById("taskColumn").value,
      assignedTo: document.getElementById("taskAssignee").value,
      dueDate: document.getElementById("taskDueDate").value,
      priority: document.getElementById("taskPriority").value,
      labelColor: document.getElementById("taskColor").value
    };

    try {
      if (taskId) {
        await api.patch(`/api/tasks/${taskId}`, payload);
        if (String(payload.columnId) && String(payload.columnId) !== String(document.getElementById("originalColumnId").value)) {
          await api.post(`/api/tasks/${taskId}/move`, { toColumnId: payload.columnId });
        }
      } else {
        await api.post(`/api/tasks/boards/${boardId}/tasks`, payload);
      }

      MiniTrello.closeDialog("taskDialog");
      MiniTrello.showToast("Задачата е записана.");
      await loadBoard();
    } catch (error) {
      MiniTrello.showNotice("taskNotice", error.message, true);
    }
  });

  document.getElementById("deleteTaskBtn").addEventListener("click", async () => {
    const taskId = document.getElementById("taskId").value;
    if (!taskId || !window.confirm("Сигурен ли си, че искаш да изтриеш задачата?")) {
      return;
    }

    await api.delete(`/api/tasks/${taskId}`);
    MiniTrello.closeDialog("taskDialog");
    MiniTrello.showToast("Задачата е изтрита.");
    await loadBoard();
  });

  document.getElementById("commentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    MiniTrello.clearNotice("commentNotice");

    try {
      const currentTaskId = document.getElementById("commentTaskId").value;
      await api.post(`/api/tasks/${currentTaskId}/comments`, {
        content: document.getElementById("commentContent").value.trim()
      });
      document.getElementById("commentContent").value = "";
      MiniTrello.showToast("Коментарът е добавен.");
      await openTaskDetails(currentTaskId);
    } catch (error) {
      MiniTrello.showNotice("commentNotice", error.message, true);
    }
  });

  document.getElementById("deleteBoardBtn").addEventListener("click", async () => {
    if (!window.confirm("Сигурен ли си, че искаш да изтриеш борда?")) {
      return;
    }
    await api.delete(`/api/boards/${boardId}`);
    window.location.href = "/dashboard.html";
  });

  elements.columnsContainer.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-task]");
    const viewButton = event.target.closest("[data-view-task]");
    const createTaskButton = event.target.closest("[data-create-task-in-column]");
    const renameColumnButton = event.target.closest("[data-column-rename]");
    const deleteColumnButton = event.target.closest("[data-column-delete]");
    const moveColumnButton = event.target.closest("[data-column-order-id]");

    if (editButton) {
      await openEditTask(editButton.dataset.editTask);
      return;
    }
    if (viewButton) {
      await openTaskDetails(viewButton.dataset.viewTask);
      return;
    }
    if (createTaskButton) {
      openCreateTask(createTaskButton.dataset.createTaskInColumn);
      return;
    }
    if (renameColumnButton) {
      const title = window.prompt("Ново име на колоната:");
      if (!title) return;
      await api.patch(`/api/boards/columns/${renameColumnButton.dataset.columnRename}`, { title });
      await loadBoard();
      return;
    }
    if (deleteColumnButton) {
      if (!window.confirm("Изтриване на колоната?")) return;
      try {
        await api.delete(`/api/boards/columns/${deleteColumnButton.dataset.columnDelete}`);
        MiniTrello.showToast("Колоната е изтрита.");
        await loadBoard();
      } catch (error) {
        MiniTrello.showToast(error.message);
      }
      return;
    }
    if (moveColumnButton) {
      const columnId = Number(moveColumnButton.dataset.columnOrderId);
      const direction = moveColumnButton.dataset.columnMove;
      const ids = state.columns.map((column) => column.id);
      const index = ids.indexOf(columnId);
      const swapIndex = direction === "left" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= ids.length) return;
      [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
      await api.patch(`/api/boards/${boardId}/columns/reorder`, { columnIds: ids });
      await loadBoard();
    }
  });

  await loadBoard();
})();


