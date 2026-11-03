'use strict';
const $=id=>document.getElementById(id);
let statistics=[],latest=[];
const randomBuffer=new Uint32Array(2048);let randomIndex=randomBuffer.length;
const random=()=>{if(randomIndex===randomBuffer.length){crypto.getRandomValues(randomBuffer);randomIndex=0;}return (randomBuffer[randomIndex++]+.5)/4294967296;};
const gaussian=()=>Math.sqrt(-2*Math.log(random()))*Math.cos(2*Math.PI*random());
const average=a=>a.reduce((s,x)=>s+x,0)/a.length;
const variance=a=>{if(a.length<2)return NaN;const m=average(a);return a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1);};
function model(){const kind=$('population-type').value,p=Number($('p').value);const bell=(x,m,s)=>Math.exp(-.5*((x-m)/s)**2)/(s*Math.sqrt(2*Math.PI));
 if(kind==='normal')return {mean:50,sd:15,range:[-20,120],draw:()=>50+15*gaussian(),pdf:x=>bell(x,50,15),description:'Normal: μ = 50, σ = 15'};
 if(kind==='uniform')return {mean:50,sd:100/Math.sqrt(12),range:[-20,120],draw:()=>100*random(),pdf:x=>x>=0&&x<=100?.01:0,description:'Uniform on [0, 100]: μ = 50, σ = 28.87'};
 if(kind==='skewed')return {mean:20,sd:20,range:[0,200],draw:()=>-20*Math.log(random()),pdf:x=>x>=0?Math.exp(-x/20)/20:0,description:'Exponential: μ = 20, σ = 20'};
 if(kind==='bimodal')return {mean:50,sd:Math.sqrt(674),range:[-20,120],draw:()=>(random()<.5?25:75)+7*gaussian(),pdf:x=>.5*bell(x,25,7)+.5*bell(x,75,7),description:'Equal mixture: N(25, 7²) and N(75, 7²); μ = 50, σ = 25.96'};
 return {mean:p,sd:Math.sqrt(p*(1-p)),range:[-.5,1.5],draw:()=>random()<p?1:0,categorical:true,description:`Success / failure: p = ${p.toFixed(2)}, population SD = ${Math.sqrt(p*(1-p)).toFixed(3)}`};
}
function add(svg,tag,attrs,text){const e=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text!==undefined)e.textContent=text;svg.appendChild(e);return e;}
function histogram(data,range,bins){const [lo,hi]=range,width=(hi-lo)/bins,counts=Array(bins).fill(0);let outside=0;for(const v of data){if(v<lo||v>hi)outside++;counts[Math.max(0,Math.min(bins-1,Math.floor((v-lo)/width)))]++;}return {counts,width,outside};}
function plot(svg,range,data,{pdf=null,color='#2474b5',bins=40,marker=null,discrete=null,label='Value'}={}){
 svg.replaceChildren();const l=68,r=826,t=12,b=160,[lo,hi]=range,X=x=>l+(x-lo)/(hi-lo)*(r-l);
 const h=histogram(data,range,bins),bars=h.counts.map(c=>data.length?c/(data.length*h.width):0);
 const curve=pdf?Array.from({length:1001},(_,i)=>{const x=lo+(hi-lo)*i/1000;return [x,pdf(x)];}):[];
 const ymax=Math.max(.001,...bars,...curve.map(x=>x[1]),...(discrete?discrete.map(x=>x[1]):[]))*1.15,Y=y=>b-y/ymax*(b-t);
 for(let i=0;i<=3;i++){const y=ymax*i/3;add(svg,'line',{x1:l,x2:r,y1:Y(y),y2:Y(y),stroke:'#e4eae3'});add(svg,'text',{x:l-8,y:Y(y)+4,'text-anchor':'end'},y===0?'0':y<.01?y.toExponential(1):y.toFixed(2));}
 for(let i=0;i<=5;i++){const x=lo+(hi-lo)*i/5;add(svg,'text',{x:X(x),y:b+22,'text-anchor':'middle'},Math.abs(x)>=10?x.toFixed(0):x.toFixed(2));}
 bars.forEach((v,i)=>{if(v)add(svg,'rect',{x:X(lo+i*h.width)+.5,y:Y(v),width:(r-l)/bins-1,height:b-Y(v),fill:color,'fill-opacity':'.65'});});
 if(discrete)for(const [x,p]of discrete)add(svg,'rect',{x:X(x-.2),y:Y(p),width:X(x+.2)-X(x-.2),height:b-Y(p),fill:color,'fill-opacity':'.65'});
 if(curve.length)add(svg,'path',{d:curve.map(([x,y],i)=>(i?'L':'M')+X(x).toFixed(2)+','+Y(y).toFixed(2)).join(' '),fill:'none',stroke:'#b76b27','stroke-width':3});
 if(marker!==null&&marker>=lo&&marker<=hi)add(svg,'line',{x1:X(marker),x2:X(marker),y1:t,y2:b,stroke:'#7a617f','stroke-dasharray':'3 4'});
 add(svg,'text',{x:(l+r)/2,y:209,'text-anchor':'middle'},label);add(svg,'text',{transform:'translate(15 85) rotate(-90)','text-anchor':'middle'},discrete?'Probability':'Density');return h.outside;
}
function update(){const m=model(),n=Number($('n').value),stat=$('statistic').value,cat=!!m.categorical;
 $('p-control').hidden=!cat;$('p-value').textContent=Number($('p').value).toFixed(2);$('n-value').textContent=n;
 $('statistic').disabled=cat;$('stat-name').textContent=cat?'p̂':stat==='mean'?'x̄':stat==='sd'?'s':'s²';
 plot($('population'),m.range,[],{pdf:cat?null:m.pdf,discrete:cat?[[0,1-m.mean],[1,m.mean]]:null,marker:m.mean,label:cat?'Outcome (0 = failure, 1 = success)':'Population value'});$('population-info').textContent=m.description+' · dotted line marks the population mean';
 const sampleOutside=plot($('sample'),m.range,latest,{bins:cat?2:35,color:'#2474b5',label:'Observed value'});
 const current=latest.length?cat||stat==='mean'?average(latest):stat==='sd'?Math.sqrt(variance(latest)):variance(latest):null;
 $('sample-info').textContent=latest.length?`n = ${latest.length} · ${$('stat-name').textContent} = ${current.toFixed(3)}`+(sampleOutside?` · ${sampleOutside} observations beyond the axis are included in edge bins`:''):'Draw a sample to begin.';
 const mean=statistics.length?average(statistics):null,sd=statistics.length>1?Math.sqrt(variance(statistics)):null;
 let range=cat?[0,1]:stat==='mean'?m.range:stat==='sd'?[0,100]:[0,10000];
 const center=cat||stat==='mean'?m.mean:mean,spread=cat||stat==='mean'?m.sd/Math.sqrt(n):sd;
 const overlay=$('normal-curve').checked&&spread>0&&center!==null?x=>Math.exp(-.5*((x-center)/spread)**2)/(spread*Math.sqrt(2*Math.PI)):null;
 const out=plot($('sampling'),range,statistics,{pdf:overlay,color:'#15816a',marker:cat||stat==='mean'?m.mean:null,label:cat?'Sample proportion p̂':stat==='mean'?'Sample mean x̄':stat==='sd'?'Sample standard deviation s':'Sample variance s²'});
 $('count').textContent=statistics.length.toLocaleString();$('stat-mean').textContent=mean===null?'—':mean.toFixed(3);$('stat-sd').textContent=sd===null?'—':sd.toFixed(3);
 $('sampling-info').textContent=(cat||stat==='mean'?`Theoretical mean = ${m.mean.toFixed(3)} · standard error = ${(m.sd/Math.sqrt(n)).toFixed(3)}`:'Normal overlay, when enabled, is fitted to the simulated statistics.')+(out?` · ${out} statistics beyond the axis are included in edge bins.`:'');
}
function clear(){statistics=[];latest=[];$('notice').textContent='';update();}
function settings(){const cat=$('population-type').value==='categorical';if(cat)$('statistic').value='mean';const min=$('statistic').value==='mean'?1:2;$('n').min=min;if(Number($('n').value)<min)$('n').value=min;clear();}
function draw(count){if(statistics.length+count>50000){$('notice').textContent='50,000-sample limit reached. Clear samples to start again.';return;}const m=model(),n=Number($('n').value),stat=$('statistic').value;for(let j=0;j<count;j++){latest=Array.from({length:n},m.draw);statistics.push(m.categorical||stat==='mean'?average(latest):stat==='sd'?Math.sqrt(variance(latest)):variance(latest));}update();}
['population-type','p','n','statistic'].forEach(id=>$(id).addEventListener(id==='p'||id==='n'?'input':'change',settings));$('normal-curve').addEventListener('change',update);
$('one').addEventListener('click',()=>draw(1));$('hundred').addEventListener('click',()=>draw(100));$('thousand').addEventListener('click',()=>draw(1000));$('clear').addEventListener('click',clear);$('reset').addEventListener('click',()=>{$('population-type').value='normal';$('p').value=.5;$('n').value=30;$('statistic').value='mean';$('normal-curve').checked=false;settings();});update();
