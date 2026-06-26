(function () {
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

  function hideKelownaFundingAnalysis() {
    const panel = document.getElementById("fundingChanges");
    if (panel) panel.hidden = true;
  }

  function renderKelownaFundingAnalysis(strategy) {
    const panel = document.getElementById("fundingChanges");
    if (!panel || typeof state === "undefined" || state.activeDataset !== "kelowna") {
      hideKelownaFundingAnalysis();
      return;
    }

    const published = kelownaPresetData.publishedFunding2026;
    const firstYear = strategy.annual.find(row => row.year === 2026) || strategy.annual[0];
    if (!firstYear) {
      hideKelownaFundingAnalysis();
      return;
    }

    const optimized = {
      external: firstYear.grants + firstYear.alternatives,
      reserves: firstYear.restricted + firstYear.unrestricted,
      taxDebt: firstYear.gap,
    };
    const changes = {
      externalChange: optimized.external - published.external,
      reserveChange: optimized.reserves - published.reserves,
      pressureReduction: published.taxDebt - optimized.taxDebt,
      lowerProjectNeed: published.total - firstYear.projectCost,
    };

    panel.hidden = false;
    const publishedTaxRate = published.taxDebt / Math.max(published.total, 1);
    const lowerNeedTaxEffect = changes.lowerProjectNeed * publishedTaxRate;
    const mixDrivenSavings = changes.pressureReduction - lowerNeedTaxEffect;

    document.getElementById("fundingChangeIntro").textContent =
      `The optimized 2026 strategy lowers tax or debt pressure from ${currency.format(published.taxDebt)} in the published Priority 1 funding summary to ${currency.format(optimized.taxDebt)}.`;

    document.getElementById("fundingChangeStats").innerHTML = [
      changeStat("Tax/debt avoided", changes.pressureReduction, "positive"),
      changeStat("External funding added", changes.externalChange, "positive"),
      changeStat("Reserve timing added", changes.reserveChange, "positive"),
      changeStat("Remaining tax/debt", optimized.taxDebt, "warning"),
    ].join("");

    document.getElementById("fundingChangeComments").innerHTML = [
      `The savings are achieved by applying grants and other non-tax sources first. External funding increases from ${currency.format(published.external)} in the published 2026 summary to ${currency.format(optimized.external)}, a change of ${currency.format(changes.externalChange)}.`,
      `Eligible restricted reserves, DCCs, and available unrestricted reserve room are then used before tax or borrowing. That moves reserve funding from ${currency.format(published.reserves)} to ${currency.format(optimized.reserves)}, a change of ${currency.format(changes.reserveChange)}, while preserving the stated minimum reserve balances in the model.`,
      `The optimized 2026 project envelope is ${currency.format(firstYear.projectCost)} compared with the published funding summary total of ${currency.format(published.total)}. At the published tax/debt mix, that lower draw requirement accounts for about ${currency.format(lowerNeedTaxEffect)} of the pressure reduction; the remaining ${currency.format(mixDrivenSavings)} comes from the funding mix shift.`,
      `The model does not treat the residual ${currency.format(optimized.taxDebt)} as a cut. It marks the amount that still needs taxation, debt, deferral, scope review, or a new funding source after eligible grants, alternatives, and reserves have been exhausted.`,
    ].map(item => `<li>${item}</li>`).join("");

    renderKelownaProjectChanges(firstYear, published);
  }

  function changeStat(label, value, tone) {
    return `
      <div class="change-stat ${tone || ""}">
        <span>${escapeAnalysisHtml(label)}</span>
        <strong>${currency.format(value)}</strong>
      </div>
    `;
  }

  function renderKelownaProjectChanges(firstYear, published) {
    const list = document.getElementById("projectChangeList");
    const caption = document.getElementById("projectChangeCaption");
    if (!list || !caption) return;

    const publishedMixTotal = published.external + published.reserves + published.taxDebt;
    const rows = firstYear.projects
      .map(projectFunding => {
        const sourceProject = state.projects.find(project => project.name === projectFunding.name) || {};
        const publishedBaseline = {
          external: projectFunding.cost * (published.external / publishedMixTotal),
          reserves: projectFunding.cost * (published.reserves / publishedMixTotal),
          taxDebt: projectFunding.cost * (published.taxDebt / publishedMixTotal),
        };
        const optimizedExternal = projectFunding.grant + projectFunding.alternative;
        const optimizedReserves = projectFunding.restricted + projectFunding.unrestricted;
        return {
          ...projectFunding,
          sourceProject,
          publishedBaseline,
          optimizedExternal,
          optimizedReserves,
          taxDebtChange: publishedBaseline.taxDebt - projectFunding.gap,
        };
      })
      .sort((a, b) => b.taxDebtChange - a.taxDebtChange);

    caption.textContent = "Published aggregate mix allocated proportionally to each 2026 service line, compared with optimized funding";

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
            <span>Optimized tax/debt<strong>${currency.format(row.gap)}</strong></span>
            <span class="savings">Tax/debt change<strong>${changeLabel}</strong></span>
          </summary>
          <div class="project-change-body">
            <dl>
              <dt>Published mix baseline</dt>
              <dd>${currency.format(row.publishedBaseline.external)} external, ${currency.format(row.publishedBaseline.reserves)} reserves, ${currency.format(row.publishedBaseline.taxDebt)} tax/debt</dd>
              <dt>Optimized funding</dt>
              <dd>${currency.format(row.optimizedExternal)} external, ${currency.format(row.optimizedReserves)} reserves, ${currency.format(row.gap)} tax/debt</dd>
              <dt>Eligibility basis</dt>
              <dd>${escapeAnalysisHtml(row.sourceProject.category || "capital")} category, ${growthPercent}% growth share, ${isAffirmative(row.sourceProject.grantEligible) ? `${grantPercent}% grant rate` : "not grant eligible"}</dd>
            </dl>
            <p class="project-change-note">${escapeAnalysisHtml(note)}</p>
          </div>
        </details>
      `;
    }).join("");
  }

  function cleanKelownaProjectName(name) {
    return String(name).replace(/\s+capital requests\s+\d{4}$/i, "");
  }

  function projectChangeNote(row, externalChange, reserveChange) {
    const parts = [];
    if (externalChange > 1000) {
      parts.push(`Adds ${currency.format(externalChange)} more grants or alternative funding than the published aggregate mix would imply for this service line.`);
    } else if (externalChange < -1000) {
      parts.push(`Uses ${currency.format(Math.abs(externalChange))} less external funding than the published aggregate mix would imply, so the model leans more on eligible reserves or residual tax/debt.`);
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
      parts.push(`${currency.format(row.gap)} remains as tax/debt pressure after eligible funding sources are applied.`);
    } else {
      parts.push("No residual tax/debt pressure remains for this service line after eligible funding is applied.");
    }

    return parts.join(" ");
  }

  function isAffirmative(value) {
    return value === true || value === 1 || String(value || "").toLowerCase().trim() === "yes";
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
