(function () {
  function money(value) {
    if (typeof currency !== "undefined") return currency.format(value);
    return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(value || 0);
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
        taxation: parseMoney(cells[6].textContent)
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

    const canvas = document.getElementById("tenYearFundingChart");
    if (canvas && typeof drawBars === "function") {
      drawBars(canvas.getContext("2d"), canvas, [
        { label: "Grants", value: totals.grants, color: "#167d7f" },
        { label: "Alternatives", value: totals.alternatives, color: "#4f8f45" },
        { label: "Reserves", value: totals.reserves, color: "#19324a" },
        { label: "Debt", value: totals.debt, color: "#b94a48" },
        { label: "Taxation", value: totals.taxation, color: "#b87b22" }
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
      `Grants and alternatives cover ${Math.round(externalShare * 100)}% of the 10-year capital need before reserves are used.`,
      `Reserve funding covers ${Math.round(reserveShare * 100)}% of the modelled 10-year program while preserving reserve minimums.`,
      `Debt covers ${Math.round(debtShare * 100)}% of the 10-year need, with taxation shown separately after annual debt capacity is used.`
    ];
    if (pressureYears.length) {
      findings.push(`Largest debt/tax pressure years: ${pressureYears.map((row) => `${row.year} ${money(row.debt + row.taxation)}`).join(", ")}.`);
    }
    const list = document.getElementById("tenYearFindingsList");
    if (list) list.innerHTML = findings.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
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
