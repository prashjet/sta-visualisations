'use strict';
const $ = id => document.getElementById(id);
const blue='#2474b5', orange='#b76b27', green='#15816a';
function add(svg, tag, attrs, text){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text!==undefined)e.textContent=text;svg.appendChild(e);return e;}
function chart(svg, curves, ymax, ylabel, limit){
 svg.replaceChildren();const l=76,r=826,t=16,b=225;
 const X=x=>l+x/5000*(r-l),Y=y=>b-y/ymax*(b-t);
 for(let i=0;i<=4;i++){let y=ymax*i/4;add(svg,'line',{x1:l,x2:r,y1:Y(y),y2:Y(y),stroke:'#e4eae3'});add(svg,'text',{x:l-10,y:Y(y)+4,'text-anchor':'end'},y===0?'0':y<.01?y.toExponential(1):y.toFixed(2));}
 for(let x=0;x<=5000;x+=1000)add(svg,'text',{x:X(x),y:b+22,'text-anchor':'middle'},x);
 if(Number.isFinite(limit)){add(svg,'line',{x1:X(limit),x2:X(limit),y1:t,y2:b,stroke:'#9a8b73','stroke-dasharray':'3 4'});add(svg,'text',{x:X(limit)-5,y:t+12,'text-anchor':'end'},'θ_lim');}
 for(const c of curves){const d=c.points.map(([x,y],i)=>(i?'L':'M')+X(x).toFixed(3)+','+Y(y).toFixed(3)).join(' ');if(c.fill)add(svg,'path',{d:d+` L${X(c.points.at(-1)[0])},${b} L${X(c.points[0][0])},${b} Z`,fill:c.color,'fill-opacity':'.08'});add(svg,'path',{d,fill:'none',stroke:c.color,'stroke-width':3,'stroke-dasharray':c.dash||''});}
 add(svg,'text',{x:(l+r)/2,y:278,'text-anchor':'middle'},'Distance θ (pc)');add(svg,'text',{transform:'translate(16 125) rotate(-90)','text-anchor':'middle'},ylabel);
}
function infer(varpi,sigma,limit){
 const logL=x=>x>0?-.5*((varpi-1/x)/sigma)**2:-Infinity;
 // Rescale in log space around the maximum on the prior support.
 const peak=varpi>0?Math.min(1/varpi,limit):limit;
 const logPeak=Number.isFinite(peak)?logL(peak):-.5*(varpi/sigma)**2;
 const f=x=>Math.exp(logL(x)-logPeak);
 if(!Number.isFinite(limit))return {f,mode:varpi>0?1/varpi:Infinity};
 const steps=12000,h=limit/steps,grid=Array.from({length:steps+1},(_,i)=>[i*h,f(i*h)]);
 let area=0,moment=0;const cdf=[0];
 for(let i=1;i<=steps;i++){const [a,fa]=grid[i-1],[b,fb]=grid[i];area+=(fa+fb)*h/2;moment+=(a*fa+b*fb)*h/2;cdf.push(area);}
 const quantile=q=>{const target=q*area;let lo=1,hi=steps;while(lo<hi){const mid=(lo+hi)>>1;if(cdf[mid]<target)lo=mid+1;else hi=mid;}const frac=(target-cdf[lo-1])/(cdf[lo]-cdf[lo-1]);return (lo-1+frac)*h;};
 return {f,grid,area,mean:moment/area,low:quantile(.16),high:quantile(.84),mode:peak};
}
function update(){
 const v=Number($('varpi').value),s=Number($('sigma').value),raw=Number($('limit').value),lim=raw===5100?Infinity:raw,improper=!Number.isFinite(lim),show=$('show-posterior').checked;
 $('varpi-value').textContent=v.toFixed(5);$('sigma-value').textContent=s.toFixed(5);$('limit-value').textContent=improper?'∞':lim+' pc';
 const result=infer(v,s,lim), global=infer(v,s,Infinity);
 const xs=Array.from({length:2501},(_,i)=>i*2);
 // Include points around a narrow likelihood peak as well as a uniform grid.
 if(v>0){const center=1/v,width=s/v**2;for(let i=-200;i<=200;i++){const x=center+i*width/40;if(x>0&&x<5000)xs.push(x);}}xs.sort((a,b)=>a-b);
 chart($('likelihood-chart'),[{color:blue,dash:'7 4',points:xs.map(x=>[x,global.f(x)])}],1.12,'Relative likelihood',lim);
 let curves,ymax;
 if(improper){curves=[{color:orange,dash:'3 4',points:[[0,1],[5000,1]]}];if(show)curves.push({color:green,fill:true,points:xs.map(x=>[x,global.f(x)])});ymax=1.12;}
 else{curves=[{color:orange,dash:'3 4',points:[[0,0],[0,1/lim],[lim,1/lim],[lim,0],[5000,0]]}];if(show)curves.push({color:green,fill:true,points:[...result.grid.map(([x,y])=>[x,y/result.area]),[lim,0],[5000,0]]});ymax=1.12*Math.max(1/lim,show?1/result.area:0);}
 chart($('density-chart'),curves,ymax,improper?'Unnormalised shape':'Probability density (pc⁻¹)',lim);
 $('prior-label').textContent=improper?'Improper prior P*(θ) = 1':'Prior P(θ)';$('posterior-label').textContent=improper?'Improper posterior P*(θ | ϖ)':'Posterior P(θ | ϖ)';$('posterior-label').hidden=!show;$('posterior-results').hidden=!show;
 $('status').className='status'+(improper?' improper':'');
 $('status').textContent=improper?'θ_lim = ∞: improper prior and improper posterior. The nonzero likelihood tail extends indefinitely; neither the prior nor the posterior can be normalised.':`θ_lim = ${lim} pc: proper uniform prior.${show?' The posterior integrates to 1 over the full prior support.':''}`;
 $('mode').textContent=Number.isFinite(result.mode)?result.mode.toFixed(0)+' pc'+(!improper&&result.mode===lim?' (boundary)':''):'No finite mode';
 $('mean').textContent=improper?'Undefined':result.mean.toFixed(0)+' pc';$('interval').textContent=improper?'Undefined':`${result.low.toFixed(0)}–${result.high.toFixed(0)} pc`;
}
['varpi','sigma','limit'].forEach(id=>$(id).addEventListener('input',update));$('show-posterior').addEventListener('change',update);
$('negative').addEventListener('click',()=>{$('varpi').value=-.0005;update();});$('reset').addEventListener('click',()=>{$('varpi').value=.001;$('sigma').value=.0003;$('limit').value=3000;$('show-posterior').checked=false;update();});update();
