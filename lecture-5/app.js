'use strict';
const ids = ['mu','n','sigma','eta','lambda'];
const defaults = [-7.5,12,1.2,-6,0.8];
const controls = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
let draws;
// A seeded initial sample makes the lecture's starting view reproducible.
function makeDraws(seed) {
  const random = () => {seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296;};
  return Array.from({length:200}, () => Math.sqrt(-2*Math.log(Math.max(random(),1e-12)))*Math.cos(2*Math.PI*random()));
}
const svg = document.getElementById('chart');
function element(name, attrs, text) {
 const el = document.createElementNS('http://www.w3.org/2000/svg', name);
 Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v));
 if(text !== undefined) el.textContent = text;
 svg.appendChild(el); return el;
}
function update() {
 const showPosterior = document.getElementById('show-posterior').checked;
 document.getElementById('posterior-legend').hidden = !showPosterior;
 document.querySelectorAll('.posterior-result').forEach(el=>el.hidden=!showPosterior);
 const p = Object.fromEntries(ids.map(id => [id, Number(controls[id].value)]));
 ids.forEach(id => document.getElementById(id+'-value').textContent = id==='n' ? p[id] : p[id].toFixed(2));
 const xbar = p.n === 0 ? 0 : p.mu + p.sigma*draws.slice(0,p.n).reduce((a,b)=>a+b,0)/p.n;
 const dataPrecision = p.n/p.sigma**2, priorPrecision = 1/p.lambda**2;
 const variance = 1/(dataPrecision+priorPrecision), mean = variance*(dataPrecision*xbar+priorPrecision*p.eta);
 const curves = [{m:xbar,s:p.sigma/Math.sqrt(p.n),c:'#2474b5',dash:'7 4'}, {m:p.eta,s:p.lambda,c:'#b76b27',dash:'3 4'}, {m:mean,s:Math.sqrt(variance),c:'#15816a',dash:''}].filter((c,i)=>(p.n>0 || i>0) && (i!==2 || showPosterior));
 const lo = -10, hi = -2;
 const ymax = Math.max(p.n === 0 ? 1 : 0,...curves.map(c=>1/(c.s*Math.sqrt(2*Math.PI))))*1.12;
 const left=66,right=826,top=24,bottom=375;
 const X = x => left+(x-lo)/(hi-lo)*(right-left), Y = y => bottom-y/ymax*(bottom-top);
 svg.querySelectorAll(':scope > :not(title):not(desc)').forEach(el=>el.remove());
 for(let i=0;i<=4;i++) {const v=ymax*i/4,y=Y(v);element('line',{x1:left,x2:right,y1:y,y2:y,stroke:'#e4eae3'});element('text',{x:left-10,y:y+4,'text-anchor':'end'},v.toFixed(ymax>10?1:2));}
 for(let i=0;i<=8;i++) {const v=lo+(hi-lo)*i/8; element('text',{x:X(v),y:bottom+24,'text-anchor':'middle'},v.toFixed(1));}
 if(p.mu >= lo && p.mu <= hi) {
 element('line',{x1:X(p.mu),x2:X(p.mu),y1:top,y2:bottom,stroke:'#87958a','stroke-dasharray':'2 5'});
 element('text',{x:X(p.mu),y:top-8,'text-anchor':'middle'},'true μ');
 }
 if(p.n === 0) element('line',{x1:left,x2:right,y1:Y(1),y2:Y(1),stroke:'#2474b5','stroke-width':2.7,'stroke-dasharray':'7 4'});
 document.getElementById('likelihood-label').textContent = p.n === 0 ? 'Likelihood (constant = 1)' : 'Likelihood (unit area)';
 curves.forEach(c=>{const points=[]; // Sample each Gaussian around its own centre to resolve narrow peaks.
 for(let i=0;i<=800;i++){const x=lo+(hi-lo)*i/800;points.push(x);}
 for(let i=-200;i<=200;i++) {const x=c.m+i*c.s/40;if(x>=lo&&x<=hi)points.push(x);}
 points.sort((a,b)=>a-b);
 const d=points.map((x,i)=>(i?'L':'M')+X(x).toFixed(2)+','+Y(Math.exp(-.5*((x-c.m)/c.s)**2)/(c.s*Math.sqrt(2*Math.PI))).toFixed(2)).join(' ');
 if(!c.dash)element('path',{d:d+` L${X(hi)},${bottom} L${X(lo)},${bottom} Z`,fill:c.c,'fill-opacity':'.08'});
 element('path',{d,fill:'none',stroke:c.c,'stroke-width':c.dash?2.7:3.4,'stroke-dasharray':c.dash});
 });
 element('text',{x:(left+right)/2,y:bottom+55,'text-anchor':'middle'},'Candidate population mean μ (mag)');
 element('text',{transform:'translate(17 200) rotate(-90)','text-anchor':'middle'},'Density / unit-area likelihood');
 document.getElementById('mle').textContent=p.n === 0 ? 'Undefined' : xbar.toFixed(3);
 document.getElementById('map').textContent=mean.toFixed(3);
 document.getElementById('width').textContent=Math.sqrt(variance).toFixed(3);
 document.getElementById('sample').textContent=p.n === 0 ? 'No observations · likelihood is constant in μ · posterior equals prior' : `${p.n} simulated clusters · sample mean x̄ = ${xbar.toFixed(3)} mag · likelihood width σ/√n = ${(p.sigma/Math.sqrt(p.n)).toFixed(3)} mag`;
 const w = dataPrecision*variance;
 document.getElementById('weights').textContent=p.n === 0 ? 'With no observations, P(μ | X) = P(μ): the MAP is η and the posterior standard deviation is λ. The constant likelihood cannot be normalised over the whole real line; it is shown at its actual value of 1.' : `The MAP is a precision-weighted average: ${(100*w).toFixed(1)}% sample mean + ${(100*(1-w)).toFixed(1)}% prior mean. A larger n or smaller σ gives the data more weight; a smaller λ strengthens the prior.`;
 document.getElementById('chart-desc').textContent=p.n === 0 ? `No observations. Constant likelihood; posterior equals the prior, with mean ${p.eta} and standard deviation ${p.lambda}.` : `Likelihood centred at ${xbar.toFixed(3)}, prior at ${p.eta}, posterior at ${mean.toFixed(3)} with standard deviation ${Math.sqrt(variance).toFixed(3)}.`;
}
document.getElementById('show-posterior').addEventListener('change',update);
ids.forEach(id=>controls[id].addEventListener('input',update));
document.getElementById('resample').addEventListener('click',()=>{draws=makeDraws(crypto.getRandomValues(new Uint32Array(1))[0]);update();});
document.getElementById('reset').addEventListener('click',()=>{document.getElementById('show-posterior').checked=false;ids.forEach((id,i)=>controls[id].value=defaults[i]);draws=makeDraws(46);update();});
draws=makeDraws(46);update();
