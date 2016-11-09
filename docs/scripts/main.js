import Display from './display'
import Input from './input'
import Random from './random'
import Vector from './vector'
import Rect from './rect'

var sprites = ['paddle', 'ball', 'block', 'impact', 'star', 'earth.gif', 'moon.gif', 'mars.gif']

Display.init('#wrap')
var background = Display.create('background')
var foreground = Display.create('foreground')

background.rect(Display.size, ['#001', '#112'])()

function removeFromArray(array, item) {
  var index = array.indexOf(item)
  if (index !== -1) {
    array.splice(index, 1)
  }
}

function main() {
  var ball
  var player
  var Game = (function() {
    var drawnScore = 0
    var Game = {
      score: 0,
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
        Game.entities = []

        Game.paddles = []
        Game.balls = []
        Game.blocks = []
        Game.bumpers = []

        Game.score = 0

        player = createPaddle()
        ball = createBall()
        createBlocks([Display.size[0] / 2, Display.size[1] / 4], [8, 4])
        createBumper([Display.size[0] - 7, 16])
        Game.scoreText = foreground.text('00000000', 'left', 'white')([0, 0])
        Game.updateScore()
      },
      stop: function() {
        var i = Game.entities.length
        while (i--) {
          Game.entities[i].delete()
        }
        Game.entities = []
      },
      addScore: function(score) {
        Game.score += score
      },
      updateScore: function(score) {
        score = Math.round(score || Game.score).toString()
        while (score.length < 8) {
          score = '0' + score
        }
        Game.scoreText.content = score
      },
      stutter: function() {
        Game.stuttering = true
      },
      reset: function(delay) {
        if (!Game.resetting) {
          Game.resetting = true
          Game.resetTimer = (delay || 0) * 60
        }
      },
      loop: function() {
        if (!Game.paused) {
          if (!Game.stuttering) {
            if (Game.resetting) {
              if (!Game.resetTimer--) {
                Game.resetting = false
                Game.stop()
                Game.start()
              }
            }
            var i = 0, imax = Game.entities.length, entity
            while (i < imax) {
              entity = Game.entities[i++]
              entity && entity.update()
            }
            if (drawnScore !== Game.score) {
              drawnScore += (Game.score - drawnScore) / 8
              Game.updateScore(drawnScore)
            }
            foreground.update()
          } else {
            Game.stuttering = false
          }
        }
        if (Input.tapped.KeyP) {
          Game.paused = !Game.paused
        }
      }
    }
    return Game
  }())

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
      this.vel = [0, 0]
      this.pos = Vector.clone(pos) || this.pos
      if (this.sprite) {
        this.sprite = this.sprite(this.pos, true)
      }
      this.lifetime = 0
      Game.entities.push(this)
    },
    delete: function() {
      removeFromArray(Game.entities, this)
      foreground.delete(this.sprite)
    },
    update: function() {
      Vector.add(this.vel, Vector.scaled(this.dir, this.spd))
      Vector.add(this.pos, this.vel)
      Vector.scale(this.vel, this.frc)
      this.sprite.pos = this.pos
      this.lifetime++
    }
  }

  function createImpact(pos) {
    var size = 1
    var impact = Object.assign(Object.create(Entity), {
      size: [size, size],
      sprite: foreground.sprite('impact', size),
      frames: 8,
      update: function() {
        if (++this.sprite.index > this.frames) {
          return this.delete()
        }
        Entity.update.call(this)
      }
    })
    pos = pos || [0, 0]
    impact.create(pos)
    return impact
  }

  function createRay(pos, target, offset) {
    var size = 0.2
    var ray = Object.assign(Object.create(Entity), {
      size: [size, size],
      sprite: foreground.circle(size, 'dodgerblue'),
      spd: -0.1,
      frc: 0.1,
      target: target,
      update: function() {
        var distanceVector = Vector.subtracted(Vector.added(target.pos, offset), this.pos)
        var distanceScalar = Vector.magnitude(distanceVector)
        this.dir = Vector.getNormal(distanceVector)
        this.spd += 0.005
        if (distanceScalar < size) {
          this.delete()
        }
        Entity.update.call(this)
      }
    })
    pos = pos || [0, 0]
    ray.create(pos)
    return ray
  }

  function createStardust(pos, dir) {
    var size = 0.1
    var stardust = Object.assign(Object.create(Entity), {
      size: [size, size],
      sprite: foreground.rect([size, size], 'white'),
      dir: Vector.UP,
      spd: 0.05,
      frc: 0.2,
      create: function(pos, dir) {
        Entity.create.call(this, pos)
        this.dir = Vector.clone(dir || this.dir)
        this.vel = Vector.scaled(this.dir, this.spd * 10)
      },
      update: function() {
        if (this.lifetime > 10 - Random.choose()) {
          this.sprite.visible = !this.sprite.visible
        }
        if (this.lifetime > 30) {
          return this.delete()
        }
        Entity.update.call(this)
      }
    })
    pos = pos || [0, 0]
    stardust.create(pos, dir)
    return stardust
  }

  function createPowerup(pos) {
    var size = 1.5
    var powerup = Object.assign(Object.create(Entity), {
      size: [size, size],
      sprite: foreground.sprite('star', size),
      trail: foreground.rect([size / 2, size * 2], ['rgba(0, 204, 255, 0)', 'dodgerblue']),
      dir: Vector.DOWN,
      spd: 0.05,
      frames: 12,
      frameDelay: 2,
      create: function(pos) {
        this.trail = this.trail(Vector.subtracted(pos, [0, this.size[1]]), true)
        Entity.create.call(this, pos)
        this.frameTimer = this.frameDelay
      },
      update: function() {
        if (!--this.frameTimer) {
          this.frameTimer = this.frameDelay
          if (++this.sprite.index >= this.frames) {
            this.sprite.index = 0
          }
        }
        Entity.update.call(this)
        this.trail.pos = Vector.subtracted(this.pos, [0, this.size[1]])
        var dust = createStardust([Random.get() * this.size[0] / 2 + this.pos[0] - this.size[0] / 4, this.pos[1]], Vector.fromDegrees(Random.get() * 20 - 10))
        dust.spd += Random.get(4) * 0.01
        var paddle, i = Game.paddles.length
        while (i--) {
          paddle = Game.paddles[i]
          if (this.pos[1] > paddle.pos[1] - paddle.size[1]) {
            var distance = Vector.magnitude(Vector.subtracted(this.pos, paddle.pos))
            if (distance < paddle.size[1] / 2 + this.size[1] / 4) {
              var j = Random.get(10) + 10
              while (j--) {
                var dust = createStardust([Random.get() * this.size[0] / 2 + this.pos[0] - this.size[0] / 4, this.pos[1]], Vector.fromDegrees(Random.get() * 360))
                dust.spd = Random.get(10) * 0.001 + 0.005
              }
              // var j = 3
              // while (j--) {
              //   createRay(Vector.added(this.pos, [j - 1, 0]), paddle, [0, -paddle.size[1] / 2 - ball.size[1] / 2])
              // }
              Game.score += 1000
              this.delete()
              foreground.delete(this.trail)
            }
          }
        }
        if (this.pos[1] > Display.size[1] + 8) {
          this.delete()
          foreground.delete(this.trail)
        }
      }
    })
    pos = pos || [0, 0]
    powerup.create(pos)
    return powerup
  }

  function createBlock(pos, index) {
    var size = [3, 1]
    var block = Object.assign(Object.create(Entity), {
      size: size,
      sprite: foreground.sprite('block', size),
      create: function(pos) {
        Entity.create.call(this, pos)
        Game.blocks.push(this)
      },
      delete: function() {
        this.sprite.color = 'white'
        removeFromArray(Game.blocks, this)
        this.timer = 5
      },
      update: function() {
        if (typeof this.timer !== 'undefined') {
          if (!this.timer--) {
            Entity.delete.call(this)
          }
        }
      }
    })
    pos = pos || Vector.scaled(Display.size, 0.5)
    block.create(pos)
    block.sprite.index = index || 0
    return block
  }

  function createBlocks(origin, dimensions) {
    var bw = 3
    var bh = 1
    var x = origin[0]
    var y = origin[1]
    var w = dimensions[0]
    var h = dimensions[1]
    var l = x - (w * bw) / 2
    var t = y - (h * bh) / 2
    for (var i = 0; i < h; i++) {
      for (var j = 0; j < w; j++) {
        createBlock([l + bw * (j + 0.5), t + bh * (i + 0.5)], i)
      }
    }
  }

  function createBall(pos) {
    var size = 1.07
    var ball = Object.assign(Object.create(Entity), {
      size: [size, size],
      sprite: foreground.image('moon.gif', size),
      dir: Vector.DOWN,
      spd: 0.0075,
      frc: 1,
      launched: false,
      create: function(pos) {
        Entity.create.call(this, pos)
        Game.balls.push(this)
      },
      delete: function() {
        Entity.delete.call(this)
        removeFromArray(Game.balls, this)
      },
      stutter: function() {
        this.stuttering = true
        this.stutterTimer = 2
      },
      move: function(vel) {
        vel = vel || this.vel
        if (vel[0])
          this.moveAxis([vel[0], 0])
        if (vel[1])
          this.moveAxis([0, vel[1]])
      },
      moveAxis: function(vel) {
        this.pos[0] += vel[0]
        this.pos[1] += vel[1]
        var block, i = Game.blocks.length
        var l, t, r, b, hitbox
        var bounce = 1
        while (i--) {
          block = Game.blocks[i]
          l = block.pos[0] - block.size[0] / 2
          t = block.pos[1] - block.size[1] / 2
          r = block.pos[0] + block.size[0] / 2
          b = block.pos[1] + block.size[1] / 2
          if (this.pos[0] + this.size[0] / 2 > l && this.pos[1] + this.size[1] / 2 > t && this.pos[0] - this.size[0] / 2 < r && this.pos[1] - this.size[1] / 2 < b) {
            var x, y
            if (vel[0] > 0) {
              this.pos[0] = l - this.size[0] / 2
              this.vel[0] *= -bounce
              x = l
              y = this.pos[1]
            }
            if (vel[1] > 0) {
              this.pos[1] = t - this.size[1] / 2
              this.vel[1] *= -bounce
              x = this.pos[0]
              y = t
            }
            if (vel[0] < 0) {
              this.pos[0] = r + this.size[0] / 2
              this.vel[0] *= -bounce
              x = r
              y = this.pos[1]
            }
            if (vel[1] < 0) {
              this.pos[1] = b + this.size[1] / 2
              this.vel[1] *= -bounce
              x = this.pos[0]
              y = b
            }
            if (Random.get() < 0.1) {
              createPowerup([x, y])
            }
            createImpact([x, y])
            Game.addScore(100 * (4 - block.sprite.index))
            block.delete()
            Display.shake()
            this.stutter()
          }
        }
      },
      update: function() {
        if (!this.stuttering) {
          Vector.add(this.vel, Vector.scaled(this.dir, this.spd))
          if (this.launched) {
            this.move()

            var circles = Game.paddles.concat(Game.bumpers)

            var circle, i = circles.length
            var distanceMax, distanceVector, distanceScalar, distanceNormal
            while (i--) {
              circle = circles[i]
              distanceMax = this.size[0] / 2 + circle.size[0] / 2
              distanceVector = Vector.subtracted(this.pos, circle.pos)
              distanceScalar = Vector.magnitude(distanceVector)
              if (distanceScalar < distanceMax) {
                distanceNormal = Vector.getNormal(distanceVector)
                this.pos = Vector.added(circle.pos, Vector.scaled(distanceNormal, distanceMax))
                this.vel = Vector.scaled(distanceNormal, (circle.bounce || Vector.magnitude(this.vel)))
              }
            }

            var l = this.size[0] / 2
            var r = Display.size[0] - this.size[0] / 2
            var t = this.size[1] / 2
            var b = Display.size[1] + this.size[1] / 2 + Display.size[1] / 4
            if (this.pos[0] < l) {
              this.pos[0] = l
              this.vel[0] *= -1
            }
            if (this.pos[0] > r) {
              this.pos[0] = r
              this.vel[0] *= -1
            }
            if (this.pos[1] < t) {
              this.pos[1] = t
              this.vel[1] *= -1
            }
            if (this.pos[1] > b) {
              // Game.reset(1)
              this.delete()
              ball = createBall()
            }
            var normal = Vector.getNormal(Vector.inverted(this.vel)), angle = Vector.toDegrees(normal)
            var newNormal, newAngle, dust
            var i = 4
            while (i--) {
              newAngle = angle + Random.get(30) - 15
              newNormal = Vector.fromDegrees(newAngle)
              dust = createStardust(this.pos, newNormal)
              dust.speed = Random.get(100) * 0.00001
            }
          } else {
            this.pos = Vector.added(player.pos, [0, -player.size[1] / 2 - this.size[1] / 2])
            if (Input.tapped.MouseLeft) {
              this.vel = Vector.scaled(Vector.UP, 0.2)
              this.launched = true
            }
          }
          Vector.scale(this.vel, this.frc)
          this.sprite.pos = this.pos
        } else {
          if (!this.stutterTimer--) {
            this.stuttering = false
          }
        }
      }
    })
    pos = pos || Vector.added(player.pos, [0, -player.size[1] / 2 - size / 2])
    ball.create(pos)
    return ball
  }

  function createBumper(pos) {
    var size = 2.08
    var bumper = Object.assign(Object.create(Entity), {
      size: [size, size],
      sprite: foreground.image('mars.gif', size),
      dir: Vector.LEFT,
      spd: 0.001,
      frc: 0.991,
      create: function(pos) {
        Entity.create.call(this, pos)
        Game.bumpers.push(this)
      },
      delete: function() {
        Entity.delete.call(this)
        removeFromArray(Game.bumpers, this)
      },
      update: function() {
        Entity.update.call(this)
        if (this.dir[0] < 0 && this.pos[0] < Display.size[0] * 0.25) {
          this.dir[0] = 1
        }
        if (this.dir[0] > 0 && this.pos[0] > Display.size[0] * 0.75) {
          this.dir[0] = -1
        }
      }
    })
    pos = pos || [0, 0]
    bumper.create(pos)
    return bumper
  }

  function createPaddle(pos) {
    var size = 4
    var paddle = Object.assign(Object.create(Entity), {
      size: [size, size],
      sprite: foreground.image('earth.gif', size),
      bounce: 0.55,
      create: function(pos) {
        Entity.create.call(this, pos)
        Game.paddles.push(this)
      },
      delete: function() {
        Entity.delete.call(this)
        removeFromArray(Game.paddles, this)
      },
      update: function() {
        var target
        if (Input.mousePos) {
          target = Vector.added(Vector.multiplied(Input.mousePos, [Display.size[0], 0]), [0, Display.size[1]])
          this.vel = Vector.scaled(Vector.subtracted(target, this.pos), 0.25)
        }
        Entity.update.call(this)
        if (this.pos[0] < this.size[0] / 2)
          this.pos[0] = this.size[0] / 2
        if (this.pos[0] > Display.size[0] - this.size[0] / 2)
          this.pos[0] = Display.size[0] - this.size[0] / 2
        this.pos[1] = Display.size[1] - ((1 / 128) * Math.pow(this.pos[0] - Display.size[0] / 2, 2))
      }
    })
    pos = pos || [Display.size[0] / 2, Display.size[1]]
    paddle.create(pos)
    return paddle
  }

  Game.start()
  Input.init('#wrap')
  Input.loop(Game.loop)
}

Display.load(sprites, main)
