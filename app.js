// SAMPLE DATA (Mock Fleet Level Data)

const trucks = {
  "263": "Truck 263",
  "301": "Truck 301",
  "418": "Truck 418"
};

const sampleTrips = [
  { date: "02/03/26", origin: "Clinton, OK", dest: "Amarillo, TX", route: ["OK","TX"], miles: 262 },
  { date: "02/05/26", origin: "Amarillo, TX", dest: "Denver, CO", route: ["TX","NM","CO"], miles: 430 },
  { date: "02/07/26", origin: "Denver, CO", dest: "Wichita, KS", route: ["CO","KS"], miles: 518 },
];

const fuelGallons = 4632;

// INIT SELECTORS
function initSelectors() {
  const truckSelect = document.getElementById("truckSelect");
  const quarterSelect = document.getElementById("quarterSelect");

  Object.entries(trucks).forEach(([id, label]) => {
    truckSelect.innerHTML += `<option value="${id}">${label}</option>`;
  });

  ["Q1 2026","Q2 2026","Q3 2026","Q4 2026"]
    .forEach(q => quarterSelect.innerHTML += `<option>${q}</option>`);
}

// RENDER DASHBOARD
function renderDashboard() {

  // KPI CALCULATIONS
  const totalMiles = sampleTrips.reduce((sum,t) => sum + t.miles, 0);

  const stateTotals = {};
  sampleTrips.forEach(t => {
    const per = t.miles / t.route.length;
    t.route.forEach(s => {
      stateTotals[s] = (stateTotals[s] || 0) + per;
    });
  });

  const avgMpg = (totalMiles / fuelGallons).toFixed(2);

  // UPDATE KPIs
  document.getElementById("totalMiles").innerText =
    totalMiles.toLocaleString();

  document.getElementById("iftaMiles").innerText =
    totalMiles.toLocaleString();

  document.getElementById("stateCount").innerText =
    Object.keys(stateTotals).length;

  document.getElementById("fuelGallons").innerText =
    fuelGallons.toLocaleString() + " gal";

  document.getElementById("avgMpg").innerText =
    avgMpg;

  // RENDER IFTA TABLE
  const iftaTable = document.getElementById("iftaTable");
  iftaTable.innerHTML = "";

  Object.entries(stateTotals)
    .sort((a,b)=>b[1]-a[1])
    .forEach(([state,miles])=>{
      iftaTable.innerHTML += `
        <tr>
          <td>${state}</td>
          <td class="number">${miles.toFixed(1)}</td>
        </tr>`;
    });

  // RENDER TRIPS
  const tripTable = document.getElementById("tripTable");
  tripTable.innerHTML = "";

  sampleTrips.forEach(t=>{
    tripTable.innerHTML += `
      <tr>
        <td>${t.date}</td>
        <td>${t.origin}</td>
        <td>${t.dest}</td>
        <td class="route">${t.route.join(", ")}</td>
        <td class="number">${t.miles}</td>
      </tr>`;
  });
}

// INIT
initSelectors();
renderDashboard();
