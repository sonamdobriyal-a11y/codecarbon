type OutputConsoleProps = {
  stdout: string;
  stderr: string;
};

export function OutputConsole({ stdout, stderr }: OutputConsoleProps) {
  const hasOutput = stdout.trim().length > 0 || stderr.trim().length > 0;
  return (
    <div className="glass-panel rounded-xl p-4 h-60 overflow-auto console-output text-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-slate-900 dark:text-slate-200">Output Console</p>
        {!hasOutput && <span className="text-xs text-slate-500 dark:text-slate-400">Waiting for execution…</span>}
      </div>
      {stdout && (
        <pre className="text-emerald-600 dark:text-emerald-200 whitespace-pre-wrap mb-2">
          {stdout || "No stdout"}
        </pre>
      )}
      {stderr && (
        <pre className="text-rose-600 dark:text-rose-300 whitespace-pre-wrap">
          {stderr || "No stderr"}
        </pre>
      )}
      {!hasOutput && <p className="text-slate-500 dark:text-slate-400">Run your code to see results here.</p>}
    </div>
  );
}
