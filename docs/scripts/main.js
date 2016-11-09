import Display from './display'
import Input from './input'
import Random from './random'
import Vector from './vector'
import Rect from './rect'

var sprites = ['paddle', 'ball', 'block', 'impact', 'earth.gif', 'moon.gif']

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
  var Game = {
    entities: null,
    paddles: null,
    balls: null,
    blocks: null,
    resetting: false,
    resetTimer: null,
    start: function() {
      this.entities = []

      this.paddles = []
      this.balls = []
      this.blocks = []

      player = createPaddle()
      ball = createBall()
      for (var y = 0; y < 8; y++) {
        for (var x = 0; x < 6; x++) {
          createBlock([4 / 2 + 4 * (x + 1), 1 / 2 + 1 * (y + 1) + 6], Math.floor(y / 2))
        }
      }
    },
    stop: function() {
      var i = this.entities.length
      while (i--) {
        this.entities[i].delete()
      }
      this.entities = []
    },
    reset: function(delay) {
      if (!this.resetting) {
        this.resetting = true
        this.resetTimer = (delay || 0) * 60
      }
    },
    loop: function() {
      if (!Game.paused) {
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
        foreground.update()
      }
      if (Input.tapped.KeyP) {
        Game.paused = !Game.paused
      }
    }
  }

  var Entity = {
    sprite: null,
    pos: null,
    size: 0,
    vel: [0, 0],
    dir: [0, 0],
    spd: 0,
    frc: 0,
    create: function(pos) {
      this.vel = [0, 0]
      this.pos = Vector.clone(pos) || this.pos
      if (this.sprite) {
        this.sprite = this.sprite(this.pos, true)
      }
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

  function createBlock(pos, index) {
    var size = [4, 1]
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

  function createBall(pos) {
    var size = 1.07
    var ball = Object.assign(Object.create(Entity), {
      size: [size, size],
      sprite: foreground.image('moon.gif', size),
      dir: Vector.DOWN,
      spd: 0.01,
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
            createImpact([x, y])
            block.delete()
            Display.shake()
          }
        }
      },
      update: function() {
        Vector.add(this.vel, Vector.scaled(this.dir, this.spd))
        if (this.launched) {
          this.move()

          var paddle, i = Game.paddles.length
          var distanceMax, distanceVector, distanceScalar, distanceNormal
          while (i--) {
            paddle = Game.paddles[i]
            distanceMax = this.size[0] / 2 + paddle.size[0] / 2
            distanceVector = Vector.subtracted(this.pos, paddle.pos)
            distanceScalar = Vector.magnitude(distanceVector)
            if (distanceScalar < distanceMax) {
              distanceNormal = Vector.getNormal(distanceVector)
              this.pos = Vector.added(paddle.pos, Vector.scaled(distanceNormal, distanceMax))
              this.vel = Vector.scaled(distanceNormal, 0.6)
            }
          }

          var l = this.size[0] / 2
          var r = Display.size[0] - this.size[0] / 2
          var t = this.size[1] / 2
          var b = Display.size[1] + this.size[1] * 2
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
        } else {
          this.pos = Vector.added(player.pos, [0, -player.size[1] / 2 - this.size[1] / 2])
          if (Input.tapped.MouseLeft) {
            this.vel = Vector.scaled(Vector.UP, 0.25)
            this.launched = true
          }
        }
        Vector.scale(this.vel, this.frc)
        this.sprite.pos = this.pos
      }
    })
    pos = pos || Vector.added(player.pos, [0, -player.size[1] / 2 - size / 2])
    ball.create(pos)
    return ball
  }

  function createPaddle(pos) {
    var size = 4
    var paddle = Object.assign(Object.create(Entity), {
      size: [size, size],
      sprite: foreground.image('earth.gif', size),
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
          this.vel = Vector.scaled(Vector.subtracted(target, this.pos), 0.1)
        }
        Entity.update.call(this)
        if (this.pos[0] < this.size[0] / 2)
          this.pos[0] = this.size[0] / 2
        if (this.pos[0] > Display.size[0] - this.size[0] / 2)
          this.pos[0] = Display.size[0] - this.size[0] / 2
      }
    })
    pos = pos || [Display.size[0] / 2, Display.size[1]]
    paddle.create(pos)
    return paddle
  }

  Game.start()
  Input.init('#wrap')
  Input.loop(Game.loop)

  foreground.sprite('paddle', 2)(0, 0)

}

Display.load(sprites, main)
