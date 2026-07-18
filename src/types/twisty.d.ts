import type { DetailedHTMLProps, HTMLAttributes } from "react";

// Minimal typing for the cubing.js custom element used in TwistyPreview.
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "twisty-player": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
