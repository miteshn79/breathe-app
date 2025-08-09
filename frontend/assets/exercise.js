// v4.2 player: calmer tempo, circle/square/triangle/lines, "Top-up" label
(function(){
  const TWO_PI=Math.PI*2; let TEMPO=1.75; let MODE='auto';
  let player={running:false,tRemain:480,ex:null,anim:0,_phaseElapsed:0};
  let shape={path:null,segLen:0,total:0,kindOrder:[],left:null,right:null,leftLen:0,rightLen:0};

  const $=id=>document.getElementById(id);
  const text=(id,t)=>{const e=$(id); if(e) e.textContent=t};
  const html=(id,s)=>{const e=$(id); if(e) e.innerHTML=s};

  function stepsFromPattern(p){ const a=[]; if(p.inhale>0)a.push('in'); if(p.holdIn>0)a.push('holdin'); if(p.sip>0)a.push('sip'); if(p.exhale>0)a.push('out'); if(p.holdOut>0)a.push('holdout'); return a; }
  function paintTimer(){ const m=String(Math.floor(player.tRemain/60)).padStart(2,'0'); const s=String(Math.floor(player.tRemain%60)).padStart(2,'0'); text('timer',`${m}:${s}`); }
  function drawPhaseUI(label,seconds,kind){
    text('phase',label); text('countdown',Math.ceil(seconds||0));
    ['in','holdin','sip','out','holdout'].forEach(id=>$('seg-'+id).classList.remove('active'));
    const segId={in:'seg-in',holdin:'seg-holdin',sip:'seg-sip',out:'seg-out',holdout:'seg-holdout'}[kind];
    if(segId) $(segId).classList.add('active');
    const arc=$('arc'); if(arc){ const R=92,C=2*Math.PI*R; arc.setAttribute('stroke-dasharray',`${C} ${C}`); arc.setAttribute('stroke-dashoffset',String(C)); }
  }

  function resolveMode(){ if(MODE!=='auto') return MODE; const n=shape.kindOrder.length; if(n>=4) return 'square'; if(n===3) return 'triangle'; if(n===2) return 'lines'; return 'ring'; }
  function updateVisibility(){ const ringVis=(resolveMode()==='ring'); $('ring-group').style.display=ringVis?'block':'none'; $('shape-group').style.display=ringVis?'none':'block'; }

  function buildShape(){
    const g=$('shape-group'); g.innerHTML=''; const mode=resolveMode();
    const ns='http://www.w3.org/2000/svg', mk=(t,a)=>{const el=document.createElementNS(ns,t); for(const k in a) el.setAttribute(k,a[k]); return el;};
    if(mode==='square'||mode==='triangle'){
      const d=(mode==='square')?'M60 60 L180 60 L180 180 L60 180 Z':'M120 45 L200 190 L40 190 Z';
      const track=mk('path',{id:'shape-track',d,fill:'none',stroke:'rgba(0,0,0,0.12)','stroke-width':'10','stroke-linecap':'round','stroke-linejoin':'round'});
      const prog =mk('path',{id:'shape-prog', d,fill:'none',stroke:'url(#gradIn)','stroke-width':'10','stroke-linecap':'round','stroke-linejoin':'round','stroke-dasharray':'0 1','stroke-dashoffset':'0'});
      const dot  =mk('circle',{id:'shape-dot',cx:'0',cy:'0',r:'6',fill:'#4aa3ff'});
      g.appendChild(track); g.appendChild(prog); g.appendChild(dot);
      const total=track.getTotalLength(); shape.total=total; shape.segLen=total/(shape.kindOrder.length||1); shape.path=track;
    } else if(mode==='lines'){
      const left =mk('path',{id:'shape-left', d:'M70 60 L70 190', fill:'none', stroke:'rgba(0,0,0,0.12)','stroke-width':'10','stroke-linecap':'round'});
      const right=mk('path',{id:'shape-right',d:'M170 190 L170 60',fill:'none', stroke:'rgba(0,0,0,0.12)','stroke-width':'10','stroke-linecap':'round'});
      const prog =mk('path',{id:'shape-prog', d:'', fill:'none', stroke:'url(#gradIn)','stroke-width':'10','stroke-linecap':'round'});
      const dot  =mk('circle',{id:'shape-dot',cx:'70',cy:'60',r:'6',fill:'#4aa3ff'});
      g.appendChild(left); g.appendChild(right); g.appendChild(prog); g.appendChild(dot);
      shape.left=left; shape.right=right; shape.leftLen=left.getTotalLength(); shape.rightLen=right.getTotalLength();
    }
  }
  function moveDot(kind,t){
    const mode=resolveMode(), dot=$('shape-dot'), prog=$('shape-prog'); if(!dot||!prog) return;
    if(mode==='square'||mode==='triangle'){
      const idx=shape.kindOrder.indexOf(kind); const start=Math.max(0,idx)*shape.segLen; const pos=start+t*shape.segLen;
      const pt=shape.path.getPointAtLength(pos); dot.setAttribute('cx',pt.x); dot.setAttribute('cy',pt.y);
      prog.setAttribute('stroke',(kind==='in'||kind==='sip')?'url(#gradIn)':(kind==='out'?'url(#gradOut)':'url(#gradHold)'));
      prog.setAttribute('stroke-dasharray', `${pos} 9999`);
    } else {
      if(kind==='in'||kind==='sip'||kind==='holdin'){
        const L=shape.leftLen, pos=Math.min(L,t*L), pt=shape.left.getPointAtLength(pos);
        dot.setAttribute('cx',pt.x); dot.setAttribute('cy',pt.y);
        prog.setAttribute('d', `M70 60 L70 ${60+pos}`); prog.setAttribute('stroke','url(#gradIn)');
      } else {
        const L=shape.rightLen, pos=Math.min(L,t*L), pt=shape.right.getPointAtLength(pos);
        dot.setAttribute('cx',pt.x); dot.setAttribute('cy',pt.y);
        prog.setAttribute('d', `M170 190 L170 ${190-pos}`); prog.setAttribute('stroke','url(#gradOut)');
      }
    }
  }

  function runPhaseRing(label,seconds,kind,done){
    drawPhaseUI(label,seconds,kind); const start=performance.now();
    const arc=$('arc'),dot=$('dot'),orb=$('orb'); const R=92,C=2*Math.PI*R;
    arc.setAttribute('stroke-dasharray', `${C} ${C}`); arc.setAttribute('stroke',(kind==='in'||kind==='sip')?'url(#gradIn)':(kind==='out'?'url(#gradOut)':'url(#gradHold)'));
    const baseR=54; let target=1.0; if(kind==='in'||kind==='sip')target=1.12; if(kind==='out')target=0.94; orb.setAttribute('r',String(baseR*target));
    function step(now){
      if(!player.running) return; const el=(now-start)/1000; const t=Math.min(1,el/seconds);
      arc.setAttribute('stroke-dashoffset', String(C*(1-t)));
      const angle=-Math.PI/2 + t*TWO_PI; const x=120 + R*Math.cos(angle); const y=120 + R*Math.sin(angle);
      dot.setAttribute('cx',x); dot.setAttribute('cy',y);
      text('countdown',Math.max(1,Math.ceil(seconds-el)));
      player.tRemain=Math.max(0,player.tRemain - (t*seconds - (player._phaseElapsed||0))); player._phaseElapsed=t*seconds; paintTimer();
      if(t<1) player.anim=requestAnimationFrame(step); else { player._phaseElapsed=0; done(); }
    } player.anim=requestAnimationFrame(step);
  }

  function runPhaseShape(label,seconds,kind,done){
    drawPhaseUI(label,seconds,kind); const start=performance.now();
    function step(now){
      if(!player.running) return; const el=(now-start)/1000; const t=Math.min(1,el/seconds);
      moveDot(kind,t); text('countdown',Math.max(1,Math.ceil(seconds-el)));
      player.tRemain=Math.max(0,player.tRemain - (t*seconds - (player._phaseElapsed||0))); player._phaseElapsed=t*seconds; paintTimer();
      if(t<1) player.anim=requestAnimationFrame(step); else { player._phaseElapsed=0; done(); }
    } player.anim=requestAnimationFrame(step);
  }
  const runner=()=> (resolveMode()==='ring')?runPhaseRing:runPhaseShape;

  function cycle(){
    if(!player.running) return; if(player.tRemain<=0) return stop();
    const p=player.ex.pattern||{inhale:4,holdIn:0,sip:0,exhale:6,holdOut:0}; const run=runner();
    run('Inhale', p.inhale*TEMPO, 'in', ()=>{
      if(p.holdIn>0) run('Hold', p.holdIn*TEMPO, 'holdin', afterHoldIn); else afterHoldIn();
    });
    function afterHoldIn(){
      if(p.sip>0) run('Top-up', p.sip*TEMPO, 'sip', exhold); else exhold();
    }
    function exhold(){
      run('Exhale', p.exhale*TEMPO, 'out', ()=>{
        if(p.holdOut>0) run('Hold', p.holdOut*TEMPO, 'holdout', loop); else loop();
      });
    }
    function loop(){ if(player.running) cycle(); }
  }
  function start(){ if(player.running) return; player.running=true; cycle(); }
  function pause(){ player.running=false; if(player.anim) cancelAnimationFrame(player.anim); }
  function stop(){ player.running=false; if(player.anim) cancelAnimationFrame(player.anim); drawPhaseUI('Ready',0,'in'); }

  document.addEventListener('DOMContentLoaded', ()=>{
    const id=new URLSearchParams(location.search).get('id')||'box';
    const ex=(window.EXERCISES||[]).find(x=>x.id===id)||window.EXERCISES[0]; player.ex=ex;
    shape.kindOrder = stepsFromPattern(ex.pattern);

    const crumb=$('crumb'); if(crumb) crumb.innerHTML=`<a href="index.html">Home</a> › <a href="library.html">Library</a> › <span>${ex.name}</span>`;
    text('ex-title',ex.name); text('ex-why',ex.why);
    html('ex-steps',ex.steps.map(s=>`<li>${s}</li>`).join(''));
    html('ex-benefits',(ex.benefits||[]).map(b=>`<li>${b}</li>`).join(''));
    html('ex-links',(ex.links||[]).map(l=>`<li><a href="${l.href}" target="_blank" rel="noopener">${l.label}</a></li>`).join(''));

    const minsSel=$('session-mins'); player.tRemain=parseInt(minsSel.value,10)*60; paintTimer(); drawPhaseUI('Ready',0,'in');
    $('btn-start').onclick=start; $('btn-pause').onclick=pause; $('btn-stop').onclick=stop;
    minsSel.onchange=()=>{ player.tRemain=parseInt(minsSel.value,10)*60; paintTimer(); };

    const tempo=$('tempo'), tempoOut=$('tempo-out'); tempo.value='1.75'; tempoOut.textContent='1.75×';
    tempo.oninput=()=>{ TEMPO=parseFloat(tempo.value); tempoOut.textContent=TEMPO.toFixed(2)+'×'; };

    const trace=$('trace'); trace.onchange=()=>{ MODE=trace.value; updateVisibility(); buildShape(); };
    updateVisibility(); buildShape();
  });
})();
