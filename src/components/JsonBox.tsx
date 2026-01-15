import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

export function JsonBox({
  title,
  jsonText,
  onCopy,
  copyDisabled,
  footer,
}: {
  title: string;
  jsonText: string;
  onCopy?: () => void;
  copyDisabled?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="cardHeader">
        <div className="cardTitle">{title}</div>
        {onCopy ? (
          <button className="btn secondary" onClick={onCopy} disabled={copyDisabled}>
            Copy
          </button>
        ) : null}
      </div>

      {jsonText ? (
        <SyntaxHighlighter
          language="json"
          customStyle={{
            margin: 0,
            background: "transparent",
            padding: 0,
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          {jsonText}
        </SyntaxHighlighter>
      ) : (
        <pre className="pre">—</pre>
      )}

      {footer ? <div style={{ marginTop: 10 }}>{footer}</div> : null}
    </div>
  );
}
