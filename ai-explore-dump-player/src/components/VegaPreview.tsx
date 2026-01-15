import React, { useEffect, useRef, useState } from "react";
import embed, { VisualizationSpec } from "vega-embed";

export function VegaPreview({
  spec,
  hint,
}: {
  spec: any | null;
  hint: string | null;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let view: any;

    async function run() {
      setRenderError(null);

      if (!ref.current) return;
      ref.current.innerHTML = "";

      if (!spec) return;

      try {
        const res = await embed(ref.current, spec as VisualizationSpec, {
          actions: false,
        });
        view = res.view;
      } catch (e: any) {
        setRenderError(String(e?.message ?? e));
      }
    }

    run();

    return () => {
      try {
        view?.finalize?.();
      } catch {}
    };
  }, [spec]);

  return (
    <div className="card" style={{ minHeight: 220 }}>
      <div className="cardHeader">
        <div className="cardTitle">Vega chart preview</div>
        {hint ? <div className="hint">{hint}</div> : null}
      </div>

      {renderError ? (
        <div className="small" style={{ color: "#b91c1c" }}>
          Render error: {renderError}
        </div>
      ) : null}

      {!spec ? (
        <div className="small">Spec not ready yet…</div>
      ) : (
        <div ref={ref} />
      )}
    </div>
  );
}
