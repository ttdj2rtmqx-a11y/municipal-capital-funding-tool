const state = {
  reserves: [],
  cashflow: [],
  projects: [],
  fundingSources: [],
  assessments: [],
  strategy: null,
};

const reserveTemplate = [
  ["name", "type", "balance", "annualContribution", "minimumBalance", "eligibleCategories", "growthRate"],
  ["DCC Roads", "restricted", "12500000", "800000", "1000000", "roads;growth", "2.0"],
  ["Capital Works Reserve", "unrestricted", "9000000", "650000", "1500000", "all", "2.0"],
  ["Utility Renewal", "restricted", "6750000", "500000", "750000", "water;sewer", "2.0"],
];

const cashflowTemplate = [
  ["year", "baseRevenues", "baseExpenses", "taxRevenue", "debtCapacity"],
  ["2026", "85000000", "79000000", "42000000", "5000000"],
  ["2027", "87200000", "81500000", "43800000", "5000000"],
  ["2028", "89500000", "84000000", "45600000", "5500000"],
];

const projectTemplate = [
  ["name", "startYear", "endYear", "cost", "category", "growthShare", "grantEligible", "grantRate", "alternativeFunding", "priority"],
  ["North Trunk Upgrade", "2027", "2030", "28000000", "water", "0.35", "yes", "0.25", "1200000", "1"],
  ["Civic Centre Renewal", "2028", "2029", "11500000", "facilities", "0.05", "no", "0", "400000", "3"],
  ["Arterial Widening", "2029", "2033", "36000000", "roads", "0.55", "yes", "0.2", "2600000", "2"],
];

const sampleData = {
  reserves: [
    { name: "DCC Roads", type: "restricted", balance: 12500000, annualContribution: 800000, minimumBalance: 1000000, eligibleCategories: "roads;growth", growthRate: 2 },
    { name: "DCC Parks", type: "restricted", balance: 4500000, annualContribution: 350000, minimumBalance: 500000, eligibleCategories: "parks;growth", growthRate: 2 },
    { name: "Utility Renewal", type: "restricted", balance: 6750000, annualContribution: 500000, minimumBalance: 750000, eligibleCategories: "water;sewer", growthRate: 2 },
    { name: "Capital Works Reserve", type: "unrestricted", balance: 9000000, annualContribution: 650000, minimumBalance: 1500000, eligibleCategories: "all", growthRate: 2 },
  ],
  cashflow: Array.from({ length: 30 }, (_, index) => {
    const year = 2026 + index;
    return {
      year,
      baseRevenues: 85000000 * Math.pow(1.026, index),
      baseExpenses: 79000000 * Math.pow(1.031, index),
      taxRevenue: 42000000 * Math.pow(1.03, index),
      debtCapacity: 5000000 + (index > 8 ? 1500000 : 0),
    };
  }),
  projects: [
    { name: "North Trunk Upgrade", startYear: 2027, endYear: 2030, cost: 28000000, category: "water", growthShare: 0.35, grantEligible: "yes", grantRate: 0.25, alternativeFunding: 1200000, priority: 1 },
    { name: "Arterial Widening", startYear: 2029, endYear: 2033, cost: 36000000, category: "roads", growthShare: 0.55, grantEligible: "yes", grantRate: 0.2, alternativeFunding: 2600000, priority: 2 },
    { name: "Civic Centre Renewal", startYear: 2028, endYear: 2029, cost: 11500000, category: "facilities", growthShare: 0.05, grantEligible: "no", grantRate: 0, alternativeFunding: 400000, priority: 3 },
    { name: "Community Park Phase 2", startYear: 2031, endYear: 2034, cost: 14500000, category: "parks", growthShare: 0.45, grantEligible: "yes", grantRate: 0.3, alternativeFunding: 750000, priority: 2 },
    { name: "Fleet Electrification", startYear: 2026, endYear: 2031, cost: 9200000, category: "fleet", growthShare: 0.1, grantEligible: "yes", grantRate: 0.18, alternativeFunding: 550000, priority: 4 },
  ],
};

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

document.addEventListener("DOMContentLoaded", () => {
  bindUploads();
  bindActions();
  drawEmptyChart();
});

function bindUploads() {
  bindFile("reserveFile", "reserveStatus", "Reserves", rows => {
    state.reserves = rows.map(normalizeReserve).filter(item => item.name);
  });
  bindFile("cashflowFile", "cashflowStatus", "Cash Flow", rows => {
    state.cashflow = rows.map(normalizeCashflow).filter(item => item.year);
  });
  bindFile("projectFile", "projectStatus", "Projects", rows => {
    state.projects = rows.map(normalizeProject).filter(item => item.name);
  });
  bindFile("fundingFile", "fundingStatus", "Funding Sources", rows => {
    state.fundingSources = rows;
  });
}

function bindFile(inputId, statusId, category, handler) {
  const input = document.getElementById(inputId);
  const status = document.getElementById(statusId);
  input.addEventListener("change", async event => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const assessments = [];
    let modelRows = [];

    for (const file of files) {
      const assessment = await assessDocument(file, category);
      assessments.push(assessment);
      if (assessment.rows.length) modelRows = modelRows.concat(assessment.rows);
    }

    if (modelRows.length) handler(modelRows);
    state.assessments = state.assessments
      .filter(assessment => assessment.category !== category)
      .concat(assessments);
    status.textContent = `${files.length} file${files.length === 1 ? "" : "s"} assessed`;
    status.style.color = "#167d7f";
    renderAssessments();
  });
}

function bindActions() {
  document.getElementById("loadSample").addEventListener("click", () => {
    state.reserves = structuredClone(sampleData.reserves);
    state.cashflow = structuredClone(sampleData.cashflow);
    state.projects = structuredClone(sampleData.projects);
    state.assessments = [
      createSampleAssessment("Reserve balance sheet sample.csv", "Reserves", "Reserve balance schedule", "Opening reserve balances with policy minimums, eligibility tags, annual contributions, and expected reserve earnings.", 0.94),
      createSampleAssessment("30 year capital cash flow sample.csv", "Cash Flow", "Long range cash flow forecast", "Annual revenue, expense, tax levy, and debt-capacity assumptions across the planning horizon.", 0.92),
      createSampleAssessment("Capital projects sample.csv", "Projects", "Capital project funding register", "Project timing, service category, growth component, grant eligibility, alternative funding, and priority ranking.", 0.95),
      createSampleAssessment("Grant programs sample.pdf", "Funding Sources", "Grant and alternative funding guide", "External funding rules, grant program fit, development contribution opportunities, and non-tax funding constraints.", 0.86),
    ];
    document.getElementById("reserveStatus").textContent = "Sample reserves loaded";
    document.getElementById("cashflowStatus").textContent = "Sample cash flow loaded";
    document.getElementById("projectStatus").textContent = "Sample projects loaded";
    document.getElementById("fundingStatus").textContent = "Sample funding sources loaded";
    renderAssessments();
    runModel();
  });

  document.getElementById("runModel").addEventListener("click", runModel);
  document.getElementById("exportResults").addEventListener("click", exportResults);
  document.getElementById("downloadReserves").addEventListener("click", () => downloadCsv("reserve-template.csv", reserveTemplate));
  document.getElementById("downloadCashflow").addEventListener("click", () => downloadCsv("cashflow-template.csv", cashflowTemplate));
  document.getElementById("downloadProjects").addEventListener("click", () => downloadCsv("project-template.csv", projectTemplate));
}

function runModel() {
  if (!state.reserves.length || !state.cashflow.length || !state.projects.length) {
    setNote("Load all three files, or use sample data, before optimizing.");
    return;
  }

  const settings = getSettings();
  state.strategy = optimizeFunding(state.reserves, state.cashflow, state.projects, settings);
  renderStrategy(state.strategy);
}

function getSettings() {
  return {
    inflationRate: readPercent("inflationRate"),
    reserveReturnRate: readPercent("reserveReturnRate"),
    maxTaxLift: readPercent("maxTaxLift"),
    horizonYears: Number(document.getElementById("horizonYears").value) || 30,
  };
}

function readPercent(id) {
  return (Number(document.getElementById(id).value) || 0) / 100;
}

async function assessDocument(file, category) {
  const extension = file.name.split(".").pop().toLowerCase();
  const isReadable = ["csv", "txt", "json"].includes(extension) || file.type.startsWith("text/");
  const text = isReadable ? await file.text() : "";
  const rows = extension === "csv" || file.type === "text/csv" ? parseCsv(text) : [];
  const headers = rows.length ? Object.keys(rows[0]) : inferTextHeaders(text);
  const profile = inferDocumentProfile(file.name, category, headers, text, rows);

  return {
    fileName: file.name,
    category,
    extension,
    size: file.size,
    rows,
    ...profile,
  };
}

function inferDocumentProfile(fileName, category, headers, text, rows) {
  const haystack = `${fileName} ${headers.join(" ")} ${text.slice(0, 5000)}`.toLowerCase();
  const signals = {
    reserves: scoreSignals(haystack, ["reserve", "fund", "balance", "restricted", "unrestricted", "minimum", "dcc", "statutory"]),
    cashflow: scoreSignals(haystack, ["cash", "flow", "revenue", "expense", "tax", "levy", "debt", "forecast", "year"]),
    projects: scoreSignals(haystack, ["project", "capital", "grant", "growth", "priority", "source", "asset", "cost"]),
    funding: scoreSignals(haystack, ["grant", "program", "eligible", "funding", "contribution", "partnership", "developer", "senior government"]),
  };
  const inferredType = Object.entries(signals).sort((a, b) => b[1] - a[1])[0][0];
  const expectedFields = expectedFieldsFor(category);
  const foundFields = expectedFields.filter(field => headers.some(header => header.includes(cleanKey(field))));
  const missingFields = expectedFields.filter(field => !foundFields.includes(field));
  const readableSummary = summarizeReadableContent(category, inferredType, headers, rows, text);
  const confidence = Math.min(0.98, 0.35 + signals[inferredType] * 0.07 + foundFields.length * 0.08 + (rows.length ? 0.14 : 0));

  return {
    inferredType: labelForType(inferredType),
    summary: readableSummary,
    confidence,
    foundFields,
    missingFields,
    issues: assessmentIssues(category, inferredType, rows, headers, missingFields, text),
  };
}

function scoreSignals(text, words) {
  return words.reduce((score, word) => score + (text.includes(word) ? 1 : 0), 0);
}

function expectedFieldsFor(category) {
  if (category === "Reserves") return ["name", "type", "balance", "minimumBalance", "eligibleCategories"];
  if (category === "Cash Flow") return ["year", "baseRevenues", "baseExpenses", "taxRevenue", "debtCapacity"];
  if (category === "Funding Sources") return ["name", "grantEligible", "grantRate", "alternativeFunding", "eligibleCategories"];
  return ["name", "startYear", "endYear", "cost", "category", "growthShare", "grantEligible", "alternativeFunding"];
}

function labelForType(type) {
  if (type === "reserves") return "Reserve document";
  if (type === "cashflow") return "Cash flow forecast";
  if (type === "funding") return "Grant and alternative funding guide";
  return "Capital project source";
}

function summarizeReadableContent(category, inferredType, headers, rows, text) {
  if (rows.length) {
    return `Readable table with ${rows.length} data row${rows.length === 1 ? "" : "s"} and columns for ${headers.slice(0, 6).join(", ")}${headers.length > 6 ? ", and more" : ""}.`;
  }
  if (text.trim()) {
    const words = text.trim().replace(/\s+/g, " ").split(" ").slice(0, 28).join(" ");
    return `Readable text appears related to ${labelForType(inferredType).toLowerCase()}: ${words}${text.length > words.length ? "..." : ""}`;
  }
  return `The file was accepted for ${category.toLowerCase()} review, but this browser version cannot extract body text from that format yet.`;
}

function assessmentIssues(category, inferredType, rows, headers, missingFields, text) {
  const issues = [];
  const normalizedCategory = category === "Cash Flow" ? "cashflow" : category.toLowerCase();
  const expectedType = normalizedCategory === "reserves"
    ? "reserves"
    : normalizedCategory === "projects"
      ? "projects"
      : normalizedCategory === "funding sources"
        ? "funding"
        : "cashflow";

  if (inferredType !== expectedType) {
    issues.push(`This looks more like ${labelForType(inferredType).toLowerCase()} than ${category.toLowerCase()}.`);
  }
  if (!rows.length && !text.trim()) {
    issues.push("Assessment is limited to file name, type, and size until text extraction is connected for this format.");
  }
  if (missingFields.length) {
    issues.push(`Missing model fields: ${missingFields.slice(0, 5).join(", ")}${missingFields.length > 5 ? ", and more" : ""}.`);
  }
  if (headers.length && rows.length && rows.length < 3) {
    issues.push("The file has only a few data rows; confirm it is not a partial export.");
  }
  if (!issues.length) {
    issues.push("Core model fields are present and the document is ready to support optimization.");
  }
  return issues;
}

function inferTextHeaders(text) {
  const firstLine = text.split(/\r?\n/).find(line => line.includes(",")) || "";
  return firstLine ? firstLine.split(",").map(cleanKey).filter(Boolean) : [];
}

function renderAssessments() {
  const grid = document.getElementById("assessmentGrid");
  if (!state.assessments.length) {
    grid.innerHTML = `
      <article class="assessment-empty">
        <strong>No documents assessed yet.</strong>
        <span>Upload files above or load sample data to see document-level findings.</span>
      </article>
    `;
    return;
  }

  grid.innerHTML = state.assessments.map(assessment => `
    <article class="assessment-card">
      <header>
        <div>
          <h3>${escapeHtml(assessment.fileName)}</h3>
          <small>${formatFileSize(assessment.size || 0)} · ${escapeHtml(assessment.inferredType)}</small>
        </div>
        <span class="assessment-pill">${escapeHtml(assessment.category)}</span>
      </header>
      <div class="confidence-row">
        <span>Confidence</span>
        <div class="confidence-track"><span style="width: ${Math.round(assessment.confidence * 100)}%"></span></div>
      </div>
      <dl>
        <dt>Summary</dt>
        <dd>${escapeHtml(assessment.summary)}</dd>
        <dt>Fields</dt>
        <dd>${assessment.foundFields.length ? escapeHtml(assessment.foundFields.join(", ")) : "No model fields detected"}</dd>
      </dl>
      <ul>${assessment.issues.map(issue => `<li>${escapeHtml(issue)}</li>`).join("")}</ul>
    </article>
  `).join("");
}

function createSampleAssessment(fileName, category, inferredType, summary, confidence) {
  return {
    fileName,
    category,
    inferredType,
    summary,
    confidence,
    size: 0,
    rows: [],
    foundFields: expectedFieldsFor(category),
    missingFields: [],
    issues: ["Core model fields are present and the document is ready to support optimization."],
  };
}

function optimizeFunding(reservesInput, cashflowInput, projectsInput, settings) {
  const firstYear = Math.min(...cashflowInput.map(row => row.year), ...projectsInput.map(project => project.startYear));
  const years = Array.from({ length: settings.horizonYears }, (_, index) => firstYear + index);
  const reserves = reservesInput.map(reserve => ({ ...reserve, balance: reserve.balance || 0 }));
  const annual = years.map(year => ({
    year,
    projectCost: 0,
    grants: 0,
    alternatives: 0,
    restricted: 0,
    unrestricted: 0,
    gap: 0,
    endingReserves: 0,
    projects: [],
  }));

  for (const yearRow of annual) {
    for (const reserve of reserves) {
      const reserveRate = Number.isFinite(reserve.growthRate) ? reserve.growthRate / 100 : settings.reserveReturnRate;
      reserve.balance = reserve.balance * (1 + reserveRate) + (reserve.annualContribution || 0);
    }

    const activeProjects = projectsInput
      .filter(project => yearRow.year >= project.startYear && yearRow.year <= project.endYear)
      .sort((a, b) => (a.priority || 99) - (b.priority || 99));

    for (const project of activeProjects) {
      const projectYears = Math.max(1, project.endYear - project.startYear + 1);
      const elapsed = yearRow.year - firstYear;
      const inflatedCost = (project.cost / projectYears) * Math.pow(1 + settings.inflationRate, elapsed);
      const grant = isYes(project.grantEligible) ? inflatedCost * Math.min(Math.max(project.grantRate || 0, 0), 1) : 0;
      const alternative = Math.min(project.alternativeFunding / projectYears || 0, Math.max(0, inflatedCost - grant));
      let remaining = Math.max(0, inflatedCost - grant - alternative);

      const growthAmount = remaining * Math.min(Math.max(project.growthShare || 0, 0), 1);
      const nonGrowthAmount = remaining - growthAmount;

      const restrictedForGrowth = drawFromReserves(reserves, project.category, growthAmount, true);
      const restrictedForBase = drawFromReserves(reserves, project.category, nonGrowthAmount, false);
      remaining -= restrictedForGrowth + restrictedForBase;

      const unrestricted = drawUnrestricted(reserves, remaining);
      remaining -= unrestricted;

      const cashflow = cashflowInput.find(row => row.year === yearRow.year) || {};
      const debtCapacity = cashflow.debtCapacity || 0;
      const taxCapacity = (cashflow.taxRevenue || 0) * settings.maxTaxLift;
      const manageableGap = Math.min(remaining, debtCapacity + taxCapacity);
      const gap = remaining;

      yearRow.projectCost += inflatedCost;
      yearRow.grants += grant;
      yearRow.alternatives += alternative;
      yearRow.restricted += restrictedForGrowth + restrictedForBase;
      yearRow.unrestricted += unrestricted;
      yearRow.gap += gap;
      yearRow.projects.push({
        name: project.name,
        cost: inflatedCost,
        grant,
        alternative,
        restricted: restrictedForGrowth + restrictedForBase,
        unrestricted,
        gap,
        warning: gap > manageableGap ? "Gap exceeds annual tax/debt comfort range" : "",
      });
    }

    yearRow.endingReserves = reserves.reduce((sum, reserve) => sum + reserve.balance, 0);
  }

  const totals = annual.reduce(
    (sum, row) => {
      sum.projectCost += row.projectCost;
      sum.grants += row.grants;
      sum.alternatives += row.alternatives;
      sum.restricted += row.restricted;
      sum.unrestricted += row.unrestricted;
      sum.gap += row.gap;
      return sum;
    },
    { projectCost: 0, grants: 0, alternatives: 0, restricted: 0, unrestricted: 0, gap: 0 },
  );

  return { annual, totals, reserves };
}

function drawFromReserves(reserves, category, amount, growthOnly) {
  let remaining = amount;
  let drawn = 0;
  const eligible = reserves
    .filter(reserve => reserve.type === "restricted")
    .filter(reserve => reserveAllows(reserve, category, growthOnly))
    .sort((a, b) => categoryScore(b, category, growthOnly) - categoryScore(a, category, growthOnly));

  for (const reserve of eligible) {
    if (remaining <= 0) break;
    const available = Math.max(0, reserve.balance - (reserve.minimumBalance || 0));
    const draw = Math.min(available, remaining);
    reserve.balance -= draw;
    remaining -= draw;
    drawn += draw;
  }

  return drawn;
}

function drawUnrestricted(reserves, amount) {
  let remaining = amount;
  let drawn = 0;
  const eligible = reserves
    .filter(reserve => reserve.type !== "restricted" || reserveAllows(reserve, "all", false))
    .sort((a, b) => (b.balance - (b.minimumBalance || 0)) - (a.balance - (a.minimumBalance || 0)));

  for (const reserve of eligible) {
    if (remaining <= 0) break;
    if (reserve.type === "restricted" && !reserveAllows(reserve, "all", false)) continue;
    const available = Math.max(0, reserve.balance - (reserve.minimumBalance || 0));
    const draw = Math.min(available, remaining);
    reserve.balance -= draw;
    remaining -= draw;
    drawn += draw;
  }

  return drawn;
}

function reserveAllows(reserve, category, growthOnly) {
  const eligible = String(reserve.eligibleCategories || "all")
    .toLowerCase()
    .split(/[;|,]/)
    .map(item => item.trim())
    .filter(Boolean);
  if (reserve.type !== "restricted") return true;
  if (eligible.includes("all")) return true;
  if (growthOnly && eligible.includes("growth")) return true;
  return eligible.includes(String(category).toLowerCase());
}

function categoryScore(reserve, category, growthOnly) {
  const eligible = String(reserve.eligibleCategories || "").toLowerCase();
  if (eligible.includes(String(category).toLowerCase())) return 3;
  if (growthOnly && eligible.includes("growth")) return 2;
  if (eligible.includes("all")) return 1;
  return 0;
}

function renderStrategy(strategy) {
  const totals = strategy.totals;
  document.getElementById("metricNeed").textContent = currency.format(totals.projectCost);
  document.getElementById("metricExternal").textContent = currency.format(totals.grants + totals.alternatives);
  document.getElementById("metricReserves").textContent = currency.format(totals.restricted + totals.unrestricted);
  document.getElementById("metricGap").textContent = currency.format(totals.gap);
  setNote(`${state.projects.length} projects optimized across ${strategy.annual.length} years.`);

  renderAnnualRows(strategy.annual);
  renderFindings(strategy);
  drawFundingChart(strategy);
}

function renderAnnualRows(rows) {
  const body = document.getElementById("annualRows");
  const activeRows = rows.filter(row => row.projectCost || row.grants || row.restricted || row.unrestricted || row.gap);
  body.innerHTML = activeRows
    .map(row => `
      <tr>
        <td>${row.year}</td>
        <td>${currency.format(row.projectCost)}</td>
        <td>${currency.format(row.grants)}</td>
        <td>${currency.format(row.alternatives)}</td>
        <td>${currency.format(row.restricted)}</td>
        <td>${currency.format(row.unrestricted)}</td>
        <td>${currency.format(row.gap)}</td>
        <td>${currency.format(row.endingReserves)}</td>
      </tr>
    `)
    .join("");
}

function renderFindings(strategy) {
  const list = document.getElementById("findingsList");
  const totals = strategy.totals;
  const externalShare = totals.projectCost ? (totals.grants + totals.alternatives) / totals.projectCost : 0;
  const reserveShare = totals.projectCost ? (totals.restricted + totals.unrestricted) / totals.projectCost : 0;
  const highGapYears = strategy.annual.filter(row => row.gap > 0).sort((a, b) => b.gap - a.gap).slice(0, 3);
  const lowReserves = strategy.reserves.filter(reserve => reserve.balance <= (reserve.minimumBalance || 0) * 1.05);

  const findings = [
    `External funding covers ${Math.round(externalShare * 100)}% of the capital program before reserves are used.`,
    `Reserve draws cover ${Math.round(reserveShare * 100)}% while preserving stated minimum balances.`,
  ];

  if (highGapYears.length) {
    findings.push(`Largest tax or debt pressure: ${highGapYears.map(row => `${row.year} ${currency.format(row.gap)}`).join(", ")}.`);
  } else {
    findings.push("No residual taxation or debt gap remains after applying eligible funding sources.");
  }

  if (lowReserves.length) {
    findings.push(`Reserve policy watchlist: ${lowReserves.map(reserve => reserve.name).join(", ")} finish near minimum balance.`);
  }

  list.innerHTML = findings.map(item => `<li>${item}</li>`).join("");
}

function drawFundingChart(strategy) {
  const canvas = document.getElementById("fundingChart");
  const ctx = canvas.getContext("2d");
  const bars = [
    { label: "Grants", value: strategy.totals.grants, color: "#167d7f" },
    { label: "Alternatives", value: strategy.totals.alternatives, color: "#4f8f45" },
    { label: "Restricted", value: strategy.totals.restricted, color: "#19324a" },
    { label: "Unrestricted", value: strategy.totals.unrestricted, color: "#b87b22" },
    { label: "Tax / debt", value: strategy.totals.gap, color: "#b94a48" },
  ];
  document.getElementById("chartCaption").textContent = `${currency.format(strategy.totals.projectCost)} total need`;
  drawBars(ctx, canvas, bars);
}

function drawEmptyChart() {
  const canvas = document.getElementById("fundingChart");
  const ctx = canvas.getContext("2d");
  drawBars(ctx, canvas, [
    { label: "Grants", value: 1, color: "#d6e3e2" },
    { label: "Alternatives", value: 1, color: "#d6e3e2" },
    { label: "Restricted", value: 1, color: "#d6e3e2" },
    { label: "Unrestricted", value: 1, color: "#d6e3e2" },
    { label: "Tax / debt", value: 1, color: "#d6e3e2" },
  ]);
}

function drawBars(ctx, canvas, bars) {
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  const max = Math.max(...bars.map(bar => bar.value), 1);
  const margin = { top: 22, right: 28, bottom: 60, left: 42 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const barWidth = plotWidth / bars.length - 24;

  ctx.strokeStyle = "#d8dee5";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotHeight);
  ctx.lineTo(width - margin.right, margin.top + plotHeight);
  ctx.stroke();

  bars.forEach((bar, index) => {
    const x = margin.left + index * (plotWidth / bars.length) + 12;
    const barHeight = (bar.value / max) * plotHeight;
    const y = margin.top + plotHeight - barHeight;
    ctx.fillStyle = bar.color;
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = "#17212b";
    ctx.font = "700 19px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(bar.value > 1 ? compactCurrency(bar.value) : "", x + barWidth / 2, Math.max(20, y - 8));
    ctx.fillStyle = "#66717d";
    ctx.font = "700 16px system-ui";
    wrapCanvasText(ctx, bar.label, x + barWidth / 2, height - 34, barWidth + 18);
  });
}

function wrapCanvasText(ctx, text, x, y, maxWidth) {
  const words = text.split(" ");
  let line = "";
  let lineY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += 17;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, lineY);
}

function compactCurrency(value) {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return currency.format(value);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some(cell => cell.trim())) rows.push(row);
  if (!rows.length) return [];

  const headers = rows[0].map(cleanKey);
  return rows.slice(1).map(values => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = values[index] || "";
    });
    return item;
  });
}

function normalizeReserve(row) {
  return {
    name: pick(row, "name", "reserve", "fund"),
    type: String(pick(row, "type", "restriction") || "unrestricted").toLowerCase(),
    balance: money(pick(row, "balance", "openingbalance", "amount")),
    annualContribution: money(pick(row, "annualcontribution", "contribution", "annualdeposit")),
    minimumBalance: money(pick(row, "minimumbalance", "minbalance", "policyminimum")),
    eligibleCategories: pick(row, "eligiblecategories", "category", "eligibility") || "all",
    growthRate: number(pick(row, "growthrate", "returnrate", "interest")),
  };
}

function normalizeCashflow(row) {
  return {
    year: number(pick(row, "year")),
    baseRevenues: money(pick(row, "baserevenues", "revenues", "revenue")),
    baseExpenses: money(pick(row, "baseexpenses", "expenses", "expense")),
    taxRevenue: money(pick(row, "taxrevenue", "taxation", "taxlevy")),
    debtCapacity: money(pick(row, "debtcapacity", "borrowingcapacity")),
  };
}

function normalizeProject(row) {
  return {
    name: pick(row, "name", "project"),
    startYear: number(pick(row, "startyear", "yearstart", "start")),
    endYear: number(pick(row, "endyear", "yearend", "end")) || number(pick(row, "startyear", "yearstart", "start")),
    cost: money(pick(row, "cost", "totalcost", "capitalcost")),
    category: pick(row, "category", "assetclass", "service") || "general",
    growthShare: ratio(pick(row, "growthshare", "growthcomponent", "growth")),
    grantEligible: pick(row, "granteligible", "grant", "eligible") || "no",
    grantRate: ratio(pick(row, "grantrate", "grantshare", "grantpercentage")),
    alternativeFunding: money(pick(row, "alternativefunding", "otherfunding", "developercontribution")),
    priority: number(pick(row, "priority", "rank")),
  };
}

function pick(row, ...keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== "") return row[key];
  }
  return "";
}

function cleanKey(key) {
  return String(key).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function money(value) {
  return number(String(value).replace(/[$,\s]/g, ""));
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ratio(value) {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const parsed = number(raw.replace("%", ""));
  return raw.includes("%") || parsed > 1 ? parsed / 100 : parsed;
}

function isYes(value) {
  return ["yes", "y", "true", "1"].includes(String(value).trim().toLowerCase());
}

function downloadCsv(filename, rows) {
  const content = rows.map(row => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportResults() {
  if (!state.strategy) {
    setNote("Run the optimizer before exporting results.");
    return;
  }
  const rows = [
    ["year", "projectCost", "grants", "alternatives", "restrictedReserves", "unrestrictedReserves", "taxOrDebtGap", "endingReserves"],
    ...state.strategy.annual.map(row => [
      row.year,
      Math.round(row.projectCost),
      Math.round(row.grants),
      Math.round(row.alternatives),
      Math.round(row.restricted),
      Math.round(row.unrestricted),
      Math.round(row.gap),
      Math.round(row.endingReserves),
    ]),
  ];
  downloadCsv("optimized-capital-funding-strategy.csv", rows);
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatFileSize(bytes) {
  if (!bytes) return "Sample";
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${bytes} bytes`;
}

function setNote(message) {
  document.getElementById("modelNote").textContent = message;
}
