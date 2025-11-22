import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { executeCode } from "./api";
import type { RunResponse } from "./types";
import { MetricCard } from "./components/MetricCard";
import { OutputConsole } from "./components/OutputConsole";
import { LoadingIndicator } from "./components/LoadingIndicator";

type Theme = "dark" | "light";

const LANGUAGE_OPTIONS = [{ label: "Python 3.11", value: "python" }];
const DEFAULT_CODE = `import time

print("Measuring emissions with CodeCarbon...")
total = 0
for i in range(50_000):
    total += i
    if i % 10_000 == 0:
        time.sleep(0.01)

print("Result:", total)
`;
const TEMPLATE_OPTIONS = [
  {
    label: "Custom",
    value: "custom",
    code: DEFAULT_CODE
  },
  {
    label: "Transformer",
    value: "transformer",
    code: `import math
import random
import time

def scaled_dot_product_attention(query, keys, values):
    # Compute attention scores for each key
    scores = [sum(qi * ki for qi, ki in zip(query, key)) for key in keys]
    scale = 1 / math.sqrt(len(query))
    weights = [math.exp(s * scale) for s in scores]
    total = sum(weights)
    weights = [w / total for w in weights]

    # Weighted sum of value vectors
    dim = len(values[0])
    output = []
    for d in range(dim):
        output.append(sum(w * val[d] for w, val in zip(weights, values)))
    return output, weights

tokens = ["hello", "codecarbon", "world", "!"]
embed = {t: [random.random() for _ in range(4)] for t in tokens}

query = embed["hello"]
keys = [embed[t] for t in tokens]
values = [embed[t] for t in tokens]

time.sleep(0.05)
attended, weights = scaled_dot_product_attention(query, keys, values)

print("Attention weights:", [round(w, 3) for w in weights])
print("Transformer-style attention result:", [round(x, 3) for x in attended])`
  },
  {
    label: "Classifier",
    value: "classifier",
    code: `from collections import Counter
import math
import time

def cosine_sim(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0

classes = {
    "sports": [1, 0, 0, 1, 0],
    "tech": [0, 1, 1, 0, 1],
    "finance": [0, 0, 1, 1, 0],
}

doc = "tech markets rally on new AI chips".split()
vocab = {"sports":0,"tech":1,"ai":2,"chips":3,"finance":4}
vec = [0]*5
for token, count in Counter(doc).items():
    if token in vocab:
        vec[vocab[token]] = count

time.sleep(0.05)
scores = {label: cosine_sim(vec, emb) for label, emb in classes.items()}
pred = max(scores, key=scores.get)
print("Scores:", scores)
print("Predicted class:", pred)`
  },
  {
    label: "Neural network",
    value: "neural",
    code: `import math
import random
import time

random.seed(0)

def relu(x): return max(0, x)
def sigmoid(x): return 1 / (1 + math.exp(-x))

weights1 = [[random.uniform(-1, 1) for _ in range(3)] for _ in range(4)]
weights2 = [random.uniform(-1, 1) for _ in range(4)]
bias1 = [0.1] * 4
bias2 = 0.05

def forward(x):
    h = [relu(sum(wi * xi for wi, xi in zip(w, x)) + b) for w, b in zip(weights1, bias1)]
    out = sigmoid(sum(wi * hi for wi, hi in zip(weights2, h)) + bias2)
    return h, out

sample = [0.2, 0.8, 0.4]
time.sleep(0.05)
hidden, output = forward(sample)
print("Hidden layer:", [round(v, 3) for v in hidden])
print("Output probability:", round(output, 3))`
  }
];

function formatNumber(value?: number | null, fractionDigits = 4) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "0";
  }
  return value.toFixed(fractionDigits);
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }
    return (window.localStorage.getItem("theme") as Theme | null) ?? "dark";
  });
  const [language, setLanguage] = useState(LANGUAGE_OPTIONS[0].value);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [result, setResult] = useState<RunResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMetrics, setShowMetrics] = useState(false);
  const [template, setTemplate] = useState(TEMPLATE_OPTIONS[0].value);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem("theme", theme);
    }
  }, [theme]);

  const metrics = useMemo(() => {
    if (!result) {
      return null;
    }
    return [
      {
        label: "Energy Consumed",
        value: `${formatNumber(result.energy_kwh, 6)} kWh`
      },
      {
        label: "CO₂ Emitted",
        value: `${formatNumber(result.emissions, 4)} g`,
        accent: "from-emerald-400 to-lime-400"
      },
      {
        label: "Duration",
        value: `${formatNumber(result.duration, 2)} s`,
        accent: "from-fuchsia-400 to-pink-500"
      },
      {
        label: "CPU Energy",
        value: `${formatNumber(result.cpu_energy, 6)} kWh`
      },
      {
        label: "GPU Energy",
        value: `${formatNumber(result.gpu_energy, 6)} kWh`
      },
      {
        label: "Carbon Intensity",
        value: result.carbon_intensity ? `${result.carbon_intensity} gCO₂/kWh` : "N/A"
      }
    ];
  }, [result]);

  const handleRun = async () => {
    if (!code.trim()) {
      setError("Please provide code to execute.");
      return;
    }
    setIsRunning(true);
    setResult(null); // clear previous run data immediately
    setShowMetrics(false);
    setError(null);
    try {
      const data = await executeCode({ code });
      setResult(data);
      setShowMetrics(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleTemplateChange = (value: string) => {
    setTemplate(value);
    const selected = TEMPLATE_OPTIONS.find((t) => t.value === value);
    if (selected?.code) {
      setCode(selected.code);
      setResult(null);
      setError(null);
      setShowMetrics(false);
    }
  };

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  const backgroundClass =
    theme === "dark"
      ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
      : "bg-gradient-to-br from-slate-100 via-white to-slate-50";

  return (
    <div className={`min-h-screen ${backgroundClass} transition-colors duration-300 ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>
      <header className="px-6 py-6">
        <div className="max-w-6xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-widest text-cyan-500 dark:text-cyan-400">CodeCarbon Playground</p>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Monitor emissions as you code</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-1 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <span className="h-2 w-2 rounded-full bg-slate-900 dark:bg-yellow-300" />
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            {isRunning && <LoadingIndicator />}
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-6 pb-12 flex flex-col gap-6 md:pr-[360px]">
        <section className="glass-panel rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-600 dark:text-slate-300">Language</label>
              <select
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-600 dark:text-slate-300">Template</label>
              <select
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                value={template}
                onChange={(event) => handleTemplateChange(event.target.value)}
              >
                {TEMPLATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-2 font-semibold text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunning ? "Running…" : "Run Code"}
            </button>
          </div>
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <Editor
              height="420px"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value ?? "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                automaticLayout: true,
                scrollBeyondLastLine: false
              }}
            />
          </div>
          {error && (
            <p className="rounded-lg bg-rose-500/10 px-4 py-2 text-sm text-rose-700 dark:text-rose-200">
              {error}
            </p>
          )}
        </section>

        <OutputConsole stdout={result?.stdout ?? ""} stderr={result?.stderr ?? ""} />

        <aside
          className={`fixed right-4 top-28 bottom-6 z-30 w-full max-w-sm transition-transform duration-300 ease-out md:right-10 md:top-24 ${
            showMetrics ? "translate-x-0" : "translate-x-[110%]"
          }`}
        >
          <div className="glass-panel rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-2xl backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/80">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-cyan-500 dark:text-cyan-300">Energy & Emissions</p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Live metrics</h2>
              </div>
              <div className="flex items-center gap-3">
                {result?.country && (
                  <span className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    {result.country}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowMetrics(false)}
                  className="rounded-full border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label="Close metrics panel"
                >
                  Close
                </button>
              </div>
            </div>
            {metrics ? (
              <div className="mt-4 grid grid-cols-1 gap-3">
                {metrics.map((metric) => (
                  <MetricCard key={metric.label} label={metric.label} value={metric.value} accent={metric.accent} />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Run code to see live measurements.</p>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
