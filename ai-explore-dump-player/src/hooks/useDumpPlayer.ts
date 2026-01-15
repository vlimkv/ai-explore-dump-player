import { useCallback, useMemo, useRef, useState } from "react";
import { StreamEvent } from "../utils/dump";
import { randInt, sleep } from "../utils/sleep";
import { tryExtractVegaSpec, VegaLiteSpec } from "../utils/vegaExtract";

export type PlayerStatus = "idle" | "streaming" | "done" | "error" | "paused";

const HARD_DATA = [
  { region: "Almaty", revenue: 120 },
  { region: "Astana", revenue: 90 },
  { region: "Shymkent", revenue: 70 },
];

function withHardcodedData(spec: VegaLiteSpec): VegaLiteSpec {
  return {
    ...spec,
    data: { values: HARD_DATA },
  };
}

export function useDumpPlayer() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [vegaRaw, setVegaRaw] = useState<string>("");
  const [vegaSpec, setVegaSpec] = useState<VegaLiteSpec | null>(null);
  const [vegaHint, setVegaHint] = useState<string | null>(null);
  const [vegaSource, setVegaSource] = useState<"fenced" | "braces" | null>(null);

  // Bonus: playback speed (0.25x .. 4x)
  const [speed, setSpeed] = useState<number>(1);

  const stopRef = useRef(false);
  const pauseRef = useRef(false);
  const runningRef = useRef(false);
  const idxRef = useRef(0);

  const canPlay = useMemo(() => events.length > 0 && (status === "idle" || status === "done" || status === "error"), [events.length, status]);
  const canStop = status === "streaming" || status === "paused";
  const canPause = status === "streaming";
  const canResume = status === "paused";

  const loadEvents = useCallback((ev: StreamEvent[]) => {
    setEvents(ev);
    setStatus("idle");
    setStreamText("");
    setError(null);
    setVegaRaw("");
    setVegaSpec(null);
    setVegaHint(null);
    setVegaSource(null);
    stopRef.current = false;
    pauseRef.current = false;
    idxRef.current = 0;
  }, []);

  const stop = useCallback(() => {
    stopRef.current = true;
    pauseRef.current = false;
  }, []);

  const pause = useCallback(() => {
    pauseRef.current = true;
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    if (!events.length) return;
    pauseRef.current = false;
    setStatus("streaming");
  }, [events.length]);

  const play = useCallback(async () => {
    if (!events.length || runningRef.current) return;

    runningRef.current = true;
    stopRef.current = false;
    pauseRef.current = false;

    setStatus("streaming");
    setError(null);

    // If re-playing from scratch (idle/error/done), reset
    idxRef.current = 0;
    setStreamText("");
    setVegaRaw("");
    setVegaSpec(null);
    setVegaHint(null);
    setVegaSource(null);

    let acc = "";

    try {
      for (let i = 0; i < events.length; i++) {
        idxRef.current = i;

        while (pauseRef.current && !stopRef.current) {
          await sleep(60);
        }
        if (stopRef.current) break;

        // Delay scaled by speed
        const base = randInt(50, 150);
        const scaled = Math.max(5, Math.round(base / Math.max(0.1, speed)));
        await sleep(scaled);

        if (stopRef.current) break;

        const ev = events[i];

        if (ev.event === "token") {
          acc += ev.data.delta;
          setStreamText(acc);

          const res = tryExtractVegaSpec(acc);
          if (res.ok) {
            setVegaRaw(res.raw);
            setVegaSpec(withHardcodedData(res.spec));
            setVegaHint(null);
            setVegaSource(res.source);
          } else {
            if (res.reason === "invalid_schema") setVegaHint(res.error ?? "Invalid Vega schema");
            // invalid_json / not_found — норм во время стрима
          }
        }

        if (ev.event === "error") {
          setStatus("error");
          setError(ev.data.message || "Unknown error");
          runningRef.current = false;
          return;
        }

        if (ev.event === "done") {
          setStatus("done");
          runningRef.current = false;
          return;
        }
      }

      if (stopRef.current) {
        setStatus("idle");
      } else if (!pauseRef.current) {
        setStatus("done");
      }
    } catch (e: any) {
      setStatus("error");
      setError(String(e?.message ?? e));
    } finally {
      runningRef.current = false;
    }
  }, [events, speed]);

  // Bonus: resume streaming from pause point (continue from idxRef)
  const continueFromPause = useCallback(async () => {
    if (!events.length || runningRef.current) return;
    if (status !== "paused") return;

    runningRef.current = true;
    stopRef.current = false;

    setStatus("streaming");
    setError(null);

    // reconstruct acc from current streamText (already accumulated)
    let acc = streamText;

    try {
      for (let i = idxRef.current + 1; i < events.length; i++) {
        idxRef.current = i;

        while (pauseRef.current && !stopRef.current) {
          await sleep(60);
        }
        if (stopRef.current) break;

        const base = randInt(50, 150);
        const scaled = Math.max(5, Math.round(base / Math.max(0.1, speed)));
        await sleep(scaled);

        if (stopRef.current) break;

        const ev = events[i];

        if (ev.event === "token") {
          acc += ev.data.delta;
          setStreamText(acc);

          const res = tryExtractVegaSpec(acc);
          if (res.ok) {
            setVegaRaw(res.raw);
            setVegaSpec(withHardcodedData(res.spec));
            setVegaHint(null);
            setVegaSource(res.source);
          } else {
            if (res.reason === "invalid_schema") setVegaHint(res.error ?? "Invalid Vega schema");
          }
        }

        if (ev.event === "error") {
          setStatus("error");
          setError(ev.data.message || "Unknown error");
          runningRef.current = false;
          return;
        }

        if (ev.event === "done") {
          setStatus("done");
          runningRef.current = false;
          return;
        }
      }

      if (stopRef.current) setStatus("idle");
      else if (!pauseRef.current) setStatus("done");
    } catch (e: any) {
      setStatus("error");
      setError(String(e?.message ?? e));
    } finally {
      runningRef.current = false;
    }
  }, [events, speed, status, streamText]);

  const copyText = useCallback(async () => {
    if (!streamText) return;
    await navigator.clipboard.writeText(streamText);
  }, [streamText]);

  const copyVega = useCallback(async () => {
    if (!vegaRaw) return;
    await navigator.clipboard.writeText(vegaRaw);
  }, [vegaRaw]);

  return {
    eventsCount: events.length,
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
  };
}
