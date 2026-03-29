const K = 5;
const fps = 20;
const defaultAlpha = 170;
const CITY_RADIUS = 2.5;

let step = 0;
let codeLines;
let colors = [];
let cityAssignments = [];
let converged = false;
let loading = true;
let loadError = false;

let normalizedCities = [];

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = vals[i]?.trim());
    return obj;
  });
}

function buildNormalizedCities(municipios, climateRows) {
  const climateMap = {};
  for (const row of climateRows) {
    climateMap[parseInt(row.code_muni)] = {
      t: (parseFloat(row.tmax_mean) + parseFloat(row.tmin_mean)) / 2,
      r: parseFloat(row.pr_mean),
      h: parseFloat(row.rh_mean),
      s: parseFloat(row.rs_mean),
    };
  }

  const joined = municipios
    .map(c => {
      const climate = climateMap[parseInt(c.codigo_ibge)];
      if (!climate) return null;
      return {
        name: c.nome,
        uf:   c.uf,
        lat:  parseFloat(c.latitude),
        lon:  parseFloat(c.longitude),
        ...climate,
      };
    })
    .filter(c => c && !isNaN(c.lat) && !isNaN(c.lon)
                   && !isNaN(c.t) && !isNaN(c.r)
                   && !isNaN(c.h) && !isNaN(c.s));

  const keys = ['t', 'r', 'h', 's'];
  const mins = {}, maxs = {};
  keys.forEach(k => {
    mins[k] = Math.min(...joined.map(c => c[k]));
    maxs[k] = Math.max(...joined.map(c => c[k]));
  });
  return joined.map(c => {
    const norm = {};
    keys.forEach(k => norm[k] = (c[k] - mins[k]) / (maxs[k] - mins[k]));
    return { ...c, norm };
  });
}

let centroidVecs = [];

function featureVec(city) {
  return [city.norm.t, city.norm.r, city.norm.h, city.norm.s];
}

function euclidean(a, b) {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
}

function initCentroids() {
  centroidVecs = [];
  const n = normalizedCities.length;
  const seen = new Set();
  while (seen.size < K) seen.add(Math.floor(Math.random() * n));
  [...seen].forEach(i => centroidVecs.push([...featureVec(normalizedCities[i])]));
}

function assignClusters() {
  cityAssignments = normalizedCities.map(city => {
    const vec = featureVec(city);
    let best = 0, bestD = Infinity;
    centroidVecs.forEach((cv, k) => {
      const d = euclidean(vec, cv);
      if (d < bestD) { bestD = d; best = k; }
    });
    return best;
  });
}

function updateCentroids() {
  const newVecs = Array.from({ length: K }, () => [0, 0, 0, 0]);
  const counts  = Array(K).fill(0);
  normalizedCities.forEach((city, i) => {
    const k = cityAssignments[i];
    featureVec(city).forEach((v, d) => newVecs[k][d] += v);
    counts[k]++;
  });
  newVecs.forEach((vec, k) => {
    if (counts[k] > 0) vec.forEach((_, d) => vec[d] /= counts[k]);
  });
  let moved = false;
  for (let k = 0; k < K; k++) {
    if (euclidean(newVecs[k], centroidVecs[k]) > 0.001) moved = true;
    centroidVecs[k] = newVecs[k];
  }
  return !moved;
}

const MAP = { latMin: -33.8, latMax: 5.3, lonMin: -74.0, lonMax: -28.6 };

function project(lat, lon) {
  const size = min(width, height);
  const mx = size * 0.10;
  const my = size * 0.08;
  const mw = size - 2 * mx;
  const mh = size - 2 * my;
  return createVector(
    mx + ((lon - MAP.lonMin) / (MAP.lonMax - MAP.lonMin)) * mw,
    my + ((MAP.latMax - lat) / (MAP.latMax - MAP.latMin)) * mh
  );
}

function withAlpha(c, a) {
  return color(red(c), green(c), blue(c), a);
}

function drawCities() {
  noStroke();
  for (let i = 0; i < normalizedCities.length; i++) {
    const city = normalizedCities[i];
    const pos  = project(city.lat, city.lon);
    const k    = cityAssignments[i];
    let col;
    if (step === 0 || k === undefined) {
      col = color(130, 130, 130, 160);
    } else {
      col = withAlpha(colors[k % colors.length], defaultAlpha);
    }
    fill(col);
    ellipse(pos.x, pos.y, CITY_RADIUS * 2, CITY_RADIUS * 2);
  }
}

function star(x, y, r) {
  const npoints = 8, r1 = r / 2, r2 = r1 / 2;
  const angle = TWO_PI / npoints, half = angle / 2;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    vertex(x + cos(a) * r2,        y + sin(a) * r2);
    vertex(x + cos(a + half) * r1, y + sin(a + half) * r1);
  }
  endShape(CLOSE);
}

function drawLegend() {
  if (step < 2) return;
  const x = 18, startY = height - K * 24 - 16;
  textSize(11);
  noStroke();
  for (let k = 0; k < K; k++) {
    const y = startY + k * 24;
    fill(withAlpha(colors[k % colors.length], 230));
    ellipse(x + 7, y + 7, 14, 14);
    fill(50);
    textAlign(LEFT, CENTER);
    const count = cityAssignments.filter(a => a === k).length;
    text(`Cluster ${k + 1}  (${count} municípios)`, x + 18, y + 7);
  }
}

function drawStatus() {
  const labels = [
    `${normalizedCities.length} municípios carregados — pressione ↓ para iniciar`,
    'Centróides inicializados aleatoriamente',
    'Municípios atribuídos aos clusters',
    converged ? 'Convergiu ✓  — pressione ↓ para ver resultado' : 'Centróides recalculados',
    'Algoritmo convergiu ✓',
    'Resultado final',
  ];
  fill(60);
  noStroke();
  textSize(12);
  textAlign(RIGHT, BOTTOM);
  text(labels[Math.min(step, labels.length - 1)], width - 16, height - 16);
}

function drawLoadingScreen() {
  background(220, 220, 220);
  fill(80);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(18);
  if (loadError) {
    text('Erro ao carregar dados. Verifique os arquivos.', width / 2, height / 2);
  } else {
    text('Carregando municípios e dados climáticos…', width / 2, height / 2);
    textSize(12);
    fill(130);
    text('municipios.json + climate_2020.csv', width / 2, height / 2 + 28);
  }
}

const stepToLineMap = { 0:0, 1:2, 2:3, 3:4, 4:5, 5:6 };

function highlightStep(s) {
  if (!codeLines) return;
  codeLines.forEach(l => l.classList.remove('highlight'));
  const line = stepToLineMap[s];
  if (line !== undefined && line < codeLines.length)
    codeLines[line].classList.add('highlight');
}

function reset() {
  if (loading) return;
  step = 0;
  converged = false;
  centroidVecs = [];
  cityAssignments = [];
  highlightStep(0);
  redraw();
}

function nextStep() {
  if (loading) return;
  if (step === 0) {
    initCentroids();
    assignClusters();
    step = 1;
  } else if (step === 1) {
    assignClusters();
    step = 2;
  } else if (step === 2) {
    converged = updateCentroids();
    step = 3;
  } else if (step === 3) {
    if (converged) {
      step = 4;
    } else {
      assignClusters();
      step = 2;
    }
  } else if (step === 4) {
    step = 5;
  }
  highlightStep(step);
  redraw();
}

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('canvas-container');
  canvas.position(0, 0);
  canvas.style('z-index', '-1');
  canvas.style('position', 'fixed');

  codeLines = document.querySelectorAll('.code-line');

  colors = [
    color(220, 50,  50,  defaultAlpha),
    color(50,  160, 80,  defaultAlpha),
    color(50,  120, 220, defaultAlpha),
    color(230, 170, 30,  defaultAlpha),
    color(170, 60,  200, defaultAlpha),
  ];

  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp')    reset();
    if (e.key === 'ArrowDown')  nextStep();
    if (e.key === 'ArrowLeft')  location.assign('../page_0/index.html');
    if (e.key === 'ArrowRight') location.assign('../page_2/index.html');
    if (e.key.toLowerCase() === 'h') {
      const o = document.getElementById('help-overlay');
      o.style.display = (o.style.display === 'flex') ? 'none' : 'flex';
    }
  });

  document.getElementById('help-close').addEventListener('click', () => {
    document.getElementById('help-overlay').style.display = 'none';
  });

  noLoop();
  frameRate(fps);
  highlightStep(0);

  Promise.all([
    fetch('./municipios.json').then(r => { if (!r.ok) throw new Error('municipios.json: HTTP ' + r.status); return r.json(); }),
    fetch('./climate_2020.csv').then(r => { if (!r.ok) throw new Error('climate_2020.csv: HTTP ' + r.status); return r.text(); }),
  ])
  .then(([municipios, csvText]) => {
    const climateRows = parseCSV(csvText);
    normalizedCities = buildNormalizedCities(municipios, climateRows);
    loading = false;
    highlightStep(0);
    redraw();
  })
  .catch(err => {
    console.error('Failed to load data:', err);
    loadError = true;
    redraw();
  });
}

function draw() {
  if (loading) {
    drawLoadingScreen();
    return;
  }
  background(220, 220, 220);
  drawCities();
  drawLegend();
  drawStatus();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  redraw();
}
