const fps = 20;
const ANIM_FRAMES = 12;

const inertiaData = [
  { k: 1, v: 312.95 },
  { k: 2, v: 108.07 },
  { k: 3, v: 39.52  },
  { k: 4, v: 17.98  },
  { k: 5, v: 15.05  },
  { k: 6, v: 11.52  },
  { k: 7, v: 9.08   },
  { k: 8, v: 8.02   },
  { k: 9, v: 7.02   },
];

let revealed = 0;
let animating = false;
let animT = 0;

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('canvas-container');
  canvas.position(0, 0);
  canvas.style('z-index', '-1');
  canvas.style('position', 'fixed');

  frameRate(fps);
  noLoop();

  document.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" && !animating && revealed < inertiaData.length) {
      animating = true;
      animT = 0;
      loop();
    }
    if (e.key === "ArrowUp") {
      revealed = 0;
      animating = false;
      animT = 0;
      noLoop();
      redraw();
    }
    if (e.key === "ArrowLeft")  location.assign("../page_10/index.html");
    if (e.key === "ArrowRight") location.assign("../page_11/index.html");
  });

  redraw();
}

function draw() {
  background(220, 220, 220);

  const PAD_L = 90, PAD_R = 60, PAD_T = 70, PAD_B = 70;
  const W = width  - PAD_L - PAD_R;
  const H = height - PAD_T  - PAD_B;
  const n = inertiaData.length;
  const maxV = inertiaData[0].v;

  function px(i) { return PAD_L + (i / (n - 1)) * W; }
  function py(v)  { return PAD_T + H - (v / maxV) * H; }

  // axes
  if (animating) {
    stroke(80);
    strokeWeight(2);
    line(PAD_L, PAD_T, PAD_L, PAD_T + H);
    line(PAD_L, PAD_T + H, PAD_L + W, PAD_T + H);

    // y grid + ticks
    const yTicks = 5;
    for (let t = 0; t <= yTicks; t++) {
      let v = (t / yTicks) * maxV;
      let y = py(v);
      stroke(200); strokeWeight(1);
      line(PAD_L, y, PAD_L + W, y);
      stroke(80); strokeWeight(2);
      line(PAD_L - 5, y, PAD_L, y);
      noStroke(); fill(60); textSize(13); textAlign(RIGHT, CENTER);
      text(nf(v, 0, 0), PAD_L - 8, y);
    }

    // x ticks
    for (let i = 0; i < n; i++) {
      let x = px(i);
      stroke(80); strokeWeight(2);
      line(x, PAD_T + H, x, PAD_T + H + 5);
      noStroke(); fill(60); textSize(13); textAlign(CENTER, TOP);
      text("K=" + inertiaData[i].k, x, PAD_T + H + 8);
    }

    // axis labels
    fill(40); noStroke(); textSize(14);
    textAlign(CENTER, BOTTOM);
    text("Número de clusters (K)", PAD_L + W / 2, height - 8);
    push();
    translate(18, PAD_T + H / 2);
    rotate(-HALF_PI);
    textAlign(CENTER, CENTER);
    text("Inércia", 0, 0);
    pop();
  }

  // line through revealed points
  const total = revealed + (animating ? animT : 0);
  stroke(0, 100, 200); strokeWeight(3); noFill();
  beginShape();
  for (let i = 0; i < min(floor(total) + 1, n); i++) {
    if (animating && i === revealed && i > 0) {
      let lx = lerp(px(i - 1), px(i), animT);
      let ly = lerp(py(inertiaData[i-1].v), py(inertiaData[i].v), animT);
      vertex(lx, ly);
    } else {
      vertex(px(i), py(inertiaData[i].v));
    }
  }
  endShape();

  // dots + labels for fully revealed points
  for (let i = 0; i < revealed; i++) {
    let x = px(i), y = py(inertiaData[i].v);
    let isElbow = inertiaData[i].k === 5;
    noStroke();
    fill(isElbow ? color(220, 50, 50) : color(0, 100, 200));
    circle(x, y, isElbow ? 16 : 11);
    fill(40); textSize(12); textAlign(CENTER, BOTTOM);
    text(nf(inertiaData[i].v, 0, 1), x, y - 8);
  }

  // advance animation
  if (animating) {
    animT += 1 / ANIM_FRAMES;
    if (animT >= 1) {
      revealed++;
      animating = false;
      noLoop();
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  redraw();
}
