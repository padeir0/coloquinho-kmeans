const fps = 20;
const circleSize = 20;
const numClusters = 20;

const minPointsPerCluster = 10;
const maxPointsPerCluster = 80;

const minInitialRadius = 10;
const maxInitialRadius = 50;

const maxRadius = maxInitialRadius+10;

const centerExclusionZoneRadius = 200;
const maxDistanceToCenter = centerExclusionZoneRadius + 300;

let clusters = [];

function randomOrthoPair(maxRadius) {
  let x = random(-maxRadius, maxRadius);
  let y = random(-maxRadius, maxRadius);
  let v1 = createVector(x, y);
  let v2 = createVector(-y, x);
  return {"axis1": v1, "axis2": v2}
}

function pointCloud(center, maxRadius, numPoints) {
  let pair = randomOrthoPair(maxRadius);
  out = [];
  for (let i = 0; i < numPoints; i++) {
    let p = center.copy()
    let a1 = randomGaussian(0, 1);
    let a2 = randomGaussian(0, 1);
    p.add(p5.Vector.mult(pair.axis1, a1))
     .add(p5.Vector.mult(pair.axis2, a2));
    out.push(p);
  }
  return out;
}

function randint(lower, upper) {
  return floor(random(lower, upper));
}

function goodPosition(p) {
  let windowCenter = createVector(width/2, height/2);
  let distToCenter = p5.Vector.dist(windowCenter, p);
  return distToCenter < centerExclusionZoneRadius ||
         distToCenter > maxDistanceToCenter ||
         p.x < 0 || p.x > width ||
         p.y < 0 || p.y > height;
}

function randomVecInCanvas() {
  let out = createVector(random(0, width), random(0, height));
  while (goodPosition(out)) {
    out = createVector(random(0, width), random(0, height));
  }
  return out;
}

class Cluster {
  constructor (center, numPoints, initialRadius) {
    this.center = center;
    this.points = pointCloud(center, initialRadius, numPoints);
    this.fade = max(0, 1 - (this.deviation() / maxRadius));
  }

  deviation() {
    let out = 0;
    for (let i = 0; i < this.points.length; i++) {
      out += p5.Vector.dist(this.center, this.points[i]);
    }
    return out/this.points.length;
  }
  
  draw() {
    for (let i = 0; i < this.points.length; i++) {
      let p = this.points[i];
      noStroke();
      fill(128, 0, 0, this.fade*240);
      circle(p.x, p.y, circleSize);
    }
  }
}

function newRandomCluster() {
  let center = randomVecInCanvas();
  let numPoints = randint(minPointsPerCluster, maxPointsPerCluster);
  let initialRadius = randint(minInitialRadius, maxInitialRadius);
  return new Cluster(center, numPoints, initialRadius);
}

function generateClusters() {
  clusters = [];
  for (let i = 0; i < numClusters; i++) {
    clusters.push(newRandomCluster());
  }
}

function generateAndRedraw() {
  generateClusters();
  redraw();
}

function setup() {
  p5Canvas = createCanvas(windowWidth, windowHeight);
  p5Canvas.parent("canvas-container");

  p5Canvas.position(0, 0);
  p5Canvas.style('z-index', '-1');
  p5Canvas.style('position', 'fixed');

  document.addEventListener("keydown", e => {
    if (e.key === "ArrowUp") generateAndRedraw();
    if (e.key === "ArrowLeft") location.assign("../page_0/index.html");
    if (e.key === "ArrowRight") location.assign("../page_2/index.html");
    if (e.key.toLowerCase() === "h") {
      const overlay = document.getElementById("help-overlay");
      overlay.style.display = (overlay.style.display === "flex") ? "none" : "flex";
    }
  });

  document.getElementById("help-close").addEventListener("click", () => {
    document.getElementById("help-overlay").style.display = "none";
  });

  frameRate(fps);
  generateClusters();
  noLoop();
}

function draw() {
  background(220);
  for (let i = 0; i < numClusters; i++) {
    clusters[i].draw();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generateAndRedraw();
}
