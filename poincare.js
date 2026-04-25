"use strict"

const canvas = document.getElementsByTagName("canvas")[0]
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const tau = Math.PI * 2;
const { cos, sin, tan, sqrt, min, max, atan2, hypot, tanh, atanh } = Math

const ctx = canvas.getContext("2d")

function main() {
  let p = new H2(new R2(0, 0))
  let q = new H2(new R2(0, 1/2))

  function draw() {
    ctx.reset()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.scale(1, -1)
    ctx.scale(200, 200)

    function point(p) {
      ctx.fillStyle="black";
      ctx.beginPath()
      ctx.arc(p.x, p.y, 5/200, 0, tau)
      ctx.fill()
    }

    function line(p,q) {
      ctx.beginPath()
      ctx.moveTo(p.x,p.y)
      ctx.lineTo(q.x,q.y)
      ctx.stroke()
    }

    ctx.lineWidth = 1/200;
    ctx.beginPath()
    ctx.arc(0,0,1,0,tau)
    ctx.stroke()

    for(let t = 0; t <= 1; t += .1) {
      point(p.lerp(q, t).r2)
    }
    p = p.r2;
    q = q.r2;
    let p_ = inv(p)
    let q_ = inv(q)
    if(!p_ || !q_) {
      line(p,q)
    } else {
      let m = mid(p,p_)
      let n = mid(q,q_)
      let m_ = perp(m, p)
      let n_ = perp(n, q)
      let c = inter(m,m_,n,n_)
      let r = p.sub(c).norm()
      ctx.beginPath()
      let a = p.sub(c).ang()
      let b = q.sub(c).ang()
      if((a-b+tau)%tau<tau/2)[a,b]=[b,a]
      ctx.arc(c.x,c.y,r,a,b)
      ctx.stroke()
    }
    point(p)
    point(q)
    p = new H2(p);
    q = new H2(q);
  }

  draw()

  requestAnimationFrame(function tick() {
    requestAnimationFrame(tick)
    let f = H2.rot(.01,p)
    p = p.do(f)
    q = q.do(f)
    draw()
  })

  canvas.oncontextmenu = canvas.onclick = e => {
    e.preventDefault()
    let x = (e.clientX-canvas.width/2)/200;
    let y = -(e.clientY-canvas.height/2)/200;
    let c = new R2(x, y)
    if(c.norm2() >= 1) return
    c = new H2(c)
    if(e.button == 0) {
      p = c
    } else {
      q = c
    }
    draw()
  }
}

function inv(p) {
  const h = p.norm2()
  if (h === 0) return undefined
  return p.div(h)
}

function mid(p,q) {
  return p.add(q).div(2)
}
function perp(p,q) {
  return new R2(p.x-(q.y-p.y),p.y+(q.x-p.x))
}

function inter(p,q,r,s) {
  return new R2(
    ((p.x*q.y-p.y*q.x) * (r.x-s.x) - (p.x-q.x) * (r.x*s.y - r.y*s.x))/((p.x-q.x)*(r.y-s.y)-(p.y-q.y)*(r.x-s.x)),
    ((p.x*q.y-p.y*q.x) * (r.y-s.y) - (p.y-q.y) * (r.x*s.y - r.y*s.x))/((p.x-q.x)*(r.y-s.y)-(p.y-q.y)*(r.x-s.x)),
  )
}

class Map {
  apply;
  inv;
  constructor(apply, inv) {
    this.apply = apply;
    if (inv != null) {
      this.inv = new Map(inv);
      this.inv.inv = this;
    }
  }
  then(other) {
    return new Map(x => other.apply(this.apply(x)))
  }
}

Object.prototype.do = function(map) { return map.apply(this) }

class R2 {
  static zero = new R2(0,0);

  x; y;

  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  static from(n) {
    if(n instanceof R2) return n
    if(n instanceof C) return new R2(n.r, n.i)
    if(n instanceof H2) return n.r2
    throw new Error("cannot convert to R2")
  }
  
  add(that) {
    return new R2(this.x + that.x, this.y + that.y)
  }

  sub(that) {
    return new R2(this.x - that.x, this.y - that.y)
  }

  mul(r) {
    return new R2(this.x * r, this.y * r)
  }

  div(r) {
    return new R2(this.x / r, this.y / r)
  }

  dot(that) {
    return this.x * that.x + this.y * that.y
  }

  norm() {
    return hypot(this.x, this.y)
  }

  norm2() {
    return this.x ** 2 + this.y ** 2
  }

  ang() {
    return atan2(this.y, this.x)
  }

  rot(ang) {
    return this.do(R2.rot(ang))
  }

  static add(that) {
    return new Map(x => x.add(that))
  }

  static sub(that) {
    return new Map(x => x.sub(that))
  }

  static mul(r) {
    return new Map(x => x.mul(r))
  }

  static div(r) {
    return new Map(x => x.div(r))
  }
  
  static rot(ang) {
    const c = cos(ang)
    const s = sin(ang)
    return new Map(r => new R2(r.x * c - r.y * s, r.x * s + r.y * c))
  }
}

class C {
  static zero = new C(0, 0);

  r; i;

  constructor(r, i=0) {
    this.r = r;
    this.i = i;
  }

  static from(n) {
    if(n instanceof C) return n
    if(typeof n === "number") return new C(n)
    if(n instanceof R2) return new C(n.x, n.y)
    if(n instanceof H2) return new C(n.r2.x, n.r2.y)
    throw new Error("cannot convert to C")
  }

  add(that) {
    that = C.from(that);
    return new C(this.r + that.r, this.i + that.i)
  }

  sub(that) {
    that = C.from(that);
    return new C(this.r - that.r, this.i - that.i)
  }

  mul(that) {
    if (typeof that === "number") {
      return new C(this.r * that, this.i * that)
    } else {
      return new C(this.r * that.r - this.i * that.i, this.r * that.i + this.i * that.r)
    }
  }

  star() {
    return new C(this.r, -this.i)
  }

  norm() {
    return hypot(this.r, this.i)
  }

  norm2() {
    return this.r ** 2 + this.i ** 2
  }

  div(that) {
    if (typeof that === "number") {
      return new C(this.r / that, this.i / that)
    } else {
      return this.mul(that.star()).div(that.norm2())
    }
  }

  static ei(theta) {
    return new C2(cos(theta), sin(theta))
  }

  static add(that) {
    return new Map(x => x.add(that))
  }

  static sub(that) {
    return new Map(x => x.sub(that))
  }

  static mul(r) {
    return new Map(x => x.mul(r))
  }

  static div(r) {
    return new Map(x => x.div(r))
  }
}

class H2 {
  static zero = new H2(R2.zero);

  r2;

  constructor(r2) {
    this.r2 = r2;
  }

  static from(p) {
    if(p instanceof H2) return p
    if(p instanceof R2) return new H2(p)
    if(p instanceof C) return new H2(R2.from(p))
    throw new Error("cannot convert to H2")
  }

  rot(ang, around) {
    return this.do(H2.rot(ang, around))
  }

  tx(from, to) {
    return this.do(H2.tx(from, to))
  }

  static rot(ang, around) {
    if (around == null) {
      const rot = R2.rot(ang)
      return new Map(h => new H2(rot.apply(h.r2)))
    } else {
      return H2.tx(around, null).then(H2.rot(ang)).then(H2.tx(null, around))
    }
  }

  static tx(from, to) {
    if(from == null || to == null) {
      const c = from ? C.from(from).mul(-1) : C.from(to);
      return new Map(p => {
        const z = C.from(p);
        return H2.from(z.add(c).div(c.star().mul(z).add(1)))
      })
    }
    return H2.tx(from, null).then(H2.tx(null, to))
  }

  lerp(that, t) {
    that = that.tx(this, null)
    that = new H2(that.r2.mul(tanh(t * atanh(that.r2.norm())) / that.r2.norm()))
    return that.tx(null, this)
  }
}

class R3 {
  static zero = new R3(0,0,0);

  x; y; z;

  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static from(n) {
    if(n instanceof R3) return n
    if(n instanceof R2) return new R2(n.x, n.y, 0)
    throw new Error("cannot convert to R3")
  }
  
  add(that) {
    return new R2(this.x + that.x, this.y + that.y, this.z + that.z)
  }

  sub(that) {
    return new R2(this.x - that.x, this.y - that.y, this.z + that.z)
  }

  mul(r) {
    return new R2(this.x * r, this.y * r, this.z * r)
  }

  div(r) {
    return new R2(this.x / r, this.y / r, this.z / r)
  }

  dot(that) {
    return this.x * that.x + this.y * that.y + this.z * that.z
  }

  norm() {
    return hypot(this.x, this.y, this.z)
  }

  norm2() {
    return this.x ** 2 + this.y ** 2 + this.z ** 2
  }

  static add(that) {
    return new Map(x => x.add(that))
  }

  static sub(that) {
    return new Map(x => x.sub(that))
  }

  static mul(r) {
    return new Map(x => x.mul(r))
  }

  static div(r) {
    return new Map(x => x.div(r))
  }

  static plane(u, v) {
    u = u.div(u.norm());
    v = v.sub(u.mul(u.dot(v)));
    v = v.div(v.norm());
    return new Map(
      p => new R2(p.dot(u), p.dot(v)),
      p => u.mul(p.x).add(v.mul(p.y)),
    )
  }
}

class H3 {
  static zero = new H3(R3.zero);

  r3;

  constructor(r3) {
    this.r3 = r3;
  }

  static from(p) {
    if(p instanceof H3) return p
    if(p instanceof R3) return new H3(p)
    throw new Error("cannot convert to H3")
  }

  tx(from, to) {
    return this.do(H3.tx(from, to))
  }

  static rot(ang, around) {
    if (around == null) {
      const rot = R2.rot(ang)
      return new Map(h => new H2(rot.apply(h.r2)))
    } else {
      return H2.tx(around, null).then(H2.rot(ang)).then(H2.tx(null, around))
    }
  }

  static tx(from, to) {
    if(from == null || to == null) {
      return new Map(p => {
        const plane = R3.plane((from ?? to).r3, p);
        plane.inv(new H2(plane.apply(p.r3)).tx(
          from?.do(plane),
          to?.do(plane),
        ).r2)
      });
    }
    return H3.tx(from, null).then(H3.tx(null, to))
  }

  lerp(that, t) {
    that = that.tx(this, null)
    that = new H3(that.r3.mul(tanh(t * atanh(that.r3.norm())) / that.r3.norm()))
    return that.tx(null, this)
  }
}

main()

