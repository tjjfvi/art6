/// <reference lib="dom"/>
// @ts-check

import * as t from "https://esm.sh/three@0.184.0?dev";
import * as tsl from "https://esm.sh/three@0.184.0/tsl?dev";
import { OrbitControls } from "https://esm.sh/three@0.184.0/addons/controls/OrbitControls.js?dev";
import { NodeMaterial, WebGPURenderer, RenderPipeline, CanvasTarget } from "https://esm.sh/three@0.184.0/webgpu?dev";

let render = window.location.toString().includes("?render")
const res = render ? Math.floor(Math.min(8192/window.innerWidth, 8192/window.innerHeight)) : 1;

const iwidth = window.innerWidth;
const iheight = window.innerHeight;

const width = window.innerWidth * res;
const height = window.innerHeight * res;


const canvas = render ? new OffscreenCanvas(width, height) : document.querySelector("canvas")

canvas.width = width
canvas.height = height


// const camera = new t.PerspectiveCamera( 100, width / height, 0.01, 10000 );
// camera.position.set(0,0,1000);

const near = .001
const far = 100000
let scale = 10
const camera = new t.OrthographicCamera(-iwidth/2*scale, iwidth/2*scale, iheight/2*scale, -iheight/2*scale, near, far)
camera.position.set(0,0,10000);
// camera.position.set(0,0,-10000);
// camera.position.set(-10000,0,0);

const fgScene = new t.Scene();
const bgScene = new t.Scene();

// const mesh = new t.Mesh(new t.BoxGeometry(100,1,100), new t.MeshNormalMaterial())
const mesh = new t.Mesh(new t.CylinderGeometry(100, 100, 1000, ), new t.MeshNormalMaterial())
mesh.geometry.setAttribute("up",
  new t.BufferAttribute(new Float32Array(
    [...Array(mesh.geometry.getAttribute("position").count)].flatMap((_,i)=>[0,1,0])
  ),3)
);
mesh.rotateX(Math.PI/2)
// const mesh = new t.Mesh(new t.SphereGeometry(100), new t.MeshNormalMaterial())

// fgScene.add(mesh)


const renderer = new WebGPURenderer({ canvas, antialias: true });
const renderPipeline = new RenderPipeline(renderer);
const fgPass = tsl.pass(fgScene, camera)
const bgPass = tsl.pass(bgScene, camera)
bgPass.setMRT(tsl.mrt({
  output: tsl.output,
  depth: tsl.depth,
  normal: tsl.normalView,
}))
const maskColor = tsl.texture(bgPass.getTextureNode("output"), tsl.screenCoordinate.div(tsl.screenSize));
const maskDepth = tsl.texture(bgPass.getTextureNode("depth"), tsl.screenCoordinate.div(tsl.screenSize));
const maskNormal = tsl.texture(bgPass.getTextureNode("normal"), tsl.screenCoordinate.div(tsl.screenSize));

renderPipeline.outputNode = fgPass

const controls = new OrbitControls( camera, document.querySelector("canvas") );
// camera.translateY(height/2);
// controls.target.y = height/2;
controls.update();

if (render) {
  renderer.init().then(async () => {
    renderPipeline.render()
    const blob = await canvas.convertToBlob()
    console.log(canvas, blob)
    let url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href=url
    link.download="image.png"
    link.click()
  })
} else {
  renderer.setAnimationLoop(tick);
}




function tick() {
  controls.update();
  renderPipeline.render();
}

const { cos, sin, hypot, atan2, sqrt } = Math;
const tau = Math.PI * 2;

class R3 {
  static zero = new R3(0,0,0);

  x; y; z;

  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
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

  unit() {
    return this.div(this.norm())
  }

  transform(x, y, z) {
    return x.mul(this.x).add(y.mul(this.y)).add(z.mul(this.z))
  }
}

class Sin {
  width; height; depth; phase
  constructor(width, height, depth, phase) {
    Object.assign(this, { width, height, depth, phase })
  }

  reset() {
    this.set(0);
  }

  set(t) {
    const dt = 1;
    const ang = (t + this.phase) * tau;
    const dang = tau;
    const s = sin(ang);
    const S = sin(ang * 2);
    const ds = cos(ang) * dang;
    const dS = cos(ang * 2) * dang * 2;
    this.pos = new R3(
      s * this.width,
      t * this.height,
      S * this.depth,
    );
    this.vel = new R3(
      ds * this.width,
      dt * this.height,
      dS * this.depth,
    );
  }
}

class Speed {
  curve;
  constructor(curve) {
    this.curve = curve;
  }

  reset() {
    this.curve.reset();
    this.t = 0;
    this.u = 0;
    this.pos = this.curve.pos;
    this.vel = this.curve.vel;
  }

  set(t) {
    const delta_t = t - this.t;
    const delta_u = delta_t / this.curve.vel.norm();
    this.t = t;
    this.u += delta_u;
    this.curve.set(this.u);
    this.pos = this.curve.pos;
    this.vel = this.curve.vel.unit();
  }
}

class Along {
  small; big;
  constructor(small, big) {
    Object.assign(this, { small, big })
  }

  reset() {
    this.small.reset();
    this.big.reset();
    this.x = new R3(1,0,0);
    this.update();
  }

  set(t) {
    this.small.set(t);
    this.big.set(this.small.pos.y);
    this.update();
  }

  update() {
    const y = this.big.vel;
    const x = this.x = this.x.sub(y.mul(y.dot(this.x))).unit();
    const z = x.cross(y);
    this.pos = this.big.pos.add(this.small.pos.transform(x, R3.zero, z));
    this.vel = this.small.vel.transform(x, y, z);
  }
}

const duration = 50000;
// const duration = 20;
const timeStep = 4;

const fgThickness = 6;
const bgThickness = 10;

const fg = new t.Color().setHex(0x46c676);
// const bg = new t.Color().setHex(0x151820);
const bg = new t.Color().setHex(0);

// const fgMat = new t.MeshBasicMaterial({ color: fg });
// const bgMat = new t.MeshBasicMaterial({ color: bg });

// const fgMat = new t.MeshNormalMaterial();
// const bgMat = new t.MeshNormalMaterial();


fgScene.background = bg;



const material2 = new NodeMaterial();
material2.colorNode = tsl.Fn(() => {
  let up = tsl.attribute("up", "vec3").transformDirection(tsl.modelWorldMatrix).transformDirection(tsl.cameraWorldMatrix)
  // let up = tsl.vec3(0,1,0).transformDirection(tsl.cameraWorldMatrix)
  let normal = tsl.normalView
  let into = tsl.vec3(0,0,1)
  into = tsl.normalize(into.sub(up.mul(into.dot(up))))
  // normal = up

  let output = tsl.vec4();
  let t = normal.dot(into)

  tsl.If(t.greaterThan(.8), () => {
    output.assign(tsl.vec3(fg.r,fg.g,fg.b))
  }).Else(() => {
    output.assign(tsl.vec3(bg.r,bg.g,bg.b))
  });
  return output
})();
// mesh.material = material2

// const baseScale = 1/10;
// curves(5)

// const bgMat = material2;
const bgMat = new t.MeshNormalMaterial();



let colorId = 0;
let colorStep = 1

const baseScale = 1;
// curves(1)
curves(3)

function curves(layer, parent) {
  if (layer < 0) return makePath(parent);
  const scale = baseScale * 4 ** layer;
  for (let i = 0; i < 3; i++) {
    // if(layer == 1 && i != 0) continue;
    // let curve = new Speed(new Sin(30*scale,225*scale, 20*scale, (i-1)/3));
    let curve = new Speed(new Sin(30*scale,120*scale, 15*scale, (i-1)/3));
    if (parent) {
      curve = new Speed(new Along(curve, parent));
    }
    curves(layer - 1, curve);
  }
}

function makePath(curve) {
  curve.reset();
  const points = []
  for(let time = 0; time >= -duration; time -= timeStep) {
    curve.set(time)
    points.push({ pos: curve.pos, vel: curve.vel })
  }
  points.reverse();
  curve.reset();
  for(let time = timeStep; time <= duration; time += timeStep) {
    curve.set(time)
    points.push({ pos: curve.pos, vel: curve.vel })
  }
  
  let fgLast;
  let bgLast;
  const fgVerts = [];
  const bgVerts = [];
  const indices = [];
  const up = [];
  const radial = 20;
  let x = new R3(1,0,0);
  for(const point of points) {
    const y = point.vel;
    x = x.sub(y.mul(y.dot(x))).unit();
    const z = y.cross(x);
    const p = (i, r) => {
      const c = cos(i / radial * tau);
      const s = sin(i / radial * tau);
      const p = point.pos.add(x.mul(c).add(z.mul(s)).mul(r));
      return new t.Vector3(p.x,p.y,p.z);
    }
    const ps = (v,r) => Array.from({ length: radial }, (_, i) => v.push(p(i, r))-1)
    const fgCur = ps(fgVerts, fgThickness)
    const bgCur = ps(bgVerts, bgThickness)
        for(let i = 0; i < radial; i++) up.push(point.vel.x,point.vel.y,point.vel.z)
    if (fgLast && bgLast) {
      for(let i = 0; i < radial; i++) {
        const j = (i + 1) % radial;
        indices.push(bgLast[i], bgLast[j], bgCur[j], bgLast[i], bgCur[j], bgCur[i])
      }
    }
    fgLast = fgCur;
    bgLast = bgCur;
  }

  let degree = 2
  // let fg = new t.Color().setHSL(colorId/81*.95, 1, .5)
  // let fgc = 27 <= colorId && colorId < 54 ? new t.Color().setHSL(colorId/27*.95, 1, .5): new t.Color().setHex(0xbdc3c7);
  let fgc = new t.Color().setHSL((colorId % 27 -13)/81*.6+Math.floor(colorId/27)/3, 1, ((colorId % 3) - 2)*.2 + .5 );
  const color = new t.Color((colorId >> degree*2) % (1<<degree) / (1<<degree), (colorId >> degree) % (1<<degree) / (1<<degree), colorId % (1<<degree) / (1<<degree))
  colorId += colorStep


  const fgMat = new NodeMaterial();
  fgMat.colorNode = tsl.vec4(fgc.r,fgc.g,fgc.b)

  // fgMat.colorNode = maskNormal.z
  fgMat.maskNode = tsl.bool(true);
  // fgMat.colorNode = tsl.depth.sub(maskDepth).mul(10).add(.5)
  let tup = tsl.normalize(tsl.attribute("up","vec3")).transformDirection(tsl.cameraWorldMatrix)
  // let tupz = tsl.sqrt(maskNormal.z.mul(tup.z))
  let tupz = tsl.vec3(maskNormal.z, tup.z, 0)
  fgMat.colorNode = tsl.orthographicDepthToViewZ(tsl.depth, near, far).sub(tsl.orthographicDepthToViewZ(maskDepth, near, far)).mul(-1).div(bgThickness-fgThickness).mul(
   // tsl.normalize(tsl.normalView).z
   tsl.sqrt(tsl.float(1).sub(tupz.mul(tupz)))
   ).sub(2)
   fgMat.colorNode = tsl.vec3(fgMat.colorNode.x, fgMat.colorNode.y, 0)
  // fgMat.colorNode = tsl.vec3(tup.z, maskNormal.z, 0).mul(.5).add(.5)
  // fgMat.colorNode = tsl.sqrt(tsl.float(1).sub(tup.z.mul(tup.z)))
  const diff = maskColor.sub(tsl.vec4(color.r,color.g,color.b,1))
  // fgMat.maskNode = fgMat.colorNode.x.lessThan(0)
  fgMat.colorNode = tsl.vec4(fgc.r,fgc.g,fgc.b)
  fgMat.maskNode = fgMat.maskNode.and(diff.dot(diff).lessThan(1/128**2))

  // fgMat.maskNode = maskColor.equal( tsl.vec4(color.r,color.g,color.b,1) )

  const fgGeo = new t.BufferGeometry();
  fgGeo.setFromPoints(fgVerts);
  fgGeo.setIndex(indices);
  fgGeo.computeVertexNormals();

  const bgGeo = new t.BufferGeometry();
  bgGeo.setFromPoints(bgVerts);
  bgGeo.setIndex(indices);
  bgGeo.setAttribute("normal", new t.BufferAttribute(new Float32Array(up), 3));

  fgScene.add(new t.Mesh(fgGeo, fgMat));
  fgScene.add(new t.Mesh(bgGeo, new t.MeshBasicMaterial({ color: bg, side: t.BackSide })));
  bgScene.add(new t.Mesh(bgGeo, new t.MeshBasicMaterial({ color })));
}

