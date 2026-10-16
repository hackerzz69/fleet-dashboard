/* ============================================================
   Fleet Intelligence Dashboard — IFTA Tax Calculator
   ------------------------------------------------------------
   Standard IFTA math:
     fleet MPG          = total miles / total fuel gallons (all states)
     taxable gallons    = state miles / fleet MPG
     tax due            = taxable gallons x state diesel rate
     KY / VA surcharge  = taxable gallons x surcharge rate
                          (surcharges get NO credit for fuel bought there)
     credit             = gallons bought in that state x state rate
     net per state      = tax due + surcharge - credit
                          (positive = owed, negative = refund)

   Rates: IFTA, Inc. quarterly diesel ("Special Diesel") tax rate
   matrix, 2026 quarters. Update these each quarter.
   OR has no IFTA diesel rate (Oregon uses its own weight-mile tax):
   report the miles, rate = $0.
   ============================================================ */

/* ---------- 2026 IFTA diesel rates, $/gallon, per quarter ---------- */
const IFTA_RATES = {
  "2026Q1": {AL:0.31,AR:0.285,AZ:0.26,CA:0.971,CO:0.325,CT:0.489,DE:0.22,FL:0.4027,GA:0.371,IA:0.325,ID:0.32,IL:0.738,IN:0.61,KS:0.26,KY:0.22,LA:0.2,MA:0.24,MD:0.4675,ME:0.312,MI:0.524,MN:0.326,MO:0.295,MS:0.21,MT:0.2975,NC:0.41,ND:0.23,NE:0.318,NH:0.222,NJ:0.561,NM:0.21,NV:0.27,NY:0.3805,OH:0.47,OK:0.19,OR:0,PA:0.741,RI:0.4,SC:0.28,SD:0.28,TN:0.27,TX:0.2,UT:0.379,VA:0.327,VT:0.31,WA:0.584,WI:0.329,WV:0.357,WY:0.24},
  "2026Q2": {AL:0.31,AR:0.285,AZ:0.26,CA:0.971,CO:0.325,CT:0.489,DE:0.22,FL:0.4097,GA:0.373,IA:0.325,ID:0.32,IL:0.738,IN:0.63,KS:0.26,KY:0.22,LA:0.2,MA:0.24,MD:0.4675,ME:0.312,MI:0.524,MN:0.326,MO:0.295,MS:0.21,MT:0.2975,NC:0.41,ND:0.23,NE:0.318,NH:0.222,NJ:0.561,NM:0.21,NV:0.27,NY:0.3805,OH:0.47,OK:0.19,OR:0,PA:0.741,RI:0.4,SC:0.28,SD:0.28,TN:0.27,TX:0.2,UT:0.379,VA:0.327,VT:0.31,WA:0.584,WI:0.329,WV:0.357,WY:0.24},
  "2026Q3": {AL:0.31,AR:0.285,AZ:0.26,CA:0.979,CO:0.335,CT:0.499,DE:0.22,FL:0.4097,GA:0.373,IA:0.325,ID:0.32,IL:0.738,IN:0.63,KS:0.26,KY:0.22,LA:0.2,MA:0.24,MD:0.4745,ME:0.312,MI:0.524,MN:0.326,MO:0.295,MS:0.24,MT:0.2975,NC:0.41,ND:0.23,NE:0.318,NH:0.222,NJ:0.561,NM:0.21,NV:0.27,NY:0.3805,OH:0.47,OK:0.19,OR:0,PA:0.741,RI:0.4,SC:0.28,SD:0.28,TN:0.27,TX:0.2,UT:0.379,VA:0.336,VT:0.31,WA:0.595,WI:0.329,WV:0.357,WY:0.24},
  "2026Q4": {AL:0.31,AR:0.285,AZ:0.26,CA:0.979,CO:0.335,CT:0.499,DE:0.22,FL:0.4097,GA:0.373,IA:0.325,ID:0.32,IL:0.738,IN:0.63,KS:0.26,KY:0.22,LA:0.2,MA:0.24,MD:0.4745,ME:0.312,MI:0.524,MN:0.326,MO:0.295,MS:0.24,MT:0.2975,NC:0.41,ND:0.23,NE:0.318,NH:0.222,NJ:0.561,NM:0.21,NV:0.27,NY:0.3805,OH:0.47,OK:0.19,OR:0,PA:0.741,RI:0.4,SC:0.28,SD:0.28,TN:0.27,TX:0.2,UT:0.379,VA:0.336,VT:0.31,WA:0.595,WI:0.329,WV:0.357,WY:0.24},
};

/* KY and VA surcharges (2026): charged on gallons consumed in the
   state, with NO credit for gallons purchased there. */
const IFTA_SURCHARGES = {
  "2026Q1": {KY:0.105,VA:0.143}, "2026Q2": {KY:0.105,VA:0.143},
  "2026Q3": {KY:0.105,VA:0.143}, "2026Q4": {KY:0.105,VA:0.143},
};

/* Standard filing deadlines for the 2026 quarters. */
const IFTA_DEADLINES = {
  "2026Q1": "April 30, 2026", "2026Q2": "July 31, 2026",
  "2026Q3": "November 2, 2026", /* Oct 31 is a Saturday */
  "2026Q4": "February 1, 2027", /* Jan 31 is a Sunday */
};

/* Special in-quarter rate events (fuel tax holidays). The matrix rate
   above is replaced by split-quarter rates — adjust before filing. */
const IFTA_HOLIDAYS = {
  "2026Q4": [
    "OH fuel tax holiday: rate drops to $0.0001/gal Oct 4, 2026 – Jan 2, 2027. Split-quarter rates apply; miles and fuel must still be reported.",
    "GA fuel tax suspension extended through Nov 5, 2026: GA suspension-period miles are excluded from taxable miles, and tax-free GA fuel is excluded from tax-paid gallons.",
  ],
};

/* Optional second published Google Sheet tab with fuel purchases.
   Columns: Date, State, Gallons [, Price/Gallon].
   Leave empty to run the calculator on an estimated MPG instead. */
const FUEL_CSV_URL = "";

const DEFAULT_MPG = 6.5;

/* ---------- helpers ---------- */

function ratesFor(year, quarter) {
  const key = `${year}${quarter}`;
  const rates = IFTA_RATES[key];
  return rates ? { key, rates, surcharges: IFTA_SURCHARGES[key] || {},
                  deadline: IFTA_DEADLINES[key] || "",
                  holidays: IFTA_HOLIDAYS[key] || [] } : null;
}

/* Keep only 2-letter state codes: "tx" -> "TX", "Hyrum. UT" -> "UT". */
function cleanState(s) {
  const m = String(s || "").toUpperCase().replace(/[^A-Z]/g, "");
  return m.length === 2 ? m : null;
}

/* Optional "State Miles" column on a trip row, e.g. "TX:1200, OK:300".
   Returns {ST: miles} or null when the column is absent/blank. */
function parseStateMiles(cell) {
  if (!cell) return null;
  const out = {};
  String(cell).split(/[,;]/).forEach(part => {
    const m = part.trim().match(/^([A-Za-z]{2})\s*[:=]?\s*([\d.]+)$/);
    if (m) {
      const st = cleanState(m[1]);
      if (st) out[st] = (out[st] || 0) + Number(m[2]);
    }
  });
  return Object.keys(out).length ? out : null;
}

/* Per-trip per-state miles. Uses the "State Miles" column when present;
   otherwise splits trip miles evenly across the Route states and marks
   the trip as estimated (auditors will not accept even splits). */
function stateMilesForTrip(trip) {
  const exact = parseStateMiles(trip["state miles"]);
  if (exact) return { miles: exact, estimated: false };

  const miles = Number(trip.mileage);
  if (!trip.route || isNaN(miles)) return { miles: {}, estimated: true };

  const states = trip.route.split(",").map(cleanState).filter(Boolean);
  if (!states.length) return { miles: {}, estimated: true };

  const per = miles / states.length;
  const out = {};
  states.forEach(s => { out[s] = (out[s] || 0) + per; });
  return { miles: out, estimated: true };
}

/* ---------- fuel purchases ---------- */

let fuelPurchases = null; // null = not loaded yet, [] = none

async function loadFuel() {
  fuelPurchases = [];
  if (!FUEL_CSV_URL) return;
  try {
    const res = await fetch(FUEL_CSV_URL);
    const text = (await res.text()).replace(/^\uFEFF/, "");
    const rows = text.split("\n")
      .map(r => r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map(v => v.replace(/^"|"$/g, "").trim()))
      .filter(r => r.some(c => c));
    const hi = rows.findIndex(r => r[0] && r[0].toLowerCase() === "date");
    if (hi === -1) return;
    const headers = rows[hi].map(h => h.toLowerCase());
    rows.slice(hi + 1).forEach(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i] || ""; });
      const st = cleanState(obj.state);
      const gal = Number(obj.gallons);
      if (st && !isNaN(gal) && gal > 0)
        fuelPurchases.push({ date: obj.date, state: st, gallons: gal });
    });
  } catch (e) { /* offline or unpublished: run without fuel data */ }
}

/* ---------- main calculation ---------- */

function computeIFTA(trips, fuel, mpgOverride) {
  const stateMiles = {};
  let totalMiles = 0, estimated = false;

  trips.forEach(t => {
    const { miles, estimated: est } = stateMilesForTrip(t);
    if (est) estimated = true;
    Object.entries(miles).forEach(([st, m]) => {
      stateMiles[st] = (stateMiles[st] || 0) + m;
      totalMiles += m;
    });
  });

  let totalGallons = 0, mpgEstimated = false;
  const boughtByState = {};
  (fuel || []).forEach(f => {
    const st = cleanState(f.state) || f.state;
    boughtByState[st] = (boughtByState[st] || 0) + f.gallons;
    totalGallons += f.gallons;
  });

  let mpg;
  if (mpgOverride && mpgOverride > 0) { mpg = mpgOverride; mpgEstimated = true; }
  else if (totalGallons > 0) mpg = totalMiles / totalGallons;
  else { mpg = DEFAULT_MPG; mpgEstimated = true; }

  const rows = {};
  Object.entries(stateMiles).forEach(([st, miles]) => {
    const taxableGal = miles / mpg;
    rows[st] = { miles, taxableGal, boughtGal: boughtByState[st] || 0 };
  });
  // States where fuel was bought but no miles driven still earn credit.
  Object.entries(boughtByState).forEach(([st, g]) => {
    if (!rows[st]) rows[st] = { miles: 0, taxableGal: 0, boughtGal: g };
  });

  return { stateMiles, totalMiles, totalGallons, mpg, mpgEstimated,
           milesEstimated: estimated, rows };
}

/* Apply rates to a computeIFTA result. Mutates rows, adds totals. */
function applyRates(result, rateInfo) {
  const totals = { taxDue: 0, surcharge: 0, credit: 0, net: 0 };
  Object.entries(result.rows).forEach(([st, r]) => {
    const rate = rateInfo.rates[st];
    r.rate = (rate === undefined) ? null : rate;
    r.taxDue = r.rate === null ? null : r.taxableGal * r.rate;
    r.surcharge = (rateInfo.surcharges[st] || 0) * r.taxableGal;
    r.credit = r.boughtGal * (r.rate || 0);
    r.net = (r.taxDue || 0) + r.surcharge - r.credit;
    if (r.taxDue !== null) totals.taxDue += r.taxDue;
    totals.surcharge += r.surcharge;
    totals.credit += r.credit;
    totals.net += r.net;
  });
  result.totals = totals;
  result.rateInfo = rateInfo;
  return result;
}

/* ---------- rendering ---------- */

const fmt$ = n => (n < 0 ? "-" : "") + "$" + Math.abs(n).toFixed(2);
const fmtN = (n, d = 1) => Number(n).toLocaleString(undefined,
  { maximumFractionDigits: d, minimumFractionDigits: d });

function renderTaxCalculator(filteredTrips, year, quarter) {
  const wrap = document.getElementById("taxCard");
  if (!wrap) return;

  const rateInfo = (year !== "ALL" && quarter !== "ALL")
    ? ratesFor(year, quarter) : null;

  const mpgInput = document.getElementById("mpgInput");
  const mpgOverride = mpgInput && mpgInput.value
    ? Number(mpgInput.value) : null;

  let result = computeIFTA(filteredTrips, fuelPurchases, mpgOverride);
  if (rateInfo) applyRates(result, rateInfo);

  /* summary */
  const t = result.totals;
  let summary = `
    <div class="kpis" style="padding:0 0 12px 0">
      <div class="kpi">
        <h3>Fleet MPG ${result.mpgEstimated ? "(estimated)" : "(from fuel)"}</h3>
        <div class="value">${fmtN(result.mpg, 2)}</div>
        <div class="trend">Override: <input id="mpgInput" type="number" step="0.1" min="1" max="15"
          value="${mpgOverride || ""}" placeholder="${fmtN(result.mpg, 2)}"
          style="width:80px;background:var(--panel-soft);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:4px 8px"></div>
      </div>
      <div class="kpi">
        <h3>Quarter Net</h3>
        <div class="value" style="color:${!t || t.net === 0 ? "var(--text)" : t.net > 0 ? "var(--danger)" : "var(--success)"}">
          ${!t ? "—" : (t.net >= 0 ? "Owe " : "Credit ") + fmt$(Math.abs(t.net))}</div>
        <div class="trend">${!t ? "Pick a single year + quarter" : (rateInfo.deadline ? "File by " + rateInfo.deadline : "")}</div>
      </div>
      <div class="kpi">
        <h3>Fuel Logged</h3>
        <div class="value">${fmtN(result.totalGallons)}</div>
        <div class="trend">gallons${!FUEL_CSV_URL ? " — fuel sheet not connected" : ""}</div>
      </div>
    </div>`;

  /* flags */
  const flags = [];
  if (result.milesEstimated)
    flags.push("⚠ State miles are estimated (even split of route miles). Add a <b>State Miles</b> column like <i>TX:1200, OK:300</i> for audit-ready numbers.");
  if (result.mpgEstimated && !(mpgOverride))
    flags.push("⚠ MPG is estimated. Connect the fuel sheet or type your MPG above.");
  if (rateInfo && rateInfo.holidays.length)
    rateInfo.holidays.forEach(h => flags.push("⚠ " + h));

  /* per-state table */
  let table = "";
  if (rateInfo) {
    const rows = Object.entries(result.rows)
      .sort((a, b) => b[1].net - a[1].net);
    const body = rows.map(([st, r]) => `
      <tr>
        <td class="route">${st}</td>
        <td class="number">${fmtN(r.miles)}</td>
        <td class="number">${fmtN(r.taxableGal)}</td>
        <td class="number">${r.rate === null ? "n/a" : "$" + r.rate.toFixed(4)}</td>
        <td class="number">${r.taxDue === null ? "n/a" : fmt$(r.taxDue)}</td>
        <td class="number">${r.surcharge > 0 ? fmt$(r.surcharge) : "—"}</td>
        <td class="number">${fmtN(r.boughtGal)}</td>
        <td class="number">${fmt$(r.credit)}</td>
        <td class="number" style="color:${r.net === 0 ? "var(--text)" : r.net > 0 ? "var(--danger)" : "var(--success)"};font-weight:700">
          ${r.net >= 0 ? fmt$(r.net) : "(" + fmt$(Math.abs(r.net)) + ")"}</td>
      </tr>`).join("");
    table = `
      <table>
        <thead><tr>
          <th>State</th><th class="number">Miles</th><th class="number">Taxable Gal</th>
          <th class="number">Rate</th><th class="number">Tax Due</th><th class="number">Surcharge</th>
          <th class="number">Gal Bought</th><th class="number">Credit</th><th class="number">Net</th>
        </tr></thead>
        <tbody>${body}</tbody>
        <tfoot><tr style="font-weight:700">
          <td>Total</td><td class="number">${fmtN(result.totalMiles)}</td>
          <td class="number">${fmtN(Object.values(result.rows).reduce((a, r) => a + r.taxableGal, 0))}</td>
          <td></td><td class="number">${fmt$(t.taxDue)}</td>
          <td class="number">${t.surcharge > 0 ? fmt$(t.surcharge) : "—"}</td>
          <td class="number">${fmtN(result.totalGallons)}</td>
          <td class="number">${fmt$(t.credit)}</td>
          <td class="number">${t.net >= 0 ? fmt$(t.net) : "(" + fmt$(Math.abs(t.net)) + ")"}</td>
        </tr></tfoot>
      </table>`;
  } else {
    table = `<p style="color:var(--muted)">Select a single year and quarter above to run the tax calculation. Rates are loaded for all four 2026 quarters.</p>`;
  }

  wrap.innerHTML = `
    <h2>🧾 IFTA Tax Calculator</h2>
    ${summary}
    ${flags.length ? `<div style="margin:0 0 12px 0;font-size:0.85rem;color:var(--muted);line-height:1.6">${flags.join("<br>")}</div>` : ""}
    ${table}`;

  const input = document.getElementById("mpgInput");
  if (input) input.onchange = () => renderTaxCalculator(filteredTrips, year, quarter);
}

/* Entry point, called from app.js after the trip CSV loads. */
async function initTaxCalculator() {
  await loadFuel();
}
