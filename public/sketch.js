var socket = io();
var words = [];

socket.on('connect', function() {
  console.log("Connected");
});

// from: https://socket.io/get-started/chat/#Emitting-events
$(function() {
  $('form').submit(function() {
    socket.emit('message', $('#m').val());
    $('#m').val('');
    return false;
  });
});

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  flock = new Flock();

  socket.on('message', function(string) {
    words.push(string);
  });

  socket.on('disconnected', function(id) {
    delete users[id];
  });
}

function draw() {
  background(255);
  flock.run();

  if (words.length > 0) {
    for (let i = 0; i < words.length; i++) {
      let text = words[i];
      // let length = text.length; // use this for something?
      var b = new Woid(width / 2, height / 2, text);
      flock.addWoid(b);
      words.splice(0);
    }
  }
}

// Flocking Simulation from Daniel Shiffman,
// The Nature of Code: http://natureofcode.com
// code below from: https://p5js.org/examples/simulate-flocking.html
// more recent Dec 2018: https://www.youtube.com/watch?v=mhjuuHl6qHM
// see also: https://www.youtube.com/watch?v=IoKfQrlQ7rA

// Flock object manages the array of all the woids
function Flock() {
  // An array for all the woids
  this.woids = []; // Initialize the array
}

Flock.prototype.run = function() {
  for (var i = 0; i < this.woids.length; i++) {
    this.woids[i].run(this.woids); // Passing the entire list of woids to each woid individually
  }
}

Flock.prototype.addWoid = function(b) {
  this.woids.push(b);
}

// Woid class
// Methods for Separation, Cohesion, Alignment added
function Woid(x, y, string) {
  this.acceleration = createVector(1, 1);
  this.velocity = createVector(random(-1, 1), random(-1, 1));
  this.position = createVector(x, y);
  this.r = 3.0;
  this.maxspeed = 3.0;
  this.maxforce = 0.05; // Maximum steering force
  this.string = string;
  this.size = 36;
  this.timeCheck = millis();
}

Woid.prototype.run = function(woids) {
  this.flock(woids);
  this.update();
  this.borders();
  this.render();
  this.fontsize();
}

Woid.prototype.applyForce = function(force) {
  // We could add mass here if we want A = F / M
  this.acceleration.add(force);
}

// We accumulate a new acceleration each time based on three rules
Woid.prototype.flock = function(woids) {
  var sep = this.separate(woids); // Separation
  var ali = this.align(woids); // Alignment
  var coh = this.cohesion(woids); // Cohesion
  // Arbitrarily weight these forces
  sep.mult(1.5);
  ali.mult(1.0);
  coh.mult(1.0);
  // Add the force vectors to acceleration
  this.applyForce(sep);
  this.applyForce(ali);
  this.applyForce(coh);
}

// Method to update location
Woid.prototype.update = function() {
  // Update velocity
  this.velocity.add(this.acceleration);
  // Limit speed
  this.velocity.limit(this.maxspeed);
  this.position.add(this.velocity);
  // Reset accelertion to 0 each cycle
  this.acceleration.mult(0);
}

// A method that calculates and applies a steering force towards a target
// STEER = DESIRED MINUS VELOCITY
Woid.prototype.seek = function(target) {
  var desired = p5.Vector.sub(target, this.position); // A vector pointing from the location to the target
  // Normalize desired and scale to maximum speed
  desired.normalize();
  desired.mult(this.maxspeed);
  // Steering = Desired minus Velocity
  var steer = p5.Vector.sub(desired, this.velocity);
  steer.limit(this.maxforce); // Limit to maximum steering force
  return steer;
}

Woid.prototype.render = function() {
  // Draw a woid rotated in the direction of velocity
  var theta = this.velocity.heading() + radians(90);
  push();
  translate(this.position.x, this.position.y);
  rotate(theta);
  textAlign(CENTER);
  textSize(this.size);
  text(this.string, this.r, this.r * 2);
  pop();
}

// Wraparound
Woid.prototype.borders = function() {
  if (this.position.x < -this.r) this.position.x = width + this.r;
  if (this.position.y < -this.r) this.position.y = height + this.r;
  if (this.position.x > width + this.r) this.position.x = -this.r;
  if (this.position.y > height + this.r) this.position.y = -this.r;
}

Woid.prototype.fontsize = function() {
  var passedTime = millis() - this.timeCheck;
  if (passedTime > 250 && this.size > 6) {
    this.size-= 0.1;
    this.timeCheck = millis();
  } else if (this.size == 6) {
    this.size = 6;
  }
}

// Separation
// Method checks for nearby woids and steers away
Woid.prototype.separate = function(woids) {
  var desiredseparation = 30.0;
  var steer = createVector(0, 0);
  var count = 0;
  // For every woid in the system, check if it's too close
  for (var i = 0; i < woids.length; i++) {
    var d = p5.Vector.dist(this.position, woids[i].position);
    // If the distance is greater than 0 and less than an arbitrary amount (0 when you are yourself)
    if ((d > 0) && (d < desiredseparation)) {
      // Calculate vector pointing away from neighbor
      var diff = p5.Vector.sub(this.position, woids[i].position);
      diff.normalize();
      diff.div(d); // Weight by distance
      steer.add(diff);
      count++; // Keep track of how many
    }
  }
  // Average -- divide by how many
  if (count > 0) {
    steer.div(count);
  }

  // As long as the vector is greater than 0
  if (steer.mag() > 0) {
    // Implement Reynolds: Steering = Desired - Velocity
    steer.normalize();
    steer.mult(this.maxspeed);
    steer.sub(this.velocity);
    steer.limit(this.maxforce);
  }
  return steer;
}

// Alignment
// For every nearby woid in the system, calculate the average velocity
Woid.prototype.align = function(woids) {
  var neighbordist = 50;
  var sum = createVector(0, 0);
  var count = 0;
  for (var i = 0; i < woids.length; i++) {
    var d = p5.Vector.dist(this.position, woids[i].position);
    if ((d > 0) && (d < neighbordist)) {
      sum.add(woids[i].velocity);
      count++;
    }
  }
  if (count > 0) {
    sum.div(count);
    sum.normalize();
    sum.mult(this.maxspeed);
    var steer = p5.Vector.sub(sum, this.velocity);
    steer.limit(this.maxforce);
    return steer;
  } else {
    return createVector(0, 0);
  }
}

// Cohesion
// For the average location (i.e. center) of all nearby woids, calculate steering vector towards that location
Woid.prototype.cohesion = function(woids) {
  var neighbordist = 50;
  var sum = createVector(0, 0); // Start with empty vector to accumulate all locations
  var count = 0;
  for (var i = 0; i < woids.length; i++) {
    var d = p5.Vector.dist(this.position, woids[i].position);
    if ((d > 0) && (d < neighbordist)) {
      sum.add(woids[i].position); // Add location
      count++;
    }
  }
  if (count > 0) {
    sum.div(count);
    return this.seek(sum); // Steer towards the location
  } else {
    return createVector(0, 0);
  }
}
