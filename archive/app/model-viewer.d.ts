import type React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        poster?: string;
        loading?: "eager" | "lazy";
        exposure?: string;
        "shadow-intensity"?: string;
        "camera-controls"?: boolean;
        "auto-rotate"?: boolean;
      };
    }
  }
}

export {};
