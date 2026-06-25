# Municipal Capital Funding Tool

A browser-based capital funding optimizer for municipal long-range financial planning.

The tool helps compare and sequence restricted reserves, unrestricted reserves, grants, alternative funding, taxation, and debt capacity across a multi-year capital plan.

## Features

- Upload reserve balance sheets, long-range cash flow files, project lists, and grant or alternative funding documents.
- Assess uploaded files for likely purpose, detected fields, confidence, and missing model inputs.
- Optimize project funding by applying grants and alternatives first, then eligible restricted reserves, unrestricted reserves, and finally taxation or debt gap.
- Model project timing, inflation, growth components, reserve minimum balances, annual reserve contributions, and reserve earnings.
- Review annual funding plans and export optimized results to CSV.
- Use built-in sample data and downloadable CSV templates.

## Use

Open `index.html` in a browser.

For local testing with a small web server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Input Templates

The app includes downloadable CSV templates for:

- Reserve balance sheet
- 30-year cash flow model
- Projects and funding sources

CSV files can feed the optimizer directly. PDF, Word, Excel, JSON, and text uploads are accepted for document assessment. Full body extraction from PDF, Word, and Excel files is designed as a future server-side AI enhancement.

## Notes

This is a planning and scenario-modeling tool. Municipal finance staff should validate assumptions, reserve restrictions, legislation, grant rules, debt limits, and council policy before adopting any recommended funding strategy.
