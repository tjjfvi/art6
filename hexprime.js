const canvas = document.getElementsByTagName("canvas")[0]
const ctx = canvas.getContext("2d")
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const hexScale = 5;

const tau = Math.PI * 2;
const { cos, sin, tan, sqrt } = Math

function hexCoord(x,y,z) {
  let a = -y
  let b = -z
  return [a * cos(tau/12) * hexScale + b * cos(tau/12) * cos(tau/6) * hexScale, b * cos(tau/12) * sin(tau/6) * hexScale]
}

function hex(pos) {
  let [x, y] = hexCoord(...pos)
  ctx.beginPath()
  ctx.strokeStyle = "white";
  ctx.fillStyle = "white";
  ctx.moveTo(x + sin(tau/6 * 0) * hexScale/2, y + cos(tau/6 * 0) * hexScale/2)
  for (let i = 1; i <= 6; i++) {
    ctx.lineTo(x + sin(tau/6 * i) * hexScale/2, y + cos(tau/6 * i) * hexScale/2)
  }
  // ctx.stroke();
  // ctx.fill();
}

function add(p, q) {
  return p.map((p,i)=>p+q[i])
}

function hexDir(i) {
  return [[1,-1,0],[1,0,-1],[0,1,-1],[-1,1,0],[-1,0,1],[0,-1,1]][i%6]
}

function* spiral() {
  yield [0,0,0];
  let pos = hexDir(5);
  let len = 1;
  let dir = 1;
  yield pos;
  while(true) {
    let cur = dir == 5 ? len + 1 : len;
    for(let i = 0; i < cur; i ++) {
      pos = add(pos, hexDir(dir))
      yield pos;
    }
    if(dir == 0) len += 1;
    dir += 1;
    dir %= 6;
  }
}

ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height)
ctx.translate(canvas.width/2, canvas.height/2)
ctx.rotate(-tau/12)
ctx.scale(1, -1)

const primes = []

;(async () => {
let i = 0;
for(const pos of spiral()) {
  console.log(i)
  hex(pos);
  if(i >= 2 && primes.every(p => i % p)) {
    ctx.fill();
    primes.push(i)
  }
  i++;
  if(i % 100 == 0) {
  await new Promise(r => setTimeout(r, 0))
  }
  // if(i++ === 10) {
  //   break;
  // }
}
})()

// for(let dir = 0; dir < 60; dir += 1) {
//   pos = [0,0,0];
//   for(let i = 0; i < dir; i++) {
//     pos = add(pos, hexDir(dir))
//   }
//   hex(pos)
// }

// hex([0, 0, 0])
// hex([1, -1, 0])
// hex([2, -2, 0])
// hex([1, 0, -1])
// hex([2, -1, -1])
// hex([3, -2, -1])


console.log("hi")
