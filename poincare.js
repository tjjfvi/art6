import * as t from "https://esm.sh/three@0.184.0";
import { OrbitControls } from 'https://esm.sh/three@0.184.0/addons/controls/OrbitControls.js';

const width = window.innerWidth, height = window.innerHeight;

const camera = new t.PerspectiveCamera(70, width / height, 0.01, 100);
camera.position.set(0,0,1.8);

const scene = new t.Scene();

scene.add(new t.PointLight(undefined, 1))
scene.add(new t.AmbientLight(undefined, 1))
const d = new t.DirectionalLight(undefined, 1)
d.position.set(0,1,.2)
scene.add(d)

const model = new t.Group()
model.lookAt(1,-.2,-.1)
scene.add(model);

const pointMat = new t.MeshNormalMaterial();
const edgeMat = new t.MeshStandardMaterial({
  // color: new t.Color(0xffffff),
  // color: new t.Color(0xbbbbbb),
  color: new t.Color(0x444444),
  metalness: .95,
  roughness: .2,
})
// const faceMat = new t.MeshStandardMaterial({
//   color: new t.Color(0x69b2ff),
//   transparent: true,
//   opacity: .5,
//   side: t.DoubleSide,
//   metalness: .5,
//   roughness: .5,
//   // emissive: new t.Color(0x111111),
// });
const faceMat = new t.MeshNormalMaterial({
  transparent: true,
  opacity: .5,
  side: t.DoubleSide,
});
function drawPoint(p, s = 1) {
  p = R3.from(p)
  const mesh = new t.Mesh(new t.SphereGeometry(.01 * s), pointMat);
  mesh.position.set(p.x,p.y,p.z)
  model.add(mesh)
}

function drawEdge(p, q, mat = edgeMat) {
  const geo = new t.CylinderGeometry(.02, .02, 1, 8, 8, true)
  geo.translate(0, .5, 0)
  const y = q.tx(p, null).r3;
  const yn = y.norm();
  let x = new R3(1,0,0).sub(y.mul(y.x/yn/yn))
  if (x.tiny()) x = new R3(0,1,0).sub(y.mul(y.y/yn/yn))
  x = x.div(x.norm());
  let z = x.cross(y);
  z = z.div(yn);
  warpGeo(geo, new Map(v => new H3(x.mul(v.x).add(z.mul(v.z))).tx(null, new H3(y.mul(v.y))).tx(null, p).r3));
  const mesh = new t.Mesh(geo, mat);
  model.add(mesh)
}

function drawFace(p, q, r) {
  const n = 8;
  const points = [p];
  const tris = []
  let last = [0]
  for(let i = 1; i <= n; i++) {
    const a = p.lerp(q, i/n)
    const b = p.lerp(r, i/n)
    const cur = []
    for(let j = 0; j <= i; j++) {
      const p = points.push(a.lerp(b, j/i))-1
      cur.push(p)
      if (j !== 0) {
        tris.push([last[j-1],cur[j-1],p])
        if (j !== i) {
          tris.push([last[j-1],p,last[j]])
        }
      }
    }
    last = cur;
  }
  const geo = new t.BufferGeometry()
  geo.setFromPoints(points.map(p => new t.Vector3(p.r3.x, p.r3.y, p.r3.z)));
  geo.setIndex(tris.flat())
  geo.computeVertexNormals()
  const mesh = new t.Mesh(geo, faceMat);
  model.add(mesh)
}

// scene.add(new t.Mesh(new t.SphereGeometry(1, 100, 100), new t.MeshBasicMaterial({
//   color: new t.Color("#ffffff"),
//   opacity: .06,
//   transparent: true,
//   side: t.DoubleSide
// })))

function warpGeo(geo, map) {
  const vertices = geo.attributes.position
  for (let i = 0; i < vertices.count; i++) {
    let v = new R3(vertices.getX(i), vertices.getY(i), vertices.getZ(i));
    v = map.apply(v);
    vertices.setX(i, v.x);
    vertices.setY(i, v.y);
    vertices.setZ(i, v.z);
  }
  geo.computeVertexNormals();
}

function main() {
  let c = null;
  const point = (i, phi = bestPhi, len = bestLen) => {
    const theta = i * tau / 5;
    return new H3(new R3(cos(theta) * len * cos(phi), -len * sin(phi), sin(theta) * len * cos(phi))).tx(c, null);
  }
  let bestLen = phi => solve(100, 0, 1, len => 
    point(0, phi, len).r3Dist(point(1, phi, len)) - len
  );
  const bestPhi = solve(100, 0, tau/4, phi => {
    const len = bestLen(phi);
    return tau/3 - H3.ang(
      point(0, phi, len),
      point(2, phi, len),
      H3.zero.lerp(point(1, phi, len), 1/2),
    )
  });
  bestLen = bestLen(bestPhi)
  const r = solve(100, 0, 1, r => r - point(0).r3Dist(new H3(new R3(0, -r, 0))));
  c = new H3(new R3(0, -r, 0));
  const top = c.neg();
  const points = [
    H3.zero,
    top, top.neg(),
    point(0), point(0).neg(),
    point(1), point(1).neg(),
    point(2), point(2).neg(),
    point(3), point(3).neg(),
    point(4), point(4).neg(),
  ];
  const edges = [...Array(5)].flatMap((_, i) => [
    [1, 3 + i * 2],
    [2, 4 + i * 2],
    [3 + i * 2, 3 + (i+1)%5 * 2],
    [4 + (i+2)%5 * 2, 4 + (i+3)%5 * 2],
    [4 + (i+2)%5 * 2, 3 + i * 2],
    [4 + (i+3)%5 * 2, 3 + i * 2],
  ])
  const faces = [...Array(5)].flatMap((_, i) => {
    const p = point(i)
    const q = point(i+1)
    const r = point(i+2).neg()
    const s = point(i+3).neg()
    return [
      [top, q, p],
      [top.neg(), p.neg(), q.neg()],
      [p, q, s],
      [p, s, r],
    ]
  })
  const mid = solve(100, 0, 1, q => 
    faces[0][0].lerp(faces[0][1], 1/2).lerp(faces[0][2], q)
      .tx(faces[0][1].lerp(faces[0][2], 1/2).lerp(faces[0][0], q), null)
      .r3.x
  )

  const midpoints = faces.map(face =>
    face[0].lerp(face[1], 1/2).lerp(face[2], mid)
  );

  // for(const face of faces) {
  //   const c = face[0].lerp(face[1], 1/2).lerp(face[2], mid)
  //   for (let i = 0; i < 3; i += 1) {
  //     let p = face[i].lerp(c, .0)
  //     let q = face[(i+1)%3].lerp(c, .0)
  //     let r = face[(i+2)%3].lerp(c, .0)
  //     for(let t = 0; t <= 1; t += .01) {
  //       drawPoint(p.lerp(q, t))
  //       drawPoint(p.lerp(q, 1/2).lerp(r, t*mid))
  //     }
  //   }
  // }

  let n = 0
  let l = Infinity;
  function drawCell(points, mat) {
    for(const edge of edges) {
      l = min(l, points[edge[0]].r3.sub(points[edge[1]].r3).norm())
      if(!uniq(points[edge[0]].r3.add(points[edge[1]].r3).div(2))) continue;
      n += 1;
      drawEdge(points[edge[0]], points[edge[1]], mat);
    }
  }

  const epsilon = 1e-5
  const epsilon2 = epsilon ** 2
  const buckets = {};
  function uniq(point) {
    point = R3.from(point);
    const x = floor(point.x / epsilon);
    const y = floor(point.y / epsilon);
    const z = floor(point.z / epsilon);
    for (const x_ of [x-1,x,x+1])
    for (const y_ of [y-1,y,y+1])
    for (const z_ of [z-1,z,z+1]) {
      const bucket = buckets[[x_, y_, z_]]
      if (bucket?.some(p => point.sub(p).norm2() < epsilon2)) {
        return false;
      }
    }
    (buckets[[x, y, z]] ??= []).push(point)
    return true;
  }

  // 6570
  // 81180

  let cells = [points];
  drawCell(points, new t.MeshNormalMaterial());
  for(let i = 0; cells.length != 0; i++) {
    const oldCells = cells;
    cells = [];
    for(const cell of oldCells) {
      for(const p of midpoints) {
        const points = flip(cell, p);
        if(!uniq(points[0])) {
          continue;
        }
        if(points[0].r3.norm() >= .94) continue;
        drawCell(points);
        cells.push(points);
      }
    }
  }

  console.log({ n, l })
  console.log(Math.max(...Object.values(buckets).map(x=>x.length)))

  for(const face of faces) {
    drawFace(...face)
  }

  function flip(points, p) {
    const v = p.r3.div(p.r3.norm());
    return points.map(q => {
      q = q.tx(p, null).r3;
      q = q.sub(v.mul(2 * q.dot(v)));
      return new H3(q).tx(null, p);
    });
  }
}

function hashPoint(p,m=false) {
  p = R3.from(p)
  return ""+[p.x,p.y,p.z].map(x=>Math[m ? "floor" : "ceil"](x*1000))
}

function solve(steps, min, max, goal) {
  for(let i = 0; i < steps; i++) {
    const avg = (min + max)/2
    const score = goal(avg);
    if (score === 0) return avg;
    if (score < 0) min = avg
    else max = avg
  }
  return (min + max)/2
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
const { acos, cos, sin, tan, sqrt, min, max, atan2, hypot, tanh, atanh, floor, ceil } = Math

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

  tiny() {
    return !(this.norm2() >= 1e-12)
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
    if (u.tiny()) u = new R3(1,0,0)
    v = v.sub(u.mul(u.dot(v)));
    if (v.tiny()) v = u.cross(new R3(1,0,0))
    if (v.tiny()) v = u.cross(new R3(0,1,0))
    v = v.div(v.norm());
    return new Map(
      p => new R2(p.dot(u), p.dot(v)),
      p => u.mul(p.x).add(v.mul(p.y)),
    )
  }

  static ang(a, b, o = null) {
    if (o) {
      a = a.sub(o)
      b = b.sub(o)
    }
    return acos(a.dot(b) / a.norm() / b.norm())
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
    if(from == null && to == null) {
      return new Map(p => p);
    }
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

  r3Dist(that) {
    return this.tx(that, null).r3.norm()
  }

  neg() {
    return new H3(this.r3.mul(-1))
  }
  
  lerp(that, t) {
    that = that.tx(this, null)
    that = new H3(that.r3.mul(tanh(t * atanh(that.r3.norm())) / that.r3.norm()))
    return that.tx(null, this)
  }

  static ang(a, b, o = null) {
    return R3.ang(a.tx(o, null).r3, b.tx(o, null).r3)
  }
}

main()

