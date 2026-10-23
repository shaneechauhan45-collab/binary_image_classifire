
"use strict";

const $ = (id) => document.getElementById(id);

const algorithm = $("algorithm");
const bars = $("bars");
const arraySize = $("arraySize");
const speed = $("speed");

const info = {
  bubble: {
    name: "Bubble Sort",
    best: "O(n)",
    average: "O(n²)",
    worst: "O(n²)",
    space: "O(1)",
    description:
      "Compares adjacent elements and swaps them when they are in the wrong order. After each pass, the largest remaining value moves to the end."
  },
  selection: {
    name: "Selection Sort",
    best: "O(n²)",
    average: "O(n²)",
    worst: "O(n²)",
    space: "O(1)",
    description:
      "Finds the smallest value in the unsorted portion and places it at the beginning of that portion."
  },
  insertion: {
    name: "Insertion Sort",
    best: "O(n)",
    average: "O(n²)",
    worst: "O(n²)",
    space: "O(1)",
    description:
      "Builds a sorted portion one element at a time by shifting larger elements to the right and inserting each value into its correct position."
  },
  merge: {
    name: "Merge Sort",
    best: "O(n log n)",
    average: "O(n log n)",
    worst: "O(n log n)",
    space: "O(n)",
    description:
      "Divides the array into smaller parts, sorts each part recursively, and merges the sorted parts back together."
  },
  quick: {
    name: "Quick Sort",
    best: "O(n log n)",
    average: "O(n log n)",
    worst: "O(n²)",
    space: "O(log n)",
    description:
      "Chooses a pivot, partitions the array around it, and recursively sorts the elements on either side. The stated space is typical auxiliary stack space."
  },
  heap: {
    name: "Heap Sort",
    best: "O(n log n)",
    average: "O(n log n)",
    worst: "O(n log n)",
    space: "O(1)",
    description:
      "Builds a max heap, repeatedly moves its largest element to the end, and restores the heap property."
  }
};

let original = [];
let values = [];
let comparisons = 0;
let swaps = 0;
let startedAt = 0;
let elapsedBeforePause = 0;
let timerHandle = null;
let running = false;
let paused = false;
let finished = false;
let runId = 0;
let sortedIndices = new Set();
let lastState = { compare: [], active: [] };

function randomArray(size) {
  return Array.from(
    { length: size },
    () => Math.floor(Math.random() * 95) + 5
  );
}

function renderBars(state = {}) {
  const max = Math.max(...values, 1);
  const compare = new Set(state.compare || []);
  const active = new Set(state.active || []);
  const sorted = state.sorted || sortedIndices;

  bars.replaceChildren();

  values.forEach((value, index) => {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${(value / max) * 100}%`;
    bar.title = `Index: ${index}, Value: ${value}`;
    bar.setAttribute("aria-label", `Index ${index}, value ${value}`);

    if (sorted.has(index)) {
      bar.classList.add("sorted");
    } else if (active.has(index)) {
      bar.classList.add("active");
    } else if (compare.has(index)) {
      bar.classList.add("comparing");
    }

    bars.appendChild(bar);
  });
}

function updateMetrics() {
  $("comparisons").textContent = comparisons.toLocaleString();
  $("swaps").textContent = swaps.toLocaleString();
  $("metricSize").textContent = values.length;
  $("sizeValue").textContent = arraySize.value;
}

function setStatus(message) {
  $("runStatus").textContent = `● ${message}`;
}

function currentElapsed() {
  return elapsedBeforePause +
    (running && !paused ? performance.now() - startedAt : 0);
}

function updateElapsed() {
  $("elapsed").textContent =
    `${(currentElapsed() / 1000).toFixed(2)} s`;
}

function startClock() {
  startedAt = performance.now();
  clearInterval(timerHandle);
  timerHandle = setInterval(updateElapsed, 50);
}

function stopClock() {
  if (running && !paused) {
    elapsedBeforePause += performance.now() - startedAt;
  }
  clearInterval(timerHandle);
  timerHandle = null;
  updateElapsed();
}

function updateButtons() {
  $("start").disabled = running || finished;
  $("pause").disabled = !running;
  $("pause").textContent = paused ? "▶ Resume" : "Ⅱ Pause";
  $("newArray").disabled = running;
  $("reset").disabled = running;
  algorithm.disabled = running;
  arraySize.disabled = running;
}

function resetStats() {
  comparisons = 0;
  swaps = 0;
  elapsedBeforePause = 0;
  sortedIndices = new Set();
  lastState = { compare: [], active: [] };
  updateMetrics();
  $("elapsed").textContent = "0.00 s";
}

function generateArray() {
  if (running) return;

  original = randomArray(Number(arraySize.value));
  values = [...original];
  finished = false;
  resetStats();
  renderBars();
  setStatus("Ready");
  updateButtons();
}

function resetArray() {
  if (running) return;

  values = [...original];
  finished = false;
  resetStats();
  renderBars();
  setStatus("Reset");
  updateButtons();
}

function updateAlgorithmInfo() {
  const key = algorithm.value;
  const data = info[key];

  $("algorithmName").textContent = data.name;
  $("learnTitle").textContent = data.name;
  $("learnDescription").textContent = data.description;
  $("learnTime").textContent = `Average time: ${data.average}`;
  $("learnSpace").textContent = `Space: ${data.space}`;

  document.querySelectorAll("#complexityBody tr").forEach((row) => {
    row.classList.toggle("selected", row.dataset.key === key);
  });
}

function buildComplexityTable() {
  const tbody = $("complexityBody");
  tbody.replaceChildren();

  Object.entries(info).forEach(([key, item]) => {
    const row = document.createElement("tr");
    row.dataset.key = key;

    [
      item.name,
      item.best,
      item.average,
      item.worst,
      item.space
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });

  updateAlgorithmInfo();
}

function* snapshot(compare = [], active = []) {
  yield {
    array: [...values],
    compare: [...compare],
    active: [...active],
    sorted: new Set(sortedIndices)
  };
}

function* compareAt(i, j) {
  comparisons++;
  updateMetrics();
  yield* snapshot([i, j]);
}

function* swapAt(i, j) {
  if (i !== j) {
    [values[i], values[j]] = [values[j], values[i]];
    swaps++;
    updateMetrics();
    yield* snapshot([], [i, j]);
  }
}

function* bubbleSort() {
  const n = values.length;

  for (let end = n - 1; end > 0; end--) {
    let changed = false;

    for (let j = 0; j < end; j++) {
      yield* compareAt(j, j + 1);

      if (values[j] > values[j + 1]) {
        yield* swapAt(j, j + 1);
        changed = true;
      }
    }

    sortedIndices.add(end);
    yield* snapshot();

    if (!changed) break;
  }

  sortedIndices.add(0);
}

function* selectionSort() {
  const n = values.length;

  for (let i = 0; i < n - 1; i++) {
    let min = i;

    for (let j = i + 1; j < n; j++) {
      yield* compareAt(min, j);

      if (values[j] < values[min]) min = j;
    }

    yield* swapAt(i, min);
    sortedIndices.add(i);
    yield* snapshot();
  }

  sortedIndices.add(n - 1);
}

function* insertionSort() {
  for (let i = 1; i < values.length; i++) {
    const key = values[i];
    let j = i - 1;

    while (j >= 0) {
      yield* compareAt(j, j + 1);

      if (values[j] <= key) break;

      values[j + 1] = values[j];
      swaps++;
      updateMetrics();
      yield* snapshot([], [j, j + 1]);
      j--;
    }

    values[j + 1] = key;
    sortedIndices = new Set(
      Array.from({ length: i + 1 }, (_, k) => k)
    );
    yield* snapshot();
  }

  sortedIndices = new Set(values.map((_, i) => i));
}

function* mergeSort() {
  function* merge(left, mid, right) {
    const a = values.slice(left, mid + 1);
    const b = values.slice(mid + 1, right + 1);
    let i = 0;
    let j = 0;
    let k = left;

    while (i < a.length && j < b.length) {
      comparisons++;
      updateMetrics();
      yield* snapshot([left + i, mid + 1 + j]);

      if (a[i] <= b[j]) {
        values[k++] = a[i++];
      } else {
        values[k++] = b[j++];
      }

      swaps++;
      updateMetrics();
      yield* snapshot([], [k - 1]);
    }

    while (i < a.length) {
      values[k++] = a[i++];
      swaps++;
      updateMetrics();
      yield* snapshot([], [k - 1]);
    }

    while (j < b.length) {
      values[k++] = b[j++];
      swaps++;
      updateMetrics();
      yield* snapshot([], [k - 1]);
    }
  }

  function* divide(left, right) {
    if (left >= right) return;

    const mid = Math.floor((left + right) / 2);

    yield* divide(left, mid);
    yield* divide(mid + 1, right);
    yield* merge(left, mid, right);
  }

  yield* divide(0, values.length - 1);
  sortedIndices = new Set(values.map((_, i) => i));
}

function* quickSort() {
  function* partition(low, high) {
    const pivot = values[high];
    let i = low - 1;

    for (let j = low; j < high; j++) {
      yield* compareAt(j, high);

      if (values[j] < pivot) {
        i++;
        yield* swapAt(i, j);
      }
    }

    yield* swapAt(i + 1, high);
    sortedIndices.add(i + 1);
    yield* snapshot();
    return i + 1;
  }

  function* sort(low, high) {
    if (low >= high) {
      if (low >= 0 && low < values.length) sortedIndices.add(low);
      return;
    }

    const pivotIndex = yield* partition(low, high);
    yield* sort(low, pivotIndex - 1);
    yield* sort(pivotIndex + 1, high);
  }

  yield* sort(0, values.length - 1);
  sortedIndices = new Set(values.map((_, i) => i));
}

function* heapSort() {
  const n = values.length;

  function* heapify(size, root) {
    let largest = root;
    const left = 2 * root + 1;
    const right = 2 * root + 2;

    if (left < size) {
      yield* compareAt(left, largest);
      if (values[left] > values[largest]) largest = left;
    }

    if (right < size) {
      yield* compareAt(right, largest);
      if (values[right] > values[largest]) largest = right;
    }

    if (largest !== root) {
      yield* swapAt(root, largest);
      yield* heapify(size, largest);
    }
  }

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    yield* heapify(n, i);
  }

  for (let end = n - 1; end > 0; end--) {
    yield* swapAt(0, end);
    sortedIndices.add(end);
    yield* heapify(end, 0);
  }

  sortedIndices.add(0);
}

const algorithms = {
  bubble: bubbleSort,
  selection: selectionSort,
  insertion: insertionSort,
  merge: mergeSort,
  quick: quickSort,
  heap: heapSort
};

function delayMs() {
  return Math.max(2, 205 - Number(speed.value) * 2);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startSorting() {
  if (running || finished) return;

  running = true;
  paused = false;
  const thisRun = ++runId;
  updateButtons();
  setStatus("Sorting");
  startClock();

  const iterator = algorithms[algorithm.value]();

  try {
    while (true) {
      if (thisRun !== runId) return;

      while (paused) {
        await sleep(50);
        if (thisRun !== runId) return;
      }

      const step = iterator.next();

      if (step.done) break;

      const state = step.value;
      if (state) {
        values = state.array;
        lastState = state;
        renderBars(state);
      }

      await sleep(delayMs());
    }

    sortedIndices = new Set(values.map((_, i) => i));
    renderBars({ sorted: sortedIndices });
    finished = true;
    setStatus("Completed ✓");
  } catch (error) {
    console.error("Sorting error:", error);
    setStatus("Error");
  } finally {
    if (thisRun === runId) {
      stopClock();
      running = false;
      paused = false;
      updateButtons();
      updateMetrics();
    }
  }
}

function togglePause() {
  if (!running) return;

  paused = !paused;

  if (paused) {
    elapsedBeforePause += performance.now() - startedAt;
    clearInterval(timerHandle);
    timerHandle = null;
    setStatus("Paused");
  } else {
    startedAt = performance.now();
    timerHandle = setInterval(updateElapsed, 50);
    setStatus("Sorting");
  }

  updateButtons();
  updateElapsed();
}

function cancelRun() {
  runId++;
  clearInterval(timerHandle);
  timerHandle = null;
  running = false;
  paused = false;
  stopClock();
}

function changeAlgorithm() {
  if (running) return;
  updateAlgorithmInfo();
  resetArray();
}

arraySize.addEventListener("input", () => {
  $("sizeValue").textContent = arraySize.value;
  $("metricSize").textContent = arraySize.value;
});

speed.addEventListener("input", () => {
  const value = Number(speed.value);
  $("speedValue").textContent =
    value < 35 ? "Slow" : value < 70 ? "Medium" : "Fast";
});

$("newArray").addEventListener("click", generateArray);
$("reset").addEventListener("click", resetArray);
$("start").addEventListener("click", startSorting);
$("pause").addEventListener("click", togglePause);
algorithm.addEventListener("change", changeAlgorithm);

arraySize.addEventListener("change", generateArray);

buildComplexityTable();
generateArray();
