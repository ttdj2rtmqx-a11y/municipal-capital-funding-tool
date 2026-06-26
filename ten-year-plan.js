(function () {
  const PLAN_YEARS = 10;
  const START_YEAR = 2026;
  const INTEREST_RATES = [0.03, 0.04, 0.05, 0.06];
  const DEBT_TERM_YEARS = 20;
  const PUBLISHED_DEBT_2026 = 134_103_000;

  function initTenYearPlan() {
    applyTenYearLabels();
    if (window.tenYearPlanWrapped || typeof renderStrategy !== "function") return;
    window.tenYearPlanWrapped = true;
    const baseRenderStrategy = renderStrategy;
    renderStrategy = strategy => {
      baseRenderStrategy(strategy);
      renderTenYearKelownaPlan(strategy);
    };
    if (typeof state !== "undefined" && state.strategy) {
      renderTenYearKelownaPlan(state.strategy);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTenYearPlan);
  } else {
    initTenYearPlan();
  }

  function applyTenYearLabels() {
    const horizon = document.getElementById("horizonYears");
    if (horizon) {
      horizon.min = "10";
      horizon.max = "10";
      horizon.value = "10";
      const label = horizon.closest("label");
      if (label && label.firstChild) label.firstChild.textContent = "Plan period\n            ";
    }

    setText("#longRangeCashflow h2", "10 Year Cash Flow and Debt Service");
    setText("#longRangeIntro", "Load the Kelowna plan to see the 10 year cash flow model and annual debt service sensitivity.");
    setText("#longRangeCashflow .long-range-section:first-of-type h3", "10 year funding cash flow");
    setText("#longRangeCaption", "Capital plan modelled across the 10 year planning period");

    document.querySelectorAll(".steps a").forEach(link => {
      if (/30 Year/i.test(link.textContent)) link.textContent = "10 Year";
    });
    document.querySelectorAll(".upload-tile strong").forEach(label => {
      if (/30 year cash flow/i.test(label.textContent)) label.textContent = "10 year cash flow";
    });
  }

  function renderTenYearKelownaPlan(strategy) {
    applyTenYearLabels();
    if (typeof state === "undefined" || state.activeDataset !== "kelowna") return;

    const panel = document.getElementById("longRangeCashflow");
    if (!panel) return;
    const model = buildTenYearModel();
    panel.hidden = false;

    setText("#longRangeIntro", "This 10 year view uses Kelowna's available 2026-2030 capital program as the source period, repeats that five-year program once for years 2031-2035, applies the current inflation and reserve settings, and separates optimized residual funding into new debt first and taxation only after annual debt capacity is used.");

    const stats = document.getElementById("longRangeStats");
    if (stats) {
      stats.innerHTML = [
        stat("10 year capital need", model.totals.projectCost),
        stat("10 year new debt", model.totals.debt, "warning"),
        stat("10 year taxation", model.totals.taxation, "warning"),
        stat("Peak debt service at 5.0%", model.totals.peakDebtServiceAtFive),
      ].join("");
    }

    const cashRows = document.getElementById("longRangeRows");
    if (cashRows) {
      cashRows.innerHTML = model.annual.map(row => `
        <tr>
          <td>${row.year}</td>
          <td>${money(row.projectCost)}</td>
          <td>${money(row.external)}</td>
          <td>${money(row.reserves)}</td>
          <td>${money(row.debt)}</td>
          <td>${money(row.taxation)}</td>
          <td>${money(row.endingReserves)}</td>
        </tr>
      `).join("");
    }

    const debtRows = document.getElementById("debtServiceRows");
    if (debtRows) {
      debtRows.innerHTML = model.debtService.map(row => `
        <tr>
          <td>${row.year}</td>
          <td>${money(row.newDebt)}</td>
          <td>${money(row.serviceByRate[0.03])}</td>
          <td>${money(row.serviceByRate[0.04])}</td>
          <td>${money(row.serviceByRate[0.05])}</td>
          <td>${money(row.serviceByRate[0.06])}</td>
          <td>${money(row.taxation)}</td>
          <td>${money(row.taxation + row.serviceByRate[0.05])}</td>
        </tr>
      `).join("");
    }
  }

  function buildTenYearModel() {
    const settings = { ...getSettings(), horizonYears: PLAN_YEARS };
    const cashflow = buildTenYearCashflow(settings.horizonYears);
    const projects = buildTenYearProjects(settings);
    const strategy = optimizeFunding(kelownaPresetData.reserves, cashflow, projects, settings);
    const annual = strategy.annual.slice(0, PLAN_YEARS).map(row => {
      const split = splitTaxDebt(row, cashflow);
      return {
        year: row.year,
        projectCost: row.projectCost,
        external: row.grants + row.alternatives,
        reserves: row.restricted + row.unrestricted,
        debt: split.debt,
        taxation: split.taxation,
        endingReserves: row.endingReserves,
      };
    });
    const debtService = buildDebtService(annual);
    const totals = annual.reduce((sum, row) => {
      sum.projectCost += row.projectCost;
      sum.debt += row.debt;
      sum.taxation += row.taxation;
      return sum;
    }, { projectCost: 0, debt: 0, taxation: 0, peakDebtServiceAtFive: 0 });
    totals.peakDebtServiceAtFive = Math.max(...debtService.map(row => row.serviceByRate[0.05]), 0);
    return { annual, debtService, totals };
  }

  function buildTenYearCashflow(horizonYears) {
    const base = kelownaPresetData.cashflow[0];
    return Array.from({ length: horizonYears }, (_, index) => ({
      year: START_YEAR + index,
      baseRevenues: base.baseRevenues * Math.pow(1.025, index),
      baseExpenses: base.baseExpenses * Math.pow(1.028, index),
      taxRevenue: base.taxRevenue * Math.pow(1.03, index),
      debtCapacity: index === 0 ? PUBLISHED_DEBT_2026 : 74_800_000 * Math.pow(1.02, Math.max(0, index - 1)),
    }));
  }

  function buildTenYearProjects(settings) {
    const horizonEnd = START_YEAR + PLAN_YEARS - 1;
    const cycleLength = 5;
    return kelownaPresetData.projects.flatMap(project => {
      const baseOffset = project.startYear - START_YEAR;
      const baseName = cleanName(project.name);
      const rows = [];
      for (let cycle = 0; ; cycle += 1) {
        const year = START_YEAR + baseOffset + cycle * cycleLength;
        if (year > horizonEnd) break;
        rows.push({
          ...project,
          name: `${baseName} capital requests ${year}`,
          startYear: year,
          endYear: year,
          alternativeFunding: (project.alternativeFunding || 0) * Math.pow(1 + settings.inflationRate, cycle * cycleLength),
        });
      }
      return rows;
    });
  }

  function splitTaxDebt(row, cashflowRows) {
    const cashflow = cashflowRows.find(item => item.year === row.year);
    const capacity = cashflow ? cashflow.debtCapacity || 0 : 0;
    const debt = Math.min(row.gap || 0, capacity);
    return { debt, taxation: Math.max(0, (row.gap || 0) - debt) };
  }

  function buildDebtService(annual) {
    return annual.map((row, rowIndex) => {
      const serviceByRate = {};
      INTEREST_RATES.forEach(rate => {
        serviceByRate[rate] = annual.reduce((sum, debtRow, debtIndex) => {
          const age = rowIndex - debtIndex;
          if (age < 0 || age >= DEBT_TERM_YEARS || !debtRow.debt) return sum;
          return sum + annualPayment(debtRow.debt, rate);
        }, 0);
      });
      return { year: row.year, newDebt: row.debt, taxation: row.taxation, serviceByRate };
    });
  }

  function annualPayment(principal, rate) {
    if (!principal) return 0;
    if (!rate) return principal / DEBT_TERM_YEARS;
    return principal * (rate / (1 - Math.pow(1 + rate, -DEBT_TERM_YEARS)));
  }

  function stat(label, value, tone) {
    return `<div class="change-stat ${tone || ""}"><span>${escapeText(label)}</span><strong>${money(value)}</strong></div>`;
  }

  function setText(selector, text) {
    const element = document.querySelector(selector);
    if (element) element.textContent = text;
  }

  function money(value) {
    return typeof currency !== "undefined" ? currency.format(value) : new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(value);
  }

  function cleanName(name) {
    return String(name).replace(/\s+capital requests\s+\d{4}$/i, "");
  }

  function escapeText(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
})();
