const canvas = document.getElementsByTagName("canvas")[0]
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


const tau = Math.PI * 2;
const { cos, sin, tan, sqrt } = Math

const phi = (1 + sqrt(5))/2

let max = 10_000_000

function isPrime(n) {
  if(n < 2) return false
  for (const prime of primes) {
    if (n % prime == 0) return false
    if (prime * prime > n) return true
  }
  return true
}

let primes = []
for(let i = 0; i < max; i++) {
  if(isPrime(i)) {
    primes.push(i)
  }
}

console.log(primes)

function render(canvas, res=1) {
  const ctx = canvas.getContext("2d")

  let pointScale = res * 1;
  let spiralScale = res * .5;

  function point(i, color="white") {
    ctx.fillStyle = color;
    ctx.beginPath()
    let a = (i/phi) % 1;
    let b = i;
    let t = a * tau;
    let r = sqrt(b)
    let x = cos(t) * r;
    let y = sin(t) * r;
    ctx.arc(x * spiralScale, y * spiralScale, pointScale, 0, tau)
    ctx.fill()
  }

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.translate(canvas.width/2, canvas.height/2)

  for(const prime of primes) {
    point(prime)
  }

  for(let i = 0; i < max; i += 144) {
    // point(i, "red")
  }
}

render(canvas)

window.addEventListener("keypress", async () => {
  const res = 8
  const width = window.innerWidth * res
  const height = window.innerHeight * res
  const canvas = new OffscreenCanvas(width, height)
  render(canvas, res)
  const blob = await canvas.convertToBlob()
  console.log(canvas, blob)
  let url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href=url
  link.download="primal.png"
  link.click()
})

