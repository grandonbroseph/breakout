export default {
  restrain: function(vector, rect) {
    var l = rect[0][0]
    var t = rect[0][1]
    var w = rect[1][0]
    var h = rect[1][1]
    var r = l + w
    var b = t + h
    if (vector[0] < l) {
      vector[0] = l
    }
    if (vector[1] < t) {
      vector[1] = t
    }
    if (vector[0] > r) {
      vector[0] = r
    }
    if (vector[1] > b) {
      vector[1] = b
    }
    return vector
  },
  getCenter: function(rect) {
    var x, y, w, h
    if (rect.length === 2) {
      x = 0
      y = 0
      w = rect[0]
      h = rect[1]
      if (w.length === 2) {
        x = w[0]
        y = w[1]
      }
      if (h.length === 2) {
        w = h[0]
        h = h[1]
      }
    } else {
      throw 'RectError: Rectangle for `getCenter` has invalid number of arguments'
    }
    return [x + w / 2, y + h / 2]
  },
  isColliding: function(a, b) {
    var ax, ay, aw, ah, al, at, ar, ab, bx, by, bw, bh, bl, bt, br, bb
    ax = a[0][0]
    ay = a[0][1]
    aw = a[1][0]
    ah = a[1][1]

    bx = b[0][0]
    by = b[0][1]
    bw = b[1][0]
    bh = b[1][1]

    // console.log(ax, ay, aw, ah)

    al = ax - aw / 2
    at = ay - ah / 2
    ar = ax + aw / 2
    ab = ay + ah / 2

    bl = bx - bw / 2
    bt = by - bh / 2
    br = bx + bw / 2
    bb = by + bh / 2

    return al < br && at < bb && ar > bl && ab > bt
  }
}
