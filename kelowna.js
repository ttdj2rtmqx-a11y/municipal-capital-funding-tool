const kelownaPresetData = {
  sourceUrl: "https://kelownapublishing.escribemeetings.com/Meeting.aspx?Id=45b1c010-515f-43f8-8e8e-1e0548d5092b&Agenda=Agenda&lang=English",
  sourceNote: "Public source: City of Kelowna Budget Deliberations agenda, December 4, 2025. The preset uses the 2026 Financial Plan PDF, pages 42-44, 58-60, and 68-75. Amounts are converted from $000s to dollars.",
  publishedFunding2026: { total: 518_166_000, external: 35_400_000, reserves: 342_500_000, taxDebt: 140_300_000 },
  reserves: [
    { name: "Development Cost Charges", type: "restricted", balance: 199_872_000, annualContribution: 38_000_000, minimumBalance: 20_000_000, eligibleCategories: "growth;roads;parks;water;wastewater;stormwater", growthRate: 0 },
    { name: "Capital Works, Machinery & Equipment", type: "restricted", balance: 99_611_000, annualContribution: 45_982_000, minimumBalance: 6_695_000, eligibleCategories: "facilities;fleet;roads;parks;recreation;all", growthRate: 0 },
    { name: "General Reserves", type: "unrestricted", balance: 68_391_000, annualContribution: 3_030_000, minimumBalance: 39_482_000, eligibleCategories: "all", growthRate: 0 },
    { name: "Endowment Reserve Fund", type: "restricted", balance: 165_440_000, annualContribution: 0, minimumBalance: 163_440_000, eligibleCategories: "land;parks;facilities", growthRate: 0 },
    { name: "Wastewater Reserve and Fund Equity", type: "restricted", balance: 61_184_000, annualContribution: 0, minimumBalance: 36_805_000, eligibleCategories: "wastewater", growthRate: 0 },
    { name: "Water Reserve and Fund Equity", type: "restricted", balance: 38_420_000, annualContribution: 3_742_000, minimumBalance: 30_899_000, eligibleCategories: "water", growthRate: 0 },
    { name: "Airport Reserve and Fund Equity", type: "restricted", balance: 0, annualContribution: 92_322_000, minimumBalance: 0, eligibleCategories: "airport", growthRate: 0 },
    { name: "Parking Reserve Fund", type: "restricted", balance: 12_411_000, annualContribution: 3_400_000, minimumBalance: 8_489_000, eligibleCategories: "parking", growthRate: 0 },
  ],
  cashflow: Array.from({ length: 10 }, (_, index) => {
    const year = 2026 + index;
    return {
      year,
      baseRevenues: 1_051_195_000 * Math.pow(1.025, index),
      baseExpenses: 1_041_259_000 * Math.pow(1.028, index),
      taxRevenue: 216_397_000 * Math.pow(1.03, index),
      debtCapacity: index === 0 ? 134_103_000 : 74_800_000,
    };
  }),
  projects: buildKelownaPresetProjects(),
};

function buildKelownaPresetProjects() {
  const rows = [
    ["Airport", "airport", 0.42, "yes", 0.04, 76_000_000, 2, [35_008, 41_012, 42_927, 30_202, 9_407]],
    ["Fire Safety", "facilities", 0.35, "yes", 0.08, 0, 1, [37_855, 4_630, 6_453, 240, 773]],
    ["Wastewater Utility", "wastewater", 0.55, "yes", 0.04, 22_000_000, 1, [36_791, 17_830, 17_441, 20_836, 23_236]],
    ["Stormwater & Flood Protection", "stormwater", 0.6, "yes", 0.15, 0, 2, [11_397, 11_227, 7_171, 8_935, 5_010]],
    ["Water Utility", "water", 0.52, "yes", 0.04, 27_000_000, 1, [60_138, 41_072, 35_244, 34_055, 11_525]],
    ["Solid Waste & Landfill", "solid waste", 0.38, "no", 0, 15_000_000, 3, [11_226, 10_015, 6_965, 7_575, 10_425]],
    ["Transportation", "roads", 0.65, "yes", 0.06, 5_000_000, 1, [89_025, 79_486, 118_147, 88_125, 95_022]],
    ["Transit", "transit", 0.5, "yes", 0.4, 0, 2, [8_704, 4_968, 1_930, 532, 2_478]],
    ["Parks", "parks", 0.55, "yes", 0.08, 7_500_000, 2, [56_556, 52_898, 36_895, 32_625, 29_791]],
    ["Sport & Recreation", "recreation", 0.4, "yes", 0.08, 18_000_000, 2, [115_730, 95_121, 50_550, 185, 2_493]],
    ["Arts & Culture", "facilities", 0.15, "yes", 0.05, 500_000, 4, [2_605, 605, 2_438, 13_985, 380]],
    ["Parking", "parking", 0.35, "no", 0, 8_000_000, 3, [2_820, 3_100, 8_150, 10_700, 600]],
    ["Enabling Services", "facilities", 0.25, "yes", 0.03, 0, 3, [35_523, 29_196, 31_316, 25_059, 42_844]],
  ];
  return rows.flatMap(([service, category, growthShare, grantEligible, grantRate, alternativeTotal, priority, yearly]) => {
    const total = yearly.reduce((sum, amount) => sum + amount, 0) * 1000;
    return yearly.map((amount, index) => {
      const cost = amount * 1000;
      return { name: `${service} capital requests ${2026 + index}`, startYear: 2026 + index, endYear: 2026 + index, cost, category, growthShare, grantEligible, grantRate, alternativeFunding: total ? alternativeTotal * (cost / total) : 0, priority };
    }).filter(project => project.cost > 0);
  });
}

function initKelownaOverlay() {
  const kelownaButton = document.getElementById("loadKelowna");
  if (!kelownaButton) return;
  state.activeDataset = state.activeDataset || "custom";
  wrapStrategyRenderer();
  drawEmptyKelownaComparisonChart();
  kelownaButton.addEventListener("click", loadKelownaPlan);
  loadKelownaPlan();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initKelownaOverlay);
} else {
  initKelownaOverlay();
}

function loadKelownaPlan() {
  state.activeDataset = "kelowna";
  state.reserves = structuredClone(kelownaPresetData.reserves);
  state.cashflow = structuredClone(kelownaPresetData.cashflow);
  state.projects = structuredClone(kelownaPresetData.projects);
  state.assessments = [
    createSampleAssessment("City of Kelowna - 2026 Financial Plan.pdf", "Reserves", "Financial plan reserve schedule", "Pages 42-44 identify projected reserve and fund equity balances, contributions, appropriations, statutory reserves, DCC balances, and service-area reserve constraints.", 0.96),
    createSampleAssessment("City of Kelowna - 2026 Financial Plan.pdf", "Cash Flow", "Financial plan summary", "Pages 58-60 identify 2026 revenues, expenditures, property tax demand, grants, borrowing, reserve transfers, and capital expenditure by fund.", 0.94),
    createSampleAssessment("City of Kelowna - 2026 Financial Plan.pdf", "Projects", "2026-2030 capital request schedule", "Pages 72-75 list priority 1 capital requests by service area for 2026 through 2030, totalling $1.767B across the five-year schedule.", 0.95),
    createSampleAssessment("Budget Deliberations agenda item attachments", "Funding Sources", "Published funding strategy", "Page 68 summarizes priority 1 funding as reserves, borrowing, DCC reserve, grant, other revenue, property taxation, and utility funding.", 0.92),
  ];
  document.getElementById("reserveStatus").textContent = "Kelowna reserves loaded";
  document.getElementById("cashflowStatus").textContent = "Kelowna cash flow loaded";
  document.getElementById("projectStatus").textContent = "Kelowna capital plan loaded";
  document.getElementById("fundingStatus").textContent = "Kelowna funding plan loaded";
  renderAssessments();
  runModel();
}

function wrapStrategyRenderer() {
  if (window.kelownaRendererWrapped) return;
  window.kelownaRendererWrapped = true;
  const baseRenderStrategy = renderStrategy;
  renderStrategy = strategy => {
    baseRenderStrategy(strategy);
    if (state.activeDataset === "kelowna") {
      document.getElementById("modelNote").textContent = `Kelowna capital plan optimized across ${strategy.annual.length} years.`;
    }
    renderKelownaComparison(strategy);
  };
}

function renderKelownaComparison(strategy) {
  const panel = document.getElementById("comparisonPanel");
  if (!panel) return;
  if (state.activeDataset !== "kelowna") {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  const firstYear = strategy.annual.find(row => row.year === 2026) || strategy.annual[0];
  const published = kelownaPresetData.publishedFunding2026;
  const optimized = { external: firstYear.grants + firstYear.alternatives, reserves: firstYear.restricted + firstYear.unrestricted, taxDebt: firstYear.gap };
  const pressureReduction = published.taxDebt - optimized.taxDebt;
  const reserveChange = optimized.reserves - published.reserves;
  const externalChange = optimized.external - published.external;
  document.getElementById("comparisonCaption").textContent = "2026 published Priority 1 funding mix compared with the optimizer's 2026 capital funding mix";
  document.getElementById("comparisonDelta").textContent = `${currency.format(pressureReduction)} less tax/debt pressure`;
  document.getElementById("sourceNote").innerHTML = `${kelownaPresetData.sourceNote} <a href="${kelownaPresetData.sourceUrl}" target="_blank" rel="noreferrer">Open source agenda</a>. Modelled changes: ${currency.format(externalChange)} external funding change and ${currency.format(reserveChange)} reserve/DCC timing change.`;
  drawKelownaComparisonChart(published, optimized);
}

function drawEmptyKelownaComparisonChart() {
  const canvas = document.getElementById("comparisonChart");
  if (!canvas) return;
  drawKelownaComparisonBars(canvas.getContext("2d"), canvas, [{ label: "Published", external: 1, reserves: 1, taxDebt: 1 }, { label: "Optimized", external: 1, reserves: 1, taxDebt: 1 }], true);
}

function drawKelownaComparisonChart(published, optimized) {
  const canvas = document.getElementById("comparisonChart");
  drawKelownaComparisonBars(canvas.getContext("2d"), canvas, [{ label: "Published", external: published.external, reserves: published.reserves, taxDebt: published.taxDebt }, { label: "Optimized", external: optimized.external, reserves: optimized.reserves, taxDebt: optimized.taxDebt }], false);
}

function drawKelownaComparisonBars(ctx, canvas, rows, empty) {
  const width = canvas.width;
  const height = canvas.height;
  const margin = { top: 34, right: 42, bottom: 70, left: 64 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const max = Math.max(...rows.map(row => row.external + row.reserves + row.taxDebt), 1);
  const barWidth = Math.min(150, plotWidth / rows.length - 110);
  const colors = { external: "#167d7f", reserves: "#19324a", taxDebt: "#b94a48" };
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#d8dee5";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotHeight);
  ctx.lineTo(width - margin.right, margin.top + plotHeight);
  ctx.stroke();
  rows.forEach((row, index) => {
    const total = row.external + row.reserves + row.taxDebt;
    const x = margin.left + (index + 0.5) * (plotWidth / rows.length) - barWidth / 2;
    let y = margin.top + plotHeight;
    [["taxDebt", row.taxDebt], ["reserves", row.reserves], ["external", row.external]].forEach(([key, value]) => {
      const segmentHeight = (value / max) * plotHeight;
      y -= segmentHeight;
      ctx.fillStyle = empty ? "#d6e3e2" : colors[key];
      ctx.fillRect(x, y, barWidth, segmentHeight);
      if (!empty && segmentHeight > 24) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 15px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(compactCurrency(value), x + barWidth / 2, y + Math.min(segmentHeight - 8, segmentHeight / 2 + 5));
      }
    });
    ctx.fillStyle = "#17212b";
    ctx.font = "800 17px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(empty ? "" : compactCurrency(total), x + barWidth / 2, margin.top + plotHeight + 28);
    ctx.fillStyle = "#66717d";
    ctx.font = "700 16px system-ui";
    ctx.fillText(row.label, x + barWidth / 2, margin.top + plotHeight + 52);
  });
  if (!empty) drawKelownaComparisonLegend(ctx, width - 350, 22, [["External", colors.external], ["Reserves/DCC", colors.reserves], ["Tax/debt", colors.taxDebt]]);
}

function drawKelownaComparisonLegend(ctx, x, y, items) {
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
