import React, { useCallback, useEffect } from "react";
import { parseJSONL } from "../utils/dump";
import { useDumpPlayer } from "../hooks/useDumpPlayer";
import { StreamingOutput } from "../components/StreamingOutput";
import { VegaPreview } from "../components/VegaPreview";
import { JsonBox } from "../components/JsonBox";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function AIExplorePage() {
  const {
    eventsCount,
    loadEvents,

    play,
    stop,
    pause,
    resume,
    continueFromPause,

    canPlay,
    canStop,
    canPause,
    canResume,

    status,
    streamText,
    error,

    vegaSpec,
    vegaRaw,
    vegaHint,
    vegaSource,

    speed,
    setSpeed,

    copyText,
    copyVega,
  } = useDumpPlayer();

  // If we're paused and user hit Resume, we continue from the pause point
  useEffect(() => {
    if (status === "streaming") return;
  }, [status]);

  const onFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      const text = await file.text();
      const events = parseJSONL(text);
      loadEvents(events);
    },
    [loadEvents]
  );

  const onResume = useCallback(() => {
    resume();
    // continueFromPause runs the actual loop
    continueFromPause();
  }, [resume, continueFromPause]);

  const prettySpec = vegaSpec ? JSON.stringify(vegaSpec, null, 2) : "";

  return (
    <div className="container">
      <h1 className="h1">AI Explore</h1>

      <div className="toolbar">
        <label className="label">
          <span>Load dump</span>
          <input
            type="file"
            accept=".jsonl,application/jsonl,text/plain"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <button className="btn" onClick={play} disabled={!canPlay}>
          Play
        </button>

        <button className="btn secondary" onClick={pause} disabled={!canPause}>
          Pause
        </button>

        <button className="btn" onClick={onResume} disabled={!canResume}>
          Resume
        </button>

        <button className="btn secondary" onClick={stop} disabled={!canStop}>
          Stop
        </button>

        <div className="controlsRow">
          <span className="kv">
            Speed: <b>{speed.toFixed(2)}x</b>
          </span>
          <input
            className="slider"
            type="range"
            min={0.25}
            max={4}
            step={0.05}
            value={speed}
            onChange={(e) => setSpeed(clamp(Number(e.target.value), 0.25, 4))}
          />
        </div>

        <div className="badge">
          Status: <b>{status}</b> · Events: <b>{eventsCount}</b>
          {vegaSource ? <span> · Vega source: <b>{vegaSource}</b></span> : null}
        </div>
      </div>

      {status === "error" && error ? <div className="alert">{error}</div> : null}

      <div className="grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <StreamingOutput text={streamText} />
          <div className="card">
            <div className="cardHeader">
              <div className="cardTitle">Streaming output (actions)</div>
              <button className="btn secondary" onClick={copyText} disabled={!streamText}>
                Copy output
              </button>
            </div>
            <div className="small">
              Во время стрима мы просто склеиваем <code>token.data.delta</code>. Ошибки парсинга Vega — не считаем ошибкой стрима.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <VegaPreview spec={vegaSpec} hint={vegaHint} />

          <JsonBox
            title="Vega spec (raw extracted JSON)"
            jsonText={vegaRaw ? vegaRaw : ""}
            onCopy={copyVega}
            copyDisabled={!vegaRaw}
            footer={
              <div className="small">
                Вытаскиваем либо последний <code>```json ... ```</code>, либо последний цельный JSON-объект по балансу фигурных скобок.
                Затем валидируем <code>mark</code> и <code>encoding</code>, и подставляем данные через <code>data.values</code>.
              </div>
            }
          />

          <JsonBox title="Rendered spec (after injecting hardcoded data)" jsonText={prettySpec} />
        </div>
      </div>
    </div>
  );
}
