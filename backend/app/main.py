from __future__ import annotations

import inspect
import logging
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

from codecarbon import EmissionsTracker
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from pynvml import NVMLError  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    NVMLError = None  # type: ignore[misc,assignment]


load_dotenv()


def _load_execution_timeout() -> float:
    raw_timeout = os.getenv("EXECUTION_TIMEOUT", "10").strip()
    try:
        timeout = float(raw_timeout)
    except ValueError as exc:
        raise RuntimeError(
            f"Invalid EXECUTION_TIMEOUT value '{raw_timeout}'. It must be a number."
        ) from exc
    if timeout <= 0:
        raise RuntimeError("EXECUTION_TIMEOUT must be greater than zero.")
    return timeout


EXECUTION_TIMEOUT = _load_execution_timeout()
logger = logging.getLogger(__name__)
_GPU_TRACKING_ENABLED = True

app = FastAPI(title="CodeCarbon Runner", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


class RunRequest(BaseModel):
    code: str = Field(..., description="Python source code to execute")


class RunResponse(BaseModel):
    stdout: str
    stderr: str
    emissions: float
    energy_kwh: float
    cpu_energy: float
    gpu_energy: float
    duration: float
    carbon_intensity: Optional[float]
    country: Optional[str]


class ExecutionError(Exception):
    """Raised when user code execution fails."""


def _is_gpu_tracker_error(exc: Exception) -> bool:
    if NVMLError is not None and isinstance(exc, NVMLError):
        return True
    name = exc.__class__.__name__
    return name.startswith("NVMLError") or "pynvml" in repr(exc)


def _patch_gpu_detection_to_false() -> None:
    try:
        from codecarbon.core import gpu as codecarbon_gpu
    except Exception:  # pragma: no cover - defensive guard
        return

    if getattr(codecarbon_gpu, "is_gpu_details_available", None) is not None:
        codecarbon_gpu.is_gpu_details_available = lambda: False


def _disable_gpu_tracking(exc: Optional[Exception] = None) -> None:
    global _GPU_TRACKING_ENABLED
    if not _GPU_TRACKING_ENABLED:
        return
    _GPU_TRACKING_ENABLED = False
    os.environ.setdefault("CODECARBON_HIDE_GPU", "1")
    _patch_gpu_detection_to_false()
    if exc:
        logger.warning("GPU tracking disabled: %s", exc)


def _ensure_gpu_tracking_state() -> None:
    if not _GPU_TRACKING_ENABLED:
        _patch_gpu_detection_to_false()


def _create_tracker() -> EmissionsTracker:
    tracker_kwargs: Dict[str, Any] = {
        "tracking_mode": "process",
        "measure_power_secs": 1,
        "log_level": "error",
        "save_to_file": False,
    }
    if "country_iso_code" in inspect.signature(EmissionsTracker).parameters:
        tracker_kwargs["country_iso_code"] = "IND"
    else:
        os.environ.setdefault("CODECARBON_COUNTRY", "IND")
    _ensure_gpu_tracking_state()
    try:
        return EmissionsTracker(**tracker_kwargs)
    except Exception as exc:  # pragma: no cover - defensive guard
        if _is_gpu_tracker_error(exc):
            _disable_gpu_tracking(exc)
            return EmissionsTracker(**tracker_kwargs)
        raise


def _latest_emissions_data(tracker: EmissionsTracker) -> Any:
    data = getattr(tracker, "final_emissions_data", None)
    if data:
        return data
    cached = getattr(tracker, "_emissions_data", None)
    if isinstance(cached, list) and cached:
        return cached[-1]
    return None


def _collect_tracker_metrics(tracker: EmissionsTracker) -> Dict[str, Any]:
    data = _latest_emissions_data(tracker)
    metrics: Dict[str, Any] = {
        "emissions": 0.0,
        "energy_kwh": 0.0,
        "cpu_energy": 0.0,
        "gpu_energy": 0.0,
        "duration": 0.0,
        "carbon_intensity": None,
        "country": "None",
    }

    if data is None:
        return metrics

    metrics["emissions"] = float(getattr(data, "emissions", 0.0)) * 1000.0
    metrics["energy_kwh"] = float(getattr(data, "energy_consumed", 0.0))
    metrics["cpu_energy"] = float(getattr(data, "cpu_energy", 0.0))
    metrics["gpu_energy"] = float(getattr(data, "gpu_energy", 0.0))
    metrics["duration"] = float(getattr(data, "duration", 0.0))
    metrics["carbon_intensity"] = getattr(data, "carbon_intensity", None)
    metrics["country"] = getattr(data, "country_name", None)
    return metrics


def _sanitize_environment() -> Dict[str, str]:
    safe_env: Dict[str, str] = {
        "PYTHONUNBUFFERED": "1",
        "PYTHONIOENCODING": "utf-8",
    }
    path = os.getenv("PATH")
    if path:
        safe_env["PATH"] = path
    return safe_env


def run_python(code: str) -> Dict[str, Any]:
    with tempfile.TemporaryDirectory() as tmpdir:
        script_path = Path(tmpdir, "script.py")
        script_path.write_text(code, encoding="utf-8")

        tracker = _create_tracker()
        tracker.start()
        try:
            completed = subprocess.run(
                [sys.executable, "-I", "-B", str(script_path)],
                cwd=tmpdir,
                env=_sanitize_environment(),
                text=True,
                capture_output=True,
                timeout=EXECUTION_TIMEOUT,
            )
        except subprocess.TimeoutExpired as exc:
            raise ExecutionError(f"Execution timed out after {EXECUTION_TIMEOUT} seconds.") from exc
        finally:
            tracker.stop()

        if completed.returncode != 0:
            stderr_message = (completed.stderr or "").strip() or "Execution failed."
            raise ExecutionError(stderr_message)

        metrics = _collect_tracker_metrics(tracker)
        metrics["stdout"] = completed.stdout
        metrics["stderr"] = completed.stderr
        return metrics


@app.post("/run", response_model=RunResponse)
def run_code(request: RunRequest) -> RunResponse:
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="Code payload cannot be empty.")

    try:
        result = run_python(request.code)
    except ExecutionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive guard
        raise HTTPException(status_code=500, detail=f"Execution failed: {exc}") from exc

    return RunResponse(**result)


@app.get("/healthz")
def healthcheck() -> Dict[str, str]:
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=True)
