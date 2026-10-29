# Schools+ Ops WOW dashboard

Week over week operations reporting for the Schools+ service line, SBS Operations
at Care Options for Kids. One self contained HTML page plus two small Netlify
Functions that keep the shared data in Netlify Blobs.

See `DEPLOY.md` for setup.

## Layout

```
index.html                     the dashboard, everything inlined
netlify/functions/targets.mjs  GET/PUT the shared targets document
netlify/functions/imports.mjs  list, fetch, upload and remove SLDR imports
netlify.toml                   publish dir, functions dir, /api routes
package.json                   one dependency, @netlify/blobs
```

## Data sources

1. **Service Line Detail Report (SLDR)**, the primary driver. Required columns:
   `Week Ending`, `Hours`, `Total Billed`, `Billable Status`. Also read when
   present: `Expected Amount`, `Total Paid`, `Payer`, `Client Team`, `Employee`,
   `Service Code`, `Clinical Status`, `Missed Reason`.
2. **Schools + WOW Report 2026 workbook**, baked into the page. Supplies history
   before 2026, the 2024 and 2025 year over year rows, ops notes, and the goals
   the targets editor opens pre-filled with.

## Key definitions

- **Hours Grand Total**: sum of `Hours` where `Billable Status` is in the
  selected set. Default is Billed plus Held. Ties out to the workbook exactly on
  its own Billed only basis.
- **Missed Visit hours**: `Clinical Status = Missed Visit`, held out of delivered
  hours and reported as a rate against scheduled. Missed rows carry a
  `Total Billed` amount, which is the revenue at risk figure. It is never counted
  as actual revenue.
- **Scheduled hours**: delivered hours on the selected statuses, plus missed.
- **Gross margin**: Total Billed minus Total Paid. This is a direct wage margin,
  not the P/L gross margin. See loaded margin below.
- **Loaded margin**: Total Billed minus Total Paid grossed up by the burden rate
  (payroll taxes plus benefits as a percent of direct wages). This is the figure
  that lines up with gross profit on the income statement. Default burden 16.2%,
  from the May 2026 state P/L.
- **Break-even margin**: the loaded gross margin that covers 4-wall overhead.
  Default 29.0%, the Jan to May 2026 actual. Editable on the Clinician Detail
  card; both settings are stored with the targets document and shared.
- **Contribution gap**: for a clinician under the break-even margin, revenue
  times the shortfall in margin points. Scaling by revenue is deliberate, so a
  small miss on high volume outranks a large miss on a handful of hours.
- **Headcount**: distinct `Employee` with delivered hours in the week.
- Ratios are computed pairwise, so a week with revenue but no labor cannot
  inflate a margin or a rate. The same guard applies per clinician: hours with
  no posted labor are flagged rather than shown as a 100% margin.

## Rebuilding index.html

`index.html` is assembled from source parts kept with the Claude session that
produced it (`part1.html` through `part8.js`, plus `build.py`). Edit the parts
and re-run `build.py` rather than editing `index.html` by hand.
