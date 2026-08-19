// Cover chart: cold prefill t/s vs context — upstream decays, ours holds.
// 1200x630 design canvas, rendered 2x.
import sharp from "sharp";

const W = 1200, H = 630;
const P = { l: 110, r: 130, t: 110, b: 110 };
const labels = ["8k", "32k", "64k", "128k"];
const before = [571, 490, 392, 390];
const after = [584, 530, 475, 485];
const deltas = ["+2.3%", "+8.2%", "+21.2%", "+24.2%"];

const BG = "#17181c";
const GRID = "#2a2c33";
const MUTED = "#82868f";
const FG = "#e8e9ec";
const TEAL = "#2fd6b7";

const yMin = 340, yMax = 640;
const x = (i) => P.l + (i * (W - P.l - P.r)) / (labels.length - 1);
const y = (v) => P.t + ((yMax - v) * (H - P.t - P.b)) / (yMax - yMin);
const pts = (a) => a.map((v, i) => `${x(i)},${y(v)}`).join(" ");

const gapPoly = [...after.map((v, i) => `${x(i)},${y(v)}`), ...before.map((v, i) => `${x(i)},${y(v)}`).reverse()].join(" ");

const gridLines = [400, 480, 560].map(
  (v) => `<line x1="${P.l - 20}" y1="${y(v)}" x2="${W - P.r + 20}" y2="${y(v)}" stroke="${GRID}" stroke-width="1"/>`
).join("");

const dots = (arr, color, r) => arr.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="${r}" fill="${color}"/>`).join("");
const valueLabels = (arr, color, dy, weight) => arr.map((v, i) =>
  `<text x="${x(i)}" y="${y(v) + dy}" text-anchor="middle" fill="${color}" font-size="19" font-weight="${weight}" font-family="ui-sans-serif, -apple-system, 'Helvetica Neue', Arial">${v}</text>`
).join("");

const ticks = labels.map((l, i) => `
  <text x="${x(i)}" y="${H - P.b + 46}" text-anchor="middle" fill="${FG}" font-size="20" font-family="ui-sans-serif, -apple-system, 'Helvetica Neue', Arial">${l}</text>
  <text x="${x(i)}" y="${H - P.b + 74}" text-anchor="middle" fill="${TEAL}" font-size="19" font-weight="600" font-family="ui-sans-serif, -apple-system, 'Helvetica Neue', Arial">${deltas[i]}</text>`
).join("");

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="${BG}"/>
${gridLines}
<polygon points="${gapPoly}" fill="${TEAL}" fill-opacity="0.08"/>
<polyline points="${pts(before)}" fill="none" stroke="${MUTED}" stroke-opacity="0.55" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<polyline points="${pts(after)}" fill="none" stroke="${TEAL}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
${dots(before, MUTED, 5)}
${dots(after, TEAL, 6)}
${valueLabels(before, MUTED, 34, 400)}
${valueLabels(after, FG, -18, 600)}
${ticks}
<text x="${W - P.r + 26}" y="${y(after[3]) + 7}" fill="${TEAL}" font-size="21" font-weight="600" font-family="ui-sans-serif, -apple-system, 'Helvetica Neue', Arial">ds4+</text>
<text x="${W - P.r + 26}" y="${y(before[3]) + 7}" fill="${MUTED}" font-size="21" font-family="ui-sans-serif, -apple-system, 'Helvetica Neue', Arial">main</text>
<text x="${P.l - 20}" y="52" fill="${MUTED}" font-size="20" font-family="ui-sans-serif, -apple-system, 'Helvetica Neue', Arial">cold prefill, tokens/s · DeepSeek V4 Flash · M3 Ultra</text>
</svg>`;

await sharp(Buffer.from(svg), { density: 192 }).resize(2400, 1260).png().toFile(process.argv[2]);
console.log("cover written", process.argv[2]);
