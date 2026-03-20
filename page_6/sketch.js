let img;
let p5Canvas;
let context;
let numColors = 2;
let fps = 15;
let lastKeyTime = 0;
const KEY_DELAY = 500;

function bottomText(txt) {
  push();
  textAlign(CENTER, BOTTOM);
  textSize(20);         // Adjust to your preference
  fill(0);              // Default text color
  noStroke();
  text(txt, width / 2, height); // 20px padding from bottom
  pop();
}

function fitImageToCanvas(img) {
  let imgAspect = img.width / img.height;
  let canvasAspect = width / height;
  let drawWidth, drawHeight;

  if (imgAspect > canvasAspect) {
    // image is wider relative to canvas
    drawWidth = width;
    drawHeight = width / imgAspect;
  } else {
    // image is taller relative to canvas
    drawHeight = height;
    drawWidth = height * imgAspect;
  }

  let x = (width - drawWidth) / 2;
  let y = (height - drawHeight) / 2;
  image(img, x, y, drawWidth, drawHeight);
}

function runBtnHandler() {
  if (isRunning) {
    context = undefined;
  } else {
  }
  isRunning = !isRunning;
}

function pixelDistanceSq(r, g, b, centroid) {
  let x = centroid[0] - r;
  let y = centroid[1] - g;
  let z = centroid[2] - b;
  return x*x + y*y + z*z;
}

function pixelDistance(a, b) {
  let x = b[0] - a[0];
  let y = b[1] - a[1];
  let z = b[2] - a[2];
  return Math.sqrt(x*x + y*y + z*z);
}

function randint(lower, upper) {
  return floor(random(lower, upper));
}

function farEnough(centroids, newCentroid) {
  for (let i = 0; i < centroids.length; i++) {
    let a = centroids[i];
    if (pixelDistance(a, newCentroid) <= 32) {
      return false;
    }
  }
  return true;
}

function initCentroids(pixels, numCentroids) {
  let centroids = [];
  for (let i = 0; i < numCentroids; i++) {
    let centroid = randomCentroid(pixels, centroids);
    centroids.push(centroid);
  }

  return centroids;
}

function randomCentroid(pixels, centroids) {
  const numAttempts = 3
  let centroid;
  for (let j = 0; j < numAttempts; j++) {
    let k = randint(0, pixels.length/4);
    let r = pixels[4*k];
    let g = pixels[4*k + 1];
    let b = pixels[4*k + 2];

    centroid = [r, g, b];
    if (farEnough(centroids, centroid)) {
      return centroid;
    }
  }
  return centroid; // give up
}

const MAXDIST = 3*255*255 + 1;

function updateCentroids() {
  function mapper(x) {
    return {"sum": [0,0,0], "totalElements": 0};
  }
  let centroidAvg = context.centroids.map(mapper);

  const dataLen = context.data.length/4;
  const cenLen = context.centroids.length
  for (let i = 0; i < dataLen; i++) {
    let closest = null;
    let minDistanceSq = MAXDIST;
    const r = context.data[4*i];
    const g = context.data[4*i + 1];
    const b = context.data[4*i + 2];
    for (let j = 0; j < cenLen; j++) {
      const centroid = context.centroids[j];
      const x = centroid[0] - r;
      const y = centroid[1] - g;
      const z = centroid[2] - b;
      const distanceSq =  x*x + y*y + z*z;
      if (distanceSq < minDistanceSq) {
        closest = j;
        minDistanceSq = distanceSq;
      }
    }
    context.labels[i] = closest;
    let sum = centroidAvg[closest].sum
    sum[0] += r;
    sum[1] += g;
    sum[2] += b;
    centroidAvg[closest].totalElements += 1;
  }

  let newCentroids = [];
  for (let i = 0; i < centroidAvg.length; i++) {
    const sum = centroidAvg[i].sum;
    const total = centroidAvg[i].totalElements;
    let centroid;
    if (total < 10) {
      centroid = randomCentroid(context.data, newCentroids);
    } else {
      centroid = [
        sum[0]/total,
        sum[1]/total,
        sum[2]/total,
      ];
    }
    newCentroids.push(centroid);
  }

  return newCentroids;
}

function reduceColors() {
  let newCentroids = updateCentroids();
  for (let i = 0; i < context.labels.length; i++) {
    let color = context.centroids[context.labels[i]];
    pixels[i*4]     = color[0];
    pixels[i*4 + 1] = color[1];
    pixels[i*4 + 2] = color[2];
  }

  let loop = false;
  for (let i = 0; i < newCentroids.length; i++) {
    let d = pixelDistance(context.centroids[i], newCentroids[i]);
    if (d > 1) {
      loop = true;
      break;
    }
  }

  context.centroids = newCentroids;
  context.loop = loop;
  return;
}

function reset() {
  if (img) {
    fitImageToCanvas(img);
    loadPixels();
    redraw();
    context = undefined;
    let labels = []
    for (let i = 0; i < pixels.length/4; i++) {
      labels.push(0);
    }
    context = {
      centroids: initCentroids(pixels, numColors),
      data: new Uint8ClampedArray(pixels),
      loop: true,
      labels: labels,
    };
  }
}

function nextStep() {
  if (context && context.loop) {
    reduceColors();
    redraw();
  }
}

function setup() {
  p5Canvas = createCanvas(windowWidth, windowHeight);
  p5Canvas.parent("canvas-container");

  p5Canvas.position(0, 0);
  p5Canvas.style('z-index', '-1');
  p5Canvas.style('position', 'fixed');

  background(220);
  frameRate(fps);
  noLoop();

  let uploadInput = document.getElementById("hidden-upload");
  uploadInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) {
      background(220);
      img = loadImage(URL.createObjectURL(file));
      fitImageToCanvas(img);
      loadPixels();
      updatePixels();
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "ArrowUp") reset();
    if (e.key === "ArrowDown") {
      const now = Date.now();
      if (now - lastKeyTime < KEY_DELAY) {
        return; // Too soon → ignore this key press
      }
      lastKeyTime = now;
      nextStep()
    };
    if (e.key === "ArrowLeft") location.assign("../page_5/index.html");
    if (e.key === "ArrowRight") location.assign("../page_7/index.html");
    if (e.key.toLowerCase() === "h") {
      const overlay = document.getElementById("help-overlay");
      overlay.style.display = (overlay.style.display === "flex") ? "none" : "flex";
    }
    if (e.key.toLowerCase() === "u") {
      e.preventDefault();
      uploadInput.click();
    }
    if (e.key.toLowerCase() === "w") {
      numColors = min(16, numColors+1);
      redraw();
    }
    if (e.key.toLowerCase() === "s") {
      numColors = max(2, numColors-1);
      redraw();
    }
  });
  
  document.getElementById("help-close").addEventListener("click", () => {
    document.getElementById("help-overlay").style.display = "none";
  });
}

function draw() {
  background(220, 220, 220);
  updatePixels();
  bottomText(`número de cores: ${numColors}`);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  redraw();
}
