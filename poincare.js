
import * as t from "https://esm.sh/three@0.184.0";
import { OrbitControls } from 'https://esm.sh/three@0.184.0/addons/controls/OrbitControls.js';

const width = window.innerWidth, height = window.innerHeight;

const camera = new t.PerspectiveCamera( 70, width / height, 0.01, 100 );
camera.position.set(0,0,2.5);

const scene = new t.Scene();

function point(p) {
  p = R3.from(p)
  const mesh = new t.Mesh(new t.SphereGeometry(.01), new t.MeshNormalMaterial());
  mesh.position.set(p.x,p.y,p.z)
  scene.add(mesh)
}

scene.add(new t.Mesh(new t.SphereGeometry(1, 100, 100), new t.MeshBasicMaterial({
  color: new t.Color("#ffffff"),
  opacity: .06,
  transparent: true,
  side: t.DoubleSide
})))

function randR3() {
  const theta = Math.random() * tau
  const phi = Math.acos(1 - 2 * Math.random())
  const r = Math.random() ** (1/3) * .8
  return new R3(
    cos(theta) * sin(phi) * r,
    sin(theta) * sin(phi) * r,
    cos(phi) * r,
  )
}

function main() {
  for(let i = 0; i < 10; i++) {
    let p = new H3(randR3())
    let q = new H3(randR3())
    point(p)
    point(q)
    for(let t = 0; t <= 1; t += .01) {
      point(p.lerp(q, t))
    }
  }
}

const renderer = new t.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setAnimationLoop(tick);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.update();

function tick() {
  controls.update();
  renderer.render( scene, camera );
}

const tau = Math.PI * 2;
const { cos, sin, tan, sqrt, min, max, atan2, hypot, tanh, atanh } = Math

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

class El {
  do(map) {
    return map.apply(this)
  }
}

class R2 extends El {
  static zero = new R2(0,0);

  x; y;

  constructor(x, y) {
    super();
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

class C extends El {
  static zero = new C(0, 0);

  r; i;

  constructor(r, i=0) {
    super();
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

class H2 extends El {
  static zero = new H2(R2.zero);

  r2;

  constructor(r2) {
    super();
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

class R3 extends El {
  static zero = new R3(0,0,0);

  x; y; z;

  constructor(x, y, z) {
    super();
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static from(n) {
    if(n instanceof R3) return n
    if(n instanceof R2) return new R3(n.x, n.y, 0)
    if(n instanceof H3) return n.r3
    throw new Error("cannot convert to R3")
  }
  
  add(that) {
    return new R3(this.x + that.x, this.y + that.y, this.z + that.z)
  }

  sub(that) {
    return new R3(this.x - that.x, this.y - that.y, this.z - that.z)
  }

  mul(r) {
    return new R3(this.x * r, this.y * r, this.z * r)
  }

  div(r) {
    return new R3(this.x / r, this.y / r, this.z / r)
  }

  dot(that) {
    return this.x * that.x + this.y * that.y + this.z * that.z
  }

  cross(that) {
    return new R3(
      this.y * that.z - this.z * that.y,
      this.z * that.x - this.x * that.z,
      this.x * that.y - this.y * that.x,
    )
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
    if (!v.norm2()) v = u.cross(new R3(1,0,0))
    if (!v.norm2()) v = u.cross(new R3(0,1,0))
    v = v.div(v.norm());
    return new Map(
      p => new R2(p.dot(u), p.dot(v)),
      p => u.mul(p.x).add(v.mul(p.y)),
    )
  }
}

class H3 extends El {
  static zero = new H3(R3.zero);

  r3;

  constructor(r3) {
    super();
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

  static plane(u, v) {
    const plane = R3.plane(u.r3, v.r3)
    return new Map(
      p => new H2(plane.apply(p.r3)),
      p => new H3(plane.inv.apply(p.r2)),
    )
  }

  static tx(from, to) {
    if(from == null || to == null) {
      return new Map(p => {
        const plane = H3.plane(from ?? to, p);
        return plane.inv.apply(plane.apply(p).tx(
          from?.do(plane),
          to?.do(plane),
        ))
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

