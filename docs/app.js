const bounds = { minLon: -10, maxLon: 28, minLat: 35.2, maxLat: 46.6 };
const exclusion = [[16.6, 36.9], [18.4, 36.9], [18.4, 35.6], [16.6, 35.6]];
const land = [
  [[-9.3,43.2],[-8.2,43.7],[-5.6,43.6],[-1.8,43.3],[0.6,42.6],[3.1,42.4],[3.2,41.4],[0.7,40.6],[-0.3,38.7],[-1.8,36.7],[-5.6,36.0],[-7.2,37.0],[-8.9,38.6],[-9.4,41.2]],
  [[1.4,39.1],[2.2,39.9],[3.2,39.9],[3.1,39.3],[2.4,38.9],[1.5,38.9]],
  [[6.7,43.9],[8.8,44.4],[10.2,44.0],[12.2,45.6],[13.6,45.7],[13.5,43.6],[12.4,42.1],[14.8,41.2],[15.6,40.0],[18.4,40.1],[18.5,39.1],[16.1,38.0],[15.6,37.9],[15.1,38.2],[12.6,37.6],[13.4,41.0],[12.2,41.8],[10.6,42.7],[9.4,41.2],[8.3,40.6],[8.2,38.8],[8.6,41.6],[7.6,43.5]],
  [[8.2,41.1],[9.6,41.2],[9.8,40.0],[9.6,39.1],[8.4,38.9],[8.3,40.0]],
  [[12.5,38.2],[13.4,38.2],[15.1,38.2],[15.6,38.0],[15.3,36.7],[13.4,37.0],[12.4,37.6]],
  [[19.3,42.5],[19.6,41.8],[19.4,40.6],[19.8,40.0],[20.2,39.7],[20.6,40.4],[20.4,41.5],[20.1,42.6]],
  [[20.8,39.6],[21.4,38.3],[21.9,37.6],[23.0,37.4],[23.7,38.0],[24.0,38.6],[22.9,39.2],[22.6,40.4],[23.6,41.1],[22.4,40.9],[21.2,40.6],[20.6,40.2]],
  [[23.6,35.5],[24.5,35.6],[26.1,35.3],[26.2,35.0],[24.0,34.9],[23.6,35.2]]
];

const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");
let catalog = [];
let points = [];
let hits = [];
let selectedId = null;
let timer = null;
let listingType = "tutti";
let country = "tutti";

function project(lon, lat) {
  const x = (lon - bounds.minLon) / (bounds.maxLon - bounds.minLon) * canvas.width;
  const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * canvas.height;
  return [x, y];
}
function euro(n) { return "€ " + Number(n).toLocaleString("it-IT"); }
function filters() {
  return {
    budget: Number(document.getElementById("budget").value),
    sea_km: Number(document.getElementById("sea").value),
    min_sqm: Number(document.getElementById("sqm").value),
    type: listingType,
    country,
  };
}
function paintLabels() {
  const f = filters();
  document.getElementById("budgetOut").textContent = euro(f.budget);
  document.getElementById("seaOut").textContent = f.sea_km + " km";
  document.getElementById("sqmOut").textContent = f.min_sqm + " m²";
}
function matchScore(row, f) {
  let score = 62;
  score += Math.max(0, (f.budget - row.price) / f.budget) * 22;
  score += Math.max(0, (f.sea_km - row.sea_km) / f.sea_km) * 10;
  score += Math.min(12, (row.sqm - f.min_sqm) / 8);
  score -= row.alerts.length * 8;
  return Math.max(35, Math.min(98, Math.round(score)));
}
function visible(f) {
  return catalog.filter((row) => {
    if (row.price > f.budget || row.sea_km > f.sea_km || row.sqm < f.min_sqm) return false;
    if (f.type !== "tutti" && row.type !== f.type) return false;
    if (f.country !== "tutti" && row.country !== f.country) return false;
    return true;
  }).sort((a, b) => matchScore(b, f) - matchScore(a, f));
}
function drawPoly(pts, fill) {
  ctx.beginPath();
  pts.forEach((pt, i) => {
    const [x, y] = project(pt[0], pt[1]);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = "#e4d9cc";
  ctx.stroke();
}
function draw() {
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#d7e6e4";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  land.forEach((poly) => drawPoly(poly, "#f7f1e8"));
  ctx.beginPath();
  exclusion.forEach((pt, i) => {
    const [x, y] = project(pt[0], pt[1]);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(184, 92, 56, 0.12)";
  ctx.fill();
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = "#b85c38";
  ctx.stroke();
  ctx.setLineDash([]);
  const [lx, ly] = project(17.5, 36.25);
  ctx.fillStyle = "#8a4b12";
  ctx.font = `${11 * dpr}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("zona esclusa", lx, ly);
  ctx.fillStyle = "#8d8378";
  ctx.font = `${12 * dpr}px sans-serif`;
  [["Spagna", -3.8, 40.2], ["Italia", 12.2, 42.6], ["Albania", 19.9, 41.2], ["Grecia", 22.4, 38.6]]
    .forEach(([name, lon, lat]) => {
      const [x, y] = project(lon, lat);
      ctx.fillText(name, x, y);
    });
  hits = [];
  points.forEach((p) => {
    const [x, y] = project(p.lon, p.lat);
    const r = (selectedId === p.id ? 7 : 5.2) * dpr;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (p.has_alert) {
      ctx.fillStyle = "#fffdf9";
      ctx.fill();
      ctx.lineWidth = 1.7 * dpr;
      ctx.strokeStyle = "#1c1915";
      ctx.stroke();
    } else {
      ctx.fillStyle = p.type === "asta" ? "#0f5f5a" : "#b85c38";
      ctx.fill();
    }
    hits.push({ id: p.id, x, y, r: r + 8 });
  });
}
function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  draw();
}
function showError(message) {
  const box = document.getElementById("error");
  box.textContent = message;
  box.style.display = message ? "block" : "none";
}
function renderList(list, f) {
  const box = document.getElementById("results");
  box.innerHTML = list.slice(0, 12).map((row) => `
    <button class="result${row.id === selectedId ? " on" : ""}" type="button" data-id="${row.id}">
      <strong>${row.type === "asta" ? "Asta" : "Mercato"} · ${row.city}</strong>
      <span>${euro(row.price)} · ${row.sqm} m² · ${row.condition} · match ${matchScore(row, f)}</span>
    </button>`).join("") || `<p class="meta">Nessun immobile con questi filtri.</p>`;
}
function runSearch() {
  const f = filters();
  const list = visible(f);
  points = list.map((row) => ({ id: row.id, lat: row.lat, lon: row.lon, type: row.type, has_alert: row.alerts.length > 0 }));
  document.getElementById("counter").classList.remove("searching");
  document.getElementById("count").textContent = String(list.length);
  document.getElementById("countLabel").textContent = list.length === 1 ? "immobile nel filtro" : "immobili nel filtro";
  showError("");
  renderList(list, f);
  if (selectedId && !list.some((row) => row.id === selectedId)) closeSheet();
  else if (selectedId) openSheet(selectedId, false);
  draw();
}
function schedule() {
  paintLabels();
  document.getElementById("counter").classList.add("searching");
  document.getElementById("count").textContent = "…";
  document.getElementById("countLabel").textContent = "aggiorno i risultati";
  clearTimeout(timer);
  timer = setTimeout(runSearch, 160);
}
function openSheet(id, redraw = true) {
  selectedId = id;
  const row = catalog.find((item) => item.id === id);
  if (!row) return;
  const f = filters();
  const link = row.contact.url
    ? `<a href="${row.contact.url}" target="_blank" rel="noopener">Apri la fonte ufficiale</a>`
    : "";
  document.getElementById("sheet").innerHTML = `
    <button class="close" id="close" type="button" aria-label="Chiudi">×</button>
    <p class="kicker">${row.type === "asta" ? "Asta" : "Mercato"} · ${row.country}</p>
    <h2>${row.city}</h2>
    <div class="meta">${row.condition} · id ${row.id}</div>
    <div class="facts">
      <span class="pill">${euro(row.price)}</span>
      <span class="pill">${row.sqm} m²</span>
      <span class="pill">${row.rooms} locali</span>
      <span class="pill">${row.sea_km} km dal mare</span>
      <span class="pill score">Match ${matchScore(row, f)}</span>
    </div>
    <p class="summary">${row.summary}</p>
    ${row.alerts.map((alert) => `<div class="alert">${alert}</div>`).join("")}
    <div class="contact">
      <h3>${row.contact.office}</h3>
      <p>${row.contact.where}</p>
      ${link}
    </div>`;
  document.getElementById("sheet").classList.add("open");
  document.getElementById("close").addEventListener("click", closeSheet);
  renderList(visible(f), f);
  if (redraw) draw();
}
function closeSheet() {
  selectedId = null;
  document.getElementById("sheet").classList.remove("open");
  document.getElementById("sheet").innerHTML = "";
  runSearch();
}
canvas.addEventListener("click", (ev) => {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const x = (ev.clientX - rect.left) * dpr;
  const y = (ev.clientY - rect.top) * dpr;
  const hit = hits.find((h) => Math.hypot(h.x - x, h.y - y) <= h.r);
  if (hit) openSheet(hit.id);
});
document.getElementById("results").addEventListener("click", (ev) => {
  const btn = ev.target.closest(".result");
  if (btn) openSheet(btn.dataset.id);
});
["budget", "sea", "sqm"].forEach((id) => document.getElementById(id).addEventListener("input", schedule));
document.getElementById("types").addEventListener("click", (ev) => {
  const btn = ev.target.closest("button");
  if (!btn) return;
  listingType = btn.dataset.type;
  document.querySelectorAll("#types button").forEach((b) => b.classList.toggle("on", b === btn));
  schedule();
});
document.getElementById("countries").addEventListener("click", (ev) => {
  const btn = ev.target.closest("button");
  if (!btn) return;
  country = btn.dataset.country;
  document.querySelectorAll("#countries button").forEach((b) => b.classList.toggle("on", b === btn));
  schedule();
});
document.getElementById("openInfo").addEventListener("click", () => document.getElementById("info").showModal());
window.addEventListener("resize", resize);
paintLabels();
resize();
fetch("data.json")
  .then((response) => { if (!response.ok) throw new Error("Dati non disponibili"); return response.json(); })
  .then((rows) => { catalog = rows; runSearch(); })
  .catch((err) => {
    document.getElementById("count").textContent = "—";
    document.getElementById("countLabel").textContent = "avvio non riuscito";
    showError(err.message);
  });
