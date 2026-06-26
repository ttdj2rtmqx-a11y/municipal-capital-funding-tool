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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindScenarioClearRecalculation);
  } else {
    bindScenarioClearRecalculation();
  }
})();
