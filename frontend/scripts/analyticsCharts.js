(function (window, document) {
  let categoryChartInstance = null;
  let monthlyChartInstance = null;

  const CATEGORY_COLORS = [
    "#35c2ff",
    "#20d46b",
    "#ffb84d",
    "#a78bfa",
    "#ff6b8a",
    "#2dd4bf",
    "#f97316",
    "#60a5fa",
    "#e879f9",
    "#94a3b8"
  ];

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function destroyCategoryChart() {
    categoryChartInstance?.destroy();
    categoryChartInstance = null;
  }

  function destroyMonthlyChart() {
    monthlyChartInstance?.destroy();
    monthlyChartInstance = null;
  }

  function renderCategorySpending(items = []) {
    const canvas = document.getElementById("categoryExpensesChart");
    if (!canvas) return;

    destroyCategoryChart();

    if (!items.length) return;

    categoryChartInstance = new window.Chart(canvas, {
      type: "doughnut",
      data: {
        labels: items.map((item) => item.category),
        datasets: [{
          data: items.map((item) => Math.abs(item.amount)),
          backgroundColor: items.map((_, index) => (
            CATEGORY_COLORS[index % CATEGORY_COLORS.length]
          )),
          borderColor: "#0d1a2f",
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "66%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#aebed6",
              boxWidth: 10,
              usePointStyle: true,
              padding: 14
            }
          },
          tooltip: {
            callbacks: {
              label(context) {
                const item = items[context.dataIndex];
                return `${item.category}: ${formatCurrency(item.amount)} (${item.percentage_of_expenses}%)`;
              }
            }
          }
        }
      }
    });
  }

  function renderMonthlyEvolution(items = []) {
    const canvas = document.getElementById("monthlyEvolutionChart");
    if (!canvas) return;

    destroyMonthlyChart();

    monthlyChartInstance = new window.Chart(canvas, {
      type: "bar",
      data: {
        labels: items.map((item) => item.month),
        datasets: [
          {
            label: "Receitas",
            data: items.map((item) => item.income),
            backgroundColor: "rgba(32, 212, 107, 0.72)",
            borderRadius: 5
          },
          {
            label: "Despesas",
            data: items.map((item) => item.expense),
            backgroundColor: "rgba(255, 91, 91, 0.72)",
            borderRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: "#aebed6",
              usePointStyle: true,
              boxWidth: 10
            }
          },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: "#8fa3c7", maxRotation: 45, minRotation: 0 },
            grid: { display: false },
            border: { color: "rgba(255, 255, 255, 0.08)" }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#8fa3c7",
              callback(value) {
                return formatCurrency(value);
              }
            },
            grid: { color: "rgba(255, 255, 255, 0.05)" },
            border: { color: "rgba(255, 255, 255, 0.08)" }
          }
        }
      }
    });
  }

  window.EZSaldoAnalyticsCharts = {
    destroy() {
      destroyCategoryChart();
      destroyMonthlyChart();
    },
    renderCategorySpending,
    renderMonthlyEvolution
  };
})(window, document);
