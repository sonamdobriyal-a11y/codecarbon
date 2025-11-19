export function LoadingIndicator() {
  return (
    <div className="flex items-center gap-3 text-cyan-600 dark:text-cyan-300">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75 dark:bg-cyan-300" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-600 dark:bg-cyan-500" />
      </span>
      <span className="text-sm font-medium tracking-wide uppercase">Measuring emissions…</span>
    </div>
  );
}
