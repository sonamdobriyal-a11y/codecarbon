const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
export async function executeCode(payload) {
    const response = await fetch(`${API_BASE}/run`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const message = await response
            .json()
            .catch(() => ({ detail: "Execution failed" }));
        throw new Error(message.detail ?? "Execution failed");
    }
    return response.json();
}
