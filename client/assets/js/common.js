window.MiniTrello = {
  showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  },

  showNotice(id, message, isError = false) {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = message;
    element.className = `notice show${isError ? " error" : ""}`;
  },

  clearNotice(id) {
    const element = document.getElementById(id);
    if (!element) return;
    element.className = "notice";
    element.textContent = "";
  },

  async getCurrentUser({ redirect = true } = {}) {
    const data = await api.get("/api/auth/me");
    if (!data.user && redirect) {
      window.location.href = "/login.html";
      return null;
    }
    return data.user;
  },

  async requireAuth() {
    return this.getCurrentUser({ redirect: true });
  },

  formatDate(value) {
    if (!value) return "Без срок";
    return new Date(value).toLocaleString("bg-BG");
  },

  priorityClass(priority) {
    return String(priority || "medium").toLowerCase();
  },

  async logout() {
    await api.post("/api/auth/logout", {});
    window.location.href = "/login.html";
  },

  attachLogout(buttonId = "logoutBtn") {
    const button = document.getElementById(buttonId);
    if (!button) return;
    button.addEventListener("click", () => this.logout());
  },

  openDialog(id) {
    document.getElementById(id)?.showModal();
  },

  closeDialog(id) {
    document.getElementById(id)?.close();
  },

  qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }
};

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-close-dialog]");
  if (!target) return;
  MiniTrello.closeDialog(target.dataset.closeDialog);
});
