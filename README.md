# 🚛 Fleet Intelligence Dashboard

A professional fleet-level IFTA and mileage dashboard designed for owner-operators and small fleet operations.

This dashboard provides executive-level visibility into quarterly mileage, fuel usage, IFTA state allocation, and **IFTA tax calculation** — without expensive fleet management software.

---

## 🔥 Features

- ✅ Quarter & Truck selection (multi-truck ready architecture)
- ✅ KPI summary cards
- ✅ IFTA mileage breakdown by state
- ✅ **IFTA Tax Calculator** — per-state tax due, surcharges, fuel credits, and net owed/refund for each quarter, using official IFTA, Inc. diesel rates (all four 2026 quarters built in)
- ✅ Optional fuel-purchase sheet for real fleet MPG and tax credits
- ✅ KY / VA surcharge handling (surcharges get no fuel credit)
- ✅ Recent trip reporting
- ✅ Mobile responsive
- ✅ Clean SaaS-style UI
- ✅ Static site (no backend required)

---

## 📂 Project Structure

```
fleet-dashboard/
│
├── index.html
├── styles.css
├── app.js      — trip sheet loading, filters, KPI/trip/IFTA tables
└── ifta.js     — IFTA rates, tax math, fuel sheet, tax calculator card
```

---

## 📊 Sheet Setup

### Trips tab (required)

Publish the sheet tab to CSV (`File → Share → Publish to web → CSV`) and set `CSV_URL` in `app.js`. Columns:

| Date | Origin City/State | Destination City/State | Route | Starting Odom | Ending Odom | Mileage | State Miles *(optional)* |
|---|---|---|---|---|---|---|---|

- `Route` is a comma-separated state list, e.g. `MO, OK, TX, NM, AZ, CA`.
- `State Miles` (optional) gives audit-ready per-state miles per trip, e.g. `TX:1200, OK:300`. Without it, miles are split evenly across the route states and the dashboard flags the numbers as **estimated**.

### Fuel tab (optional)

A second published tab with `Date, State, Gallons` (optional `Price/Gallon`). Set `FUEL_CSV_URL` in `ifta.js`. Fuel data drives:

- real fleet MPG (total miles / total gallons) instead of the 6.5 MPG estimate
- per-state tax-paid credits (gallons bought in a state × that state's rate)

Without a fuel sheet you can type an estimated MPG directly in the calculator card.

### How the tax math works

```
fleet MPG          = total miles / total fuel gallons (all states)
taxable gallons    = state miles / fleet MPG
tax due            = taxable gallons × state diesel rate (+ KY/VA surcharges)
credit             = gallons bought in that state × state rate
net per state      = tax due + surcharge − credit   (positive = owed, negative = refund)
```

KY and VA surcharges are charged on gallons consumed with **no** credit for gallons purchased there. Oregon has no IFTA diesel rate (it uses its own weight-mile tax): miles are reported, rate is $0.

Rates live in `IFTA_RATES` in `ifta.js` — update them from the IFTA, Inc. tax matrix each quarter. Special in-quarter events (fuel tax holidays) are flagged in `IFTA_HOLIDAYS` with the official guidance note.

---

## 🔮 Planned Enhancements

- 📊 Mileage trend charts
- 📉 MPG analytics
- 🗺 State heat map visualization
- 📤 PDF export for quarterly filing
- 🔐 Optional authentication layer
- 🚛 Multi-truck data scaling

---

## 🎯 Purpose

This project was built to provide:

- Transparent IFTA tracking
- Executive-ready reporting
- Shareable dashboard access

---

## 🚀 Deployment (GitHub Pages)

1. Push repository to GitHub
2. Go to:
   ```
   Settings → Pages
   ```
3. Under **Build and Deployment**
   - Source: Deploy from branch
   - Branch: `main`
   - Folder: `/ (root)`
4. Save

Your dashboard will be live at:

```
https://yourusername.github.io/fleet-dashboard/
```
