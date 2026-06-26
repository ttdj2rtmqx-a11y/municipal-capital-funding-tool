(function () {
  const PLAN_YEARS = 10;
  const START_YEAR = 2026;
  const INTEREST_RATES = [0.03, 0.04, 0.05, 0.06];
  const DEBT_TERM_YEARS = 20;
  const PUBLISHED_DEBT_2026 = 134_103_000;

  function initTenYearPlan() {
    applyTenYearLabels();
    injectScenarioProjectUi();
    bindScenarioProjectForm();
    renderScenarioProjects();
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

  function injectScenarioProjectUi() {
    if (document.getElementById("newProject")) return;
    const inputs = document.getElementById("inputs");
    if (!inputs) return;

    const nav = document.querySelector(".steps");
    if (nav && !nav.querySelector('a[href="#newProject"]')) {
      const link = document.createElement("a");
      link.href = "#newProject";
      link.textContent = "New Project";
      const afterInputs = nav.querySelector('a[href="#inputs"]');
      if (afterInputs && afterInputs.nextSibling) nav.insertBefore(link, afterInputs.nextSibling);
      else nav.appendChild(link);
    }

    const section = document.createElement("section");
    section.id = "newProject";
    section.className = "panel-band scenario-panel";
    section.innerHTML = `
      <div class="section-heading">
        <div>
          <p class="eyebrow">Scenario</p>
          <h2>Add a Project</h2>
        </div>
        <p>Place a new capital project into the active plan. The model applies known service-category assumptions and recalculates the optimal funding strategy.</p>
      </div>
      <form id="newProjectForm" class="scenario-form">
        <label>Project name<input id="scenarioName" type="text" value="New community facility renewal" required /></label>
        <label>Service category<select id="scenarioCategory">
          <option value="facilities">Facilities</option>
          <option value="roads">Transportation / roads</option>
          <option value="water">Water utility</option>
          <option value="wastewater">Wastewater utility</option>
          <option value="stormwater">Stormwater</option>
          <option value="parks">Parks</option>
          <option value="recreation">Sport & recreation</option>
          <option value="transit">Transit</option>
          <option value="airport">Airport</option>
          <option value="parking">Parking</option>
          <option value="solid waste">Solid waste</option>
          <option value="general">General</option>
        </select></label>
        <label>Start year<input id="scenarioStartYear" type="number" min="2026" max="2035" step="1" value="2027" required /></label>
        <label>End year<input id="scenarioEndYear" type="number" min="2026" max="2035" step="1" value="2028" required /></label>
        <label>Total cost<input id="scenarioCost" type="number" min="0" step="1000" value="25000000" required /></label>
        <label>Growth share<input id="scenarioGrowthShare" type="number" min="0" max="100" step="1" value="25" /></label>
        <label>Grant rate<input id="scenarioGrantRate" type="number" min="0" max="100" step="1" value="8" /></label>
        <label>Alternative funding<input id="scenarioAlternativeFunding" type="number" min="0" step="1000" value="0" /></label>
        <label>Priority<input id="scenarioPriority" type="number" min="1" max="9" step="1" value="2" /></label>
        <label class="scenario-check"><input id="scenarioGrantEligible" type="checkbox" checked />Grant eligible</label>
        <div class="scenario-actions">
          <button class="primary-button" type="submit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>Add and recalculate</button>
          <button id="clearScenarioProjects" class="secondary-button" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12M9 7v12m6-12v12M10 7l1-2h2l1 2" /></svg>Clear scenarios</button>
        </div>
      </form>
      <div class="scenario-summary">
        <div><h3>Scenario projects</h3><span id="scenarioProjectCount">No scenario projects added</span></div>
        <div id="scenarioProjectList" class="scenario-project-list"></div>
      </div>
    `;
    inputs.insertAdjacentElement("afterend", section);
    injectScenarioStyles();
  }

  function injectScenarioStyles() {
    if (document.getElementById("scenarioProjectStyles")) return;
    const style = document.createElement("style");
    style.id = "scenarioProjectStyles";
    style.textContent = `
      .scenario-panel{display:grid;gap:16px}.scenario-form{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;align-items:end}.scenario-form label{display:grid;gap:6px;color:var(--muted);font-size:.84rem;font-weight:800}.scenario-form input,.scenario-form select{width:100%;min-height:42px;border:1px solid var(--line);background:#fbfcfc;color:var(--ink);padding:9px 10px}.scenario-check{min-height:42px;grid-template-columns:auto minmax(0,1fr);align-items:center;padding:9px 10px;border:1px solid var(--line);background:#fbfcfc}.scenario-check input{width:18px;min-height:18px;accent-color:var(--teal)}.scenario-actions{grid-column:span 2;display:flex;flex-wrap:wrap;gap:10px}.scenario-summary{border:1px solid var(--line);background:#fbfcfc;padding:16px;display:grid;gap:12px}.scenario-summary>div:first-child{display:flex;justify-content:space-between;gap:14px;align-items:center}.scenario-summary h3{margin:0;font-size:1rem}#scenarioProjectCount,.scenario-empty,.scenario-project span{color:var(--muted)}.scenario-project-list{display:grid;gap:10px}.scenario-project{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(180px,.7fr) auto;gap:12px;align-items:center;padding:12px;border:1px solid var(--line);background:#fff}.scenario-project div{display:grid;gap:3px}.scenario-project strong{overflow-wrap:anywhere}.scenario-remove{min-height:36px}@media(max-width:980px){.scenario-form,.scenario-project{grid-template-columns:1fr}.scenario-actions{grid-column:auto}}
    `;
    document.head.appendChild(style);
  }

  function bindScenarioProjectForm() {
    if (window.scenarioProjectFormBound) return;
    const form = document.getElementById("newProjectForm");
    const category = document.getElementById("scenarioCategory");
    const clearButton = document.getElementById("clearScenarioProjects");
    if (!form || !category || !clearButton || typeof state === "undefined") return;
    window.scenarioProjectFormBound = true;
    state.scenarioProjects = Array.isArray(state.scenarioProjects) ? state.scenarioProjects : [];

    category.addEventListener("change", applyScenarioCategoryDefaults);
    applyScenarioCategoryDefaults();

    form.addEventListener("submit", event => {
      event.preventDefault();
      const project = readScenarioProject();
      if (!project) return;
      state.projects = state.projects.filter(item => item.scenarioId !== project.scenarioId).concat(project);
      state.scenarioProjects.push(project);
      renderScenarioProjects();
      if (state.reserves.length && state.cashflow.length) runModel();
      else setNote("Scenario project added. Load reserves and cash flow to recalculate the funding strategy.");
    });

    clearButton.addEventListener("click", clearScenarioProjects);
    ["loadSample", "loadKelowna"].forEach(id => {
      const button = document.getElementById(id);
      if (button) button.addEventListener("click", () => setTimeout(clearScenarioProjects, 0));
    });
  }

  function readScenarioProject() {
    const startYear = parseNumber(document.getElementById("scenarioStartYear").value);
    const endYear = parseNumber(document.getElementById("scenarioEndYear").value);
    const cost = parseMoney(document.getElementById("scenarioCost").value);
    const name = document.getElementById("scenarioName").value.trim();
    if (!name || !startYear || !endYear || !cost) {
      setNote("Enter a project name, timing, and cost before adding the scenario project.");
      return null;
    }

    return {
      scenarioId: `scenario-${Date.now()}-${Math.round(Math.random() * 10000)}`,
      name,
      startYear: Math.min(startYear, endYear),
      endYear: Math.max(startYear, endYear),
      cost,
      category: document.getElementById("scenarioCategory").value,
      growthShare: parseRatio(document.getElementById("scenarioGrowthShare").value),
      grantEligible: document.getElementById("scenarioGrantEligible").checked ? "yes" : "no",
      grantRate: parseRatio(document.getElementById("scenarioGrantRate").value),
      alternativeFunding: parseMoney(document.getElementById("scenarioAlternativeFunding").value),
      priority: parseNumber(document.getElementById("scenarioPriority").value) || 2,
      isScenario: true,
    };
  }

  function applyScenarioCategoryDefaults() {
    const category = document.getElementById("scenarioCategory");
    if (!category) return;
    const defaults = scenarioCategoryDefaults(category.value);
    document.getElementById("scenarioGrowthShare").value = Math.round(defaults.growthShare * 100);
    document.getElementById("scenarioGrantRate").value = Math.round(defaults.grantRate * 100);
    document.getElementById("scenarioGrantEligible").checked = defaults.grantEligible;
  }

  function scenarioCategoryDefaults(category) {
    const known = {
      airport: { growthShare: 0.42, grantEligible: true, grantRate: 0.04 },
      facilities: { growthShare: 0.25, grantEligible: true, grantRate: 0.05 },
      wastewater: { growthShare: 0.55, grantEligible: true, grantRate: 0.04 },
      stormwater: { growthShare: 0.60, grantEligible: true, grantRate: 0.15 },
      water: { growthShare: 0.52, grantEligible: true, grantRate: 0.04 },
      "solid waste": { growthShare: 0.38, grantEligible: false, grantRate: 0 },
      roads: { growthShare: 0.65, grantEligible: true, grantRate: 0.06 },
      transit: { growthShare: 0.50, grantEligible: true, grantRate: 0.40 },
      parks: { growthShare: 0.55, grantEligible: true, grantRate: 0.08 },
      recreation: { growthShare: 0.40, grantEligible: true, grantRate: 0.08 },
      parking: { growthShare: 0.35, grantEligible: false, grantRate: 0 },
      general: { growthShare: 0.20, grantEligible: false, grantRate: 0 },
    };
    return known[category] || known.general;
  }

  function renderScenarioProjects() {
    const count = document.getElementById("scenarioProjectCount");
    const list = document.getElementById("scenarioProjectList");
    if (!count || !list || typeof state === "undefined") return;
    state.scenarioProjects = Array.isArray(state.scenarioProjects) ? state.scenarioProjects : [];

    if (!state.scenarioProjects.length) {
      count.textContent = "No scenario projects added";
      list.innerHTML = `<p class="scenario-empty">Added projects will appear here and be included in the next optimization run.</p>`;
      return;
    }

    count.textContent = `${state.scenarioProjects.length} added to the active plan`;
    list.innerHTML = state.scenarioProjects.map(project => `
      <article class="scenario-project">
        <div><strong>${escapeText(project.name)}</strong><span>${project.startYear}-${project.endYear} · ${escapeText(project.category)} · priority ${project.priority}</span></div>
        <div><strong>${money(project.cost)}</strong><span>${Math.round(project.growthShare * 100)}% growth · ${isAffirmative(project.grantEligible) ? `${Math.round(project.grantRate * 100)}% grant` : "no grant"}</span></div>
        <button class="secondary-button scenario-remove" type="button" data-scenario-id="${escapeText(project.scenarioId)}">Remove</button>
      </article>
    `).join("");

    list.querySelectorAll(".scenario-remove").forEach(button => {
      button.addEventListener("click", () => removeScenarioProject(button.dataset.scenarioId));
    });
  }

  function removeScenarioProject(scenarioId) {
    if (typeof state === "undefined") return;
    state.scenarioProjects = (state.scenarioProjects || []).filter(project => project.scenarioId !== scenarioId);
    state.projects = state.projects.filter(project => project.scenarioId !== scenarioId);
    renderScenarioProjects();
    if (state.reserves.length && state.cashflow.length && state.projects.length) runModel();
  }

  function clearScenarioProjects() {
    if (typeof state === "undefined") return;
    const ids = new Set((state.scenarioProjects || []).map(project => project.scenarioId));
    if (ids.size) state.projects = state.projects.filter(project => !ids.has(project.scenarioId));
    state.scenarioProjects = [];
    renderScenarioProjects();
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
    const repeatedSourceProjects = kelownaPresetData.projects.flatMap(project => {
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
    const scenarioProjects = Array.isArray(state.scenarioProjects)
      ? state.scenarioProjects
          .filter(project => project.startYear <= horizonEnd && project.endYear >= START_YEAR)
          .map(project => ({ ...project }))
      : [];
    return repeatedSourceProjects.concat(scenarioProjects);
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

  function parseNumber(value) {
    const parsed = Number(String(value || "").replace(/[$,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function parseMoney(value) {
    return parseNumber(value);
  }

  function parseRatio(value) {
    const raw = String(value || "").trim();
    if (!raw) return 0;
    const parsed = parseNumber(raw.replace("%", ""));
    return raw.includes("%") || parsed > 1 ? parsed / 100 : parsed;
  }

  function cleanName(name) {
    return String(name).replace(/\s+capital requests\s+\d{4}$/i, "");
  }

  function isAffirmative(value) {
    return value === true || value === 1 || ["yes", "y", "true", "1"].includes(String(value || "").trim().toLowerCase());
  }

  function escapeText(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
})();
