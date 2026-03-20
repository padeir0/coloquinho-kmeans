const fps = 20;
const period = 5;
const circleSize = 5;
const accelerationFactor = 0.001;

const minPointsPerCluster = 5;
const maxPointsPerCluster = 50;

const minInitialRadius = 5;
const maxInitialRadius = 50;

const maxFade = 0.99;
const maxRadius = 200;

const minSpeed = -1;
const maxSpeed = -0.9;

const centerExclusionZoneRadius = 200;
const maxDistanceToCenter = centerExclusionZoneRadius + 50;

let clusters = [];

function randint(lower, upper) {
  return floor(random(lower, upper));
}

function goodPosition(p) {
  let windowCenter = createVector(width/2, height/2);
  let distToCenter = p5.Vector.dist(windowCenter, p);
  return distToCenter < centerExclusionZoneRadius ||
         distToCenter > maxDistanceToCenter;
}

function randomVecInCanvas() {
  let out = createVector(random(0, width), random(0, height));
  while (goodPosition(out)) {
    out = createVector(random(0, width), random(0, height));
  }
  return out;
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

function paintBlob(p, fade) {
  noStroke();
  fill(128, 0, 0, fade*240);
  circle(p.x, p.y, circleSize);
}

class Cluster {
  constructor (center, numPoints, initialRadius, speed) {
    this.center = center;
    this.speed = speed;
    this.points = pointCloud(center, initialRadius, numPoints);
    this.alivePoints = this.points.length;
    this.initialRadius = initialRadius;
  }

  pushLast(i) {
    if (this.alivePoints == 0) {
      return;
    }
    let lastIndex = this.alivePoints-1;
    this.points[i] = this.points[lastIndex];
    this.alivePoints--;
  }

  update() {
    if (this.isDead()) {
      return;
    }
    for (let i = 0; i < this.alivePoints; i++) {
      let p = this.points[i];
      let velVec = p5.Vector.sub(p, this.center).normalize().mult(this.speed);
      p.add(velVec);
      if (p5.Vector.dist(this.center, p) < 1) {
        this.pushLast(i);
      }
    }
    this.speed += accelerationFactor * this.speed;
    this.fade = max(0, 1 - (this.deviation() / this.initialRadius));
  }

  deviation() {
    let out = 0;
    for (let i = 0; i < this.points.length; i++) {
      out += p5.Vector.dist(this.center, this.points[i]);
    }
    return out/this.points.length;
  }

  draw() {
    if (this.isDead()) {
      paintBlob(this.center, 1);
    } else {
      for (let i = 0; i < this.points.length; i++) {
        let p = this.points[i];
        paintBlob(p, this.fade);
      }
    }
  }

  isDead() {
    return this.alivePoints == 0;
  }
}

function newRandomCluster() {
  let center = randomVecInCanvas();
  let numPoints = randint(minPointsPerCluster, maxPointsPerCluster);
  let initialRadius = randint(minInitialRadius, maxInitialRadius);
  let speed = random(minSpeed, maxSpeed);
  return new Cluster(center, numPoints, initialRadius, speed);
}

function printClusters() {
  for (let i = 0; i < clusters.length; i++) {
    let c = clusters[i];
    console.log(c);
  }
}

function setup() {
  p5Canvas = createCanvas(windowWidth, windowHeight);
  p5Canvas.parent("canvas-container");

  p5Canvas.position(0, 0);
  p5Canvas.style('z-index', '-1');
  p5Canvas.style('position', 'fixed');

  document.addEventListener("keydown", e => {
    if (e.key === "ArrowUp") printClusters();
    if (e.key === "ArrowRight") location.assign("../page_1/index.html");
    if (e.key.toLowerCase() === "h") {
      const overlay = document.getElementById("help-overlay");
      overlay.style.display = (overlay.style.display === "flex") ? "none" : "flex";
    }
  });

  document.getElementById("help-close").addEventListener("click", () => {
    document.getElementById("help-overlay").style.display = "none";
  });

  background(220);
  frameRate(fps);
}

let frames = 0;
function draw() {
  background(220);
  for (let i = 0; i < clusters.length; i++) {
    clusters[i].update();
  }
  for (let i = 0; i < clusters.length; i++) {
    clusters[i].draw();
  }
  if (frames % period == 0) {
    clusters.push(newRandomCluster());
  }
  frames++;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
