export type RunRequest = {
  code: string;
};

export type RunMetrics = {
  emissions: number;
  energy_kwh: number;
  cpu_energy: number;
  gpu_energy: number;
  duration: number;
  carbon_intensity?: number | null;
  country?: string | null;
};

export type RunResponse = RunMetrics & {
  stdout: string;
  stderr: string;
};
