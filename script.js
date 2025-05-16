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

// Pseudocode for all algorithms
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
  ],
  prim: [
    "Prim(start):",
    "  for each v in V: key[v] ← ∞, parent[v] ← null, inMST[v] ← false",
    "  key[start] ← 0",
    "  Q ← all nodes",
    "  while Q not empty:",
    "    u ← extract-min(Q)",
    "    inMST[u] ← true",
    "    for each (v, w) in adj[u]:",
    "      if not inMST[v] and w < key[v]:",
    "        key[v] ← w",
    "        parent[v] ← u",
    "  construct MST from parent[]"
  ],
  kruskal: [
    "Kruskal():",
    "  A ← empty set",
    "  for each (u, v, w) in E in non-decreasing order by w:",
    "    if Find(u) ≠ Find(v):",
    "      A ← A ∪ {(u, v)}",
    "      Union(u, v)",
    "  return A"
  ]
};

// Mode toggle
modeRadios.forEach(r => r.addEventListener('change', () => {
  if (r.value === 'custom' && r.checked) {
    randomCtrls.classList.add('hidden');
    customCtrls.classList.remove('hidden');
  } else {
    customCtrls.classList.add('hidden');
    randomCtrls.classList.remove('hidden');
  }
}));

// Generate graph
genBtn.onclick = () => {
  clearInterval(timer);
  stepBtn.disabled = playBtn.disabled = pauseBtn.disabled = true;
  const mode = document.querySelector('input[name="mode"]:checked').value;
  if (mode === 'random') buildRandom(+Ninput.value);
  else buildCustom(edgeTextarea.value);
  populateNodeSelectors();
  drawGraph();
};

// Build random graph
function buildRandom(N) {
  nodes = [];
  edges = [];
  adj = {};
  for (let i = 0; i < N; i++) {
    nodes.push({ id: i });
    adj[i] = [];
  }
  nodes.forEach((n, i) => {
    const ang = 2 * Math.PI / N * i;
    n.x = 400 + 200 * Math.cos(ang);
    n.y = 300 + 200 * Math.sin(ang);
  });
  const perm = nodes.map(n => n.id).sort(() => Math.random() - 0.5);
  for (let i = 1; i < perm.length; i++) addEdge(perm[i - 1], perm[i]);
  for (let i = 0; i < N; i++) {
    const j = Math.floor(Math.random() * N);
    if (i !== j && !adj[i].some(e => e.to === j)) addEdge(i, j);
  }
}

// Build custom graph
function buildCustom(text) {
  nodes = [];
  edges = [];
  adj = {};
  text.trim().split('\n').forEach(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) return;
    const u = +parts[0], v = +parts[1], w = +(parts[2] || 1);
    [u, v].forEach(x => {
      if (!adj[x]) {
        adj[x] = [];
        nodes.push({ id: x });
      }
    });
    if (!adj[u].some(e => e.to === v)) addEdge(u, v, w);
  });
  nodes.sort((a, b) => a.id - b.id);
  const N = nodes.length;
  nodes.forEach((n, i) => {
    const ang = 2 * Math.PI / N * i;
    n.x = 400 + 200 * Math.cos(ang);
    n.y = 300 + 200 * Math.sin(ang);
  });
}

// Add edge
function addEdge(u, v, w = Math.floor(Math.random() * 9) + 1) {
  edges.push({ u, v, w });
  adj[u].push({ to: v, w });
  adj[v].push({ to: u, w });
}

// Populate selectors
function populateNodeSelectors() {
  startNodeS.innerHTML = '';
  endNodeS.innerHTML = '';
  nodes.forEach(n => {
    [startNodeS, endNodeS].forEach(sel => {
      const o = document.createElement('option');
      o.value = n.id;
      o.textContent = n.id;
      sel.appendChild(o);
    });
  });
  endLabel.classList.toggle('hidden', algoSelect.value !== 'dijkstra');
}
algoSelect.onchange = populateNodeSelectors;

// Draw graph
function drawGraph(highlighted = [], path = [], mstEdges = []) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  edges.forEach(e => {
    const a = nodes.find(n => n.id === e.u);
    const b = nodes.find(n => n.id === e.v);
    const inPath = pathIncludesEdge(path, e);
    const inMST = mstEdges.some(m => (m.u === e.u && m.v === e.v) || (m.u === e.v && m.v === e.u));
    ctx.strokeStyle = inPath || inMST ? '#e67e22' : '#bbb';
    ctx.lineWidth = inPath || inMST ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillText(e.w, (a.x + b.x) / 2 + 6, (a.y + b.y) / 2 - 6);
  });
  nodes.forEach(n => {
    const hl = highlighted.includes(n.id);
    const inPath = path.includes(n.id);
    const inTree = mstEdges.some(m => m.u === n.id || m.v === n.id);
    ctx.fillStyle = inPath || inTree ? '#e67e22' : hl ? '#e74c3c' : '#3498db';
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(n.x, n.y, 22, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.fillText(n.id, n.x - 6, n.y + 6);
  });
}
function pathIncludesEdge(path, e) {
  for (let i = 0; i < path.length - 1; i++) {
    if ((e.u === path[i] && e.v === path[i + 1]) || (e.v === path[i] && e.u === path[i + 1])) return true;
  }
  return false;
}

// Initialize state
function initState(algo) {
  const start = +startNodeS.value;
  const end = +endNodeS.value;
  state = { algo, pc: 0, start, end };
  if (algo === 'bfs') {
    state.visited = {};
    state.queue = [start];
    state.visited[start] = true;
    state.curNeighbors = [];
    state.curIndex = 0;
  } else if (algo === 'dfs') {
    state.visited = {};
    state.stack = [[start, 0]];
    state.visited[start] = true;
  } else if (algo === 'dijkstra') {
    state.dist = {}; state.prev = {};
    nodes.forEach(n => { state.dist[n.id] = Infinity; state.prev[n.id] = null; });
    state.dist[start] = 0;
    state.queue = nodes.map(n => n.id);
  } else if (algo === 'prim') {
    state.key = {}; state.parent = {}; state.inMST = {};
    nodes.forEach(n => { state.key[n.id] = Infinity; state.parent[n.id] = null; state.inMST[n.id] = false; });
    state.key[start] = 0;
    state.queue = nodes.map(n => n.id);
  } else if (algo === 'kruskal') {
    state.dsuParent = {}; state.dsuRank = {};
    nodes.forEach(n => { state.dsuParent[n.id] = n.id; state.dsuRank[n.id] = 0; });
    state.edgeListSorted = edges.slice().sort((a,b)=>a.w-b.w);
    state.mstEdges = []; state.edgeIndex = 0;
  }
  renderCode();
  drawGraph([start]);
}

// Step execution
function step() {
  codeBox.querySelectorAll('div').forEach(d => d.classList.remove('highlight'));
  codeBox.children[state.pc]?.classList.add('highlight');
  let done = false;
  if (state.algo === 'bfs') done = bfsStep();
  else if (state.algo === 'dfs') done = dfsStep();
  else if (state.algo === 'dijkstra') done = dijkstraStep();
  else if (state.algo === 'prim') done = primStep();
  else if (state.algo === 'kruskal') done = kruskalStep();
  renderCode();
  return done;
}

// BFS step
function bfsStep() {
  const { queue, visited } = state;
  if (state.curNeighbors.length === 0) {
    if (!queue.length) { stopRun(); return true; }
    state.pc = 3; state.u = queue.shift(); state.curNeighbors = adj[state.u]; state.curIndex = 0;
  }
  if (state.curIndex < state.curNeighbors.length) {
    state.pc = 5;
    const v = state.curNeighbors[state.curIndex].to;
    state.pc = 6;
    if (!visited[v]) { visited[v] = true; queue.push(v); drawGraph(Object.keys(visited).map(x=>+x)); }
    else drawGraph(Object.keys(visited).map(x=>+x));
    state.curIndex++;
    return;
  }
  state.curNeighbors = [];
  drawGraph(Object.keys(visited).map(x=>+x));
}

// DFS step
function dfsStep() {
  const { stack, visited } = state;
  if (!stack.length) { stopRun(); return true; }
  const [u, idx] = stack.pop(); const neigh = adj[u];
  if (idx < neigh.length) {
    const v = neigh[idx].to; stack.push([u, idx+1]); state.pc = 2;
    if (!visited[v]) { state.pc = 3; visited[v]=true; stack.push([v,0]); drawGraph(Object.keys(visited).map(x=>+x)); return; }
  }
  drawGraph(Object.keys(visited).map(x=>+x));
}

// Dijkstra step
function dijkstraStep() {
  const Q = state.queue;
  if (!Q.length) {
    const path=[]; let u = state.end;
    while(u!=null){ path.unshift(u); u=state.prev[u]; }
    drawGraph([], path); stopRun(); return true;
  }
  state.pc=4; let u = Q.reduce((a,b)=>state.dist[a]<state.dist[b]?a:b); Q.splice(Q.indexOf(u),1);
  state.pc=5;
  for(let {to:v,w} of adj[u]){
    state.pc=6; const alt = state.dist[u] + w;
    if(alt<state.dist[v]){ state.dist[v]=alt; state.prev[v]=u; drawGraph([u,v]); return; }
  }
  drawGraph([u]);
}

// Prim step
function primStep() {
  const { queue, key, inMST, parent } = state;
  if (!queue.length) {
    drawGraph([], [], nodes.map(n=>({u:parent[n.id],v:n.id})).filter(e=>e.u!=null)); stopRun(); return true;
  }
  state.pc=5; let u = queue.reduce((a,b)=>key[a]<key[b]?a:b); queue.splice(queue.indexOf(u),1);
  state.pc=6; inMST[u]=true;
  for(let {to:v,w} of adj[u]){
    state.pc=7; if(!inMST[v]&&w<key[v]){ state.pc=8; key[v]=w; parent[v]=u; drawGraph([],[], nodes.map(n=>({u:parent[n.id],v:n.id})).filter(e=>e.u!=null)); return; }
  }
  drawGraph([],[], nodes.map(n=>({u:parent[n.id],v:n.id})).filter(e=>e.u!=null));
}

// DSU for Kruskal
function findDSU(u){ return state.dsuParent[u]===u?u:(state.dsuParent[u]=findDSU(state.dsuParent[u])); }
function unionDSU(u,v){
  const ru=findDSU(u), rv=findDSU(v);
  if(ru===rv)return; if(state.dsuRank[ru]<state.dsuRank[rv]) state.dsuParent[ru]=rv;
  else if(state.dsuRank[ru]>state.dsuRank[rv]) state.dsuParent[rv]=ru;
  else { state.dsuParent[rv]=ru; state.dsuRank[ru]++; }
}

// Kruskal step
function kruskalStep(){
  const list=state.edgeListSorted;
  if(state.edgeIndex>=list.length){ drawGraph([],[], state.mstEdges); stopRun(); return true; }
  state.pc=2; const e=list[state.edgeIndex++]; const ru=findDSU(e.u), rv=findDSU(e.v);
  state.pc=3;
  if(ru!==rv){ unionDSU(ru,rv); state.mstEdges.push(e); drawGraph([],[],state.mstEdges); return; }
  drawGraph([],[],state.mstEdges);
}

// Render pseudocode
function renderCode(){ codeBox.innerHTML=''; PSEUDO[state.algo].forEach((line,i)=>{ const d=document.createElement('div'); d.textContent=line; if(i===state.pc) d.classList.add('highlight'); codeBox.appendChild(d); }); }

// Stop run
function stopRun(){ clearInterval(timer); stepBtn.disabled=playBtn.disabled=true; pauseBtn.disabled=true; }

// Controls
startBtn.onclick = ()=>{ initState(algoSelect.value); stepBtn.disabled=playBtn.disabled=false; pauseBtn.disabled=true; };
stepBtn.onclick  = ()=>step();
playBtn.onclick  = ()=>{ playBtn.disabled=stepBtn.disabled=true; pauseBtn.disabled=false; const delay=(+speedSlider.max+ +speedSlider.min)-+speedSlider.value; timer=setInterval(()=>{ if(step()) stopRun(); }, delay); };
pauseBtn.onclick = ()=>{ clearInterval(timer); pauseBtn.disabled=true; playBtn.disabled=stepBtn.disabled=false; };

genBtn.click();
