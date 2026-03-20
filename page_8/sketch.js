const N = 100; // number of points per figure
const length = 100;
const blobSize = 6;

let points1D = [];
let points2D = [];
let points3D = [];

let avg1D, avg2D, avg3D;

function generatePoints() {
  points1D = [];
  points2D = [];
  points3D = [];

  for (let i = 0; i < N; i++) {
    let p1D = createVector(random(-length, length), 0, 0); 
    points1D.push(p1D);
    
    let p2D = createVector(random(-length, length), random(-length, length), 0);
    points2D.push(p2D);

    let p3D = createVector(random(-length, length), random(-length, length), random(-length, length));
    points3D.push(p3D);
  }
}

function computeAverageDistance(points) {
  let total = 0;
  let count = 0;

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      let a = points[i];
      let b = points[j];

      let d = p5.Vector.dist(a, b);

      total += d;
      count++;
    }
  }

  return total / count;
}

function computeAverages() {
  avg1D = computeAverageDistance(points1D);
  avg2D = computeAverageDistance(points2D);
  avg3D = computeAverageDistance(points3D);
}

function drawPoints(points, title, avg) {
  noStroke();

  for (let p of points) {
    fill(192, 0, 0, 192);
    circle(p.x, p.y, blobSize);
  }

  fill(0);
  text(`${title}\nDist. Média: ${avg.toFixed(2)}`, 0, 120);
}

function drawPoints3D(points, title, avg) {
  noStroke();

  for (let p of points) {
    let scale = map(p.z, -length, length, 0.4, 1);
    let fade = p.z/length;
    fill(192, 0, 0, 128+64 * fade);
    circle(p.x * scale, p.y * scale, blobSize * scale);
  }

  fill(0);
  text(`${title}\nDist. Média: ${avg.toFixed(2)}`, 0, 120);
}

function reset() {
  generatePoints();
  computeAverages();
  redraw();
}

function setup() {
  p5Canvas = createCanvas(windowWidth, windowHeight);
  p5Canvas.parent("canvas-container");

  p5Canvas.position(0, 0);
  p5Canvas.style('z-index', '-1');
  p5Canvas.style('position', 'fixed');

  textAlign(CENTER, TOP);
  textSize(14);
  noLoop();

  document.addEventListener("keydown", e => {
    if (e.key === "ArrowUp") reset();
    if (e.key === "ArrowLeft") location.assign("../page_7/index.html");
    if (e.key === "ArrowRight") location.assign("../page_9/index.html");
    if (e.key.toLowerCase() === "h") {
      const overlay = document.getElementById("help-overlay");
      overlay.style.display = (overlay.style.display === "flex") ? "none" : "flex";
    }
  });
  
  document.getElementById("help-close").addEventListener("click", () => {
    document.getElementById("help-overlay").style.display = "none";
  });

  reset();
}

function draw() {
  background(240);
  
  push();
  translate(width * 0.17, height * 0.5);
  drawPoints(points1D, "1D", avg1D);
  pop();

  push();
  translate(width * 0.50, height * 0.5);
  drawPoints(points2D, "2D", avg2D);
  pop();

  push();
  translate(width * 0.83, height * 0.5);
  drawPoints3D(points3D, "3D", avg3D);
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  redraw();
}
