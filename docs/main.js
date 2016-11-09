var Display = (function() {
  var canvases = [];
  var sprites = {};
  var scale = 32;
  var size = [scale, scale * 3 / 4];
  var flashing = false;
  var element;
  function onresize() {
    // requestAnimationFrame(function() {
      var i = canvases.length, canvas;
      while (i--) {
        canvas = canvases[i];
        update(canvas);
      }
    // })
  }
  function update(canvas) {
    var force = false;
    var rect = canvas.parent.getBoundingClientRect();
    var w = Math.round(rect.width);
    var h = Math.round(rect.height);
    if (canvas.element.width !== w || canvas.element.height !== h) {
      canvas.element.width = w;
      canvas.element.height = h;
      canvas.rect = rect;
      force = true;
    }
    if (canvas.element.id === 'foreground')
      force = true;
    drawCanvas(canvas, force);
  }
  function getDrawBox(child) {
    var unit = child.parent.rect.width / scale;
    var x, y, w, h;

    x = child.pos [0] * unit;
    y = child.pos [1] * unit;
    if (child.size) {
      w = child.size[0] * unit;
      h = child.size[1] * unit;
    } else if (child.type === 'text') {
      w = ctx.measureText(child.content).width;
      h = unit * 2;
    }

    if (child.type === 'text' || child.type === 'sprite' || child.type === 'image' || child.type === 'rect' && child.centered) {
      x -= w / 2;
      y -= h / 2;
    }

    if (child.type === 'circle') {
      w *= 2;
      h *= 2;
      x -= w / 2;
      y -= h / 2;
    }

    return {
      pos:   [x, y],
      size:  [w, h],
      color: child.color
    }
  }
  function drawChild(child) {
    if (!flashing && child.visible) {
      var parent  = child.parent;
      var unit    = parent.rect.width / scale;
      var ctx     = parent.context;
      var child, color, gradient;
      var cx, cy, x, y, w, h, box = child.drawBox || getDrawBox(child);

      x = box.pos [0];
      y = box.pos [1];
      w = box.size[0];
      h = box.size[1];

      cx = x; // + w / 2
      cy = y; // + h / 2

      color = child.color;
      if (typeof color === 'object' && color !== null) {
        if (typeof w !== 'undefined' && typeof h !== 'undefined') {
          gradient = ctx.createLinearGradient(x, y, x, y + h);
          color.some(function(color, index) {
            gradient.addColorStop(index, color);
          });
          color = gradient;
        }
      }

      ctx.fillStyle = color;

      if (child.type === 'rect') {
        ctx.fillRect(x, y, w, h);
      } else if (child.type === 'circle') {
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, (w + h) / 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.closePath();
      } else if (child.type === 'text') {
        ctx.font = unit * 2 + 'px Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(child.content, cx, cy, w, h);
      } else if (child.type === 'sprite') {
        var image = sprites[child.id][color || 'colored'];
        var sw = image.height * w / h;
        var sh = image.height;
        var sx = sw * child.index;
        var sy = 0;
        ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
      } else if (child.type === 'image') {
        var image = sprites[child.id];
        var sw = image.height * w / h;
        var sh = image.height;
        var sx = sw * child.index;
        var sy = 0;
        ctx.drawImage(image, x, y, w, h);
      }
      child.drawnBox = {
        pos:  [x, y],
        size: [w, h],
        color: child.color
      };
    }
  }
  function eraseChild(child) {
    var box = child.drawnBox;
    var ctx;
    if (box) {
      ctx = child.parent.context;
      x = box.pos [0] - 1;
      y = box.pos [1] - 1;
      w = box.size[0] + 2;
      h = box.size[1] + 2;
      ctx.clearRect(x, y, w, h);
    }
  }
  function drawCanvas(canvas, force) {
    var i, imax = canvas.children.length;
    var dirty = [];
    var box;

    i = 0;
    while (i < imax) {
      child = canvas.children[i];
      box = child.drawBox = getDrawBox(child);

      if (force || !child.drawnBox ||
          Math.round(box.pos[0]) !== Math.round(child.drawnBox.pos[0]) || Math.round(box.pos[1]) !== Math.round(child.drawnBox.pos[1]) ||
          box.color !== child.drawnBox.color
        ) {
        eraseChild(child);
        dirty.push(child);
      }
      i++;
    }

    imax = dirty.length;
    i = 0;
    while (i < imax) {
      child = dirty[i];
      drawChild(child);
      i++;
    }
  }
  function getMethods() {
    var canvas = this;
    return {
      parent: canvas,
      update: function() {
        update(canvas, true);
      },
      rect: function(size, color) {
        if (typeof size === 'number') {
          size = [size, size];
        }
        return function drawRect(pos, centered) {
          if (typeof pos === 'number') {
            pos = [pos, pos];
          }
          var data = {
            type:     'rect',
            size:     size,
            color:    color,
            pos:      pos   || [0, 0],
            centered: !!centered,
            parent:   canvas,
            visible:  true
          };
          canvas.children.push(data);
          drawChild(data);
          return data
        }
      },
      circle: function(size, color) {
        var radius = size;
        if (typeof size === 'number') {
          size = [size, size];
        }
        return function drawCircle(pos) {
          if (typeof pos === 'number') {
            pos = [pos, pos];
          }
          var data = {
            type:   'circle',
            size:   size,
            radius: radius,
            color:  color,
            pos:    pos   || [0, 0],
            parent: canvas,
            visible:  true
          };
          canvas.children.push(data);
          drawChild(data);
          return data
        }
      },
      text: function(content, align, color) {
        return function drawText(pos) {
          if (typeof pos === 'number') {
            pos = [pos, pos];
          }
          var data = {
            type:    'text',
            content: content,
            align:   align || 'left',
            color:   color,
            pos:     pos   || [0, 0],
            parent:  canvas,
            visible:  true
          };
          canvas.children.push(data);
          drawChild(data);
          return data
        }
      },
      sprite: function(id, size, subSize) {
        if (typeof id === 'undefined' || !sprites[id]) {
          throw 'DisplayError: Sprite of id `' + id + '` was not loaded.'
        }
        if (typeof size === 'number') {
          size = [size, size];
        }
        return function drawSprite(pos) {
          if (typeof pos === 'number') {
            pos = [pos, pos];
          }
          var data = {
            type:   'sprite',
            id:     id,
            index:  0,
            size:   size,
            color:  null,
            pos:    pos ? [pos[0], pos[1]] : [0, 0],
            parent: canvas,
            visible:  true
          };
          canvas.children.push(data);
          drawChild(data);
          return data
        }
      },
      image: function(id, size) {
        if (typeof id === 'undefined' || !sprites[id]) {
          throw 'DisplayError: Sprite of id `' + id + '` was not loaded.'
        }
        if (typeof size === 'number') {
          size = [size, size];
        }
        return function drawImage(pos) {
          if (typeof pos === 'number') {
            pos = [pos, pos];
          }
          var data = {
            type:   'image',
            id:     id,
            index:  0,
            size:   size,
            pos:    pos ? [pos[0], pos[1]] : [0, 0],
            parent: canvas,
            visible:  true
          };
          canvas.children.push(data);
          drawChild(data);
          return data
        }
      },
      delete: function(child) {
        var index = canvas.children.indexOf(child);
        if (index !== -1)
          canvas.children.splice(index, 1);
        else
          console.log('Child was not found.');
        eraseChild(child);
        return index
      }
    }
  }
  return {
    size: size,
    scale: scale,
    init: function(parent) {
      var type = typeof parent;
      if (type === 'undefined') {
        parent = document.body;
      } else if (type === 'string') {
        parent = document.querySelector(parent);
      }
      init = true;
      element = document.createElement('div');
      element.id = 'display';
      element.style.position = 'absolute';
      element.style.left = '0';
      element.style.top = '0';
      element.style.width = '100%';
      element.style.height = '100%';
      element.style.overflow = 'hidden';
      parent.appendChild(element);
      window.addEventListener('load', onresize);
      window.addEventListener('resize', onresize);
    },
    load: function(list, callback) {
      if (typeof list === 'string') {
        list = [list];
      }
      var index = 0;
      function next() {
        var sprite = list[index];
        if (/.+\.(png|jpg|gif)/g.test(sprite)) {
          var image = new Image();
          image.src = 'sprites/' + sprite;
          image.onload = function() {
            sprites[sprite] = image;
            index++;
            if (index < list.length) {
              next();
            } else {
              callback && callback.call(window);
            }
          };
        } else {
          var ajax = new XMLHttpRequest();
          ajax.open("GET", "sprites/" + sprite + ".svg", true);
          ajax.send();
          ajax.onload = function(e) {
            var response = ajax.responseText;
            var colors = ['white', 'black'];
            var colorIndex = 0;
            var image = new Image();
            image.src = 'data:image/svg+xml;base64,' + window.btoa(response);
            image.onload = function() {
              sprites[sprite].colored = image;
            };
            sprites[sprite] = {};
            function colorNext() {
              var color = colors[colorIndex];
              var replaced = response.replace(/fill="[#\w\d\s]+"/g, 'fill="' + color + '"');
              var image = new Image();
              image.src = 'data:image/svg+xml;base64,' + window.btoa(replaced);
              image.onload = function() {
                sprites[sprite][color] = image;
                colorIndex++;
                if (colorIndex < colors.length) {
                  colorNext();
                } else {
                  index++;
                  if (index < list.length) {
                    next();
                  } else {
                    callback && callback.call(window);
                  }
                }
              };
            }
            colorNext();
          };
        }
      }
      next();
    },
    create: function(id) {
      if (!init) {
        throw 'DisplayError: Must initialize display with `Display.init` before calling other methods'
      }
      var object, canvas = document.createElement('canvas');
      id && (canvas.id = id);
      object = {
        id:       id || null,
        element:  canvas,
        context:  canvas.getContext('2d'),
        parent:   element,
        rect:     null,
        children: []
      };
      object.methods = getMethods.call(object);
      element.appendChild(canvas);
      canvases.push(object);
      update(object);
      return object.methods
    },
    flash: function(color) {
      flashing = true;
      var i = canvases.length, canvas;
      while (i--) {
        canvas = canvases[i];
        canvas.context.fillStyle = color || 'white';
        canvas.context.fillRect(0, 0, canvas.element.width, canvas.element.height);
      }
      requestAnimationFrame(function() {
        flashing = false;
        var i = canvases.length, canvas;
        while (i--) {
          canvas = canvases[i];
          canvas.context.clearRect(0, 0, canvas.element.width, canvas.element.height);
          drawCanvas(canvas, true);
        }
      });
    },
    shake: function() {
      var magnitude = 0.25;
      var direction = 1;
      var duration  = 0.25 * 60;
      var position  = 0;
      function shake() {
        element.style.top = (direction * magnitude) + '%';
        direction *= -1;
        if (position++ < duration) {
          requestAnimationFrame(shake);
        } else {
          element.style.top = '0';
        }
      }
      shake();
    }
  }
}());

var Input = (function() {
  var pressed  = {};
  var tapped   = {};
  var time     = {};
  var released = {};

  var element = document.body;
  var mousePos = null;

  var init = false;
  var looping = false;

  function handleInput(e) {
    var type, down, code;
    if (e.type === 'keydown' || e.type === 'keyup') {
      type = 'key';
      code = e.code;
      down = e.type === 'keydown';
    } else if (e.type === 'mousedown' || e.type === 'mouseup') {
      type = 'key';
      code = e.button === 0 ? 'MouseLeft' : e.button === 2 ? 'MouseRight' : null;
      down = e.type === 'mousedown';
    } else if (e.type === 'touchstart' || e.type === 'touchend') {
      type = 'key';
      code = 'MouseLeft';
      down = e.type === 'touchstart';
    }
    if (down) {
      if (!pressed[code]) {
        time[code] = 0;
        tapped[code] = true;
      }
    } else {
      if (pressed[code]) {
        time[code] = null;
        released[code] = true;
      }
    }
    pressed[code] = down;
  }

  return {
    mousePos: mousePos,
    pressed: pressed,
    tapped: tapped,
    time: time,
    released: released,
    init: function(parent) {
      var that = this;
      var type = typeof parent;
      if (type === 'undefined') {
        parent = element;
      } else  if (type === 'string') {
        parent = document.querySelector(parent);
      }
      element = parent;
      init = true;

      function mouseDown(e) {
        var rect = element.getBoundingClientRect();
        that.mousePos = that.mousePos || [0, 0];
        that.mousePos[0] = (e.pageX - rect.left) / rect.width;
        that.mousePos[1] = (e.pageY - rect.top)  / rect.height;
        e.preventDefault();
      }

      function mouseUp() {
        that.mousePos = null;
      }

      element.addEventListener(event,        handleInput);
      window.addEventListener('keydown',     handleInput);
      window.addEventListener('keyup',       handleInput);
      window.addEventListener('mousemove',  mouseDown);
      element.addEventListener('mousedown',  mouseDown);
      window.addEventListener('mouseup',    mouseUp);

      window.addEventListener('touchmove',  mouseDown);
      element.addEventListener('touchstart', mouseDown);
      window.addEventListener('touchend',   mouseUp);

      ['mousedown', 'mouseup', 'touchstart', 'touchend'].some(function(event) {
        element.addEventListener(event, handleInput);
      });
    },
    loop: function(callback) {
      if ( looping) throw 'InputError: `loop` function is already in progress.'
      if (!init) this.init();
      looping = true;
      function loop() {
        callback.call(window);
        requestAnimationFrame(function() {
          loop(callback);
        });
        // setTimeout(function() {
        //   loop(callback)
        // }, 1000)
        for (code in pressed)  if (pressed[code]) time[code]++;
        for (code in tapped)   tapped[code]   = false;
        for (code in released) released[code] = false;
      }
      loop();
    }
  }
}());

var Random = (function(){
  function get(min, max) {
    var a = arguments.length;
    if (a === 0) {
      return Math.random()
    } else if (a === 1) {
      max = min;
      min = 0;
    }
    if (min > max) {
      var $ = min;
      min = max;
      max = $;
    }
    return Math.floor(get() * (max - min)) + min
  }

  function choose(array) {
    var a = arguments.length;
    if (a === 0 || !array.length)
      array = [0, 1];
    return array[get(array.length)]
  }

  return {
    get: get,
    choose: choose
  }
}());

var Vector = {
  LEFT:       [-1, 0],
  RIGHT:      [ 1, 0],
  UP:         [ 0,-1],
  DOWN:       [ 0, 1],
  UP_LEFT:    [-1,-1],
  UP_RIGHT:   [ 1,-1],
  DOWN_LEFT:  [-1, 1],
  DOWN_RIGHT: [ 1, 1],
  add: function(a, b) {
    a[0] += b[0];
    a[1] += b[1];
    return a
  },
  added: function(a, b) {
    return [a[0] + b[0], a[1] + b[1]]
  },
  subtract: function(a, b) {
    a[0] -= b[0];
    a[1] -= b[1];
    return a
  },
  subtracted: function(a, b) {
    return [a[0] - b[0], a[1] - b[1]]
  },
  multiply: function(a, b) {
    a[0] *= b[0];
    a[1] *= b[1];
    return a
  },
  multiplied: function(a, b) {
    return [a[0] * b[0], a[1] * b[1]]
  },
  divide: function(a, b) {
    a[0] /= b[0];
    a[1] /= b[1];
    return a
  },
  divided: function(a, b) {
    return [a[0] / b[0], a[1] / b[1]]
  },
  round: function(vector) {
    vector[0] = Math.round(vector[0]);
    vector[1] = Math.round(vector[1]);
  },
  rounded: function(vector) {
    return [Math.round(vector[0]), Math.round(vector[1])]
  },
  invert: function(vector) {
    vector[0] *= -1;
    vector[1] *= -1;
    return vector
  },
  inverted: function(vector) {
    return [-vector[0], -vector[1]]
  },
  scale: function(vector, scalar) {
    vector[0] *= scalar;
    vector[1] *= scalar;
    return vector
  },
  scaled: function(vector, scalar) {
    return [vector[0] * scalar, vector[1] * scalar]
  },
  magnitude: function(vector) {
    return Math.sqrt(vector[0] * vector[0] + vector[1] * vector[1])
  },
  normalize: function(vector) {
    var magnitude = this.magnitude(vector);
    if (!magnitude) return [0, 0]
    vector[0] /= magnitude;
    vector[1] /= magnitude;
    return vector
  },
  normalized: function(vector) {
    var magnitude = this.magnitude(vector);
    if (!magnitude) return [0, 0]
    return this.scaled(vector, 1 / magnitude)
  },
  clone: function(vector) {
    return [vector[0], vector[1]]
  },
  fromDegrees: function(degrees) {
    var radians = (degrees - 90) * Math.PI / 180;
    return [Math.cos(radians), Math.sin(radians)]
  },
  toDegrees: function(vector) {
    var degrees = Math.atan2(vector[1], vector[0]) * 180 / Math.PI + 90;
    while (degrees < 0)
      degrees += 360;
    return degrees
  },
  getNormal: function(direction) {
    var n, t = typeof direction;
    if (t === 'number') {
      n = this.fromDegrees(direction);
    } else if (t === 'object') {
      n = this.normalized(direction);
    }
    return n
  },
  restrain: function(vector, size) {
    var l = 0;
    var t = 0;
    var w = size[0];
    var h = size[1];
    var r = l + w;
    var b = t + h;
    if (vector[0] < l) {
      vector[0] = l;
    }
    if (vector[1] < t) {
      vector[1] = t;
    }
    if (vector[0] > r) {
      vector[0] = r;
    }
    if (vector[1] > b) {
      vector[1] = b;
    }
    return vector
  }
};

var sprites = ['paddle', 'ball', 'block', 'impact', 'star', 'earth.gif', 'moon.gif', 'mars.gif'];

Display.init('#wrap');
var background = Display.create('background');
var foreground = Display.create('foreground');

background.rect(Display.size, ['#001', '#112'])();

function removeFromArray(array, item) {
  var index = array.indexOf(item);
  if (index !== -1) {
    array.splice(index, 1);
  }
}

function main() {
  var ball;
  var player;
  var Game = {
    entities: null,
    paddles: null,
    balls: null,
    blocks: null,
    bumpers: null,
    paused: false,
    stuttering: false,
    resetting: false,
    resetTimer: null,
    start: function() {
      this.entities = [];

      this.paddles = [];
      this.balls = [];
      this.blocks = [];
      this.bumpers = [];

      player = createPaddle();
      ball = createBall();
      for (var y = 0; y < 8; y++) {
        for (var x = 0; x < 6; x++) {
          createBlock([4 / 2 + 4 * (x + 1), 1 / 2 + 1 * (y + 1) + 3], Math.floor(y / 2));
        }
      }
      createBumper([Display.size[0] - 7, 16]);
    },
    stop: function() {
      var i = this.entities.length;
      while (i--) {
        this.entities[i].delete();
      }
      this.entities = [];
    },
    stutter: function() {
      this.stuttering = true;
    },
    reset: function(delay) {
      if (!this.resetting) {
        this.resetting = true;
        this.resetTimer = (delay || 0) * 60;
      }
    },
    loop: function() {
      if (!Game.paused) {
        if (!Game.stuttering) {
          if (Game.resetting) {
            if (!Game.resetTimer--) {
              Game.resetting = false;
              Game.stop();
              Game.start();
            }
          }
          var i = 0, imax = Game.entities.length, entity;
          while (i < imax) {
            entity = Game.entities[i++];
            entity && entity.update();
          }
          foreground.update();
        } else {
          Game.stuttering = false;
        }
      }
      if (Input.tapped.KeyP) {
        Game.paused = !Game.paused;
      }
    }
  };

  var Entity = {
    sprite: null,
    pos: null,
    size: 0,
    vel: [0, 0],
    dir: [0, 0],
    spd: 0,
    frc: 0,
    lifetime: 0,
    create: function(pos) {
      this.vel = [0, 0];
      this.pos = Vector.clone(pos) || this.pos;
      if (this.sprite) {
        this.sprite = this.sprite(this.pos, true);
      }
      this.lifetime = 0;
      Game.entities.push(this);
    },
    delete: function() {
      removeFromArray(Game.entities, this);
      foreground.delete(this.sprite);
    },
    update: function() {
      Vector.add(this.vel, Vector.scaled(this.dir, this.spd));
      Vector.add(this.pos, this.vel);
      Vector.scale(this.vel, this.frc);
      this.sprite.pos = this.pos;
      this.lifetime++;
    }
  };

  function createImpact(pos) {
    var size = 1;
    var impact = Object.assign(Object.create(Entity), {
      size: [size, size],
      sprite: foreground.sprite('impact', size),
      frames: 8,
      update: function() {
        if (++this.sprite.index > this.frames) {
          return this.delete()
        }
        Entity.update.call(this);
      }
    });
    pos = pos || [0, 0];
    impact.create(pos);
    return impact
  }

  function createStardust(pos, dir) {
    var size = 0.1;
    var stardust = Object.assign(Object.create(Entity), {
      size: [size, size],
      sprite: foreground.rect([size, size], 'white'),
      dir: Vector.UP,
      spd: 0.05,
      frc: 0.2,
      create: function(pos, dir) {
        Entity.create.call(this, pos);
        this.dir = Vector.clone(dir || this.dir);
        this.vel = Vector.scaled(this.dir, this.spd * 10);
      },
      update: function() {
        if (this.lifetime > 20 - Random.choose()) {
          this.sprite.visible = !this.sprite.visible;
        }
        if (this.lifetime > 30) {
          return this.delete()
        }
        Entity.update.call(this);
      }
    });
    pos = pos || [0, 0];
    stardust.create(pos, dir);
    return stardust
  }

  function createPowerup(pos) {
    var size = 1.5;
    var powerup = Object.assign(Object.create(Entity), {
      size: [size, size],
      sprite: foreground.sprite('star', size),
      trail: foreground.rect([size / 2, size * 2], ['rgba(0, 204, 255, 0)', 'dodgerblue']),
      dir: Vector.DOWN,
      spd: 0.05,
      frames: 12,
      frameDelay: 2,
      create: function(pos) {
        this.trail = this.trail(Vector.subtracted(pos, [0, this.size[1]]), true);
        Entity.create.call(this, pos);
        this.frameTimer = this.frameDelay;
      },
      update: function() {
        if (!--this.frameTimer) {
          this.frameTimer = this.frameDelay;
          if (++this.sprite.index >= this.frames) {
            this.sprite.index = 0;
          }
        }
        Entity.update.call(this);
        this.trail.pos = Vector.subtracted(this.pos, [0, this.size[1]]);
        var dust = createStardust([Random.get() * this.size[0] / 2 + this.pos[0] - this.size[0] / 4, this.pos[1]], Vector.fromDegrees(Random.get() * 20 - 10));
        dust.spd += Random.get(4) * 0.01;
        var paddle, i = Game.paddles.length;
        while (i--) {
          paddle = Game.paddles[i];
          if (this.pos[1] > paddle.pos[1] - paddle.size[1]) {
            var distance = Vector.magnitude(Vector.subtracted(this.pos, paddle.pos));
            if (distance < paddle.size[1] / 2) {
              var j = Random.get(10) + 10;
              while (j--) {
                var dust = createStardust([Random.get() * this.size[0] / 2 + this.pos[0] - this.size[0] / 4, this.pos[1]], Vector.fromDegrees(Random.get() * 360));
                dust.spd = Random.get(10) * 0.001 + 0.005;
              }
              this.delete();
              foreground.delete(this.trail);
            }
          }
        }
        if (this.pos[1] > Display.size[1] + 8) {
          this.delete();
          foreground.delete(this.trail);
        }
      }
    });
    pos = pos || [0, 0];
    powerup.create(pos);
    return powerup
  }

  function createBlock(pos, index) {
    var size = [4, 1];
    var block = Object.assign(Object.create(Entity), {
      size: size,
      sprite: foreground.sprite('block', size),
      create: function(pos) {
        Entity.create.call(this, pos);
        Game.blocks.push(this);
      },
      delete: function() {
        this.sprite.color = 'white';
        removeFromArray(Game.blocks, this);
        this.timer = 5;
      },
      update: function() {
        if (typeof this.timer !== 'undefined') {
          if (!this.timer--) {
            Entity.delete.call(this);
          }
        }
      }
    });
    pos = pos || Vector.scaled(Display.size, 0.5);
    block.create(pos);
    block.sprite.index = index || 0;
    return block
  }

  function createBall(pos) {
    var size = 1.07;
    var ball = Object.assign(Object.create(Entity), {
      size: [size, size],
      sprite: foreground.image('moon.gif', size),
      dir: Vector.DOWN,
      spd: 0.0075,
      frc: 1,
      launched: false,
      create: function(pos) {
        Entity.create.call(this, pos);
        Game.balls.push(this);
      },
      delete: function() {
        Entity.delete.call(this);
        removeFromArray(Game.balls, this);
      },
      stutter: function() {
        this.stuttering = true;
        this.stutterTimer = 2;
      },
      move: function(vel) {
        vel = vel || this.vel;
        if (vel[0])
          this.moveAxis([vel[0], 0]);
        if (vel[1])
          this.moveAxis([0, vel[1]]);
      },
      moveAxis: function(vel) {
        this.pos[0] += vel[0];
        this.pos[1] += vel[1];
        var block, i = Game.blocks.length;
        var l, t, r, b, hitbox;
        var bounce = 1;
        while (i--) {
          block = Game.blocks[i];
          l = block.pos[0] - block.size[0] / 2;
          t = block.pos[1] - block.size[1] / 2;
          r = block.pos[0] + block.size[0] / 2;
          b = block.pos[1] + block.size[1] / 2;
          if (this.pos[0] + this.size[0] / 2 > l && this.pos[1] + this.size[1] / 2 > t && this.pos[0] - this.size[0] / 2 < r && this.pos[1] - this.size[1] / 2 < b) {
            var x, y;
            if (vel[0] > 0) {
              this.pos[0] = l - this.size[0] / 2;
              this.vel[0] *= -bounce;
              x = l;
              y = this.pos[1];
            }
            if (vel[1] > 0) {
              this.pos[1] = t - this.size[1] / 2;
              this.vel[1] *= -bounce;
              x = this.pos[0];
              y = t;
            }
            if (vel[0] < 0) {
              this.pos[0] = r + this.size[0] / 2;
              this.vel[0] *= -bounce;
              x = r;
              y = this.pos[1];
            }
            if (vel[1] < 0) {
              this.pos[1] = b + this.size[1] / 2;
              this.vel[1] *= -bounce;
              x = this.pos[0];
              y = b;
            }
            if (Random.get() < 0.1) {
              createPowerup([x, y]);
            }
            createImpact([x, y]);
            block.delete();
            Display.shake();
            this.stutter();
          }
        }
      },
      update: function() {
        if (!this.stuttering) {
          Vector.add(this.vel, Vector.scaled(this.dir, this.spd));
          if (this.launched) {
            this.move();

            var circles = Game.paddles.concat(Game.bumpers);

            var circle, i = circles.length;
            var distanceMax, distanceVector, distanceScalar, distanceNormal;
            while (i--) {
              circle = circles[i];
              distanceMax = this.size[0] / 2 + circle.size[0] / 2;
              distanceVector = Vector.subtracted(this.pos, circle.pos);
              distanceScalar = Vector.magnitude(distanceVector);
              if (distanceScalar < distanceMax) {
                distanceNormal = Vector.getNormal(distanceVector);
                this.pos = Vector.added(circle.pos, Vector.scaled(distanceNormal, distanceMax));
                this.vel = Vector.scaled(distanceNormal, (circle.bounce || Vector.magnitude(this.vel)));
              }
            }

            var l = this.size[0] / 2;
            var r = Display.size[0] - this.size[0] / 2;
            var t = this.size[1] / 2;
            var b = Display.size[1] + this.size[1] / 2 + Display.size[1] / 4;
            if (this.pos[0] < l) {
              this.pos[0] = l;
              this.vel[0] *= -1;
            }
            if (this.pos[0] > r) {
              this.pos[0] = r;
              this.vel[0] *= -1;
            }
            if (this.pos[1] < t) {
              this.pos[1] = t;
              this.vel[1] *= -1;
            }
            if (this.pos[1] > b) {
              // Game.reset(1)
              this.delete();
              ball = createBall();
            }
          } else {
            this.pos = Vector.added(player.pos, [0, -player.size[1] / 2 - this.size[1] / 2]);
            if (Input.tapped.MouseLeft) {
              this.vel = Vector.scaled(Vector.UP, 0.2);
              this.launched = true;
            }
          }
          Vector.scale(this.vel, this.frc);
          this.sprite.pos = this.pos;
        } else {
          if (!this.stutterTimer--) {
            this.stuttering = false;
          }
        }
      }
    });
    pos = pos || Vector.added(player.pos, [0, -player.size[1] / 2 - size / 2]);
    ball.create(pos);
    return ball
  }

  function createBumper(pos) {
    var size = 2.08;
    var bumper = Object.assign(Object.create(Entity), {
      size: [size, size],
      sprite: foreground.image('mars.gif', size),
      dir: Vector.LEFT,
      spd: 0.0025,
      frc: 0.9999,
      create: function(pos) {
        Entity.create.call(this, pos);
        Game.bumpers.push(this);
      },
      delete: function() {
        Entity.delete.call(this);
        removeFromArray(Game.bumpers, this);
      },
      update: function() {
        Entity.update.call(this);
        if ((Display.size[0] / 2 - this.pos[0]) * this.dir[0] < 0) {
          this.dir[0] *= -1;
        }
      }
    });
    pos = pos || [0, 0];
    bumper.create(pos);
    return bumper
  }

  function createPaddle(pos) {
    var size = 4;
    var paddle = Object.assign(Object.create(Entity), {
      size: [size, size],
      sprite: foreground.image('earth.gif', size),
      bounce: 0.55,
      create: function(pos) {
        Entity.create.call(this, pos);
        Game.paddles.push(this);
      },
      delete: function() {
        Entity.delete.call(this);
        removeFromArray(Game.paddles, this);
      },
      update: function() {
        var target;
        if (Input.mousePos) {
          target = Vector.added(Vector.multiplied(Input.mousePos, [Display.size[0], 0]), [0, Display.size[1]]);
          this.vel = Vector.scaled(Vector.subtracted(target, this.pos), 0.25);
        }
        Entity.update.call(this);
        if (this.pos[0] < this.size[0] / 2)
          this.pos[0] = this.size[0] / 2;
        if (this.pos[0] > Display.size[0] - this.size[0] / 2)
          this.pos[0] = Display.size[0] - this.size[0] / 2;
        this.pos[1] = Display.size[1] - ((1 / 128) * Math.pow(this.pos[0] - Display.size[0] / 2, 2));
      }
    });
    pos = pos || [Display.size[0] / 2, Display.size[1]];
    paddle.create(pos);
    return paddle
  }

  Game.start();
  Input.init('#wrap');
  Input.loop(Game.loop);
}

Display.load(sprites, main);
