// --- Elements ---
const canvas      = document.getElementById('graphCanvas');
const ctx         = canvas.getContext('2d');
const modeRadios  = document.querySelectorAll('input[name="mode"]');
const randomCtrls = document.getElementById('random-controls');
const customCtrls = document.getElementById('custom-controls');
const Ninput      = document.getElementById('nodeCount');
const edgeTextarea= document.getElementById('edgeList');
const genBtn      = document.getElementById('generate');
const startNodeS  = document.getElementById('startNode');
const endNodeS    = document.getElementById('endNode');
const endLabel    = document.getElementById('endLabel');
const algoSelect  = document.getElementById('algorithm');
const startBtn    = document.getElementById('start');
const stepBtn     = document.getElementById('step');
const playBtn     = document.getElementById('play');
const pauseBtn    = document.getElementById('pause');
const speedSlider = document.getElementById('speed');
const codeBox     = document.getElementById('pseudocode');

let nodes = [], edges = [], adj = {};
let state = null, timer = null;

// Pseudocode
const PSEUDO = {
  bfs: [
    "BFS(start):",
    "  queue ← [start]",
    "  visited[start] ← true",
    "  while queue not empty:",
    "    u ← queue.dequeue()",
    "    for each v in adj[u]:",
    "      if not visited[v]:",
    "        visited[v] ← true",
    "        queue.enqueue(v)"
  ],
  dfs: [
    "DFS(u):",
    "  visited[u] ← true",
    "  for each v in adj[u]:",
    "    if not visited[v]:",
    "      DFS(v)"
  ],
  dijkstra: [
    "Dijkstra(start):",
    "  for each v: dist[v] ← ∞, prev[v] ← null",
    "  dist[start] ← 0",
    "  Q ← all nodes",
    "  while Q not empty:",
    "    u ← extract-min(Q)",
    "    for each (v, w) in adj[u]:",
    "      alt ← dist[u] + w",
    "      if alt < dist[v]:",
    "        dist[v] ← alt",
    "        prev[v] ← u",
    "  reconstruct path from end ← prev[...]"
  ]
};

// --- Mode toggle ---
modeRadios.forEach(r => r.addEventListener('change', _=>{
  if (r.value==='custom' && r.checked) {
    randomCtrls.classList.add('hidden');
    customCtrls.classList.remove('hidden');
  } else {
    customCtrls.classList.add('hidden');
    randomCtrls.classList.remove('hidden');
  }
}));

// --- Generate Graph ---
genBtn.onclick = ()=>{
  clearInterval(timer);
  stepBtn.disabled = playBtn.disabled = pauseBtn.disabled = true;
  const mode = document.querySelector('input[name="mode"]:checked').value;
  if (mode==='random') buildRandom(+Ninput.value);
  else buildCustom(edgeTextarea.value);
  populateNodeSelectors();
  drawGraph();
};

// --- Random builder ---
function buildRandom(N){
  nodes = []; edges = []; adj = {};
  for(let i=0;i<N;i++){ nodes.push({id:i}); adj[i]=[]; }
  // circle layout
  nodes.forEach((n,i)=>{
    const ang=2*Math.PI/N*i;
    n.x=400+200*Math.cos(ang); n.y=300+200*Math.sin(ang);
  });
  // spanning tree + extras
  const perm=nodes.map(n=>n.id).sort(()=>Math.random()-.5);
  for(let i=1;i<perm.length;i++) addEdge(perm[i-1],perm[i]);
  for(let i=0;i<N;i++){
    const j=Math.floor(Math.random()*N);
    if(i!==j && !adj[i].some(e=>e.to===j)) addEdge(i,j);
  }
}

// --- Custom builder (edge list) ---
function buildCustom(text){
  nodes=[]; edges=[]; adj={};
  text.trim().split('\n').forEach(line=>{
    const parts=line.trim().split(/\s+/);
    if(parts.length<2) return;
    const u=+parts[0], v=+parts[1], w=+(parts[2]||1);
    [u,v].forEach(x=>{ if(adj[x]===undefined){ adj[x]=[]; nodes.push({id:x}); }});
    if(!adj[u].some(e=>e.to===v)) addEdge(u,v,w);
  });
  // circle layout
  nodes.sort((a,b)=>a.id-b.id);
  const N=nodes.length;
  nodes.forEach((n,i)=>{
    const ang=2*Math.PI/N*i;
    n.x=400+200*Math.cos(ang); n.y=300+200*Math.sin(ang);
  });
}

// --- Add bidir edge ---
function addEdge(u,v,w=Math.floor(Math.random()*9)+1){
  edges.push({u,v,w});
  adj[u].push({to:v,w});
  adj[v].push({to:u,w});
}

// --- Populate start/end dropdowns ---
function populateNodeSelectors(){
  startNodeS.innerHTML = '';
  endNodeS.innerHTML = '';
  nodes.forEach(n=>{
    [startNodeS,endNodeS].forEach(sel=>{
      const o=document.createElement('option');
      o.value=n.id; o.textContent=n.id;
      sel.appendChild(o);
    });
  });
  // show endNode only for Dijkstra
  if(algoSelect.value==='dijkstra') endLabel.classList.remove('hidden');
  else endLabel.classList.add('hidden');
}

// when algo changes, toggle endNode visibility
algoSelect.onchange = _=>{
  if(algoSelect.value==='dijkstra') endLabel.classList.remove('hidden');
  else endLabel.classList.add('hidden');
};

// --- Draw ---
function drawGraph(highlighted=[], path=[]){
  ctx.clearRect(0,0,800,600);
  // edges
  edges.forEach(e=>{
    const a=nodes.find(n=>n.id===e.u),
          b=nodes.find(n=>n.id===e.v);
    ctx.strokeStyle = pathIncludesEdge(path,e)? '#e67e22':'#bbb';
    ctx.lineWidth = pathIncludesEdge(path,e)?4:2;
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    const mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
    ctx.fillStyle='#555'; ctx.fillText(e.w, mx+6,my-6);
  });
  // nodes
  nodes.forEach(n=>{
    const hl = highlighted.includes(n.id),
          inPath = path.includes(n.id);
    ctx.fillStyle = inPath ? '#e67e22' : (hl? '#e74c3c':'#3498db');
    ctx.strokeStyle='#2980b9'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(n.x,n.y,22,0,2*Math.PI); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.font='16px sans-serif';
    ctx.fillText(n.id, n.x-6,n.y+6);
  });
}

function pathIncludesEdge(path, e){
  for(let i=0;i<path.length-1;i++){
    if((e.u===path[i]&&e.v===path[i+1])||(e.v===path[i]&&e.u===path[i+1]))
      return true;
  }
  return false;
}

// --- Init state & stepping ---
function initState(algo){
  const start=+startNodeS.value, end=+endNodeS.value;
  state = { algo, pc:0, visited:{}, queue:[], stack:[], dist:{}, prev:{}, start, end, path:null };
  if(algo==='bfs'){
    state.queue.push(start); state.visited[start]=true;
  } else if(algo==='dfs'){
    state.stack.push([start,0]); state.visited[start]=true;
  } else {
    nodes.forEach(n=>{ state.dist[n.id]=Infinity; state.prev[n.id]=null; });
    state.dist[start]=0;
    state.queue = nodes.map(n=>n.id);
  }
  renderCode();
  drawGraph([start]);
}

function step(){
  // clear highlights
  codeBox.querySelectorAll('div').forEach(d=>d.classList.remove('highlight'));
  codeBox.children[state.pc]?.classList.add('highlight');

  if(state.algo==='bfs') bfsStep();
  else if(state.algo==='dfs') dfsStep();
  else dijkstraStep();

  renderCode();
}

function bfsStep(){
  const {queue,visited} = state;
  if(!queue.length) return stopRun();
  state.pc=3;
  const u=queue.shift();
  state.pc=4;
  for(let {to:v} of adj[u]){
    state.pc=5;
    if(!visited[v]){
      visited[v]=true; queue.push(v);
      drawGraph(Object.keys(visited).map(x=>+x));
      return;
    }
  }
  drawGraph(Object.keys(visited).map(x=>+x));
}

function dfsStep(){
  const {stack,visited}=state;
  if(!stack.length) return stopRun();
  const [u,idx]=stack.pop(), neigh=adj[u];
  if(idx<neigh.length){
    const v=neigh[idx].to;
    stack.push([u,idx+1]);
    state.pc=2;
    if(!visited[v]){
      state.pc=3;
      visited[v]=true; stack.push([v,0]);
      drawGraph(Object.keys(visited).map(x=>+x));
      return;
    }
  }
  drawGraph(Object.keys(visited).map(x=>+x));
}

function dijkstraStep(){
  const Q=state.queue;
  if(!Q.length){
    // done → reconstruct path
    const path=[]; let u=state.end;
    while(u!=null){ path.unshift(u); u=state.prev[u]; }
    state.path=path;
    drawGraph([],path);
    return stopRun();
  }
  state.pc=3;
  // extract-min
  let u=Q.reduce((a,b)=> state.dist[a]<state.dist[b]?a:b);
  Q.splice(Q.indexOf(u),1);
  state.pc=4;
  for(let {to:v,w} of adj[u]){
    state.pc=5;
    const alt=state.dist[u]+w;
    if(alt<state.dist[v]){
      state.pc=6;
      state.dist[v]=alt; state.prev[v]=u;
      drawGraph([u,v]);
      return;
    }
  }
  drawGraph([u]);
}

function stopRun(){
  clearInterval(timer);
  stepBtn.disabled=playBtn.disabled=true;
  pauseBtn.disabled=true;
}

// --- Pseudocode render ---
function renderCode(){
  codeBox.innerHTML='';
  PSEUDO[state.algo].forEach((line,i)=>{
    const d=document.createElement('div');
    d.textContent=line;
    if(i===state.pc) d.classList.add('highlight');
    codeBox.appendChild(d);
  });
}

// --- Controls wiring ---
startBtn.onclick = ()=>{
  initState(algoSelect.value);
  stepBtn.disabled = playBtn.disabled = false;
  pauseBtn.disabled = true;
};

stepBtn.onclick = ()=>step();

playBtn.onclick = ()=>{
  playBtn.disabled = stepBtn.disabled = true;
  pauseBtn.disabled = false;
  timer = setInterval(()=>{
    step();
    // if finished, stop
    if(stepBtn.disabled && pauseBtn.disabled===false){
      clearInterval(timer);
      playBtn.disabled=true;
    }
  }, +speedSlider.value);
};

pauseBtn.onclick = ()=>{
  clearInterval(timer);
  pauseBtn.disabled=true;
  playBtn.disabled=stepBtn.disabled=false;
};

// initial load
genBtn.click();
