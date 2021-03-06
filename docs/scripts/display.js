export default (function() {
  var canvases = []
  var sprites = {}
  var scale = 32
  var size = [scale, scale * 3 / 4]
  var flashing = false
  var element
  function onresize() {
    // requestAnimationFrame(function() {
      var i = canvases.length, canvas
      while (i--) {
        canvas = canvases[i]
        update(canvas)
      }
    // })
  }
  function update(canvas) {
    var force = false
    var rect = canvas.parent.getBoundingClientRect()
    var w = Math.round(rect.width)
    var h = Math.round(rect.height)
    if (canvas.element.width !== w || canvas.element.height !== h) {
      canvas.element.width = w
      canvas.element.height = h
      canvas.rect = rect
      force = true
    }
    if (canvas.element.id === 'foreground')
      force = true
    drawCanvas(canvas, force)
  }
  function getDrawBox(child) {
    var unit = child.parent.rect.width / scale
    var ctx = child.parent.context
    var x, y, w, h

    x = child.pos [0] * unit
    y = child.pos [1] * unit
    if (child.size) {
      w = child.size[0] * unit
      h = child.size[1] * unit
    } else if (child.type === 'text') {
      ctx.font = unit * 2 + 'px VT323, Roboto, sans-serif'
      w = ctx.measureText(child.content).width
      h = unit * 2
    }

    if (child.type === 'sprite' || child.type === 'image' || child.type === 'rect' && child.centered) {
      x -= w / 2
      y -= h / 2
    }

    if (child.type === 'circle') {
      w *= 2
      h *= 2
      x -= w / 2
      y -= h / 2
    }

    return {
      pos:   [x, y],
      size:  [w, h],
      color: child.color
    }
  }
  function drawChild(child) {
    if (!flashing && child.visible) {
      var parent  = child.parent
      var unit    = parent.rect.width / scale
      var ctx     = parent.context
      var child, color, gradient
      var cx, cy, x, y, w, h, box = child.drawBox || getDrawBox(child)

      x = box.pos [0]
      y = box.pos [1]
      w = box.size[0]
      h = box.size[1]

      cx = x // + w / 2
      cy = y // + h / 2

      color = child.color
      if (typeof color === 'object' && color !== null) {
        if (typeof w !== 'undefined' && typeof h !== 'undefined') {
          gradient = ctx.createLinearGradient(x, y, x, y + h)
          color.some(function(color, index) {
            gradient.addColorStop(index, color)
          })
          color = gradient
        }
      }

      ctx.fillStyle = color

      if (child.type === 'rect') {
        ctx.fillRect(x, y, w, h)
      } else if (child.type === 'circle') {
        ctx.beginPath()
        ctx.arc(x + w / 2, y + h / 2, (w + h) / 4, 0, 2 * Math.PI)
        ctx.fill()
        ctx.closePath()
      } else if (child.type === 'text') {
        ctx.textAlign = 'left'
        ctx.textBaseline = 'hanging'
        ctx.fillText(child.content, cx, cy, w, h)
      } else if (child.type === 'sprite') {
        var image = sprites[child.id][color || 'colored']
        var sw = image.height * w / h
        var sh = image.height
        var sx = sw * child.index
        var sy = 0
        ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h)
      } else if (child.type === 'image') {
        var image = sprites[child.id]
        var sw = image.height * w / h
        var sh = image.height
        var sx = sw * child.index
        var sy = 0
        ctx.drawImage(image, x, y, w, h)
      }
      child.drawnBox = {
        pos:  [x, y],
        size: [w, h],
        color: child.color
      }
    }
  }
  function eraseChild(child) {
    var box = child.drawnBox
    var ctx
    if (box) {
      ctx = child.parent.context
      x = box.pos [0] - 1
      y = box.pos [1] - 1
      w = box.size[0] + 2
      h = box.size[1] + 2
      ctx.clearRect(x, y, w, h)
    }
  }
  function drawCanvas(canvas, force) {
    var i, imax = canvas.children.length
    var dirty = []
    var box

    i = 0
    while (i < imax) {
      child = canvas.children[i]
      box = child.drawBox = getDrawBox(child)

      if (force || !child.drawnBox ||
          Math.round(box.pos[0]) !== Math.round(child.drawnBox.pos[0]) || Math.round(box.pos[1]) !== Math.round(child.drawnBox.pos[1]) ||
          box.color !== child.drawnBox.color
        ) {
        eraseChild(child)
        dirty.push(child)
      }
      i++
    }

    imax = dirty.length
    i = 0
    while (i < imax) {
      child = dirty[i]
      drawChild(child)
      i++
    }
  }
  function getMethods() {
    var canvas = this
    return {
      parent: canvas,
      update: function() {
        update(canvas, true)
      },
      rect: function(size, color) {
        if (typeof size === 'number') {
          size = [size, size]
        }
        return function drawRect(pos, centered) {
          if (typeof pos === 'number') {
            pos = [pos, pos]
          }
          var data = {
            type:     'rect',
            size:     size,
            color:    color,
            pos:      pos   || [0, 0],
            centered: !!centered,
            parent:   canvas,
            visible:  true
          }
          canvas.children.push(data)
          drawChild(data)
          return data
        }
      },
      circle: function(size, color) {
        var radius = size
        if (typeof size === 'number') {
          size = [size, size]
        }
        return function drawCircle(pos) {
          if (typeof pos === 'number') {
            pos = [pos, pos]
          }
          var data = {
            type:   'circle',
            size:   size,
            radius: radius,
            color:  color,
            pos:    pos   || [0, 0],
            parent: canvas,
            visible:  true
          }
          canvas.children.push(data)
          drawChild(data)
          return data
        }
      },
      text: function(content, align, color) {
        return function drawText(pos) {
          if (typeof pos === 'number') {
            pos = [pos, pos]
          }
          var data = {
            type:    'text',
            content: content,
            align:   align || 'left',
            color:   color,
            pos:     pos   || [0, 0],
            parent:  canvas,
            visible:  true
          }
          canvas.children.push(data)
          drawChild(data)
          return data
        }
      },
      sprite: function(id, size, subSize) {
        if (typeof id === 'undefined' || !sprites[id]) {
          throw 'DisplayError: Sprite of id `' + id + '` was not loaded.'
        }
        if (typeof size === 'number') {
          size = [size, size]
        }
        return function drawSprite(pos) {
          if (typeof pos === 'number') {
            pos = [pos, pos]
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
          }
          canvas.children.push(data)
          drawChild(data)
          return data
        }
      },
      image: function(id, size) {
        if (typeof id === 'undefined' || !sprites[id]) {
          throw 'DisplayError: Sprite of id `' + id + '` was not loaded.'
        }
        if (typeof size === 'number') {
          size = [size, size]
        }
        return function drawImage(pos) {
          if (typeof pos === 'number') {
            pos = [pos, pos]
          }
          var data = {
            type:   'image',
            id:     id,
            index:  0,
            size:   size,
            pos:    pos ? [pos[0], pos[1]] : [0, 0],
            parent: canvas,
            visible:  true
          }
          canvas.children.push(data)
          drawChild(data)
          return data
        }
      },
      delete: function(child) {
        var index = canvas.children.indexOf(child)
        if (index !== -1)
          canvas.children.splice(index, 1)
        else
          console.log('Child was not found.')
        eraseChild(child)
        return index
      }
    }
  }
  return {
    size: size,
    scale: scale,
    init: function(parent) {
      var type = typeof parent
      if (type === 'undefined') {
        parent = document.body
      } else if (type === 'string') {
        parent = document.querySelector(parent)
      }
      init = true
      element = document.createElement('div')
      element.id = 'display'
      element.style.position = 'absolute'
      element.style.left = '0'
      element.style.top = '0'
      element.style.width = '100%'
      element.style.height = '100%'
      element.style.overflow = 'hidden'
      parent.appendChild(element)
      window.addEventListener('load', onresize)
      window.addEventListener('resize', onresize)
    },
    load: function(list, callback) {
      if (typeof list === 'string') {
        list = [list]
      }
      var index = 0
      function next() {
        var sprite = list[index]
        if (/.+\.(png|jpg|gif)/g.test(sprite)) {
          var image = new Image()
          image.src = 'sprites/' + sprite
          image.onload = function() {
            sprites[sprite] = image
            index++
            if (index < list.length) {
              next()
            } else {
              callback && callback.call(window)
            }
          }
        } else {
          var ajax = new XMLHttpRequest()
          ajax.open("GET", "sprites/" + sprite + ".svg", true)
          ajax.send()
          ajax.onload = function(e) {
            var response = ajax.responseText
            var colors = ['white', 'black']
            var colorIndex = 0
            var image = new Image()
            image.src = 'data:image/svg+xml;base64,' + window.btoa(response)
            image.onload = function() {
              sprites[sprite].colored = image
            }
            sprites[sprite] = {}
            function colorNext() {
              var color = colors[colorIndex]
              var replaced = response.replace(/fill="[#\w\d\s]+"/g, 'fill="' + color + '"')
              var image = new Image()
              image.src = 'data:image/svg+xml;base64,' + window.btoa(replaced)
              image.onload = function() {
                sprites[sprite][color] = image
                colorIndex++
                if (colorIndex < colors.length) {
                  colorNext()
                } else {
                  index++
                  if (index < list.length) {
                    next()
                  } else {
                    callback && callback.call(window)
                  }
                }
              }
            }
            colorNext()
          }
        }
      }
      next()
    },
    create: function(id) {
      if (!init) {
        throw 'DisplayError: Must initialize display with `Display.init` before calling other methods'
      }
      var object, canvas = document.createElement('canvas')
      id && (canvas.id = id)
      object = {
        id:       id || null,
        element:  canvas,
        context:  canvas.getContext('2d'),
        parent:   element,
        rect:     null,
        children: []
      }
      object.methods = getMethods.call(object)
      element.appendChild(canvas)
      canvases.push(object)
      update(object)
      return object.methods
    },
    flash: function(color) {
      flashing = true
      var i = canvases.length, canvas
      while (i--) {
        canvas = canvases[i]
        canvas.context.fillStyle = color || 'white'
        canvas.context.fillRect(0, 0, canvas.element.width, canvas.element.height)
      }
      requestAnimationFrame(function() {
        flashing = false
        var i = canvases.length, canvas
        while (i--) {
          canvas = canvases[i]
          canvas.context.clearRect(0, 0, canvas.element.width, canvas.element.height)
          drawCanvas(canvas, true)
        }
      })
    },
    shake: function() {
      var magnitude = 0.25
      var direction = 1
      var duration  = 0.25 * 60
      var position  = 0
      function shake() {
        element.style.top = (direction * magnitude) + '%'
        direction *= -1
        if (position++ < duration) {
          requestAnimationFrame(shake)
        } else {
          element.style.top = '0'
        }
      }
      shake()
    }
  }
}())
