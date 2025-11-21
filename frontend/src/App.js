import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { executeCode } from "./api";
import { MetricCard } from "./components/MetricCard";
import { OutputConsole } from "./components/OutputConsole";
import { LoadingIndicator } from "./components/LoadingIndicator";
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
function formatNumber(value, fractionDigits = 4) {
    if (value === undefined || value === null || Number.isNaN(value)) {
        return "0";
    }
    return value.toFixed(fractionDigits);
}
export default function App() {
    const [theme, setTheme] = useState(() => {
        if (typeof window === "undefined") {
            return "dark";
        }
        return window.localStorage.getItem("theme") ?? "dark";
    });
    const [language, setLanguage] = useState(LANGUAGE_OPTIONS[0].value);
    const [code, setCode] = useState(DEFAULT_CODE);
    const [result, setResult] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState(null);
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
        setError(null);
        try {
            const data = await executeCode({ code });
            setResult(data);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Execution failed.");
        }
        finally {
            setIsRunning(false);
        }
    };
    const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    const backgroundClass = theme === "dark"
        ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
        : "bg-gradient-to-br from-slate-100 via-white to-slate-50";
    return (_jsxs("div", { className: `min-h-screen ${backgroundClass} transition-colors duration-300 ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`, children: [_jsx("header", { className: "px-6 py-6", children: _jsxs("div", { className: "max-w-6xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm uppercase tracking-widest text-cyan-500 dark:text-cyan-400", children: "CodeCarbon Playground" }), _jsx("h1", { className: "text-3xl font-semibold text-slate-900 dark:text-white", children: "Monitor emissions as you code" })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("button", { type: "button", onClick: toggleTheme, className: "inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-1 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800", children: [_jsx("span", { className: "h-2 w-2 rounded-full bg-slate-900 dark:bg-yellow-300" }), theme === "dark" ? "Light mode" : "Dark mode"] }), isRunning && _jsx(LoadingIndicator, {})] })] }) }), _jsxs("main", { className: "max-w-6xl mx-auto px-6 pb-12 flex flex-col gap-6", children: [_jsxs("section", { className: "glass-panel rounded-2xl p-4 flex flex-col gap-4", children: [_jsxs("div", { className: "flex flex-col gap-4 md:flex-row md:items-center md:justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("label", { className: "text-sm text-slate-600 dark:text-slate-300", children: "Language" }), _jsx("select", { className: "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100", value: language, onChange: (event) => setLanguage(event.target.value), children: LANGUAGE_OPTIONS.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsx("button", { type: "button", onClick: handleRun, disabled: isRunning, className: "inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-2 font-semibold text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50", children: isRunning ? "Running…" : "Run Code" })] }), _jsx("div", { className: "border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden", children: _jsx(Editor, { height: "420px", language: language, theme: "vs-dark", value: code, onChange: (value) => setCode(value ?? ""), options: {
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        automaticLayout: true,
                                        scrollBeyondLastLine: false
                                    } }) }), error && (_jsx("p", { className: "rounded-lg bg-rose-500/10 px-4 py-2 text-sm text-rose-700 dark:text-rose-200", children: error }))] }), _jsxs("section", { className: "grid grid-cols-1 gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "glass-panel rounded-2xl p-4 space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: "Energy & Emissions" }), result?.country && (_jsx("span", { className: "text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400", children: result.country }))] }), metrics ? (_jsx("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2", children: metrics.map((metric) => (_jsx(MetricCard, { label: metric.label, value: metric.value, accent: metric.accent }, metric.label))) })) : (_jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400", children: "Run code to see live measurements." }))] }), _jsx(OutputConsole, { stdout: result?.stdout ?? "", stderr: result?.stderr ?? "" })] })] })] }));
}
