/// <reference lib="dom"/>

import * as t from "https://esm.sh/three@0.184.0";
import { OrbitControls } from 'https://esm.sh/three@0.184.0/addons/controls/OrbitControls.js';

const width = window.innerWidth, height = window.innerHeight;

const camera = new t.PerspectiveCamera( 100, width / height, 0.01, 100 );
camera.position.set(0,0,9);
// camera.position.set(4,4,4);
// camera.position.set(4.5,4.5,4.5);

const scene = new t.Scene();

let faces = [
  [
    [ 0, +2,  0],
    [+1, +1, +1],
    [+2,  0,  0],
    [+1, +1, -1],
  ], [
    [ 0,  0, +2],
    [+1, +1, +1],
    [ 0, +2,  0],
    [-1, +1, +1],
  ], [
    [+2,  0,  0],
    [+1, +1, +1],
    [ 0,  0, +2],
    [+1, -1, +1],
  ], [
    [+2,  0,  0],
    [+1, -1, +1],
    [ 0, -2,  0],
    [+1, -1, -1],
  ], [
    [ 0, +2,  0],
    [+1, +1, -1],
    [ 0,  0, -2],
    [-1, +1, -1],
  ], [
    [ 0,  0, +2],
    [-1, +1, +1],
    [-2,  0,  0],
    [-1, -1, +1],
  ], [
    [-2,  0,  0],
    [-1, +1, +1],
    [ 0, +2,  0],
    [-1, +1, -1],
  ], [
    [ 0, -2,  0],
    [+1, -1, +1],
    [ 0,  0, +2],
    [-1, -1, +1],
  ], [
    [ 0,  0, -2],
    [+1, +1, -1],
    [+2,  0,  0],
    [+1, -1, -1],
  ], [
    [ 0, -2,  0],
    [-1, -1, +1],
    [-2,  0,  0],
    [-1, -1, -1],
  ], [
    [ 0,  0, -2],
    [+1, -1, -1],
    [ 0, -2,  0],
    [-1, -1, -1],
  ], [
    [-2,  0,  0],
    [-1, +1, -1],
    [ 0,  0, -2],
    [-1, -1, -1],
  ],
]

let edges = faces.map(([a,b,c,d]) => [[a,b],[c,d]]).flat(1)

const geometry = new t.BufferGeometry();
geometry.setAttribute("position", new t.BufferAttribute(new Float32Array(faces.map(([a,b,c,d]) => [a,b,c,c,d,a]).flat(2)), 3));
geometry.setIndex([...Array(geometry.getAttribute("position").array.length/3)].map((_,i)=>i))
geometry.computeVertexNormals()
console.log(geometry)

const edgeLength = Math.sqrt(3)


const material = new t.MeshStandardMaterial();

scene.add(new t.PointLight(new t.Color("#bdc3c7"),40))
const light = new t.DirectionalLight(new t.Color("#151820"),4)
light.position.set(0,0,1)
light.position.set(1,1,1)
scene.add(light)

const mesh = new t.Mesh( geometry, material );
// scene.add( mesh );

const group = new t.Group();
const edgeGeometry = new t.CylinderGeometry(.1,.1,edgeLength,32,1,true);
edgeGeometry.applyMatrix4(new t.Matrix4().makeTranslation(0,edgeLength/2,0))
edgeGeometry.applyMatrix4(new t.Matrix4().makeRotationX(Math.PI/2))
for(const edge of edges.slice(0)) {
  const cyl = new t.Mesh(edgeGeometry, material)
  cyl.position.copy(new t.Vector3(...edge[0]))
  cyl.lookAt(new t.Vector3(...edge[1]))
  group.add(cyl)
}

let size = 10

// scene.background = new t.Color("#ff0000")

scene.fog = new t.FogExp2(new t.Color("#000000"),.06)

for(let x = -size; x <= size; x++)
for(let y = -size; y <= size; y++)
for(let z = -size; z <= size; z++)
{
  if((x + y + z) % 2 != 0) continue
  group.position.set(x*2,y*2,z*2)
  scene.add(group.clone())
}

const renderer = new t.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
renderer.setAnimationLoop(tick);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls( camera, renderer.domElement );
// camera.position.set( 0, 20, 100 );
controls.update();


function tick() {
  controls.update();
  renderer.render( scene, camera );
}

window.addEventListener("keypress", async () => {
  const res = 8
    const width = window.innerWidth * res
    const height = window.innerHeight * res
  const canvas = new OffscreenCanvas(width, height)
  const renderer = new t.WebGLRenderer({ canvas, antialias: true })
  renderer.render(scene, camera)
  const blob = await canvas.convertToBlob()
  console.log(canvas, blob)
  let url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href=url
  link.download="image.png"
  link.click()
})

