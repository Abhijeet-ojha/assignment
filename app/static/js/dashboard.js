/* ═══════════════════════════════════════════════
   dashboard.js — View router, state, CRUD, realtime
   ═══════════════════════════════════════════════ */

(() => {
  "use strict";

  // ─── Auth guard ───
  const token = localStorage.getItem("access_token");
  const LOGIN_URL = "/login";
  const API_BASE = "";

  if (!token) {
    window.location.href = LOGIN_URL;
    return;
  }

  // ─── Lightweight state ───
  const state = {
    currentView: "dashboard",
    cachedAnalytics: null,
    cachedTasks: null,
    analyticsDirty: true,
    tasksDirty: true,
  };

  // ─── DOM refs ───
  const $ = (id) => document.getElementById(id);

  const dom = {
    sidebarNav: $("sidebarNav"),
    // Dashboard
    dashTotal: $("dashTotal"),
    dashCompleted: $("dashCompleted"),
    dashPending: $("dashPending"),
    dashCompletion: $("dashCompletion"),
    dashboardMetrics: $("dashboardMetrics"),
    recentTaskList: $("recentTaskList"),
    realtimeFeed: $("realtimeFeed"),
    // Tasks
    taskList: $("taskList"),
    statusFilter: $("statusFilter"),
    priorityFilter: $("priorityFilter"),
    openTaskModalBtn: $("openTaskModal"),
    // Modal
    taskModal: $("taskModal"),
    modalBackdrop: $("modalBackdrop"),
    closeTaskModalBtn: $("closeTaskModal"),
    taskForm: $("taskForm"),
    taskMessage: $("taskMessage"),
    modalTitle: $("modalTitle"),
    // Other
    logoutBtn: $("logoutBtn"),
    toastContainer: $("toastContainer"),
    userName: $("userName"),
    userPill: $("userPill"),
  };

  // ─── Auth helpers ───
  const authHeaders = () => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  });

  const handleUnauthorized = () => {
    localStorage.removeItem("access_token");
    window.location.href = LOGIN_URL;
  };

  // ─── Toast ───
  const showToast = (message) => {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  };

  // ═══════════════════════════════════════════════
  // VIEW ROUTER
  // ═══════════════════════════════════════════════

  const switchView = (viewName) => {
    state.currentView = viewName;

    // Toggle sections
    document.querySelectorAll(".view-section").forEach((section) => {
      section.classList.toggle("hidden", section.id !== `view-${viewName}`);
      if (section.id === `view-${viewName}`) {
        section.classList.add("active-view");
      } else {
        section.classList.remove("active-view");
      }
    });

    // Toggle nav active state
    dom.sidebarNav.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.view === viewName);
    });

    // Load data for the view
    if (viewName === "dashboard") {
      loadDashboard();
    } else if (viewName === "tasks") {
      loadTasks();
    } else if (viewName === "analytics") {
      loadAnalytics();
    }
  };

  // Wire up sidebar clicks
  dom.sidebarNav.addEventListener("click", (e) => {
    const item = e.target.closest("[data-view]");
    if (!item) return;
    e.preventDefault();
    const view = item.dataset.view;
    if (view !== state.currentView) {
      switchView(view);
    }
  });

  // ═══════════════════════════════════════════════
  // DASHBOARD VIEW
  // ═══════════════════════════════════════════════

  const loadDashboard = async () => {
    const [analytics, tasks] = await Promise.all([
      fetchAnalyticsData(),
      fetchTasksData(),
    ]);

    if (analytics) {
      renderDashboardMetrics(analytics);
    }
    if (tasks) {
      renderRecentTasks(tasks.slice(0, 5));
    }
  };

  const renderDashboardMetrics = (data) => {
    dom.dashTotal.textContent = data.total_tasks;
    dom.dashCompleted.textContent = data.completed_tasks;
    dom.dashPending.textContent = data.pending_tasks;
    dom.dashCompletion.textContent = `${data.completion_percentage}%`;

    dom.dashboardMetrics.querySelectorAll(".metric-card").forEach((card) => {
      card.classList.add("loaded");
    });
  };

  const renderRecentTasks = (tasks) => {
    if (!tasks.length) {
      dom.recentTaskList.innerHTML =
        '<div class="empty-state">No tasks yet. Create your first task from My Tasks.</div>';
      return;
    }

    dom.recentTaskList.innerHTML = tasks
      .map(
        (task) => `
      <div class="task-card">
        <div class="task-header">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-meta">
            <span class="badge status ${task.status === "Completed" ? "completed" : ""}">${task.status}</span>
            <span class="badge priority ${task.priority.toLowerCase()}">${task.priority}</span>
          </div>
        </div>
        ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ""}
      </div>`
      )
      .join("");
  };

  // ═══════════════════════════════════════════════
  // MY TASKS VIEW
  // ═══════════════════════════════════════════════

  const loadTasks = async () => {
    dom.taskList.innerHTML = '<div class="loading-state">Loading tasks…</div>';
    const tasks = await fetchTasksData(true);
    if (tasks) renderTaskBoard(tasks);
  };

  const renderTaskBoard = (tasks) => {
    if (!tasks.length) {
      dom.taskList.innerHTML =
        '<div class="empty-state">No tasks found. Click "New Task" to get started.</div>';
      return;
    }

    dom.taskList.innerHTML = "";
    tasks.forEach((task) => {
      const card = document.createElement("div");
      card.className = "task-card";
      card.innerHTML = `
        <div class="task-header">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-actions">
            <button class="action-btn" data-action="edit" data-id="${task.id}">Edit</button>
            <button class="action-btn danger" data-action="delete" data-id="${task.id}">Delete</button>
          </div>
        </div>
        <p class="task-desc">${escapeHtml(task.description || "No description")}</p>
        <div class="task-meta">
          <span class="badge status ${task.status === "Completed" ? "completed" : ""}">${task.status}</span>
          <span class="badge priority ${task.priority.toLowerCase()}">${task.priority}</span>
        </div>`;

      // Event delegation on the card
      card.querySelector('[data-action="edit"]').addEventListener("click", () => openEditModal(task));
      card.querySelector('[data-action="delete"]').addEventListener("click", () => deleteTask(task.id));

      dom.taskList.appendChild(card);
    });
  };

  // ═══════════════════════════════════════════════
  // ANALYTICS VIEW
  // ═══════════════════════════════════════════════

  const loadAnalytics = async () => {
    const data = await fetchAnalyticsData(true);
    if (data && window.Analytics) {
      window.Analytics.renderAll(data);
    }
  };

  // ═══════════════════════════════════════════════
  // DATA FETCHERS (with caching)
  // ═══════════════════════════════════════════════

  const fetchAnalyticsData = async (forceRefresh = false) => {
    if (!forceRefresh && state.cachedAnalytics && !state.analyticsDirty) {
      return state.cachedAnalytics;
    }

    try {
      const response = await fetch(`${API_BASE}/analytics`, { headers: authHeaders() });
      if (response.status === 401) { handleUnauthorized(); return null; }
      const result = await response.json();
      if (response.ok && result.success) {
        state.cachedAnalytics = result.data;
        state.analyticsDirty = false;
        return result.data;
      }
      showToast(result.message || "Unable to load analytics");
    } catch {
      showToast("Network error loading analytics");
    }
    return null;
  };

  const fetchTasksData = async (forceRefresh = false) => {
    if (!forceRefresh && state.cachedTasks && !state.tasksDirty) {
      return state.cachedTasks;
    }

    const params = new URLSearchParams();
    if (dom.statusFilter.value) params.append("status", dom.statusFilter.value);
    if (dom.priorityFilter.value) params.append("priority", dom.priorityFilter.value);

    try {
      const response = await fetch(`${API_BASE}/tasks?${params}`, { headers: authHeaders() });
      if (response.status === 401) { handleUnauthorized(); return null; }
      const result = await response.json();
      if (response.ok && result.success) {
        state.cachedTasks = result.data;
        state.tasksDirty = false;
        return result.data;
      }
      showToast(result.message || "Unable to load tasks");
    } catch {
      showToast("Network error loading tasks");
    }
    return null;
  };

  const invalidateCache = () => {
    state.analyticsDirty = true;
    state.tasksDirty = true;
  };

  // ═══════════════════════════════════════════════
  // TASK CRUD
  // ═══════════════════════════════════════════════

  const openModal = () => dom.taskModal.classList.remove("hidden");
  const closeModal = () => dom.taskModal.classList.add("hidden");

  const openCreateModal = () => {
    dom.taskForm.reset();
    dom.taskForm.taskId.value = "";
    dom.modalTitle.textContent = "Create task";
    dom.taskMessage.textContent = "";
    openModal();
  };

  const openEditModal = (task) => {
    dom.modalTitle.textContent = "Update task";
    dom.taskMessage.textContent = "";
    dom.taskForm.taskId.value = task.id;
    dom.taskForm.title.value = task.title;
    dom.taskForm.description.value = task.description || "";
    dom.taskForm.priority.value = task.priority;
    dom.taskForm.status.value = task.status;
    openModal();
  };

  const saveTask = async (payload, taskId) => {
    const isUpdate = Boolean(taskId);
    const url = isUpdate ? `${API_BASE}/tasks/${taskId}` : `${API_BASE}/tasks`;
    const method = isUpdate ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (response.status === 401) { handleUnauthorized(); return; }
      const result = await response.json();
      if (!response.ok || !result.success) {
        dom.taskMessage.textContent = result.message || "Unable to save task.";
        dom.taskMessage.style.color = "#e94949";
        return;
      }
    } catch {
      dom.taskMessage.textContent = "Network error. Please try again.";
      dom.taskMessage.style.color = "#e94949";
      return;
    }

    closeModal();
    invalidateCache();
    refreshCurrentView();
  };

  const deleteTask = async (taskId) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (response.status === 401) { handleUnauthorized(); return; }
      const result = await response.json();
      if (!response.ok || !result.success) {
        showToast(result.message || "Delete failed");
        return;
      }
    } catch {
      showToast("Network error. Unable to delete task.");
      return;
    }

    invalidateCache();
    refreshCurrentView();
  };

  const refreshCurrentView = () => {
    switchView(state.currentView);
  };

  // ═══════════════════════════════════════════════
  // REALTIME FEED
  // ═══════════════════════════════════════════════

  const MAX_FEED_ITEMS = 10;

  const addRealtimeItem = (action, title) => {
    const labelClass = action.toLowerCase();
    const item = document.createElement("li");
    item.className = "realtime-item";
    item.innerHTML = `<span class="feed-label ${labelClass}">${action}</span> ${escapeHtml(title)}`;

    // Remove placeholder
    const placeholder = dom.realtimeFeed.querySelector(".muted");
    if (placeholder) placeholder.remove();

    dom.realtimeFeed.prepend(item);

    // Trim to max
    while (dom.realtimeFeed.children.length > MAX_FEED_ITEMS) {
      dom.realtimeFeed.removeChild(dom.realtimeFeed.lastChild);
    }
  };

  // ═══════════════════════════════════════════════
  // EVENT WIRING
  // ═══════════════════════════════════════════════

  dom.openTaskModalBtn.addEventListener("click", openCreateModal);
  dom.closeTaskModalBtn.addEventListener("click", closeModal);
  dom.modalBackdrop.addEventListener("click", closeModal);

  dom.statusFilter.addEventListener("change", () => {
    state.tasksDirty = true;
    loadTasks();
  });
  dom.priorityFilter.addEventListener("change", () => {
    state.tasksDirty = true;
    loadTasks();
  });

  dom.logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("access_token");
    window.location.href = LOGIN_URL;
  });

  dom.taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const payload = {
      title: dom.taskForm.title.value,
      description: dom.taskForm.description.value,
      priority: dom.taskForm.priority.value,
      status: dom.taskForm.status.value,
    };
    saveTask(payload, dom.taskForm.taskId.value);
  });

  // Close modal on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !dom.taskModal.classList.contains("hidden")) {
      closeModal();
    }
  });

  // ═══════════════════════════════════════════════
  // SOCKET.IO REALTIME
  // ═══════════════════════════════════════════════

  window.Sockets.init({
    onConnect: () => showToast("⚡ Realtime connected"),
    onTaskCreated: (payload) => {
      addRealtimeItem("Created", payload?.task?.title || "Unknown");
      invalidateCache();
      if (state.currentView === "dashboard" || state.currentView === "tasks") {
        refreshCurrentView();
      }
    },
    onTaskUpdated: (payload) => {
      addRealtimeItem("Updated", payload?.task?.title || "Unknown");
      invalidateCache();
      if (state.currentView === "dashboard" || state.currentView === "tasks") {
        refreshCurrentView();
      }
    },
    onTaskDeleted: (payload) => {
      addRealtimeItem("Deleted", payload?.task?.title || "Unknown");
      invalidateCache();
      if (state.currentView === "dashboard" || state.currentView === "tasks") {
        refreshCurrentView();
      }
    },
  });

  // ═══════════════════════════════════════════════
  // FETCH USER INFO
  // ═══════════════════════════════════════════════

  const loadUserInfo = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
      if (response.status === 401) { handleUnauthorized(); return; }
      const result = await response.json();
      if (response.ok && result.success && result.data?.user) {
        const user = result.data.user;
        dom.userName.textContent = user.username;
        const avatar = dom.userPill.querySelector(".user-avatar");
        if (avatar) avatar.textContent = user.username.charAt(0).toUpperCase();
      }
    } catch {
      // silently fail
    }
  };

  // ═══════════════════════════════════════════════
  // UTILS
  // ═══════════════════════════════════════════════

  const escapeHtml = (str) => {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  };

  // ═══════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════

  loadUserInfo();
  switchView("dashboard");
})();
