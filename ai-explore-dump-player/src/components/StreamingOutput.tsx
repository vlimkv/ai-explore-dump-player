import React from "react";

export function StreamingOutput({ text }: { text: string }) {
  return (
    <div className="card">
      <div className="cardHeader">
        <div className="cardTitle">Streaming output</div>
      </div>
      <pre className="pre">{text || "—"}</pre>
    </div>
  );
}
