(function () {
  function bindScenarioClearRecalculation() {
    const button = document.getElementById("clearScenarioProjects");
    if (!button || button.dataset.recalculateBound === "true") return;
    button.dataset.recalculateBound = "true";
    button.addEventListener("click", () => {
      setTimeout(() => {
        if (typeof state === "undefined" || typeof runModel !== "function") return;
        if (state.reserves.length && state.cashflow.length && state.projects.length) {
          runModel();
        }
      }, 0);
    });
  }

  function injectChartStyles() {
    if (document.getElementById("tenYearLineChartStyles")) return;
    const style = document.createElement("style");
    style.id = "tenYearLineChartStyles";
    style.textContent = `
      .line-chart-canvas {
        display: block;
        width: 100%;
        height: 280px;
        margin: 10px 0 14px;
        border: 1px solid var(--line);
        background: #fff;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureCanvas(id, rowsId) {
    const existing = document.getElementById(id);
    if (existing) return existing;
    const rows = document.getElementById(rowsId);
    const tableWrap = rows?.closest(".table-wrap");
    if (!tableWrap) return null;
    const canvas = document.createElement("canvas");
    canvas.id = id;
    canvas.className = "line-chart-canvas";
    canvas.width = 960;
    canvas.height = 280;
    tableWrap.insertAdjacentElement("beforebegin", canvas);
    return canvas;
  }

  function ensureLineChartCanvases() {
    injectChartStyles();
    ensureCanvas("longRangeChart", "longRangeRows");
    ensureCanvas("debtServiceChart", "debtServiceRows");
  }

  function parseMoney(value) {
    return Number(String(value || "").replace(/[^0-9.-]/g, "")) || 0;
  }

  function parseFundingRows() {
    return Array.from(document.querySelectorAll("#longRangeRows tr"))
      .map((row) => Array.from(row.cells || []))
      .filter((cells) => cells.length >= 7)
      .map((cells) => ({
        year: Number(cells[0].textContent) || 0,
        projectCost: parseMoney(cells[1].textContent),
        external: parseMoney(cells[2].textContent),
        reserves: parseMoney(cells[3].textContent),
        debt: parseMoney(cells[4].textContent),
        taxation: parseMoney(cells[5].textContent),
        endingReserves: parseMoney(cells[6].textContent)
      }))
      .filter((row) => row.year);
  }

  function parseDebtRows() {
    return Array.from(document.querySelectorAll("#debtServiceRows tr"))
      .map((row) => Array.from(row.cells || []))
      .filter((cells) => cells.length >= 8)
      .map((cells) => ({
        year: Number(cells[0].textContent) || 0,
        serviceByRate: {
          "3.0%": parseMoney(cells[2].textContent),
          "4.0%": parseMoney(cells[3].textContent),
          "5.0%": parseMoney(cells[4].textContent),
          "6.0%": parseMoney(cells[5].textContent)
        },
        taxation: parseMoney(cells[6].textContent)
      }))
      .filter((row) => row.year);
  }

  function compactChartCurrency(value) {
    const abs = Math.abs(value);
    if (abs >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (abs >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `$${Math.round(value / 1000)}K`;
    return `$${Math.round(value).toLocaleString()}`;
  }

  function lineSeriesValue(item, row) {
    if (typeof item.value === "function") return item.value(row);
    return Number(row[item.key]) || 0;
  }

  function drawLineLegend(ctx, series, x, y, maxWidth) {
    let cursorX = x;
    let cursorY = y;
    ctx.font = "12px Inter, system-ui, sans-serif";
    series.forEach((item) => {
      const labelWidth = ctx.measureText(item.label).width + 28;
      if (cursorX + labelWidth > x + maxWidth) {
        cursorX = x;
        cursorY += 18;
      }
      ctx.fillStyle = item.color;
      ctx.fillRect(cursorX, cursorY - 9, 14, 3);
      ctx.fillStyle = "#4b5863";
      ctx.fillText(item.label, cursorX + 20, cursorY - 5);
      cursorX += labelWidth + 14;
    });
  }

  function drawMultiLineChart(canvas, rows, series) {
    if (!canvas || !canvas.getContext || !rows.length) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const pad = { top: 20, right: 26, bottom: 58, left: 70 };
    const plotWidth = width - pad.left - pad.right;
    const plotHeight = height - pad.top - pad.bottom;
    const values = rows.flatMap((row) => series.map((item) => lineSeriesValue(item, row)));
    const maxValue = Math.max(1, ...values);
    const yMax = Math.ceil(maxValue / 10000000) * 10000000;
    const xStep = rows.length > 1 ? plotWidth / (rows.length - 1) : plotWidth;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#d8e0e4";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#62707b";
    ctx.font = "12px Inter, system-ui, sans-serif";

    for (let i = 0; i <= 4; i += 1) {
      const value = (yMax / 4) * i;
      const y = pad.top + plotHeight - (value / yMax) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
      ctx.fillText(compactChartCurrency(value), 8, y + 4);
    }

    rows.forEach((row, index) => {
      const x = pad.left + xStep * index;
      ctx.fillStyle = "#62707b";
      ctx.fillText(String(row.year), x - 12, height - 32);
    });

    series.forEach((item) => {
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      rows.forEach((row, index) => {
        const x = pad.left + xStep * index;
        const y = pad.top + plotHeight - (lineSeriesValue(item, row) / yMax) * plotHeight;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    drawLineLegend(ctx, series, pad.left, height - 8, plotWidth);
  }

  function renderChartsFromTables() {
    ensureLineChartCanvases();
    drawMultiLineChart(document.getElementById("longRangeChart"), parseFundingRows(), [
      { key: "projectCost", label: "Capital need", color: "#17212b" },
      { key: "external", label: "Grants & alternatives", color: "#167d7f" },
      { key: "reserves", label: "Reserve funding", color: "#19324a" },
      { key: "debt", label: "New debt", color: "#b94a48" },
      { key: "taxation", label: "Taxation", color: "#b87b22" },
      { key: "endingReserves", label: "Ending reserves", color: "#4f8f45" }
    ]);
    drawMultiLineChart(document.getElementById("debtServiceChart"), parseDebtRows(), [
      { label: "Debt service 3.0%", color: "#167d7f", value: (row) => row.serviceByRate["3.0%"] },
      { label: "Debt service 4.0%", color: "#19324a", value: (row) => row.serviceByRate["4.0%"] },
      { label: "Debt service 5.0%", color: "#b87b22", value: (row) => row.serviceByRate["5.0%"] },
      { label: "Debt service 6.0%", color: "#b94a48", value: (row) => row.serviceByRate["6.0%"] },
      { key: "taxation", label: "Taxation", color: "#4f8f45" }
    ]);
  }

  function bindTenYearCharts() {
    ensureLineChartCanvases();
    if (window.tenYearChartsWrapped || typeof renderStrategy !== "function") {
      renderChartsFromTables();
      return;
    }
    window.tenYearChartsWrapped = true;
    const baseRenderStrategy = renderStrategy;
    renderStrategy = (strategy) => {
      baseRenderStrategy(strategy);
      renderChartsFromTables();
    };
    renderChartsFromTables();
  }

  function init() {
    bindScenarioClearRecalculation();
    bindTenYearCharts();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
