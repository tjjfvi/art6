
const ns = "http://www.w3.org/2000/svg";

const lineWeight = 5;
const lineGap = 20;
const rowGap = 15;
const gateGap = 15/rowGap;

const backgroundColor = "#151820";
const gateColorActive = "#bdc3c7";
const gateColorInactive = "#93989d";

const svg = document.querySelector("svg");
const defs = el(svg, "defs");
const background = el(svg, "g");
const lines = el(svg, "g");
const gates = el(svg, "g");

const n = 64;
const values = backwards(n);
// const values = bitrev(n);
// const values = cool(n);
// const values = shuffle(n);
const rows = Array.from({ length: n }, () => 0);


let row = 1
for (let p = 1; p < n; p *= 2) {
  for (let k = p; k >= 1; k /= 2) {
    for (let j = k % p; j <= n-k; j += 2*k) {
      for (let i = 0; i < k && i < n-j-k; i += 1) {
        if (Math.floor((i+j) / (p*2)) === Math.floor((i+j+k) / (p*2))) {
          // gate(i+j, row+i, i+j+k, row+i);
          gate(i+j, row+i*gateGap, i+j+k, row+i*gateGap);
          // gate(i+j, row, i+j+k, row);
        }
      }
    }
    row += k*gateGap;
    // row += 1;
  }
}

for (let i = 0; i < n; i++) {
  line(i, row);
}

const [width, height] = point(n, row+1);
svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
el(background, "rect", { x: 0, y: 0, width, height, fill: backgroundColor });
document.body.style.background = backgroundColor;

function line(index, endRow) {
  const value = values[index];
  const startRow = rows[index];
  const [x1, y1] = point(index, startRow);
  const [x2, y2] = point(index, endRow);
  el(lines, "line", {
    x1, y1, x2, y2,
    stroke: color(value),
    "stroke-linecap": "round",
    "stroke-width": lineWeight,
  });
  rows[index] = endRow;
}

function gate(startIndex, startRow, endIndex, endRow) {
  line(startIndex, startRow);
  line(endIndex, endRow);
  const active = values[startIndex] > values[endIndex];
  const gateColor = active ? gateColorActive : gateColorInactive;
  const [x1, y1] = point(startIndex, startRow);
  const [x2, y2] = point(endIndex, endRow);
  const c1 = color(values[startIndex]);
  const c2 = color(values[endIndex]);
  el(gates, "line", {
    x1, y1, x2, y2,
    stroke: backgroundColor,
    "stroke-linecap": "round",
    "stroke-width": lineWeight*2.5,
  });
  el(gates, "path", {
    d: `
      M${x1} ${y1+lineWeight*2}
      L${x1} ${y1}
      L${x2} ${y2}
      L${x2} ${y2+lineWeight*2}
    `,
    stroke: active ? gradient(c2, c1) : gradient(c1, c2),
    "stroke-linejoin": "round",
    "stroke-linecap": "round",
    "stroke-width": lineWeight,
    fill: "none",
  });
  if (active) {
    [values[startIndex], values[endIndex]] = [values[endIndex], values[startIndex]];
  }
}

function point(index, row) {
  return [
    (index + 1/2) * lineGap,
    (row + 1/2) * rowGap,
  ];
}

function color(value) {
  // return `hsl(${(value/n)*360}deg 100% 30%)`;
  return `hsl(${(value/n)*320}deg 100% ${20 + value % 4 * 10})`;
}

function el(parent, tag, attributes = {}) {
  const child = document.createElementNS(ns, tag);
  for(const attr in attributes) {
    child.setAttribute(attr, attributes[attr]);
  }
  parent.appendChild(child);
  return child;
}

function gradient(from, to) {
  const id = "g" + defs.children.length;
  const gradient = el(defs, "linearGradient", { id });
  el(gradient, "stop", { offset: "0%", "stop-color": from });
  el(gradient, "stop", { offset: "25%", "stop-color": from });
  el(gradient, "stop", { offset: "75%", "stop-color": to });
  el(gradient, "stop", { offset: "100%", "stop-color": to });
  return `url(#${id})`;
}

function sorted(n) {
  return Array.from({ length: n }, (_, i) => i);
}

function backwards(n) {
  return sorted(n).reverse();
}

function bitrev(n) {
  return Array.from({ length: n }, (_, i) =>
    parseInt(i.toString(2).padStart(Math.log2(n), 0).split("").reverse().join(""), 2)
  );
}

function vertib(n) {
  return bitrev(n).reverse();
}

function cool(n) {
  return vertib(n/4).flatMap(i => [i << 2 | 3, i << 2 | 1, i << 2 | 2, i << 2 | 0])
}

function shuffle(n) {
  const values = sorted(n);
  for(let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (n - i));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

