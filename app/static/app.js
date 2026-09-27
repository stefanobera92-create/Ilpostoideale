const bounds = { minLon: -10, maxLon: 28, minLat: 34.4, maxLat: 46.6 };
const exclusion = [[16.6, 36.9], [18.4, 36.9], [18.4, 35.6], [16.6, 35.6]];
const land = [
  [[-9.3, 43.2], [-8.2, 43.7], [-5.6, 43.6], [-1.8, 43.3], [0.6, 42.6], [3.1, 42.4], [3.2, 41.4], [0.7, 40.6], [-0.3, 38.7], [-1.8, 36.7], [-5.6, 36.0], [-7.2, 37.0], [-8.9, 38.6], [-9.4, 41.2]],
  [[1.4, 39.1], [2.2, 39.9], [3.2, 39.9], [3.1, 39.3], [2.4, 38.9], [1.5, 38.9]],
  [[6.7, 43.9], [8.8, 44.4], [10.2, 44.0], [12.2, 45.6], [13.6, 45.7], [13.5, 43.6], [12.4, 42.1], [14.8, 41.2], [15.6, 40.0], [18.4, 40.1], [18.5, 39.1], [16.1, 38.0], [15.6, 37.9], [15.1, 38.2], [12.6, 37.6], [13.4, 41.0], [12.2, 41.8], [10.6, 42.7], [9.4, 41.2], [8.3, 40.6], [8.2, 38.8], [8.6, 41.6], [7.6, 43.5]],
  [[8.2, 41.1], [9.6, 41.2], [9.8, 40.0], [9.6, 39.1], [8.4, 38.9], [8.3, 40.0]],
  [[12.5, 38.2], [13.4, 38.2], [15.1, 38.2], [15.6, 38.0], [15.3, 36.7], [13.4, 37.0], [12.4, 37.6]],
  [[19.3, 42.5], [19.6, 41.8], [19.4, 40.6], [19.8, 40.0], [20.2, 39.7], [20.6, 40.4], [20.4, 41.5], [20.1, 42.6]],
  [[20.8, 39.6], [21.4, 38.3], [21.9, 37.6], [23.0, 37.4], [23.7, 38.0], [24.0, 38.6], [22.9, 39.2], [22.6, 40.4], [23.6, 41.1], [22.4, 40.9], [21.2, 40.6], [20.6, 40.2]],
  [[23.6, 35.5], [24.5, 35.6], [26.1, 35.3], [26.2, 35.0], [24.0, 34.9], [23.6, 35.2]]
];

const mode = document.documentElement.dataset.mode || "api";
const canvas = document.getElementById("map");
const ctx = canvas.getContext("2d");
let catalog = [];
let points = [];
let hits = [];
let selectedId = null;
let timer = null;
let requestId = 0;
let sheetRequest = 0;
let listingType = "tutti";
let country = "tutti";

function project(lon, lat) {
  const x = (lon - bounds.minLon) / (bounds.maxLon - bounds.minLon) * canvas.width;
  const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * canvas.height;
  return [x, y];
}

function euro(amount) {
  return "€ " + Number(amount).toLocaleString("it-IT");
}

function km(value) {
  const number = Number(value);
  if (Math.abs(number - Math.round(number)) < 0.05) return String(Math.round(number));
  return number.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function filters() {
  return {
    budget: Number(document.getElementById("budget").value),
    sea_km: Number(document.getElementById("sea").value),
    min_sqm: Number(document.getElementById("sqm").value),
    type: listingType,
    country,
  };
}

function fitLabel(score) {
  if (score >= 85) return "Ci somiglia molto";
  if (score >= 70) return "Ci si avvicina";
  return "Rientra nei criteri";
}

function matchScore(row, f) {
  let score = 62;
  score += Math.max(0, (f.budget - row.price) / f.budget) * 22;
  score += Math.max(0, (f.sea_km - row.sea_km) / f.sea_km) * 10;
  score += Math.min(12, (row.sqm - f.min_sqm) / 8);
  score -= (row.alerts ? row.alerts.length : 0) * 8;
  return Math.max(35, Math.min(98, Math.round(score)));
}

function explain(row, f) {
  const lines = [];
  const margin = f.budget - row.price;
  lines.push(margin >= 20000
    ? `Costa ${euro(margin)} in meno del massimo che hai indicato.`
    : "Resta nel budget, vicino al massimo.");
  if (row.sea_km <= 5) {
    lines.push(`Il mare è a ${km(row.sea_km)} km: ci arrivi in pochi minuti.`);
  } else if (f.sea_km - row.sea_km >= 10) {
    lines.push(`Il mare è a ${km(row.sea_km)} km, più vicino del limite di ${km(f.sea_km)} km.`);
  } else {
    lines.push(`Il mare è a ${km(row.sea_km)} km, dentro i ${km(f.sea_km)} km scelti.`);
  }
  const extra = row.sqm - f.min_sqm;
  lines.push(extra >= 30
    ? `${row.sqm} m², ben oltre i ${f.min_sqm} m² minimi.`
    : `${row.sqm} m², in linea con i ${f.min_sqm} m² che cerchi.`);
  const alerts = row.alerts || [];
  lines.push(alerts.length
    ? "Ci sono avvisi da leggere prima di considerarlo il posto giusto."
    : "In questa scheda non compare nessun avviso di rischio.");
  return lines;
}

function dreamSentence(f) {
  const where = f.country === "tutti" ? "nel Mediterraneo" : "in " + f.country;
  const kind = f.type === "asta" ? "un'asta" : f.type === "mercato" ? "una casa in vendita" : "una casa, all'asta o in vendita";
  return `Cerchi ${kind} ${where}: fino a ${euro(f.budget)}, mare entro ${km(f.sea_km)} km, almeno ${f.min_sqm} m².`;
}

function paintLabels() {
  const f = filters();
  document.getElementById("budgetOut").textContent = euro(f.budget);
  document.getElementById("seaOut").textContent = km(f.sea_km) + " km";
  document.getElementById("sqmOut").textContent = f.min_sqm + " m²";
  document.getElementById("dream").textContent = dreamSentence(f);
}

function rankLocal(f) {
  return catalog.filter((row) => {
    if (row.price > f.budget || row.sea_km > f.sea_km || row.sqm < f.min_sqm) return false;
    if (f.type !== "tutti" && row.type !== f.type) return false;
    if (f.country !== "tutti" && row.country !== f.country) return false;
    return true;
  }).map((row) => {
    const score = matchScore(row, f);
    return {
      ...row,
      has_alert: row.alerts.length > 0,
      match_score: score,
      fit: fitLabel(score),
    };
  }).sort((a, b) => b.match_score - a.match_score || a.price - b.price || a.id.localeCompare(b.id));
}

function drawPoly(pts, fill) {
  ctx.beginPath();
  pts.forEach((pt, i) => {
    const [x, y] = project(pt[0], pt[1]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = "#e4d9cc";
  ctx.lineWidth = 1;
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
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(184, 92, 56, 0.12)";
  ctx.fill();
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = "#b85c38";
  ctx.lineWidth = 1;
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
  const ordered = [...points].sort((a, b) => {
    if (a.id === selectedId) return 1;
    if (b.id === selectedId) return -1;
    return a.match_score - b.match_score;
  });
  ordered.forEach((p) => {
    const [x, y] = project(p.lon, p.lat);
    const scale = 4 + ((p.match_score || 62) - 35) / 63 * 3.5;
    const r = (p.id === selectedId ? scale + 1.6 : scale) * dpr;
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
    if (p.id === selectedId) {
      ctx.beginPath();
      ctx.arc(x, y, r + 4 * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = "#1c1915";
      ctx.lineWidth = 1.4 * dpr;
      ctx.stroke();
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
  box.textContent = message || "";
  box.style.display = message ? "block" : "none";
}

function setSearching(on) {
  document.getElementById("counter").classList.toggle("searching", on);
  document.getElementById("results").classList.toggle("busy", on);
  if (on) {
    document.getElementById("count").textContent = "…";
    document.getElementById("countLabel").textContent = "guardo i tuoi criteri";
  }
}

function fitClass(label) {
  if (label === "Ci somiglia molto") return "fit high";
  if (label === "Ci si avvicina") return "fit mid";
  return "fit";
}

function renderList(list) {
  const box = document.getElementById("results");
  if (!list.length) {
    box.innerHTML = `<p class="empty">Nessun posto con questi criteri. Alza il budget, allontana il mare o riduci i metri quadri.</p>`;
    return;
  }
  box.innerHTML = list.map((row) => `
    <button class="result${row.id === selectedId ? " on" : ""}" type="button" data-id="${esc(row.id)}">
      <span class="${fitClass(row.fit)}">${esc(row.fit)}</span>
      <strong>${esc(row.city)}</strong>
      <span class="meta">${row.type === "asta" ? "Asta" : "In vendita"} · ${esc(row.country)} · ${euro(row.price)} · ${row.sqm} m² · ${km(row.sea_km)} km dal mare</span>
      ${row.has_alert ? `<em class="flag">Ha un avviso da leggere</em>` : ""}
    </button>`).join("");
}

function clearSheet() {
  const sheet = document.getElementById("sheet");
  sheet.classList.remove("open");
  sheet.innerHTML = "";
}

function paintSheet(row) {
  const f = filters();
  const lines = row.reasons || explain(row, f);
  const alerts = row.alerts || [];
  const office = row.contact ? row.contact.office : "";
  const where = row.contact ? row.contact.where : "";
  const url = row.contact && typeof row.contact.url === "string" && row.contact.url.startsWith("https://")
    ? row.contact.url
    : "";
  const link = url ? `<a href="${esc(url)}" target="_blank" rel="noopener">Apri la fonte ufficiale</a>` : "";
  const sheet = document.getElementById("sheet");
  sheet.innerHTML = `
    <button class="close" id="close" type="button" aria-label="Chiudi">×</button>
    <p class="kicker">${row.type === "asta" ? "Asta" : "In vendita"} · ${esc(row.country)}</p>
    <h2>${esc(row.city)}</h2>
    <div class="meta">${esc(row.condition)} · ${esc(row.fit || fitLabel(row.match_score))}</div>
    <div class="facts">
      <span class="pill">${euro(row.price)}</span>
      <span class="pill">${row.sqm} m²</span>
      <span class="pill">${row.rooms} locali</span>
      <span class="pill">${km(row.sea_km)} km dal mare</span>
      <span class="pill score">Match ${row.match_score}</span>
    </div>
    <ul class="reasons">${lines.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>
    ${row.summary ? `<p class="summary">${esc(row.summary)}</p>` : ""}
    ${alerts.map((alert) => `<div class="alert">${esc(alert)}</div>`).join("")}
    ${office ? `<div class="contact"><h3>${esc(office)}</h3><p>${esc(where)}</p>${link}</div>` : ""}`;
  sheet.classList.add("open");
  document.getElementById("close").addEventListener("click", () => closeSheet());
}

async function loadDetail(id, f) {
  if (mode === "static") {
    const row = catalog.find((item) => item.id === id);
    if (!row) return null;
    const score = matchScore(row, f);
    return {
      ...row,
      has_alert: row.alerts.length > 0,
      match_score: score,
      fit: fitLabel(score),
      reasons: explain(row, f),
    };
  }
  const params = new URLSearchParams({
    budget: String(f.budget),
    sea_km: String(f.sea_km),
    min_sqm: String(f.min_sqm),
  });
  const response = await fetch("/api/properties/" + encodeURIComponent(id) + "?" + params.toString());
  if (!response.ok) throw new Error("Scheda non disponibile");
  return response.json();
}

async function openSheet(id, fromSearch = false) {
  const token = ++sheetRequest;
  selectedId = id;
  if (!fromSearch) draw();
  try {
    const row = await loadDetail(id, filters());
    if (token !== sheetRequest || selectedId !== id) return;
    if (!row) return;
    paintSheet(row);
    showError("");
  } catch (err) {
    if (token !== sheetRequest) return;
    showError(err.message);
  }
  if (!fromSearch) renderList(points);
}

function closeSheet(refresh = true) {
  selectedId = null;
  sheetRequest += 1;
  clearSheet();
  if (refresh) schedule();
  else {
    renderList(points);
    draw();
  }
}

async function runSearch() {
  const f = filters();
  const current = ++requestId;
  setSearching(true);
  try {
    let list;
    if (mode === "static") {
      list = rankLocal(f);
    } else {
      const params = new URLSearchParams({
        budget: String(f.budget),
        sea_km: String(f.sea_km),
        min_sqm: String(f.min_sqm),
        type: f.type,
        country: f.country,
      });
      const response = await fetch("/api/search?" + params.toString());
      if (!response.ok) throw new Error("Ricerca non disponibile");
      const data = await response.json();
      list = data.points;
    }
    if (current !== requestId) return;
    points = list;
    const count = list.length;
    document.getElementById("count").textContent = String(count);
    document.getElementById("countLabel").textContent = count === 1 ? "posto nel tuo ideale" : "posti nel tuo ideale";
    setSearching(false);
    showError("");
    const stillThere = selectedId && list.some((row) => row.id === selectedId);
    if (selectedId && !stillThere) {
      selectedId = null;
      sheetRequest += 1;
      clearSheet();
    }
    renderList(list);
    if (stillThere) await openSheet(selectedId, true);
    if (current !== requestId) return;
    draw();
  } catch (err) {
    if (current !== requestId) return;
    setSearching(false);
    document.getElementById("count").textContent = "—";
    document.getElementById("countLabel").textContent = "ricerca non riuscita";
    showError(err.message);
  }
}

function schedule() {
  paintLabels();
  setSearching(true);
  clearTimeout(timer);
  timer = setTimeout(runSearch, 180);
}

function selectChip(group, attr, value) {
  document.querySelectorAll(`#${group} button`).forEach((button) => {
    const on = button.dataset[attr] === value;
    button.classList.toggle("on", on);
    button.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

canvas.addEventListener("click", (ev) => {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const x = (ev.clientX - rect.left) * dpr;
  const y = (ev.clientY - rect.top) * dpr;
  let best = null;
  let bestDistance = Infinity;
  hits.forEach((hit) => {
    const distance = Math.hypot(hit.x - x, hit.y - y);
    if (distance <= hit.r && distance < bestDistance) {
      best = hit;
      bestDistance = distance;
    }
  });
  if (best) openSheet(best.id);
  else if (selectedId) closeSheet(false);
});

document.getElementById("results").addEventListener("click", (ev) => {
  const button = ev.target.closest(".result");
  if (button) openSheet(button.dataset.id);
});

["budget", "sea", "sqm"].forEach((id) => {
  document.getElementById(id).addEventListener("input", schedule);
});

document.getElementById("types").addEventListener("click", (ev) => {
  const button = ev.target.closest("button");
  if (!button) return;
  listingType = button.dataset.type;
  selectChip("types", "type", listingType);
  schedule();
});

document.getElementById("countries").addEventListener("click", (ev) => {
  const button = ev.target.closest("button");
  if (!button) return;
  country = button.dataset.country;
  selectChip("countries", "country", country);
  schedule();
});

document.getElementById("openInfo").addEventListener("click", () => {
  document.getElementById("info").showModal();
});

document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && selectedId && !document.getElementById("info").open) closeSheet(false);
});

window.addEventListener("resize", resize);
paintLabels();
resize();

if (mode === "static") {
  fetch("data.json")
    .then((response) => {
      if (!response.ok) throw new Error("Dati non disponibili");
      return response.json();
    })
    .then((rows) => {
      catalog = rows;
      runSearch();
    })
    .catch((err) => {
      document.getElementById("count").textContent = "—";
      document.getElementById("countLabel").textContent = "avvio non riuscito";
      showError(err.message);
    });
} else {
  runSearch();
}
