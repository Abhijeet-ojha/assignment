/* ═══════════════════════════════════════════════
   analytics.js — Chart.js rendering module
   ═══════════════════════════════════════════════ */

window.Analytics = (() => {
  let statusChart = null;
  let priorityChart = null;

  const CHART_COLORS = {
    accent: "#1f7a68",
    emerald: "#3be3bf",
    blue: "#5a6dff",
    amber: "#f59e0b",
    red: "#e94949",
    muted: "#d1d5db",
  };

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { family: "'Work Sans', sans-serif", size: 12 },
        },
      },
    },
  };

  /** Destroy existing chart instances to prevent memory leaks */
  const destroyCharts = () => {
    if (statusChart) { statusChart.destroy(); statusChart = null; }
    if (priorityChart) { priorityChart.destroy(); priorityChart = null; }
  };

  /** Render doughnut chart for task status distribution */
  const renderStatusChart = (distribution) => {
    const canvas = document.getElementById("statusChart");
    if (!canvas) return;

    const labels = Object.keys(distribution);
    const data = Object.values(distribution);

    if (!labels.length) {
      _showEmpty(canvas, "No tasks to display");
      return;
    }

    const colors = labels.map((label) => {
      const lower = label.toLowerCase();
      if (lower === "completed") return CHART_COLORS.emerald;
      if (lower === "pending") return CHART_COLORS.amber;
      return CHART_COLORS.muted;
    });

    statusChart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 6,
        }],
      },
      options: {
        ...chartDefaults,
        cutout: "65%",
      },
    });
  };

  /** Render bar chart for priority distribution */
  const renderPriorityChart = (distribution) => {
    const canvas = document.getElementById("priorityChart");
    if (!canvas) return;

    const labels = Object.keys(distribution);
    const data = Object.values(distribution);

    if (!labels.length) {
      _showEmpty(canvas, "No priority data");
      return;
    }

    const colors = labels.map((label) => {
      const lower = label.toLowerCase();
      if (lower === "high") return CHART_COLORS.red;
      if (lower === "medium") return CHART_COLORS.amber;
      if (lower === "low") return CHART_COLORS.blue;
      return CHART_COLORS.muted;
    });

    priorityChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Tasks",
          data,
          backgroundColor: colors,
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 48,
        }],
      },
      options: {
        ...chartDefaults,
        plugins: {
          ...chartDefaults.plugins,
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: { family: "'Work Sans', sans-serif", size: 11 },
              color: "#667085",
            },
            grid: { color: "rgba(0,0,0,0.04)" },
          },
          x: {
            ticks: {
              font: { family: "'Work Sans', sans-serif", size: 12, weight: "600" },
              color: "#344054",
            },
            grid: { display: false },
          },
        },
      },
    });
  };

  /** Render analytics insight cards */
  const renderInsightCards = (data) => {
    _setText("analyticsProductivity", `${data.productivity_score ?? 0}`);
    _setText("analyticsStreak", `${data.streak_days ?? 0} days`);
    _setText("analyticsVelocity", `${data.completion_velocity ?? 0}/day`);
    _setText("analyticsAvgDaily", `${data.avg_tasks_per_day ?? 0}`);

    // Remove skeleton loading
    document.querySelectorAll("#insightsStrip .insight-card").forEach((el) => {
      el.classList.add("loaded");
    });
  };

  /** Render progress bar */
  const renderProgress = (data) => {
    _setText("progressLabel", `${data.completion_percentage ?? 0}%`);
    _setText("progCompleted", data.completed_tasks ?? 0);
    _setText("progPending", data.pending_tasks ?? 0);
    _setText("progTotal", data.total_tasks ?? 0);

    const fill = document.getElementById("progressFill");
    if (fill) {
      // Trigger reflow for animation
      fill.style.width = "0%";
      requestAnimationFrame(() => {
        fill.style.width = `${data.completion_percentage ?? 0}%`;
      });
    }
  };

  /** Render priority completion table */
  const renderPriorityCompletion = (priorityCompletion) => {
    const container = document.getElementById("priorityCompletionTable");
    if (!container) return;

    const entries = Object.entries(priorityCompletion || {});
    if (!entries.length) {
      container.innerHTML = '<div class="empty-state">No data available</div>';
      return;
    }

    container.innerHTML = entries
      .map(([priority, stats]) => {
        const ratio = stats.ratio ?? 0;
        return `
          <div class="stat-row">
            <span class="stat-label">${priority}</span>
            <span class="stat-val">${stats.completed}/${stats.total}</span>
            <div class="stat-bar-wrap">
              <div class="stat-bar-inner" style="width: ${ratio}%"></div>
            </div>
            <span class="stat-val">${ratio}%</span>
          </div>`;
      })
      .join("");
  };

  /** Full analytics render pipeline */
  const renderAll = (data) => {
    destroyCharts();
    renderInsightCards(data);
    renderProgress(data);
    renderStatusChart(data.status_distribution || {});
    renderPriorityChart(data.priority_distribution || {});
    renderPriorityCompletion(data.priority_completion || {});
  };

  // Helpers
  const _setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  const _showEmpty = (canvas, message) => {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '14px "Work Sans", sans-serif';
    ctx.fillStyle = "#667085";
    ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  };

  return { renderAll, destroyCharts };
})();
