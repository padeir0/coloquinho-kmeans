const circleSize = 30;
const minClusterRadius = 30;
const maxClusterRadius = 50;
const minClusterPoints = 20;
const maxClusterPoints = 30;
const numClusters = 4;
const fps = 20;
const centerExclusionZoneRadius = 200;
const maxDistanceToCenter = centerExclusionZoneRadius + 50;

const defaultAlpha = 32;
const centroidAlpha = 250;

let pointsPerClick = 20;
const maxPerClick = 100;
const minPerClick = 1;

let brushSpread = 50;
const minSpread = 1;
const maxSpread = 200;

let isCentroid = false;

let step = 0;
let points = [];
let centroids = [];
let clusters = [];
let defaultColor;
let defaultCentroidColor;
let currentChoice = 0;

class Point {
  constructor (pos, color) {
    this.pos = pos;
    this.color = color;
  }
}

function star(x, y, r) {
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

function bottomText(txt) {
  push();
  textAlign(CENTER, BOTTOM);
  textSize(20);         // Adjust to your preference
  fill(0);              // Default text color
  noStroke();
  text(txt, width / 2, height); // 20px padding from bottom
  pop();
}

function withAlpha(c, a) {
  return color(red(c), green(c), blue(c), a);
}

function randint(lower, upper) {
  return floor(random(lower, upper));
}

function circularCloud(center, radius, numPoints) {
  const noise = 5;

  let minAngle = 0;
  let maxAngle = 2*PI;

  for (let i = 0; i < numPoints; i++) {
    let angle = random(minAngle, maxAngle);
    let r = radius + randomGaussian(0, noise);
    let x = center.x + r * cos(angle);
    let y = center.y + r * sin(angle);
    points.push(new Point(createVector(x, y), defaultColor));
  }
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

function drawCentroid(pos, color) {
  stroke(3);
  fill(withAlpha(color, centroidAlpha));
  star(pos.x, pos.y, circleSize*0.75);
}

function drawPoint(point) {
  noStroke();
  fill(point.color);
  circle(point.pos.x, point.pos.y, circleSize)
}

class Cluster {
  constructor (centroid, color) {
    this.centroid = centroid;
    this.centroidHistory = [centroid]
    this.points = [];
    this.color = color;
    centroid.color = this.color;
  }

  addPoint(point) {
    this.points.push(point);
    point.color = this.color;
  }

  updateCentroid(newPos) {
    this.centroidHistory.push(newPos);
    this.centroid = newPos;
  }

  draw() {
    drawCentroid(this.centroid, this.color);
    // draw centroid history
    for (let i = this.centroidHistory.length -1; 0 < i; i--) {
      let a = this.centroidHistory[i];
      let b = this.centroidHistory[i-1];
      line(a.x, a.y, b.x, b.y);
    }
  }

  clear() {
    this.points = [];
  }
}


function createClusters(centroids) {
  resetColorPicker();
  clusters = [];
  for (let i = 0; i < centroids.length; i++) {
    let cluster = new Cluster(centroids[i], pickColor());
    clusters.push(cluster);
  }
}

function clearClusters(clusters) {
  for (let i = 0; i < clusters.length; i++) {
    clusters[i].clear();
  }
}

function nearestPoint(a) {
  let nearest = null;
  let minDistance = null;
  for (let i = 0; i < points.length; i++) {
    let distance = a.dist(points[i].pos);
    if (minDistance == null || distance < minDistance) {
      minDistance = distance;
      nearest = points[i].pos;
    }
  }
  return nearest;
}

function medianPoint(points) {
  let avg = createVector(0, 0);
  for (let i = 0; i < points.length; i++) {
    avg.x += points[i].pos.x;
    avg.y += points[i].pos.y;
  }
  avg.x = avg.x/points.length;
  avg.y = avg.y/points.length;
  return avg;
}

// atribui cada ponto ao cluster com centróide mais perto
function assignPointsToCentroids() {
  clearClusters(clusters);

  for (let i = 0; i < points.length; i++) {
    let closest = null;
    let minDistance = null;
    let point = points[i].pos;
    for (let j = 0; j < clusters.length; j++) {
      let centroid = clusters[j].centroid;
      let distance = p5.Vector.dist(point, centroid);

      if (minDistance == null || distance < minDistance) {
        closest = clusters[j];
        minDistance = distance;
      }
    }
    closest.addPoint(points[i]);
  }
}

// atualiza o centroide de cada cluster
function updateClusterCentroids() {
  for (let i = 0; i < clusters.length; i++) {
    let pos;
    if (clusters[i].points.length > 0) {
      pos = medianPoint(clusters[i].points);
    } else {
      pos = nearestPoint(clusters[i].centroid, points);
    }
    clusters[i].updateCentroid(pos);
  }
}

function closeEnough(a, b) {
  return p5.Vector.dist(a, b) < 1;
}

function verifyTermination() {
  for (let i = 0; i < clusters.length; i++) {
    let cluster = clusters[i];
    if (cluster.centroidHistory.length > 1) {
      let a = cluster.centroidHistory[cluster.centroidHistory.length-1];
      let b = cluster.centroidHistory[cluster.centroidHistory.length-2];
      if (!closeEnough(a, b)) {
        return false; // algum cluster ainda pode aproximar mais.
      }
    } else {
      return false; // acabou de começar.
    }
  }
  return true;
}

function reset() {
  clusters = [];
  step = 0;
  redraw();
  for (let i = 0; i < points.length; i++) {
    let p = points[i];
    p.color = defaultColor;
  }
}

function clearCanvas() {
  points = [];
  centroids = [];
  reset();
}

function createCentroids() {
  createClusters(centroids);
}

function nextStep() {
  if (step == 0) {
    createCentroids();
    step = 1;
  } else if (step == 1) {
    assignPointsToCentroids();
    step = 2;
  } else if (step == 2) {
    updateClusterCentroids();
    step = 3;
  } else if (step == 3) {
    let finished = verifyTermination();
    if (finished) {
      step = 4;
    } else {
      step = 1;
    }
  } else if (step = 4) {
    // do nothing?
  }
  redraw();
}

function resetColorPicker() {
  currentChoice = 0;
}

function pickColor() {
  let c = colors[currentChoice];
  currentChoice = (currentChoice+1) % colors.length;
  return c;
}

function setup() {
  let p5Canvas = createCanvas(windowWidth, windowHeight);
  p5Canvas.parent('canvas-container');

  p5Canvas.position(0, 0);
  p5Canvas.style('z-index', '-1');
  p5Canvas.style('position', 'fixed');

  document.addEventListener("keydown", e => {
    if (e.key === "ArrowUp") reset();
    if (e.key === "ArrowDown") nextStep();
    if (e.key === "ArrowLeft") location.assign("../page_4/index.html");
    if (e.key === "ArrowRight") location.assign("../page_6/index.html");
    if (e.key.toLowerCase() === "h") {
      const overlay = document.getElementById("help-overlay");
      overlay.style.display = (overlay.style.display === "flex") ? "none" : "flex";
    }
    if (e.key.toLowerCase() === "c") {
      isCentroid = !isCentroid;
    }
    if (e.key.toLowerCase() === "l") {
      clearCanvas();
    }
    if (e.key.toLowerCase() === "w") {
      pointsPerClick = min(maxPerClick, pointsPerClick+1);
    }
    if (e.key.toLowerCase() === "s") {
      pointsPerClick = max(minPerClick, pointsPerClick-1);
    }
    if (e.key.toLowerCase() === "a") {
      brushSpread = max(minSpread, brushSpread-1);
    }
    if (e.key.toLowerCase() === "d") {
      brushSpread = min(maxSpread, brushSpread+1);
    }
  });
  
  document.getElementById("help-close").addEventListener("click", () => {
    document.getElementById("help-overlay").style.display = "none";
  });
  
  colors = [
    color(230, 25, 75, defaultAlpha),
    color(60, 180, 75, defaultAlpha),
    color(255, 225, 25, defaultAlpha),
    color(0, 130, 200, defaultAlpha),
    color(205, 130, 48, defaultAlpha),
    color(145, 30, 180, defaultAlpha),
    color(70, 200, 200, defaultAlpha),
    color(200, 50, 200, defaultAlpha),
    color(200, 205, 60, defaultAlpha),
    color(120, 120, 120, defaultAlpha)
  ];

  defaultColor = color(192, 0, 0, defaultAlpha);
  defaultCentroidColor = color(0, 0, 0);
  frameRate(fps);
  reset();
}

function draw() {
  background(220, 220, 220);
  for (let i = 0; i < points.length; i++) {
    let point = points[i];
    drawPoint(point);
  }
  for (let i = 0; i < centroids.length; i++) {
    let centroid = centroids[i];
    drawCentroid(centroid, defaultCentroidColor);
  }
  for (let i = 0; i < clusters.length; i++) {
    clusters[i].draw();
  }
  bottomText(`dados por clique: ${pointsPerClick}, tamanho do pincel: ${brushSpread}, centroid: ${isCentroid}\n`);
}

function windowResized() {
  let newWidth = windowWidth;
  let newHeight = windowHeight;
  resizeCanvas(newWidth, newHeight);
  redraw();
}

function clickHandler(mouseX, mouseY) {
  let pos = createVector(mouseX, mouseY)
  if (isCentroid) {
    // sempre queremos apenas um centroide.
    centroids.push(pos);
  } else {
    if (pointsPerClick == 1) {
      // queremos ser precisos nesse caso
      points.push(new Point(pos, defaultColor));
    } else {
      for (let i = 0; i < pointsPerClick; i++) {
        let r = createVector(random(-brushSpread, brushSpread), random(-brushSpread, brushSpread));
        let newPos = p5.Vector.add(pos, r);
        points.push(new Point(newPos, defaultColor));
      }
    }
  }
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 &&
         x <= width && y <= height;
}

function mousePressed() {
  if (inBounds(mouseX, mouseY)) {
    clickHandler(mouseX, mouseY);
  }
}

function touchStarted() {
  if (inBounds(mouseX, mouseY)) {
    clickHandler(mouseX, mouseY);
    return false;
  }
  return true;
}
