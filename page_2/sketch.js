const fps = 1;
const circleSize = 20;
const numClusters = 5;

const minPointsPerCluster = 10;
const maxPointsPerCluster = 20;

const minInitialRadius = 30;
const maxInitialRadius = 50;

const maxRadius = maxInitialRadius;

const centerExclusionZoneRadius = 500;
const maxDistanceToCenter = centerExclusionZoneRadius + 50;

let clusters = [];

function star(p, r) {
  let x = p.x;
  let y = p.y;
  const npoints = 8;
  const radius1 = r/2;
  const radius2 = radius1 / 2;
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius1;
    sy = y + sin(a + halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

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

// TODO: fix this mess, take the center of the screen and apply a
// random angle to it plus some offset noise.
function randomVecInCanvas() {
  let out = createVector(random(0, width), random(0, height));
  let i = 0;
  while (goodPosition(out) && i < 20) {
    out = createVector(random(0, width), random(0, height));
    i++;
  }
  return out;
}

class Cluster {
  constructor (center, numPoints, initialRadius) {
    this.center = center;
    this.points = pointCloud(center, initialRadius, numPoints);
    this.centroid = this.findCentroid();
    this.fade = max(0.1, 1 - (this.deviation() / maxRadius));
  }

  deviation() {
    let out = 0;
    for (let i = 0; i < this.points.length; i++) {
      out += p5.Vector.dist(this.center, this.points[i]);
    }
    return out/this.points.length;
  }

  findCentroid() {
    let out = createVector(0, 0);
    for (let i = 0; i < this.points.length; i++) {
      let p = this.points[i];
      out.add(p);
    }
    out.mult(1.0 / this.points.length);
    return out;
  }

  draw() {
    for (let i = 0; i < this.points.length; i++) {
      let p = this.points[i];
      noStroke();
      fill(128, 0, 0, this.fade*192);
      circle(p.x, p.y, circleSize);
    }
    fill(0, 0, 128);
    star(this.centroid, circleSize);
    fill(128, 0, 0, this.fade*192);
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

  frameRate(fps);
  generateClusters();

  document.addEventListener("keydown", e => {
    if (e.key === "ArrowUp") generateAndRedraw();
    if (e.key === "ArrowLeft") location.assign("../page_1/index.html");
    if (e.key === "ArrowRight") location.assign("../page_3/index.html");
    if (e.key.toLowerCase() === "h") {
      const overlay = document.getElementById("help-overlay");
      overlay.style.display = (overlay.style.display === "flex") ? "none" : "flex";
    }
  });

  document.getElementById("help-close").addEventListener("click", () => {
    document.getElementById("help-overlay").style.display = "none";
  });

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
  generateClusters();
}
