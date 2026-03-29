const G = 1;
const dt = 0.5;
const maxBlobSize = 100;
const minBlobSize = 30;
const maxBlobInitSpeed = 0.005;
const maxBlobs = 32;
const minDistance = 5;
const density = 3;
const fps = 20;

let blobs = [];
let leftRect = null;

let colors;
const defaultAlpha = 192;
let currentChoice = 0;

function withAlpha(c, a) {
  return color(red(c), green(c), blue(c), a);
}

function randint(min, max) {
  return floor(random(min, max));
}

function pointOutsideCanvas() {
  let choice = randint(0, 4);
  if (choice == 0) {        // top
    return createVector(random(0, windowWidth), -maxBlobSize);
  } else if (choice == 1) { // bottom
    return createVector(random(0, windowWidth), windowHeight+maxBlobSize);
  } else if (choice == 2) { // left
    return createVector(-maxBlobSize, random(0, windowHeight));
  } else {                  // right
    return createVector(windowWidth+maxBlobSize, random(0, windowHeight));
  }
}

class Rect {
  constructor(topLeft, bottomRight) {
    this.topLeft = topLeft;
    this.bottomRight = bottomRight;
  }

  height() {
    return this.bottomRight.y - this.topLeft.y;
  }

  width() {
    return this.bottomRight.x - this.topLeft.x;
  }

  draw() {
    fill(0,0,0,0);
    stroke(0);
    rect(this.topLeft.x, this.topLeft.y, this.width(), this.height());
  }
}

function setLeftRect() {
  let topLeft = createVector(windowWidth/4, windowHeight/3);
  let bottomRight = p5.Vector.add(topLeft, createVector(50, 50));
  leftRect = new Rect(topLeft, bottomRight);
}

function pointInRect(rect) {
  let width = rect.bottomRight.x - rect.topLeft.x;
  let height = rect.bottomRight.y - rect.topLeft.y;

  let h_width = width/2;
  let h_height = height/2;
  
  let centerX = rect.topLeft.x + h_width;
  let centerY = rect.topLeft.y + h_height;
  return createVector(centerX + random(-h_width, h_width),
                      centerY + random(-h_height, h_height));
}

class Blob {
  constructor(pos, vel, mass, color) {
    this.pos = pos;
    this.mass = mass;
    this.vel = vel;
    this.acel = createVector(0, 0);
    this.size = mass / density;
    this.color = withAlpha(color, defaultAlpha * (1 - this.size/maxBlobSize));
  }

  update_acel(blobs) {
    this.acel.x = 0;
    this.acel.y = 0;
    for (let i = 0; i < blobs.length; i++) {
      let other = blobs[i];
      if (other != this) {
        let offset = p5.Vector.sub(other.pos, this.pos);
        let dist = max(offset.mag(), minDistance);
        let a_inc = (G * other.mass) / (dist * dist);
        this.acel.add(offset.normalize().mult(a_inc));
      }
    }
  }

  update_state() {
    this.vel.add(p5.Vector.mult(this.acel, dt));
    this.pos.add(p5.Vector.mult(this.vel, dt));
  }

  draw() {
    fill(this.color);
    circle(this.pos.x, this.pos.y, this.size);
  }
}

function addBlob() {
  if (blobs.length < maxBlobs) {
    blobs.push(randomBlob());
  }
}

function outOfBounds(pos) {
  return pos.y < -3 * maxBlobSize ||
         pos.y > windowHeight + 3 * maxBlobSize ||
         pos.x > windowWidth  + 3 * maxBlobSize ||
         pos.x < -3 * maxBlobSize;
}

function randomBlob() {
  let position = pointOutsideCanvas();
  let target = pointInRect(leftRect);
  let velDir = p5.Vector.sub(target, position);
  let velocity = p5.Vector.mult(velDir, maxBlobInitSpeed);
  let mass = random(minBlobSize, maxBlobSize);
  let color = pickColor();
  return new Blob(position, velocity, mass, color);
}

function updateBlobs() {
  for (let i = 0; i < blobs.length; i++) {
    blobs[i].update_acel(blobs);
  }

  for (let i = 0; i < blobs.length; i++) {
    blobs[i].update_state();
    if (outOfBounds(blobs[i].pos)) {
      blobs[i] = randomBlob();
    }
  }
}

function drawBlobs() {
  for (let i = 0; i < blobs.length; i++) {
    blobs[i].draw();
  }
}

function resetColorPicker() {
  currentChoice = 0;
}

function pickColor() {
  let c = colors[currentChoice];
  currentChoice = (currentChoice+1) % colors.length;
  return c;
}

function debug() {
  console.log(blobs);
}

function setup() {
  p5Canvas = createCanvas(windowWidth, windowHeight);
  p5Canvas.parent("canvas-container");

  p5Canvas.position(0, 0);
  p5Canvas.style('z-index', '-1');
  p5Canvas.style('position', 'fixed');

  document.addEventListener("keydown", e => {
    if (e.key === "ArrowUp") debug();
    if (e.key === "ArrowLeft") location.assign("../page_11/index.html");
    if (e.key.toLowerCase() === "h") {
      const overlay = document.getElementById("help-overlay");
      overlay.style.display = (overlay.style.display === "flex") ? "none" : "flex";
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
  ];

  noStroke();
  setLeftRect();
  frameRate(fps);
}

function draw() {
  background(220);
  updateBlobs();
  drawBlobs();
  addBlob();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  setLeftRect();
}
