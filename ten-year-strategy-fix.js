(function () {
  const publishedCapitalPlanTotal = 1_767_203_000;
  const publishedCapitalPlanYears = "2026-2030";
  const publishedFunding2026 = {
    external: 26_775_000,
    reserves: 342_500_000,
    debt: 134_103_000,
    taxation: 0,
  };

  function money(value) {
    if (typeof currency !== "undefined") return currency.format(value);
    return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(value || 0);
  }

  function compactMoney(value) {
    const abs = Math.abs(value || 0);
    if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
    return money(value);
  }

  function parseMoney(value) {
    return Number(String(value || "").replace(/[^0-9.-]/g, "")) || 0;
  }

  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function setText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  }

  function ensureTenYearStrategySection() {
    if (document.getElementById("tenYearStrategy")) return;
    const longRange = document.getElementById("longRangeCashflow");
    if (!longRange) return;

    const nav = document.querySelector(".steps");
    if (nav && !nav.querySelector('a[href="#tenYearStrategy"]')) {
      const link = document.createElement("a");
      link.href = "#tenYearStrategy";
      link.textContent = "10 Year Strategy";
      const longRangeLink = nav.querySelector('a[href="#longRangeCashflow"]');
      if (longRangeLink) nav.insertBefore(link, longRangeLink);
      else nav.appendChild(link);
    }

    const section = document.createElement("section");
    section.id = "tenYearStrategy";
    section.className = "panel-band";
    section.hidden = true;
    section.innerHTML = `
      <div class="section-heading">
        <div>
          <p class="eyebrow">Step 7</p>
          <h2>10 Year Recommended Strategy</h2>
        </div>
        <p id="tenYearStrategyNote">Load the Kelowna plan to see the recommended long-range funding strategy.</p>
      </div>
      <div class="metric-grid">
        <div class="metric"><span>10 year capital need</span><strong id="tenYearMetricNeed">$0</strong></div>
        <div class="metric"><span>Grants and alternatives</span><strong id="tenYearMetricExternal">$0</strong></div>
        <div class="metric"><span>Reserve funding</span><strong id="tenYearMetricReserves">$0</strong></div>
        <div class="metric alert"><span>Debt and taxation</span><strong id="tenYearMetricPressure">$0</strong></div>
      </div>
      <div class="strategy-layout">
        <div class="chart-panel">
          <div class="chart-header">
            <h3>10 Year Funding Mix</h3>
            <span id="tenYearChartCaption">Awaiting model</span>
          </div>
          <canvas id="tenYearFundingChart" width="840" height="320"></canvas>
        </div>
        <div class="findings-panel">
          <h3>10 Year Funding Guidance</h3>
          <ul id="tenYearFindingsList">
            <li>Load the Kelowna plan to identify the long-range least-tax strategy.</li>
          </ul>
        </div>
      </div>
      <div id="tenYearComparisonPanel" class="comparison-panel" hidden>
        <div class="chart-header">
          <div>
            <h3>10 Year Before vs Optimized</h3>
            <span id="tenYearComparisonCaption">Modelled baseline compared with the optimizer</span>
          </div>
          <span id="tenYearComparisonDelta">Awaiting model</span>
        </div>
        <canvas id="tenYearComparisonChart" width="920" height="340"></canvas>
        <p id="tenYearSourceNote" class="source-note"></p>
      </div>
    `;
    longRange.insertAdjacentElement("beforebegin", section);
  }

  function readTenYearRows() {
    return Array.from(document.querySelectorAll("#longRangeRows tr"))
      .map((row) => Array.from(row.cells || []))
      .filter((cells) => cells.length >= 8)
      .map((cells) => ({
        year: Number(cells[0].textContent) || 0,
        projectCost: parseMoney(cells[1].textContent),
        grants: parseMoney(cells[2].textContent),
        alternatives: parseMoney(cells[3].textContent),
        reserves: parseMoney(cells[4].textContent),
        debt: parseMoney(cells[5].textContent),
        taxation: parseMoney(cells[6].textContent),
      }))
      .filter((row) => row.year && row.projectCost);
  }

  function totalRows(rows) {
    return rows.reduce((sum, row) => {
      sum.projectCost += row.projectCost;
      sum.grants += row.grants;
      sum.alternatives += row.alternatives;
      sum.reserves += row.reserves;
      sum.debt += row.debt;
      sum.taxation += row.taxation;
      return sum;
    }, { projectCost: 0, grants: 0, alternatives: 0, reserves: 0, debt: 0, taxation: 0 });
  }

  function renderTenYearStrategy() {
    ensureTenYearStrategySection();
    const panel = document.getElementById("tenYearStrategy");
    if (!panel) return;
    const rows = readTenYearRows();
    if (!rows.length) return;

    const totals = totalRows(rows);
    const external = totals.grants + totals.alternatives;
    const pressure = totals.debt + totals.taxation;
    panel.hidden = false;

    setText("tenYearStrategyNote", "This summarizes the optimizer's recommended funding mix across the full 10-year model, including the repeated 2031-2035 capital cycle used for long-range scenario testing.");
    setText("tenYearMetricNeed", money(totals.projectCost));
    setText("tenYearMetricExternal", money(external));
    setText("tenYearMetricReserves", money(totals.reserves));
    setText("tenYearMetricPressure", money(pressure));
    setText("tenYearChartCaption", `${money(totals.projectCost)} total 10-year need`);
    renderTenYearBeforeAfter(totals);

    const canvas = document.getElementById("tenYearFundingChart");
    if (canvas && typeof drawBars === "function") {
      drawBars(canvas.getContext("2d"), canvas, [
        { label: "Grants", value: totals.grants, color: "#167d7f" },
        { label: "Alternatives", value: totals.alternatives, color: "#4f8f45" },
        { label: "Reserves", value: totals.reserves, color: "#19324a" },
        { label: "Debt", value: totals.debt, color: "#b94a48" },
        { label: "Taxation", value: totals.taxation, color: "#b87b22" },
      ]);
    }

    const externalShare = totals.projectCost ? external / totals.projectCost : 0;
    const reserveShare = totals.projectCost ? totals.reserves / totals.projectCost : 0;
    const debtShare = totals.projectCost ? totals.debt / totals.projectCost : 0;
    const pressureYears = rows
      .filter((row) => row.debt || row.taxation)
      .sort((a, b) => (b.debt + b.taxation) - (a.debt + a.taxation))
      .slice(0, 3);
    const findings = [
      `The 10-year need exceeds the published ${publishedCapitalPlanYears} plan because the model repeats the available five-year capital program into 2031-2035 and applies the current inflation setting to both cycles.`,
      `Grants and alternatives cover ${Math.round(externalShare * 100)}% of the 10-year capital need before reserves are used.`,
      `Reserve funding covers ${Math.round(reserveShare * 100)}% of the modelled 10-year program while preserving reserve minimums.`,
      `Debt covers ${Math.round(debtShare * 100)}% of the 10-year need, with taxation shown separately after annual debt capacity is used.`,
    ];
    if (pressureYears.length) {
      findings.push(`Largest debt/tax pressure years: ${pressureYears.map((row) => `${row.year} ${money(row.debt + row.taxation)}`).join(", ")}.`);
    }
    const list = document.getElementById("tenYearFindingsList");
    if (list) list.innerHTML = findings.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  function renderTenYearBeforeAfter(totals) {
    const panel = document.getElementById("tenYearComparisonPanel");
    if (!panel) return;
    const publishedMixTotal = Math.max(1, publishedFunding2026.external + publishedFunding2026.reserves + publishedFunding2026.debt + publishedFunding2026.taxation);
    const baseline = {
      label: "Baseline",
      external: totals.projectCost * (publishedFunding2026.external / publishedMixTotal),
      reserves: totals.projectCost * (publishedFunding2026.reserves / publishedMixTotal),
      debt: totals.projectCost * (publishedFunding2026.debt / publishedMixTotal),
      taxation: totals.projectCost * (publishedFunding2026.taxation / publishedMixTotal),
    };
    const optimized = {
      label: "Optimized",
      external: totals.grants + totals.alternatives,
      reserves: totals.reserves,
      debt: totals.debt,
      taxation: totals.taxation,
    };
    const pressureReduction = baseline.debt + baseline.taxation - optimized.debt - optimized.taxation;
    panel.hidden = false;
    setText("tenYearComparisonCaption", "Modelled 10-year baseline applies the published 2026 capital funding mix proportionally, then compares the optimized sequence");
    setText("tenYearComparisonDelta", `${money(pressureReduction)} less debt/tax pressure`);
    setText("tenYearSourceNote", `The ${money(totals.projectCost)} 10-year need is a scenario extension, not a published 10-year plan: it repeats Kelowna's ${money(publishedCapitalPlanTotal)} 2026-2030 capital program into 2031-2035 and applies the current inflation setting.`);
    drawComparisonBars(document.getElementById("tenYearComparisonChart"), [baseline, optimized]);
  }

  function drawComparisonBars(canvas, rows) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const margin = { top: 34, right: 42, bottom: 70, left: 64 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const max = Math.max(...rows.map((row) => row.external + row.reserves + row.debt + row.taxation), 1);
    const barWidth = Math.min(150, plotWidth / rows.length - 110);
    const colors = { external: "#167d7f", reserves: "#19324a", debt: "#b94a48", taxation: "#b87b22" };

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "#d8dee5";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + plotHeight);
    ctx.lineTo(width - margin.right, margin.top + plotHeight);
    ctx.stroke();

    rows.forEach((row, index) => {
      const total = row.external + row.reserves + row.debt + row.taxation;
      const x = margin.left + (index + 0.5) * (plotWidth / rows.length) - barWidth / 2;
      let y = margin.top + plotHeight;
      [["taxation", row.taxation], ["debt", row.debt], ["reserves", row.reserves], ["external", row.external]].forEach(([key, value]) => {
        const segmentHeight = (value / max) * plotHeight;
        y -= segmentHeight;
        ctx.fillStyle = colors[key];
        ctx.fillRect(x, y, barWidth, segmentHeight);
        if (segmentHeight > 24) {
          ctx.fillStyle = "#ffffff";
          ctx.font = "700 15px system-ui";
          ctx.textAlign = "center";
          ctx.fillText(compactMoney(value), x + barWidth / 2, y + Math.min(segmentHeight - 8, segmentHeight / 2 + 5));
        }
      });
      ctx.fillStyle = "#17212b";
      ctx.font = "800 17px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(compactMoney(total), x + barWidth / 2, margin.top + plotHeight + 28);
      ctx.fillStyle = "#66717d";
      ctx.font = "700 16px system-ui";
      ctx.fillText(row.label, x + barWidth / 2, margin.top + plotHeight + 52);
    });

    drawLegend(ctx, width - 480, 22, [
      ["Grants/alternatives", colors.external],
      ["Reserves", colors.reserves],
      ["Debt", colors.debt],
      ["Taxation", colors.taxation],
    ]);
  }

  function drawLegend(ctx, x, y, items) {
    ctx.textAlign = "left";
    ctx.font = "700 14px system-ui";
    items.forEach(([label, color], index) => {
      const offset = index * 112;
      ctx.fillStyle = color;
      ctx.fillRect(x + offset, y, 12, 12);
      ctx.fillStyle = "#66717d";
      ctx.fillText(label, x + offset + 18, y + 11);
    });
  }

  function bindTenYearStrategy() {
    ensureTenYearStrategySection();
    if (window.tenYearStrategyWrapped || typeof renderStrategy !== "function") {
      setTimeout(renderTenYearStrategy, 0);
      return;
    }
    window.tenYearStrategyWrapped = true;
    const baseRenderStrategy = renderStrategy;
    renderStrategy = (strategy) => {
      baseRenderStrategy(strategy);
      setTimeout(renderTenYearStrategy, 0);
    };
    setTimeout(renderTenYearStrategy, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindTenYearStrategy);
  } else {
    bindTenYearStrategy();
  }
})();
