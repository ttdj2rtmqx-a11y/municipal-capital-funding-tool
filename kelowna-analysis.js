(function () {
  const publishedDebt = 134_103_000;
  const interestRates = [0.03, 0.04, 0.05, 0.06];
  const debtTermYears = 20;

  function initKelownaAnalysis() {
    if (window.kelownaAnalysisWrapped || typeof renderStrategy !== "function") return;
    window.kelownaAnalysisWrapped = true;
    const baseRenderStrategy = renderStrategy;
    renderStrategy = strategy => {
      baseRenderStrategy(strategy);
      renderKelownaFundingAnalysis(strategy);
    };
    if (typeof state !== "undefined" && state.strategy) {
      renderKelownaFundingAnalysis(state.strategy);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initKelownaAnalysis);
  } else {
    initKelownaAnalysis();
  }

  function normalizedPublishedFunding() {
    const published = kelownaPresetData.publishedFunding2026;
    const debt = published.debt || publishedDebt;
    const taxation = published.taxation || Math.max(0, (published.taxDebt || 0) - debt);
    return { ...published, debt, taxation, taxDebt: debt + taxation };
  }

  function hideKelownaFundingAnalysis() {
    const changes = document.getElementById("fundingChanges");
    if (changes) changes.hidden = true;
    const longRange = document.getElementById("longRangeCashflow");
    if (longRange) longRange.hidden = true;
  }

  function renderKelownaFundingAnalysis(strategy) {
    const panel = document.getElementById("fundingChanges");
    if (!panel || typeof state === "undefined" || state.activeDataset !== "kelowna") {
      hideKelownaFundingAnalysis();
      return;
    }

    const firstYear = strategy.annual.find(row => row.year === 2026) || strategy.annual[0];
    if (!firstYear) {
      hideKelownaFundingAnalysis();
      return;
    }

    const published = normalizedPublishedFunding();
    const optimized = {
      external: firstYear.grants + firstYear.alternatives,
      reserves: firstYear.restricted + firstYear.unrestricted,
      ...splitAnnualTaxDebt(firstYear),
    };
    optimized.taxDebt = optimized.debt + optimized.taxation;

    const changes = {
      externalChange: optimized.external - published.external,
      reserveChange: optimized.reserves - published.reserves,
      pressureReduction: published.taxDebt - optimized.taxDebt,
      debtReduction: published.debt - optimized.debt,
      taxationReduction: published.taxation - optimized.taxation,
      lowerProjectNeed: published.total - firstYear.projectCost,
    };

    panel.hidden = false;
    renderSeparatedComparison(firstYear, published, optimized, changes);
    renderSeparatedAnnualRows(strategy);
    renderKelownaProjectChanges(firstYear, published);
    renderKelownaLongRangeCashflow();
  }

  function renderSeparatedComparison(firstYear, published, optimized, changes) {
    const publishedTaxRate = published.taxDebt / Math.max(published.total, 1);
    const lowerNeedTaxEffect = changes.lowerProjectNeed * publishedTaxRate;
    const mixDrivenSavings = changes.pressureReduction - lowerNeedTaxEffect;

    document.getElementById("comparisonCaption").textContent =
      "2026 published Priority 1 funding mix compared with the optimizer, with borrowing and taxation separated";
    document.getElementById("comparisonDelta").textContent =
      `${currency.format(changes.pressureReduction)} less tax/debt pressure`;
    document.getElementById("sourceNote").innerHTML =
      `${kelownaPresetData.sourceNote} <a href="${kelownaPresetData.sourceUrl}" target="_blank" rel="noreferrer">Open source agenda</a>. Modelled changes: ${currency.format(changes.externalChange)} external funding change, ${currency.format(changes.reserveChange)} reserve/DCC timing change, ${currency.format(changes.debtReduction)} less new debt, and ${currency.format(changes.taxationReduction)} less taxation.`;

    document.getElementById("fundingChangeIntro").textContent =
      `The optimized 2026 strategy lowers combined debt and taxation pressure from ${currency.format(published.taxDebt)} in the published Priority 1 funding summary to ${currency.format(optimized.taxDebt)}.`;

    document.getElementById("fundingChangeStats").innerHTML = [
      changeStat("Debt avoided", changes.debtReduction, "positive"),
      changeStat("Taxation avoided", changes.taxationReduction, "positive"),
      changeStat("External funding added", changes.externalChange, "positive"),
      changeStat("Remaining debt", optimized.debt, "warning"),
    ].join("");

    document.getElementById("fundingChangeComments").innerHTML = [
      `The savings are achieved by applying grants and other non-tax sources first. External funding increases from ${currency.format(published.external)} in the published 2026 summary to ${currency.format(optimized.external)}, a change of ${currency.format(changes.externalChange)}.`,
      `Eligible restricted reserves, DCCs, and available unrestricted reserve room are then used before tax or borrowing. That moves reserve funding from ${currency.format(published.reserves)} to ${currency.format(optimized.reserves)}, a change of ${currency.format(changes.reserveChange)}, while preserving the stated minimum reserve balances in the model.`,
      `Published 2026 borrowing is separated from taxation as ${currency.format(published.debt)} of debt and ${currency.format(published.taxation)} of taxation. The optimized residual is split as ${currency.format(optimized.debt)} of new debt and ${currency.format(optimized.taxation)} of taxation after applying available debt capacity first.`,
      `The optimized 2026 project envelope is ${currency.format(firstYear.projectCost)} compared with the published funding summary total of ${currency.format(published.total)}. At the published tax/debt mix, that lower draw requirement accounts for about ${currency.format(lowerNeedTaxEffect)} of the pressure reduction; the remaining ${currency.format(mixDrivenSavings)} comes from the funding mix shift.`,
      `The model does not treat the residual ${currency.format(optimized.taxDebt)} as a cut. It marks the amount that still needs debt, taxation, deferral, scope review, or a new funding source after eligible grants, alternatives, and reserves have been exhausted.`,
    ].map(item => `<li>${item}</li>`).join("");

    drawSeparatedComparisonChart(published, optimized);
  }

  function renderSeparatedAnnualRows(strategy) {
    const header = document.querySelector("#cashflow table thead tr");
    const body = document.getElementById("annualRows");
    if (!header || !body) return;

    header.innerHTML = `
      <th>Year</th>
      <th>Project cost</th>
      <th>Grants</th>
      <th>Alternatives</th>
      <th>Restricted</th>
      <th>Unrestricted</th>
      <th>Debt</th>
      <th>Taxation</th>
      <th>Ending reserves</th>
    `;

    const activeRows = strategy.annual.filter(row => row.projectCost || row.grants || row.restricted || row.unrestricted || row.gap);
    body.innerHTML = activeRows.map(row => {
      const split = splitAnnualTaxDebt(row);
      return `
        <tr>
          <td>${row.year}</td>
          <td>${currency.format(row.projectCost)}</td>
          <td>${currency.format(row.grants)}</td>
          <td>${currency.format(row.alternatives)}</td>
          <td>${currency.format(row.restricted)}</td>
          <td>${currency.format(row.unrestricted)}</td>
          <td>${currency.format(split.debt)}</td>
          <td>${currency.format(split.taxation)}</td>
          <td>${currency.format(row.endingReserves)}</td>
        </tr>
      `;
    }).join("");
  }

  function renderKelownaProjectChanges(firstYear, published) {
    const list = document.getElementById("projectChangeList");
    const caption = document.getElementById("projectChangeCaption");
    if (!list || !caption) return;

    const publishedMixTotal = published.external + published.reserves + published.debt + published.taxation;
    const projectSplits = splitProjectTaxDebt(firstYear.projects, debtCapacityForYear(firstYear.year));
    const rows = firstYear.projects
      .map(projectFunding => {
        const sourceProject = state.projects.find(project => project.name === projectFunding.name) || {};
        const optimizedSplit = projectSplits.get(projectFunding.name) || { debt: 0, taxation: 0 };
        const publishedBaseline = {
          external: projectFunding.cost * (published.external / publishedMixTotal),
          reserves: projectFunding.cost * (published.reserves / publishedMixTotal),
          debt: projectFunding.cost * (published.debt / publishedMixTotal),
          taxation: projectFunding.cost * (published.taxation / publishedMixTotal),
        };
        const optimizedExternal = projectFunding.grant + projectFunding.alternative;
        const optimizedReserves = projectFunding.restricted + projectFunding.unrestricted;
        return {
          ...projectFunding,
          sourceProject,
          publishedBaseline,
          optimizedExternal,
          optimizedReserves,
          optimizedDebt: optimizedSplit.debt,
          optimizedTaxation: optimizedSplit.taxation,
          taxDebtChange: publishedBaseline.debt + publishedBaseline.taxation - optimizedSplit.debt - optimizedSplit.taxation,
        };
      })
      .sort((a, b) => b.taxDebtChange - a.taxDebtChange);

    caption.textContent = "Published aggregate mix allocated proportionally to each 2026 service line, with debt and taxation shown separately";

    list.innerHTML = rows.map(row => {
      const projectLabel = cleanKelownaProjectName(row.name);
      const changeLabel = row.taxDebtChange >= 0
        ? `${currency.format(row.taxDebtChange)} lower`
        : `${currency.format(Math.abs(row.taxDebtChange))} higher`;
      const externalChange = row.optimizedExternal - row.publishedBaseline.external;
      const reserveChange = row.optimizedReserves - row.publishedBaseline.reserves;
      const growthPercent = Math.round((row.sourceProject.growthShare || 0) * 100);
      const grantPercent = Math.round((row.sourceProject.grantRate || 0) * 100);
      const note = projectChangeNote(row, externalChange, reserveChange);

      return `
        <details class="project-change">
          <summary>
            <span class="project-change-title">${escapeAnalysisHtml(projectLabel)}</span>
            <span>Capital cost<strong>${currency.format(row.cost)}</strong></span>
            <span>Optimized debt<strong>${currency.format(row.optimizedDebt)}</strong></span>
            <span class="savings">Debt/tax change<strong>${changeLabel}</strong></span>
          </summary>
          <div class="project-change-body">
            <dl>
              <dt>Published mix baseline</dt>
              <dd>${currency.format(row.publishedBaseline.external)} external, ${currency.format(row.publishedBaseline.reserves)} reserves, ${currency.format(row.publishedBaseline.debt)} debt, ${currency.format(row.publishedBaseline.taxation)} taxation</dd>
              <dt>Optimized funding</dt>
              <dd>${currency.format(row.optimizedExternal)} external, ${currency.format(row.optimizedReserves)} reserves, ${currency.format(row.optimizedDebt)} debt, ${currency.format(row.optimizedTaxation)} taxation</dd>
              <dt>Eligibility basis</dt>
              <dd>${escapeAnalysisHtml(row.sourceProject.category || "capital")} category, ${growthPercent}% growth share, ${isAffirmative(row.sourceProject.grantEligible) ? `${grantPercent}% grant rate` : "not grant eligible"}</dd>
            </dl>
            <p class="project-change-note">${escapeAnalysisHtml(note)}</p>
          </div>
        </details>
      `;
    }).join("");
  }

  function renderKelownaLongRangeCashflow() {
    const panel = document.getElementById("longRangeCashflow");
    if (!panel || state.activeDataset !== "kelowna") return;

    const model = buildKelownaLongRangeModel();
    panel.hidden = false;

    document.getElementById("longRangeIntro").textContent =
      "This 30 year view repeats Kelowna's 2026-2030 capital program in five-year cycles, applies the current inflation and reserve settings, and separates optimized residual funding into new debt first and taxation only after annual debt capacity is used.";

    document.getElementById("longRangeStats").innerHTML = [
      changeStat("30 year capital need", model.totals.projectCost, ""),
      changeStat("30 year new debt", model.totals.debt, "warning"),
      changeStat("30 year taxation", model.totals.taxation, "warning"),
      changeStat("Peak debt service at 5.0%", model.totals.peakDebtServiceAtFive, ""),
    ].join("");

    document.getElementById("longRangeRows").innerHTML = model.annual.map(row => `
      <tr>
        <td>${row.year}</td>
        <td>${currency.format(row.projectCost)}</td>
        <td>${currency.format(row.external)}</td>
        <td>${currency.format(row.reserves)}</td>
        <td>${currency.format(row.debt)}</td>
        <td>${currency.format(row.taxation)}</td>
        <td>${currency.format(row.endingReserves)}</td>
      </tr>
    `).join("");

    document.getElementById("debtServiceRows").innerHTML = model.debtService.map(row => `
      <tr>
        <td>${row.year}</td>
        <td>${currency.format(row.newDebt)}</td>
        <td>${currency.format(row.serviceByRate[0.03])}</td>
        <td>${currency.format(row.serviceByRate[0.04])}</td>
        <td>${currency.format(row.serviceByRate[0.05])}</td>
        <td>${currency.format(row.serviceByRate[0.06])}</td>
        <td>${currency.format(row.taxation)}</td>
        <td>${currency.format(row.taxation + row.serviceByRate[0.05])}</td>
      </tr>
    `).join("");
  }

  function buildKelownaLongRangeModel() {
    const settings = { ...getSettings(), horizonYears: 30 };
    const cashflow = buildLongRangeCashflow(settings.horizonYears);
    const projects = buildLongRangeProjects(settings);
    const strategy = optimizeFunding(kelownaPresetData.reserves, cashflow, projects, settings);
    const annual = strategy.annual.slice(0, settings.horizonYears).map(row => {
      const split = splitAnnualTaxDebt(row, cashflow);
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
    const debtService = buildDebtServiceSensitivity(annual, interestRates, debtTermYears);
    const totals = annual.reduce((sum, row) => {
      sum.projectCost += row.projectCost;
      sum.debt += row.debt;
      sum.taxation += row.taxation;
      return sum;
    }, { projectCost: 0, debt: 0, taxation: 0, peakDebtServiceAtFive: 0 });
    totals.peakDebtServiceAtFive = Math.max(...debtService.map(row => row.serviceByRate[0.05]), 0);
    return { annual, debtService, totals };
  }

  function buildLongRangeCashflow(horizonYears) {
    const base = kelownaPresetData.cashflow[0];
    return Array.from({ length: horizonYears }, (_, index) => ({
      year: 2026 + index,
      baseRevenues: base.baseRevenues * Math.pow(1.025, index),
      baseExpenses: base.baseExpenses * Math.pow(1.028, index),
      taxRevenue: base.taxRevenue * Math.pow(1.03, index),
      debtCapacity: index === 0 ? publishedDebt : 74_800_000 * Math.pow(1.02, Math.max(0, index - 1)),
    }));
  }

  function buildLongRangeProjects(settings) {
    const horizonEnd = 2026 + 30 - 1;
    const cycleLength = 5;
    return kelownaPresetData.projects.flatMap(project => {
      const baseOffset = project.startYear - 2026;
      const baseName = cleanKelownaProjectName(project.name);
      const projects = [];
      for (let cycle = 0; ; cycle += 1) {
        const year = 2026 + baseOffset + cycle * cycleLength;
        if (year > horizonEnd) break;
        const alternativeGrowth = Math.pow(1 + settings.inflationRate, cycle * cycleLength);
        projects.push({
          ...project,
          name: `${baseName} capital requests ${year}`,
          startYear: year,
          endYear: year,
          alternativeFunding: (project.alternativeFunding || 0) * alternativeGrowth,
        });
      }
      return projects;
    });
  }

  function splitAnnualTaxDebt(row, cashflowRows = state.cashflow) {
    const debtCapacity = debtCapacityForYear(row.year, cashflowRows);
    const debt = Math.min(row.gap || 0, debtCapacity);
    return {
      debt,
      taxation: Math.max(0, (row.gap || 0) - debt),
    };
  }

  function splitProjectTaxDebt(projects, debtCapacity) {
    let remainingDebtCapacity = debtCapacity;
    return projects.reduce((map, project) => {
      const debt = Math.min(project.gap || 0, remainingDebtCapacity);
      remainingDebtCapacity -= debt;
      map.set(project.name, {
        debt,
        taxation: Math.max(0, (project.gap || 0) - debt),
      });
      return map;
    }, new Map());
  }

  function debtCapacityForYear(year, cashflowRows = state.cashflow) {
    const cashflow = cashflowRows.find(row => row.year === year);
    if (cashflow) return cashflow.debtCapacity || 0;
    const yearsAfter2026 = Math.max(0, year - 2026);
    return 74_800_000 * Math.pow(1.02, Math.max(0, yearsAfter2026 - 1));
  }

  function buildDebtServiceSensitivity(annual, rates, termYears) {
    return annual.map((row, rowIndex) => {
      const serviceByRate = {};
      rates.forEach(rate => {
        serviceByRate[rate] = annual.reduce((sum, debtRow, debtIndex) => {
          const age = rowIndex - debtIndex;
          if (age < 0 || age >= termYears || !debtRow.debt) return sum;
          return sum + annualDebtPayment(debtRow.debt, rate, termYears);
        }, 0);
      });
      return {
        year: row.year,
        newDebt: row.debt,
        taxation: row.taxation,
        serviceByRate,
      };
    });
  }

  function annualDebtPayment(principal, rate, termYears) {
    if (!principal) return 0;
    if (!rate) return principal / termYears;
    return principal * (rate / (1 - Math.pow(1 + rate, -termYears)));
  }

  function drawSeparatedComparisonChart(published, optimized) {
    const canvas = document.getElementById("comparisonChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    drawSeparatedComparisonBars(ctx, canvas, [
      { label: "Published", external: published.external, reserves: published.reserves, debt: published.debt, taxation: published.taxation },
      { label: "Optimized", external: optimized.external, reserves: optimized.reserves, debt: optimized.debt, taxation: optimized.taxation },
    ]);
  }

  function drawSeparatedComparisonBars(ctx, canvas, rows) {
    const width = canvas.width;
    const height = canvas.height;
    const margin = { top: 34, right: 42, bottom: 70, left: 64 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const max = Math.max(...rows.map(row => row.external + row.reserves + row.debt + row.taxation), 1);
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
          ctx.fillText(analysisCompactCurrency(value), x + barWidth / 2, y + Math.min(segmentHeight - 8, segmentHeight / 2 + 5));
        }
      });
      ctx.fillStyle = "#17212b";
      ctx.font = "800 17px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(analysisCompactCurrency(total), x + barWidth / 2, margin.top + plotHeight + 28);
      ctx.fillStyle = "#66717d";
      ctx.font = "700 16px system-ui";
      ctx.fillText(row.label, x + barWidth / 2, margin.top + plotHeight + 52);
    });

    drawSeparatedLegend(ctx, width - 480, 22, [
      ["External", colors.external],
      ["Reserves/DCC", colors.reserves],
      ["Debt", colors.debt],
      ["Taxation", colors.taxation],
    ]);
  }

  function drawSeparatedLegend(ctx, x, y, items) {
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

  function changeStat(label, value, tone) {
    return `
      <div class="change-stat ${tone || ""}">
        <span>${escapeAnalysisHtml(label)}</span>
        <strong>${currency.format(value)}</strong>
      </div>
    `;
  }

  function cleanKelownaProjectName(name) {
    return String(name).replace(/\s+capital requests\s+\d{4}$/i, "");
  }

  function projectChangeNote(row, externalChange, reserveChange) {
    const parts = [];
    if (externalChange > 1000) {
      parts.push(`Adds ${currency.format(externalChange)} more grants or alternative funding than the published aggregate mix would imply for this service line.`);
    } else if (externalChange < -1000) {
      parts.push(`Uses ${currency.format(Math.abs(externalChange))} less external funding than the published aggregate mix would imply, so the model leans more on eligible reserves, debt, or taxation.`);
    } else {
      parts.push("External funding is broadly in line with the published aggregate mix for this service line.");
    }

    if (reserveChange > 1000) {
      parts.push(`Draws ${currency.format(reserveChange)} more from eligible reserves, DCCs, or unrestricted reserve room before using tax or debt.`);
    } else if (reserveChange < -1000) {
      parts.push(`Draws ${currency.format(Math.abs(reserveChange))} less from reserves than the published aggregate mix would imply, usually because eligibility or minimum balance limits constrain the draw.`);
    } else {
      parts.push("Reserve use is broadly in line with the published aggregate mix.");
    }

    if (row.gap > 0) {
      parts.push(`${currency.format(row.optimizedDebt)} remains as debt and ${currency.format(row.optimizedTaxation)} remains as taxation after eligible funding sources are applied.`);
    } else {
      parts.push("No residual debt or taxation pressure remains for this service line after eligible funding is applied.");
    }

    return parts.join(" ");
  }

  function isAffirmative(value) {
    return value === true || value === 1 || String(value || "").toLowerCase().trim() === "yes";
  }

  function analysisCompactCurrency(value) {
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    return currency.format(value);
  }

  function escapeAnalysisHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
