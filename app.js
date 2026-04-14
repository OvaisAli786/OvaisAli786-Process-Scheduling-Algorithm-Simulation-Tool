/* ══════════════════════════════════════════════════════════════════
   ProcessSim — JavaScript Application Logic
   ══════════════════════════════════════════════════════════════════ */

"use strict";

// ─── State ───────────────────────────────────────────────────────
const state = {
  processes: [],
  algorithm: "FCFS",
  preemptive: false,
  priorityPreemptive: false,
  timeQuantum: 2,
  zoomLevel: 100,
  nextId: 1,
};

// ─── Process color palette ─────────────────────────────────────
const COLORS = [
  "#7c6fff","#4f9eff","#3ecf8e","#ff9500","#e879f9",
  "#ff5e75","#06d2bd","#facc15","#f97316","#84cc16",
  "#60a5fa","#a78bfa","#34d399","#fbbf24","#fb7185",
  "#38bdf8","#c084fc","#4ade80","#f472b6","#fb923c",
];
function getColor(pid) {
  // Hash PID string to color index
  let h = 0;
  for (let i = 0; i < pid.length; i++) h = (h * 31 + pid.charCodeAt(i)) & 0xffffffff;
  return COLORS[Math.abs(h) % COLORS.length];
}

// ─── Algo descriptions ─────────────────────────────────────────
const ALGO_INFO = {
  FCFS: {
    tag: "Non-Preemptive",
    desc: "Processes are executed in order of arrival. Simple and fair for batch systems. First Come, First Served.",
  },
  SJF: {
    tag: "Non-Preemptive / Preemptive",
    desc: "Shortest job runs first. Minimizes average waiting time. Enable preemption for SRTF (Shortest Remaining Time First).",
  },
  PRIORITY: {
    tag: "Non-Preemptive / Preemptive",
    desc: "Processes are scheduled by priority. Lower number = higher priority. Preemptive mode interrupts on higher priority arrival.",
  },
  RR: {
    tag: "Preemptive",
    desc: "Round Robin gives every process a time quantum. Fair CPU sharing. Adjustable quantum for latency vs. overhead trade-off.",
  },
};

// ─── DOM refs ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const dom = {
  processList:      $("processList"),
  emptyState:       $("emptyState"),
  processCount:     $("processCount"),
  runBtn:           $("runBtn"),
  addProcessBtn:    $("addProcessBtn"),
  generateBtn:      $("generateBtn"),
  clearBtn:         $("clearBtn"),
  pidInput:         $("pidInput"),
  arrivalInput:     $("arrivalInput"),
  burstInput:       $("burstInput"),
  priorityInput:    $("priorityInput"),
  priorityGroup:    $("priorityGroup"),
  priorityHeader:   $("priorityHeader"),
  priorityCol:      $("priorityCol"),
  algoDesc:         $("algoDesc"),
  rrConfig:         $("rrConfig"),
  sjfConfig:        $("sjfConfig"),
  priorityConfig:   $("priorityConfig"),
  timeQuantum:      $("timeQuantum"),
  quantumSlider:    $("quantumSlider"),
  preemptiveToggle: $("preemptiveToggle"),
  priorityPreemptiveToggle: $("priorityPreemptiveToggle"),
  loadingOverlay:   $("loadingOverlay"),
  resultsSection:   $("resultsSection"),
  statsStrip:       $("statsStrip"),
  ganttContainer:   $("ganttContainer"),
  ganttTimeline:    $("ganttTimeline"),
  ganttLegend:      $("ganttLegend"),
  metricsBody:      $("metricsBody"),
  exportCSV:        $("exportCSV"),
  zoomIn:           $("zoomIn"),
  zoomOut:          $("zoomOut"),
  zoomLabel:        $("zoomLabel"),
  themeToggle:      $("themeToggle"),
  sunIcon:          $("sunIcon"),
  moonIcon:         $("moonIcon"),
  toastContainer:   $("toastContainer"),
  comparisonCard:   $("comparisonCard"),
  comparisonGrid:   $("comparisonGrid"),
};

// ─── Theme ────────────────────────────────────────────────────
let isDark = true;
dom.themeToggle.addEventListener("click", () => {
  isDark = !isDark;
  document.documentElement.dataset.theme = isDark ? "" : "light";
  dom.sunIcon.style.display  = isDark ? "" : "none";
  dom.moonIcon.style.display = isDark ? "none" : "";
});

// ─── Algorithm tabs ───────────────────────────────────────────
document.querySelectorAll(".algo-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".algo-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    state.algorithm = tab.dataset.algo;
    updateAlgoUI();
  });
});

function updateAlgoUI() {
  const info = ALGO_INFO[state.algorithm];
  dom.algoDesc.innerHTML = `<span class="algo-tag">${info.tag}</span>${info.desc}`;

  dom.rrConfig.style.display       = state.algorithm === "RR"       ? "" : "none";
  dom.sjfConfig.style.display      = state.algorithm === "SJF"      ? "" : "none";
  dom.priorityConfig.style.display = state.algorithm === "PRIORITY" ? "" : "none";

  const showPriority = state.algorithm === "PRIORITY";
  dom.priorityGroup.style.display  = showPriority ? "" : "none";
  dom.priorityHeader.style.display = showPriority ? "" : "none";
  dom.priorityCol.style.display    = showPriority ? "" : "none";
}

// ─── Time quantum sync ────────────────────────────────────────
dom.timeQuantum.addEventListener("input", () => {
  state.timeQuantum = Math.max(1, parseInt(dom.timeQuantum.value) || 1);
  dom.quantumSlider.value = Math.min(state.timeQuantum, 20);
});
dom.quantumSlider.addEventListener("input", () => {
  state.timeQuantum = parseInt(dom.quantumSlider.value);
  dom.timeQuantum.value = state.timeQuantum;
});
dom.preemptiveToggle.addEventListener("change", () => {
  state.preemptive = dom.preemptiveToggle.checked;
});
dom.priorityPreemptiveToggle.addEventListener("change", () => {
  state.priorityPreemptive = dom.priorityPreemptiveToggle.checked;
});

// ─── Zoom controls ────────────────────────────────────────────
dom.zoomIn.addEventListener("click", () => {
  state.zoomLevel = Math.min(300, state.zoomLevel + 20);
  updateGanttZoom();
});
dom.zoomOut.addEventListener("click", () => {
  state.zoomLevel = Math.max(40, state.zoomLevel - 20);
  updateGanttZoom();
});
function updateGanttZoom() {
  dom.zoomLabel.textContent = state.zoomLevel + "%";
  // Scale applied via unit width in renderGantt
  if (state.lastResult) renderGantt(state.lastResult.timeline, state.lastResult.processes);
}

// ─── Process management ───────────────────────────────────────
dom.addProcessBtn.addEventListener("click", addProcess);
[dom.pidInput, dom.arrivalInput, dom.burstInput, dom.priorityInput].forEach(el => {
  el.addEventListener("keydown", e => { if (e.key === "Enter") addProcess(); });
});

function addProcess() {
  const pid     = dom.pidInput.value.trim() || `P${state.nextId}`;
  const arrival = dom.arrivalInput.value === "" ? 0 : parseInt(dom.arrivalInput.value);
  const burst   = parseInt(dom.burstInput.value);
  const priority = parseInt(dom.priorityInput.value) || 1;

  if (!dom.burstInput.value || isNaN(burst) || burst < 1) {
    showToast("Burst time must be ≥ 1", "error"); return;
  }
  if (isNaN(arrival) || arrival < 0) {
    showToast("Arrival time must be ≥ 0", "error"); return;
  }
  if (state.processes.find(p => p.pid === pid)) {
    showToast(`Process "${pid}" already exists`, "error"); return;
  }
  if (state.processes.length >= 100) {
    showToast("Maximum 100 processes allowed", "error"); return;
  }

  state.processes.push({ pid, arrival, burst, priority, color: getColor(pid) });
  state.nextId++;

  // Auto-increment PID
  dom.pidInput.value     = `P${state.nextId}`;
  dom.arrivalInput.value = "";
  dom.burstInput.value   = "";
  dom.priorityInput.value = "";
  dom.burstInput.focus();

  renderProcessList();
  showToast(`Added ${pid}`, "success");
}

dom.clearBtn.addEventListener("click", () => {
  if (!state.processes.length) return;
  state.processes = [];
  state.nextId = 1;
  dom.pidInput.value = "P1";
  renderProcessList();
  dom.resultsSection.style.display = "none";
  showToast("All processes cleared", "info");
});

dom.generateBtn.addEventListener("click", () => {
  const count = Math.floor(Math.random() * 6) + 5; // 5–10
  state.processes = [];
  state.nextId = 1;
  for (let i = 0; i < count; i++) {
    const pid = `P${i + 1}`;
    state.processes.push({
      pid,
      arrival:  Math.floor(Math.random() * 15),
      burst:    Math.floor(Math.random() * 18) + 1,
      priority: Math.floor(Math.random() * 10) + 1,
      color:    getColor(pid),
    });
    state.nextId = i + 2;
  }
  dom.pidInput.value = `P${state.nextId}`;
  renderProcessList();
  showToast(`Generated ${count} random processes`, "info");
});

function renderProcessList() {
  const procs = state.processes;
  dom.processCount.textContent = `${procs.length} process${procs.length !== 1 ? "es" : ""}`;
  dom.runBtn.disabled = procs.length === 0;

  if (!procs.length) {
    dom.processList.innerHTML = "";
    dom.processList.appendChild(dom.emptyState);
    return;
  }

  dom.processList.innerHTML = procs.map((p, i) => `
    <div class="process-row" id="prow-${i}">
      <div class="process-pid">
        <span class="pid-dot" style="background:${p.color}"></span>
        ${p.pid}
      </div>
      <div class="process-val">${p.arrival}</div>
      <div class="process-val">${p.burst}</div>
      <div class="process-val">${p.priority}</div>
      <div>
        <button class="btn-pill" onclick="removeProcess(${i})">✕</button>
      </div>
    </div>
  `).join("");
}

window.removeProcess = function(idx) {
  state.processes.splice(idx, 1);
  renderProcessList();
};

// ─── Run simulation ───────────────────────────────────────────
dom.runBtn.addEventListener("click", runSimulation);

async function runSimulation() {
  if (!state.processes.length) { showToast("No processes to schedule", "error"); return; }

  dom.loadingOverlay.style.display = "";
  dom.resultsSection.style.display = "none";

  await new Promise(r => setTimeout(r, 320)); // UX: brief loading state

  const procs = state.processes.map(p => ({ ...p }));
  let result;

  try {
    switch (state.algorithm) {
      case "FCFS":     result = scheduleFCFS(procs); break;
      case "SJF":      result = scheduleSJF(procs, state.preemptive); break;
      case "PRIORITY": result = schedulePriority(procs, state.priorityPreemptive); break;
      case "RR":       result = scheduleRR(procs, state.timeQuantum); break;
    }
    state.lastResult = result;
    state.lastResult.processes = procs;
  } catch (e) {
    showToast("Simulation error: " + e.message, "error");
    dom.loadingOverlay.style.display = "none";
    return;
  }

  dom.loadingOverlay.style.display = "none";
  dom.resultsSection.style.display = "";

  // Render
  renderStats(result);
  renderGantt(result.timeline, procs);
  renderMetricsTable(result, procs);

  // Animate scroll
  dom.resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  showToast(`${state.algorithm} simulation complete ✓`, "success");
}

// ═══════════════════════════════════════════════════════════════
// SCHEDULING ALGORITHMS
// ═══════════════════════════════════════════════════════════════

// ─── FCFS ──────────────────────────────────────────────────────
function scheduleFCFS(procs) {
  const sorted = [...procs].sort((a, b) => a.arrival - b.arrival || a.pid.localeCompare(b.pid));
  const timeline = [];
  let time = 0;
  const results = {};

  for (const p of sorted) {
    if (time < p.arrival) {
      timeline.push({ pid: "IDLE", start: time, end: p.arrival });
      time = p.arrival;
    }
    const start = time;
    time += p.burst;
    timeline.push({ pid: p.pid, start, end: time });
    results[p.pid] = {
      arrival: p.arrival,
      burst: p.burst,
      priority: p.priority,
      start,
      finish: time,
      turnaround: time - p.arrival,
      waiting: start - p.arrival,
      response: start - p.arrival,
    };
  }
  return { timeline, results };
}

// ─── SJF ───────────────────────────────────────────────────────
function scheduleSJF(procs, preemptive) {
  if (!preemptive) return scheduleSJFNonPreemptive(procs);
  return scheduleSRTF(procs);
}

function scheduleSJFNonPreemptive(procs) {
  const sorted = [...procs].sort((a, b) => a.arrival - b.arrival);
  const timeline = [];
  const results = {};
  const ready = [];
  let time = 0;
  let done = 0;

  const initResult = p => {
    results[p.pid] = { arrival: p.arrival, burst: p.burst, priority: p.priority, start: -1, finish: 0, response: -1 };
  };
  procs.forEach(initResult);

  while (done < procs.length) {
    const arrived = sorted.filter(p => p.arrival <= time && !results[p.pid].finish);
    const candidate = arrived.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival)[0];

    if (!candidate) {
      const next = sorted.find(p => !results[p.pid].finish);
      if (next) { timeline.push({ pid: "IDLE", start: time, end: next.arrival }); time = next.arrival; }
      continue;
    }

    const start = time;
    if (results[candidate.pid].start === -1) results[candidate.pid].start = start;
    if (results[candidate.pid].response === -1) results[candidate.pid].response = start - candidate.arrival;
    time += candidate.burst;
    results[candidate.pid].finish    = time;
    results[candidate.pid].turnaround = time - candidate.arrival;
    results[candidate.pid].waiting    = results[candidate.pid].turnaround - candidate.burst;
    timeline.push({ pid: candidate.pid, start, end: time });
    done++;
  }
  return { timeline, results };
}

function scheduleSRTF(procs) {
  const timeline = [];
  const results = {};
  const remaining = {};
  procs.forEach(p => {
    remaining[p.pid] = p.burst;
    results[p.pid] = { arrival: p.arrival, burst: p.burst, priority: p.priority, start: -1, finish: 0, response: -1 };
  });

  let time = 0;
  let done = 0;
  let prev = null;
  const maxTime = procs.reduce((s, p) => s + p.burst, 0) + Math.max(...procs.map(p => p.arrival)) + 1;

  while (done < procs.length && time <= maxTime) {
    const available = procs.filter(p => p.arrival <= time && remaining[p.pid] > 0);
    if (!available.length) { time++; continue; }

    const curr = available.sort((a, b) => remaining[a.pid] - remaining[b.pid] || a.arrival - b.arrival)[0];

    if (results[curr.pid].response === -1) results[curr.pid].response = time - curr.arrival;
    if (results[curr.pid].start === -1) results[curr.pid].start = time;

    if (!prev || prev !== curr.pid) {
      if (prev === null && time > 0) timeline.push({ pid: "IDLE", start: 0, end: time });
      timeline.push({ pid: curr.pid, start: time, end: time });
    }
    timeline[timeline.length - 1].end = time + 1;

    remaining[curr.pid]--;
    if (remaining[curr.pid] === 0) {
      results[curr.pid].finish    = time + 1;
      results[curr.pid].turnaround = time + 1 - curr.arrival;
      results[curr.pid].waiting    = results[curr.pid].turnaround - curr.burst;
      done++;
    }
    prev = curr.pid;
    time++;
  }

  // Merge consecutive same-pid timeline blocks
  const merged = mergeTimeline(timeline);
  return { timeline: merged, results };
}

// ─── Priority ──────────────────────────────────────────────────
function schedulePriority(procs, preemptive) {
  if (!preemptive) return schedulePriorityNonPreemptive(procs);
  return schedulePriorityPreemptive(procs);
}

function schedulePriorityNonPreemptive(procs) {
  const sorted = [...procs].sort((a, b) => a.arrival - b.arrival);
  const timeline = [];
  const results = {};
  procs.forEach(p => {
    results[p.pid] = { arrival: p.arrival, burst: p.burst, priority: p.priority, start: -1, finish: 0, response: -1 };
  });

  let time = 0;
  let done = 0;

  while (done < procs.length) {
    const available = sorted.filter(p => p.arrival <= time && !results[p.pid].finish);
    if (!available.length) {
      const next = sorted.find(p => !results[p.pid].finish);
      if (next) { timeline.push({ pid: "IDLE", start: time, end: next.arrival }); time = next.arrival; }
      continue;
    }
    const curr = available.sort((a, b) => a.priority - b.priority || a.arrival - b.arrival)[0];
    const start = time;
    results[curr.pid].start    = start;
    results[curr.pid].response = start - curr.arrival;
    time += curr.burst;
    results[curr.pid].finish    = time;
    results[curr.pid].turnaround = time - curr.arrival;
    results[curr.pid].waiting    = results[curr.pid].turnaround - curr.burst;
    timeline.push({ pid: curr.pid, start, end: time });
    done++;
  }
  return { timeline, results };
}

function schedulePriorityPreemptive(procs) {
  const timeline = [];
  const results = {};
  const remaining = {};
  procs.forEach(p => {
    remaining[p.pid] = p.burst;
    results[p.pid] = { arrival: p.arrival, burst: p.burst, priority: p.priority, start: -1, finish: 0, response: -1 };
  });

  let time = 0;
  let done = 0;
  let prev = null;
  const maxTime = procs.reduce((s, p) => s + p.burst, 0) + Math.max(...procs.map(p => p.arrival)) + 1;

  while (done < procs.length && time <= maxTime) {
    const available = procs.filter(p => p.arrival <= time && remaining[p.pid] > 0);
    if (!available.length) { time++; continue; }

    const curr = available.sort((a, b) => a.priority - b.priority || a.arrival - b.arrival)[0];

    if (results[curr.pid].response === -1) results[curr.pid].response = time - curr.arrival;
    if (results[curr.pid].start === -1) results[curr.pid].start = time;

    if (prev !== curr.pid) {
      timeline.push({ pid: curr.pid, start: time, end: time });
    }
    timeline[timeline.length - 1].end = time + 1;

    remaining[curr.pid]--;
    if (remaining[curr.pid] === 0) {
      results[curr.pid].finish    = time + 1;
      results[curr.pid].turnaround = time + 1 - curr.arrival;
      results[curr.pid].waiting    = results[curr.pid].turnaround - curr.burst;
      done++;
    }
    prev = curr.pid;
    time++;
  }

  return { timeline: mergeTimeline(timeline), results };
}

// ─── Round Robin ───────────────────────────────────────────────
function scheduleRR(procs, quantum) {
  const timeline = [];
  const results = {};
  const remaining = {};
  const queue = [];
  const added = new Set();

  procs.forEach(p => {
    remaining[p.pid] = p.burst;
    results[p.pid] = { arrival: p.arrival, burst: p.burst, priority: p.priority, start: -1, finish: 0, response: -1 };
  });

  const sorted = [...procs].sort((a, b) => a.arrival - b.arrival);
  let time = 0;
  let done = 0;

  // Seed initial queue
  sorted.filter(p => p.arrival <= 0).forEach(p => { queue.push(p.pid); added.add(p.pid); });

  const enqueueArrived = t => {
    sorted.filter(p => p.arrival <= t && !added.has(p.pid)).forEach(p => { queue.push(p.pid); added.add(p.pid); });
  };

  while (done < procs.length) {
    enqueueArrived(time);
    if (!queue.length) {
      // Jump to next arrival
      const nextArr = sorted.filter(p => !added.has(p.pid) && remaining[p.pid] > 0)
                            .sort((a, b) => a.arrival - b.arrival)[0];
      if (nextArr) { timeline.push({ pid: "IDLE", start: time, end: nextArr.arrival }); time = nextArr.arrival; enqueueArrived(time); }
      else break;
    }

    const pid = queue.shift();
    if (!pid || remaining[pid] === undefined || remaining[pid] <= 0) continue;

    const proc = procs.find(p => p.pid === pid);
    if (results[pid].response === -1) results[pid].response = time - proc.arrival;
    if (results[pid].start === -1) results[pid].start = time;

    const exec = Math.min(quantum, remaining[pid]);
    timeline.push({ pid, start: time, end: time + exec });
    remaining[pid] -= exec;
    time += exec;
    enqueueArrived(time);

    if (remaining[pid] === 0) {
      results[pid].finish    = time;
      results[pid].turnaround = time - proc.arrival;
      results[pid].waiting    = results[pid].turnaround - proc.burst;
      done++;
    } else {
      queue.push(pid);
    }
  }
  return { timeline, results };
}

// ─── Timeline helpers ─────────────────────────────────────────
function mergeTimeline(tl) {
  if (!tl.length) return tl;
  const out = [{ ...tl[0] }];
  for (let i = 1; i < tl.length; i++) {
    const last = out[out.length - 1];
    if (tl[i].pid === last.pid && tl[i].start <= last.end) {
      last.end = Math.max(last.end, tl[i].end);
    } else {
      out.push({ ...tl[i] });
    }
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

// ─── Stats strip ──────────────────────────────────────────────
function renderStats(result) {
  const vals = Object.values(result.results);
  const avgTAT = avg(vals.map(v => v.turnaround));
  const avgWT  = avg(vals.map(v => v.waiting));
  const avgRT  = avg(vals.map(v => v.response));
  const totalTime = Math.max(...vals.map(v => v.finish)) - Math.min(...vals.map(v => v.arrival));
  const totalBurst = vals.reduce((s, v) => s + v.burst, 0);
  const cpuUtil = ((totalBurst / totalTime) * 100).toFixed(1);
  const throughput = (vals.length / totalTime).toFixed(3);

  const stats = [
    { icon: "⏱️", label: "Avg Turnaround", val: avgTAT.toFixed(2), grad: "var(--grad-green)" },
    { icon: "⌛", label: "Avg Waiting Time", val: avgWT.toFixed(2), grad: "var(--grad-orange)" },
    { icon: "⚡", label: "Avg Response Time", val: avgRT.toFixed(2), grad: "var(--grad-blue)" },
    { icon: "🖥️", label: "CPU Utilization", val: cpuUtil + "%", grad: "var(--grad-purple)" },
    { icon: "📊", label: "Throughput", val: throughput + "/u", grad: "var(--grad-pink)" },
    { icon: "🧩", label: "Processes", val: vals.length, grad: "linear-gradient(135deg,#facc15,#f97316)" },
  ];

  dom.statsStrip.innerHTML = stats.map((s, i) => `
    <div class="stat-card" style="animation-delay:${i * 0.06}s">
      <div class="stat-icon" style="background:${s.grad}">${s.icon}</div>
      <div>
        <div class="stat-value">${s.val}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    </div>
  `).join("");
}

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

// ─── Gantt chart ──────────────────────────────────────────────
function renderGantt(timeline, procs) {
  const totalEnd = timeline.length ? Math.max(...timeline.map(b => b.end)) : 0;
  const unitWidth = Math.max(24, Math.floor(state.zoomLevel * 0.36)); // px per time unit

  const colorMap = {};
  procs.forEach(p => colorMap[p.pid] = p.color);

  // Blocks
  dom.ganttContainer.innerHTML = timeline.map((block, i) => {
    const width  = (block.end - block.start) * unitWidth;
    const isIdle = block.pid === "IDLE";
    const color  = isIdle ? null : colorMap[block.pid];
    const delay  = Math.min(i * 0.04, 1.2);
    return `
      <div class="gantt-block ${isIdle ? "idle" : ""}"
           style="width:${width}px; min-width:${width}px;
                  ${color ? `background:${hexToGrad(color)}` : ''};
                  animation-delay:${delay}s"
           title="${block.pid}: [${block.start}–${block.end}]">
        ${width > 30 ? (isIdle ? "IDLE" : block.pid) : ""}
        <div class="gantt-tooltip">${block.pid} · ${block.start}→${block.end} (Δ${block.end - block.start})</div>
      </div>
    `;
  }).join("");

  // Timeline ticks
  dom.ganttTimeline.innerHTML = "";
  dom.ganttTimeline.style.position = "relative";
  dom.ganttTimeline.style.height = "20px";
  dom.ganttTimeline.style.minWidth = `${totalEnd * unitWidth}px`;

  const tickStep = getTickStep(totalEnd);
  for (let t = 0; t <= totalEnd; t += tickStep) {
    const mark = document.createElement("span");
    mark.className = "timeline-mark";
    mark.style.left = `${t * unitWidth}px`;
    mark.textContent = t;
    dom.ganttTimeline.appendChild(mark);
  }

  // Legend
  const seen = new Set();
  dom.ganttLegend.innerHTML = timeline
    .filter(b => b.pid !== "IDLE" && !seen.has(b.pid) && seen.add(b.pid))
    .map(b => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${colorMap[b.pid]}"></span>
        ${b.pid}
      </div>
    `).join("");
}

function hexToGrad(hex) {
  return `linear-gradient(135deg, ${hex}, ${shiftHex(hex, 30)})`;
}

function shiftHex(hex, deg) {
  // Simple hue shift approximation
  const [r, g, b] = hexToRGB(hex);
  const [h, s, l] = rgbToHSL(r, g, b);
  const [nr, ng, nb] = hslToRGB((h + deg) % 360, s, l);
  return `rgb(${nr},${ng},${nb})`;
}

function hexToRGB(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToHSL(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6;
    }
  }
  return [h * 360, s, l];
}

function hslToRGB(h, s, l) {
  h /= 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  return [hue2rgb(p, q, h + 1/3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1/3)].map(v => Math.round(v * 255));
}

function getTickStep(total) {
  if (total <= 20)  return 1;
  if (total <= 50)  return 5;
  if (total <= 100) return 10;
  if (total <= 200) return 20;
  return 50;
}

// ─── Metrics table ─────────────────────────────────────────────
function renderMetricsTable(result, procs) {
  const showPriority = state.algorithm === "PRIORITY";
  dom.priorityCol.style.display = showPriority ? "" : "none";

  const vals = Object.values(result.results);
  const rows = procs.map((p, i) => {
    const r = result.results[p.pid];
    if (!r) return "";
    return `
      <tr style="animation-delay:${i * 0.04}s">
        <td><div class="td-pid"><span class="td-dot" style="background:${p.color}"></span>${p.pid}</div></td>
        <td>${r.arrival}</td>
        <td>${r.burst}</td>
        <td class="col-priority" ${showPriority ? "" : 'style="display:none"'}>${r.priority}</td>
        <td>${r.start}</td>
        <td>${r.finish}</td>
        <td><span class="chip chip-tat">${r.turnaround}</span></td>
        <td><span class="chip chip-wt">${r.waiting}</span></td>
        <td><span class="chip chip-rt">${r.response}</span></td>
      </tr>
    `;
  });

  const avgTAT = avg(vals.map(v => v.turnaround)).toFixed(2);
  const avgWT  = avg(vals.map(v => v.waiting)).toFixed(2);
  const avgRT  = avg(vals.map(v => v.response)).toFixed(2);

  const avgRow = `
    <tr class="avg-row">
      <td colspan="${showPriority ? 6 : 5}">Average</td>
      <td><span class="chip chip-tat">${avgTAT}</span></td>
      <td><span class="chip chip-wt">${avgWT}</span></td>
      <td><span class="chip chip-rt">${avgRT}</span></td>
    </tr>
  `;

  dom.metricsBody.innerHTML = rows.join("") + avgRow;
}

// ─── Export CSV ────────────────────────────────────────────────
dom.exportCSV.addEventListener("click", () => {
  if (!state.lastResult) { showToast("Run a simulation first", "error"); return; }
  const { results } = state.lastResult;
  const header = ["PID","Arrival","Burst","Priority","Start","Finish","Turnaround","Waiting","Response"];

  const dataRows = state.processes.map(p => {
    const r = results[p.pid];
    return r ? [p.pid, r.arrival, r.burst, r.priority, r.start, r.finish, r.turnaround, r.waiting, r.response] : [];
  }).filter(row => row.length);

  const csv = [header, ...dataRows].map(r => r.join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `processsim_${state.algorithm}_${Date.now()}.csv`;
  a.click();
  showToast("CSV exported", "success");
});

// ─── Toast notifications ──────────────────────────────────────
function showToast(msg, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-dot"></span><span>${msg}</span>`;
  dom.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 350);
  }, 2800);
}

// ─── Init ─────────────────────────────────────────────────────
updateAlgoUI();
renderProcessList();

// Seed some example processes for first-time users
(function seedDemo() {
  const demo = [
    { pid: "P1", arrival: 0, burst: 10, priority: 3 },
    { pid: "P2", arrival: 2, burst: 5,  priority: 1 },
    { pid: "P3", arrival: 4, burst: 8,  priority: 4 },
    { pid: "P4", arrival: 6, burst: 3,  priority: 2 },
    { pid: "P5", arrival: 8, burst: 6,  priority: 5 },
  ];
  demo.forEach(p => state.processes.push({ ...p, color: getColor(p.pid) }));
  state.nextId = demo.length + 1;
  dom.pidInput.value = `P${state.nextId}`;
  renderProcessList();
})();
