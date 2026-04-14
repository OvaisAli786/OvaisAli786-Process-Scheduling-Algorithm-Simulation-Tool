# Process Scheduling Simulator

A professional, web-based tool designed to simulate, visualize, and analyze CPU scheduling algorithms. This application provides a dynamic and interactive environment to understand how modern operating systems manage process execution.

## 🚀 Key Features

- **Comprehensive Algorithm Support**: FCFS, SJF (Preemptive/Non-preemptive), Priority (Preemptive/Non-preemptive), and Round Robin.
- **Dynamic Visualization**: Context-aware Gantt charts that respond to preemption and quantum expiration in real-time.
- **Professional Benchmarking**: Automatic calculation of TAT, WT, and RT with a summary table.
- **Data Export**: Export simulation results to CSV for offline reporting and academic analysis.
- **Responsive Design**: Premium dark-mode UI optimized for all screen sizes with smooth glassmorphic aesthetics.

## 🛠 Tech Stack

Built with a focus on zero-dependency performance and clean architecture:
- **Core**: Vanilla JavaScript (ES6+) for logic and scheduling engine.
- **Styling**: Modern CSS3 with CSS Variables, Flexbox/Grid, and glassmorphic design principles.
- **Markup**: HTML5 Semantic elements for SEO and accessibility.

## ⚙️ How It Works

The simulation engine strictly follows a four-phase pipeline to accurately replicate operating system-level process scheduling:

### 1. Algorithm Configuration
The simulation begins by selecting a scheduling strategy. The core logic engine instantly adapts its dispatch rules based on the chosen algorithm:
- **First-Come, First-Served (FCFS):** A non-preemptive baseline where processes are executed strictly by their arrival time.
- **Shortest Job First (SJF):** The dispatcher selects the process with the smallest execution burst. It supports both **Non-Preemptive** and **Preemptive (SRTF)** modes.
- **Priority Scheduling:** Processes are scheduled based on predefined priority tiers. This supports dynamic toggling between preemptive and non-preemptive execution.
- **Round Robin (RR):** A cyclic time-sharing approach utilizing a user-configurable **Time Quantum** to ensure fair execution time across all active workloads.

### 2. Workload Ingestion & Queue Management
Users define the simulated workload by inputting strict process parameters:
- **Process ID (PID):** A unique identifier for the spawned process.
- **Arrival Time (AT):** The absolute clock tick when the process enters the ready queue.
- **Burst Time (BT):** The total CPU processing time required for the process to complete.
- **Priority:** Used to resolve dispatch conflicts when multiple processes compete for CPU cycles.

The engine validates these inputs and constructs an internal **Ready Queue**, sorting and tracking the state of each process over time.

### 3. Execution & Dispatch Protocol
Once the simulation is triggered, the engine acts as the CPU scheduler:
- **State Transitions:** It continuously monitors process states (New, Ready, Running, Terminated), evaluating preemption policies and time quantum expiration on every clock tick.
- **Timeline Logging:** It tracks context switches, active bursts, and idle intervals to construct a precise continuous timeline of events from clock tick `0` until all queues are completely drained.

### 4. Visualization & Statistical Benchmarking
The processed timeline data is passed to the presentation layer to render comprehensive analytics:
- **Dynamic Gantt Chart:** An interactive, proportional timeline that visually represents the process execution lifecycle, including preemption fragments and idle gaps.
- **Performance Metrics:** The system automatically computes essential CPU performance benchmarks for every individual process:
  - **Turnaround Time (TAT):** Total time spent in the system (Completion Time - Arrival Time).
  - **Waiting Time (WT):** Total time spent waiting in the ready queue (Turnaround Time - Burst Time).
  - **Response Time (RT):** Time elapsed from process arrival to its very first allocation of the CPU.

All computed metrics are aggregated into data tables and can be rapidly exported as structured CSV files for comparative data analysis across different algorithms.