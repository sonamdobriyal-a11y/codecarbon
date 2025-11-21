import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function MetricCard({ label, value, accent = "from-cyan-500 to-blue-500" }) {
    return (_jsxs("div", { className: "glass-panel rounded-xl p-4", children: [_jsx("p", { className: "text-sm text-slate-600 dark:text-slate-300", children: label }), _jsx("p", { className: `mt-2 text-2xl font-semibold bg-gradient-to-r ${accent} bg-clip-text text-transparent`, children: value })] }));
}
