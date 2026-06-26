(function () {
  const reconciledKelownaSourceNote = "Public source: City of Kelowna Budget Deliberations agenda, December 4, 2025. The preset uses the 2026 Financial Plan PDF, pages 68 and 72-75. Amounts are converted from $000s to dollars. Page 68's $518.166M Priority 1 total includes operating and capital requests; the 2026 comparison baseline is reconciled to the $503.378M 2026 Priority 1 capital request total, while the published 2026-2030 Priority 1 capital plan total is $1.767203B on page 75.";
  const reconciledKelownaCapitalPlanTotal = 1767203000;
  const reconciledKelownaCapitalPlanYears = "2026-2030";
  const reconciledKelownaPublishedFunding = {
    total: 503378000,
    external: 26775000,
    grants: 20600000,
    alternatives: 6175000,
    reserves: 342500000,
    debt: 134103000,
    taxation: 0,
    taxDebt: 134103000
  };

  function reconcileKelownaCapitalBaseline() {
    if (typeof kelownaPresetData !== "undefined") {
      kelownaPresetData.sourceNote = reconciledKelownaSourceNote;
      kelownaPresetData.publishedCapitalPlanTotal = reconciledKelownaCapitalPlanTotal;
      kelownaPresetData.publishedCapitalPlanYears = reconciledKelownaCapitalPlanYears;
      kelownaPresetData.publishedFunding2026 = { ...reconciledKelownaPublishedFunding };
    }
    if (typeof kelownaData !== "undefined") {
      kelownaData.sourceNote = reconciledKelownaSourceNote;
      kelownaData.publishedCapitalPlanTotal = reconciledKelownaCapitalPlanTotal;
      kelownaData.publishedCapitalPlanYears = reconciledKelownaCapitalPlanYears;
      kelownaData.publishedFunding2026 = { ...reconciledKelownaPublishedFunding };
    }
  }

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

  function describeAlternatives() {
    const section = document.querySelector("#longRangeRows")?.closest(".long-range-section");
    if (!section || section.querySelector(".alternative-source-note")) return;
    const header = section.querySelector(".chart-header");
    if (!header) return;
    const note = document.createElement("p");
    note.className = "source-note alternative-source-note";
    note.textContent = "Alternatives are non-tax, non-grant funding sources such as development cost charges, developer contributions, utility/airport/parking recoveries, partner contributions, fees, and reserve-backed recoveries assigned to eligible project types.";
    header.insertAdjacentElement("afterend", note);
  }

  function splitFundingTableHeaders() {
    const headerRow = document.querySelector("#longRangeRows")?.closest("table")?.querySelector("thead tr");
    if (!headerRow || headerRow.dataset.splitFunding === "true") return;
    headerRow.dataset.splitFunding = "true";
    headerRow.innerHTML = `
      <th>Year</th>
      <th>Capital need</th>
      <th>Grants</th>
      <th>Alternatives</th>
      <th>Reserve funding</th>
      <th>New debt</th>
      <th>Taxation</th>
      <th>Ending reserves</th>
    `;
  }

  function applySplitFundingPresentation() {
    describeAlternatives();
    splitFundingTableHeaders();
    insertPublishedPlanStat();
    const intro = document.getElementById("longRangeIntro");
    if (intro && /residual funding into new debt/i.test(intro.textContent || "")) {
      intro.textContent = "This 10 year view uses Kelowna's available 2026-2030 capital program as the source period, repeats that five-year program once for years 2031-2035, applies the current inflation and reserve settings, and separates grants, alternatives, reserves, new debt, and taxation.";
    }
  }

  function insertPublishedPlanStat() {
    const stats = document.getElementById("longRangeStats");
    if (!stats || document.getElementById("publishedCapitalPlanTotalStat")) return;
    const stat = document.createElement("div");
    stat.id = "publishedCapitalPlanTotalStat";
    stat.className = "change-stat";
    stat.innerHTML = `<span>${reconciledKelownaCapitalPlanYears} published capital plan</span><strong>${formatMoney(reconciledKelownaCapitalPlanTotal)}</strong>`;
    stats.insertAdjacentElement("afterbegin", stat);
  }

  function renderSplitFundingTableFromKnowns() {
    reconcileKelownaCapitalBaseline();
    if (typeof state === "undefined" || state.activeDataset !== "kelowna") return;
    if (typeof kelownaPresetData === "undefined" || typeof optimizeFunding !== "function" || typeof getSettings !== "function") return;
    const rows = document.getElementById("longRangeRows");
    if (!rows) return;
    const model = buildSplitTenYearModel();
    rows.innerHTML = model.annual.map((row) => `
      <tr>
        <td>${row.year}</td>
        <td>${formatMoney(row.projectCost)}</td>
        <td>${formatMoney(row.grants)}</td>
        <td>${formatMoney(row.alternatives)}</td>
        <td>${formatMoney(row.reserves)}</td>
        <td>${formatMoney(row.debt)}</td>
        <td>${formatMoney(row.taxation)}</td>
        <td>${formatMoney(row.endingReserves)}</td>
      </tr>
    `).join("");
  }

  function buildSplitTenYearModel() {
    const planYears = 10;
    const startYear = 2026;
    const settings = { ...getSettings(), horizonYears: planYears };
    const cashflow = buildSplitTenYearCashflow(planYears, startYear);
    const projects = buildSplitTenYearProjects(settings, planYears, startYear);
    const strategy = optimizeFunding(kelownaPresetData.reserves, cashflow, projects, settings);
    const annual = strategy.annual.slice(0, planYears).map((row) => {
      const split = splitTaxDebt(row, cashflow);
      return {
        year: row.year,
        projectCost: row.projectCost,
        grants: row.grants,
        alternatives: row.alternatives,
        reserves: row.restricted + row.unrestricted,
        debt: split.debt,
        taxation: split.taxation,
        endingReserves: row.endingReserves
      };
    });
    return { annual };
  }

  function buildSplitTenYearCashflow(planYears, startYear) {
    const base = kelownaPresetData.cashflow[0];
    return Array.from({ length: planYears }, (_, index) => ({
      year: startYear + index,
      baseRevenues: base.baseRevenues * Math.pow(1.025, index),
      baseExpenses: base.baseExpenses * Math.pow(1.028, index),
      taxRevenue: base.taxRevenue * Math.pow(1.03, index),
      debtCapacity: index === 0 ? 134103000 : 74800000 * Math.pow(1.02, Math.max(0, index - 1))
    }));
  }

  function buildSplitTenYearProjects(settings, planYears, startYear) {
    const horizonEnd = startYear + planYears - 1;
    const cycleLength = 5;
    const repeatedSourceProjects = kelownaPresetData.projects.flatMap((project) => {
      const baseOffset = project.startYear - startYear;
      const baseName = String(project.name).replace(/\s+capital requests\s+\d{4}$/i, "");
      const projects = [];
      for (let cycle = 0; ; cycle += 1) {
        const year = startYear + baseOffset + cycle * cycleLength;
        if (year > horizonEnd) break;
        projects.push({
          ...project,
          name: `${baseName} capital requests ${year}`,
          startYear: year,
          endYear: year,
          alternativeFunding: (project.alternativeFunding || 0) * Math.pow(1 + settings.inflationRate, cycle * cycleLength)
        });
      }
      return projects;
    });
    const scenarioProjects = Array.isArray(state.scenarioProjects)
      ? state.scenarioProjects
          .filter((project) => project.startYear <= horizonEnd && project.endYear >= startYear)
          .map((project) => ({ ...project }))
      : [];
    return repeatedSourceProjects.concat(scenarioProjects);
  }

  function splitTaxDebt(row, cashflowRows) {
    const cashflow = cashflowRows.find((item) => item.year === row.year);
    const capacity = cashflow ? cashflow.debtCapacity || 0 : 0;
    const debt = Math.min(row.gap || 0, capacity);
    return { debt, taxation: Math.max(0, (row.gap || 0) - debt) };
  }

  function formatMoney(value) {
    if (typeof currency !== "undefined") return currency.format(value);
    return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(value);
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
        grants: cells.length >= 8 ? parseMoney(cells[2].textContent) : parseMoney(cells[2].textContent),
        alternatives: cells.length >= 8 ? parseMoney(cells[3].textContent) : 0,
        external: cells.length >= 8 ? parseMoney(cells[2].textContent) + parseMoney(cells[3].textContent) : parseMoney(cells[2].textContent),
        reserves: parseMoney(cells[cells.length >= 8 ? 4 : 3].textContent),
        debt: parseMoney(cells[cells.length >= 8 ? 5 : 4].textContent),
        taxation: parseMoney(cells[cells.length >= 8 ? 6 : 5].textContent),
        endingReserves: parseMoney(cells[cells.length >= 8 ? 7 : 6].textContent)
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
    applySplitFundingPresentation();
    renderSplitFundingTableFromKnowns();
    drawMultiLineChart(document.getElementById("longRangeChart"), parseFundingRows(), [
      { key: "projectCost", label: "Capital need", color: "#17212b" },
      { key: "grants", label: "Grants", color: "#167d7f" },
      { key: "alternatives", label: "Alternatives", color: "#4f8f45" },
      { key: "reserves", label: "Reserve funding", color: "#19324a" },
      { key: "debt", label: "New debt", color: "#b94a48" },
      { key: "taxation", label: "Taxation", color: "#b87b22" },
      { key: "endingReserves", label: "Ending reserves", color: "#6f5aa8" }
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
    reconcileKelownaCapitalBaseline();
    bindScenarioClearRecalculation();
    bindTenYearCharts();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
