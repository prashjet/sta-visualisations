'use strict';

const $ = id => document.getElementById(id);
const categories = ['A', 'B', 'C', 'D'];
const controls = ['apply', 'one', 'thousand', 'ten-thousand', 'reset'];
const initialRight = 16;
const left = 65, right = 502, plotTop = 14, bottom = 198;
const statistics = [];
let sampleSize, expected, cutoffs;
let latest = null;
let xMax = initialRight;

function drawSample() {
  const observed = categories.map(() => 0);
  for (let i = 0; i < sampleSize; i++) {
    const u = Math.random();
    const category = cutoffs.findIndex(cutoff => u < cutoff);
    observed[category]++;
  }
  const contributions = observed.map((count, i) => (count - expected[i]) ** 2 / expected[i]);
  const statistic = contributions.reduce((sum, contribution) => sum + contribution, 0);
  return { observed, contributions, statistic };
}

function add(svg, tag, attributes, label) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (label !== undefined) element.textContent = label;
  svg.append(element);
}

function axes(svg, ticks, y, yLabel, xLabel, format = String) {
  svg.replaceChildren();
  for (const tick of ticks) {
    const position = y(tick);
    add(svg, 'line', { x1: left, x2: right, y1: position, y2: position, stroke: '#e4eae3' });
    add(svg, 'text', { x: left - 8, y: position + 5, 'text-anchor': 'end' }, format(tick));
  }
  add(svg, 'text', { transform: 'translate(17 106) rotate(-90)', 'text-anchor': 'middle' }, yLabel);
  add(svg, 'text', { x: (left + right) / 2, y: 246, 'text-anchor': 'middle' }, xLabel);
}

function bar(svg, x, y, width, fill) {
  add(svg, 'rect', { x, y, width, height: bottom - y, fill });
}

function renderCounts() {
  const svg = $('counts');
  const observed = latest?.observed;
  const y = count => bottom - count / sampleSize * (bottom - plotTop);
  const groupWidth = (right - left) / categories.length;
  const tickStep = Math.ceil(sampleSize / 5);
  const ticks = Array.from({ length: Math.floor(sampleSize / tickStep) + 1 }, (_, i) => i * tickStep);
  axes(svg, ticks, y, 'Count', 'Category');
  categories.forEach((category, i) => {
    const x = left + (i + 0.5) * groupWidth;
    bar(svg, x + 3, y(expected[i]), 30, '#a1b3a8');
    if (observed) bar(svg, x - 33, y(observed[i]), 30, '#2474b5');
    add(svg, 'text', { x, y: bottom + 21, 'text-anchor': 'middle' }, category);
  });
  const expectedLabel = 'Expected counts for A through D: ' + expected.map(value => Number(value.toPrecision(6))).join(', ');
  svg.setAttribute('aria-label', observed
    ? expectedLabel + '. Observed counts: ' + observed.join(', ')
    : expectedLabel);
  $('statistic').textContent = latest ? latest.statistic.toFixed(3) : '—';
  const contributions = categories.map((category, i) => {
    const label = document.createElement('span');
    label.textContent = category + ' ' + (latest ? latest.contributions[i].toFixed(3) : '—');
    return label;
  });
  $('contributions').replaceChildren(...contributions);
}

function referenceDensity(t) {
  return Math.sqrt(t / (2 * Math.PI)) * Math.exp(-t / 2);
}

function renderSampling() {
  const svg = $('sampling');
  const sampleCount = statistics.length;
  const binWidth = sampleCount < 200 ? 1 : sampleCount < 2000 ? 0.5 : sampleCount < 10000 ? 0.25 : 0.125;
  const bins = new Map();
  for (const statistic of statistics) {
    const bin = Math.floor(statistic / binWidth);
    bins.set(bin, (bins.get(bin) ?? 0) + 1);
  }
  const densities = new Map();
  let peak = 0;
  for (const [bin, count] of bins) {
    const density = count / (sampleCount * binWidth);
    densities.set(bin, density);
    peak = Math.max(peak, density);
  }
  const yMax = peak <= 0.3 ? 0.3 : peak <= 0.5 ? 0.5 : Math.ceil(peak);
  const x = value => left + value / xMax * (right - left);
  const y = density => bottom - density / yMax * (bottom - plotTop);
  const divisions = yMax === 0.3 ? 3 : yMax === 0.5 ? 5 : 4;
  const ticks = Array.from({ length: divisions + 1 }, (_, i) => i * yMax / divisions);
  axes(svg, ticks, y, 'Density', 'T', tick => Number(tick.toFixed(2)).toString());
  const step = xMax <= 24 ? 4 : 4 * Math.ceil(xMax / 32);
  for (let tick = 0; tick <= xMax; tick += step) {
    add(svg, 'text', { x: x(tick), y: bottom + 23, 'text-anchor': 'middle' }, tick);
  }
  densities.forEach((density, i) => {
    if (density > 0) bar(svg, x(i * binWidth), y(density), x(binWidth) - x(0), '#77b4a2');
  });
  const curve = Array.from({ length: 401 }, (_, i) => {
    const t = i === 400 ? xMax : Math.min(xMax, 40) * i / 400;
    return (i ? 'L' : 'M') + x(t).toFixed(2) + ',' + y(referenceDensity(t)).toFixed(2);
  });
  add(svg, 'path', { d: curve.join(' '), fill: 'none', stroke: '#b76b27', 'stroke-width': 3 });
  if (latest) {
    const marker = x(latest.statistic);
    add(svg, 'path', {
      d: `M ${marker} ${bottom} l -6 8 h 12 Z`,
      fill: '#7a417b'
    });
  }
  $('summary').textContent = 'Samples drawn: ' + sampleCount.toLocaleString('en-US') + ' · Bin width: ' + binWidth;
}

function render() {
  renderCounts();
  renderSampling();
}

function accumulate(count) {
  for (let i = 0; i < count; i++) {
    latest = drawSample();
    statistics.push(latest.statistic);
    xMax = Math.max(xMax, 4 * (Math.floor(latest.statistic / 4) + 1));
  }
}

function draw(count) {
  accumulate(count);
  render();
}

async function drawBatch(count) {
  for (const id of controls) $(id).disabled = true;
  $('summary').textContent = 'Drawing ' + count.toLocaleString('en-US') + ' samples…';
  const batchSize = Math.max(1, Math.floor(250000 / sampleSize));
  try {
    for (let remaining = count; remaining > 0; remaining -= batchSize) {
      await new Promise(resolve => setTimeout(resolve, 0));
      accumulate(Math.min(remaining, batchSize));
    }
    render();
  } finally {
    for (const id of controls) $(id).disabled = false;
  }
}

function applyModel() {
  const n = $('n').valueAsNumber;
  const probabilities = categories.map(category => $('p-' + category).valueAsNumber);
  const sum = probabilities.reduce((total, probability) => total + probability, 0);
  if (Math.abs(sum - 1) > 1e-9) {
    $('model-status').textContent = 'Null probabilities must add up to 1.';
    return;
  }
  $('model-status').textContent = '';
  sampleSize = n;
  expected = probabilities.map(probability => n * probability);
  let cumulative = 0;
  cutoffs = probabilities.map(probability => (cumulative += probability));
  cutoffs[cutoffs.length - 1] = 1;
  statistics.length = 0;
  latest = null;
  xMax = initialRight;
  $('sample-size').textContent = n;
  render();
}

$('model').addEventListener('submit', event => {
  event.preventDefault();
  if (!$('apply').disabled) applyModel();
});
$('one').addEventListener('click', () => draw(1));
$('thousand').addEventListener('click', () => draw(1000));
$('ten-thousand').addEventListener('click', () => drawBatch(10000));
$('reset').addEventListener('click', () => {
  $('model').reset();
  applyModel();
});
applyModel();
for (const id of controls) $(id).disabled = false;
