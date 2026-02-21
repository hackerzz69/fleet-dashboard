/* ==============================
   CONFIG
============================== */

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vT2mGE3YfbLHrHeVtSAW5sq7WdEGTbwGhefLtZbwAqcfT-6kZsQmIy2954KQm9yT1mg93EKLpjU8jPA/pub?output=csv";

let trips = [];

/* ==============================
   LOAD CSV
============================== */

async function loadCSV() {
  const res = await fetch(CSV_URL);
  let text = await res.text();

  text = text.replace(/^\uFEFF/, "");

  const rows = text
    .split("\n")
    .map(r =>
      r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
       .map(v => v.replace(/^"|"$/g, "").trim())
    )
    .filter(r => r.some(c => c));

  const headerIndex = rows.findIndex(r => r[0] === "Date");
  if (headerIndex === -1) return;

  const headers = rows[headerIndex].map(h => h.toLowerCase());
  const dataRows = rows.slice(headerIndex + 1);

  trips = dataRows.map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i] || "");
    return obj;
  });

  initFilters();
  render();
}

/* ==============================
   DATE HELPERS
============================== */

function parseDate(str) {
  if (!str) return NaN;
  const [m, d, y] = str.split("/");
  return new Date(`20${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`);
}

function getQuarter(date) {
  const m = date.getMonth() + 1;
  if (m <= 3) return "Q1";
  if (m <= 6) return "Q2";
  if (m <= 9) return "Q3";
  return "Q4";
}

/* ==============================
   FILTERS
============================== */

function initFilters() {
  const yearSelect = document.getElementById("yearSelect");
  const quarterSelect = document.getElementById("quarterSelect");

  const years = [...new Set(
    trips
      .map(t => parseDate(t.date))
      .filter(d => !isNaN(d))
      .map(d => d.getFullYear())
  )].sort((a,b)=>b-a);

  yearSelect.innerHTML =
    `<option value="ALL">All Years</option>` +
    years.map(y => `<option value="${y}">${y}</option>`).join("");

  yearSelect.onchange = render;
  quarterSelect.onchange = render;
}

/* ==============================
   MAIN RENDER
============================== */

function render() {

  const year = document.getElementById("yearSelect").value;
  const quarter = document.getElementById("quarterSelect").value;

  const filtered = trips.filter(t => {
    const d = parseDate(t.date);
    if (isNaN(d)) return false;

    if (year !== "ALL" && d.getFullYear().toString() !== year)
      return false;

    if (quarter !== "ALL" && getQuarter(d) !== quarter)
      return false;

    return true;
  });

  renderTrips(filtered);
  renderIFTA(filtered);
  updateKPIs(filtered);
}

/* ==============================
   RENDER TRIPS
============================== */

function renderTrips(list) {
  const tbody = document.getElementById("tripTable");
  tbody.innerHTML = "";

  list.forEach(t => {
    tbody.innerHTML += `
      <tr>
        <td>${t.date}</td>
        <td>${t["origin city/state"]}</td>
        <td>${t["destination city/state"]}</td>
        <td class="route">${t.route}</td>
        <td class="number">${Number(t.mileage).toFixed(1)}</td>
      </tr>
    `;
  });
}

/* ==============================
   RENDER IFTA
============================== */

function renderIFTA(list) {
  const totals = {};

  list.forEach(t => {
    const miles = Number(t.mileage);
    if (!t.route || isNaN(miles)) return;

    const states = t.route.split(",").map(s => s.trim());
    const per = miles / states.length;

    states.forEach(s => {
      totals[s] = (totals[s] || 0) + per;
    });
  });

  const tbody = document.getElementById("iftaTable");
  tbody.innerHTML = "";

  Object.entries(totals)
    .sort((a,b)=>b[1]-a[1])
    .forEach(([state,miles])=>{
      tbody.innerHTML += `
        <tr>
          <td>${state}</td>
          <td class="number">${miles.toFixed(1)}</td>
        </tr>`;
    });
}

/* ==============================
   KPI CALCULATIONS
============================== */

function updateKPIs(list) {

  let totalMiles = 0;
  let stateSet = new Set();

  list.forEach(t => {
    const miles = Number(t.mileage);
    if (!isNaN(miles)) totalMiles += miles;

    if (t.route) {
      t.route.split(",").forEach(s =>
        stateSet.add(s.trim())
      );
    }
  });

  document.getElementById("totalMiles").innerText =
    totalMiles.toLocaleString(undefined,{maximumFractionDigits:1});

  document.getElementById("iftaMiles").innerText =
    totalMiles.toLocaleString(undefined,{maximumFractionDigits:1});

  document.getElementById("stateCount").innerText =
    stateSet.size;

  document.getElementById("fuelGallons").innerText =
    "—"; // until fuel sheet connected

  document.getElementById("avgMpg").innerText =
    "—";
}

/* ==============================
   INIT
============================== */

loadCSV();
