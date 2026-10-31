/**
 * Pixel-art desktop icons (32×32 grid, crisp edges) in the spirit of the
 * reference's Win95 icon set. Pure SVG — no external assets.
 */
import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 32 32',
  shapeRendering: 'crispEdges',
  width: 40,
  height: 40,
  'aria-hidden': true,
};

/** A small window with a code prompt — Problems. */
export function IconProblems(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <rect x="2" y="4" width="28" height="24" fill="#000" />
      <rect x="3" y="5" width="26" height="22" fill="#c0c0c0" />
      <rect x="4" y="6" width="24" height="4" fill="#000080" />
      <rect x="25" y="7" width="2" height="2" fill="#c0c0c0" />
      <rect x="5" y="11" width="22" height="14" fill="#fff" />
      <rect x="7" y="14" width="2" height="2" fill="#000080" />
      <rect x="9" y="16" width="2" height="2" fill="#000080" />
      <rect x="7" y="18" width="2" height="2" fill="#000080" />
      <rect x="13" y="19" width="8" height="2" fill="#008080" />
    </svg>
  );
}

/** Trophy — Contests. */
export function IconContests(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <rect x="8" y="4" width="16" height="2" fill="#000" />
      <rect x="7" y="6" width="18" height="10" fill="#000" />
      <rect x="9" y="6" width="14" height="9" fill="#ffd700" />
      <rect x="10" y="7" width="3" height="6" fill="#fff6b0" />
      <rect x="3" y="7" width="4" height="2" fill="#000" />
      <rect x="3" y="9" width="2" height="4" fill="#000" />
      <rect x="25" y="7" width="4" height="2" fill="#000" />
      <rect x="27" y="9" width="2" height="4" fill="#000" />
      <rect x="11" y="16" width="10" height="2" fill="#000" />
      <rect x="14" y="18" width="4" height="4" fill="#c09000" />
      <rect x="10" y="22" width="12" height="2" fill="#000" />
      <rect x="9" y="24" width="14" height="4" fill="#808080" />
      <rect x="9" y="27" width="14" height="1" fill="#000" />
    </svg>
  );
}

/** Bar chart — Rankings. */
export function IconRankings(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <rect x="3" y="27" width="26" height="2" fill="#000" />
      <rect x="5" y="15" width="6" height="12" fill="#000" />
      <rect x="6" y="16" width="4" height="11" fill="#c0c0c0" />
      <rect x="13" y="6" width="6" height="21" fill="#000" />
      <rect x="14" y="7" width="4" height="20" fill="#ffd700" />
      <rect x="21" y="11" width="6" height="16" fill="#000" />
      <rect x="22" y="12" width="4" height="15" fill="#c27a3a" />
    </svg>
  );
}

/** Speech bubbles — Discuss. */
export function IconDiscuss(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <rect x="2" y="4" width="20" height="14" fill="#000" />
      <rect x="3" y="5" width="18" height="12" fill="#ffffe1" />
      <rect x="5" y="18" width="4" height="2" fill="#000" />
      <rect x="5" y="8" width="12" height="2" fill="#808080" />
      <rect x="5" y="12" width="8" height="2" fill="#808080" />
      <rect x="12" y="12" width="18" height="13" fill="#000" />
      <rect x="13" y="13" width="16" height="11" fill="#27ced7" />
      <rect x="24" y="25" width="4" height="2" fill="#000" />
      <rect x="15" y="16" width="10" height="2" fill="#006d73" />
      <rect x="15" y="20" width="6" height="2" fill="#006d73" />
    </svg>
  );
}

/** Person — Profile. */
export function IconProfile(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <rect x="11" y="4" width="10" height="10" fill="#000" />
      <rect x="12" y="5" width="8" height="8" fill="#f0c090" />
      <rect x="13" y="8" width="2" height="2" fill="#000" />
      <rect x="17" y="8" width="2" height="2" fill="#000" />
      <rect x="6" y="16" width="20" height="12" fill="#000" />
      <rect x="7" y="17" width="18" height="11" fill="#000080" />
      <rect x="14" y="17" width="4" height="6" fill="#fff" />
    </svg>
  );
}

/** Terminal — Submissions. */
export function IconTerminal(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <rect x="2" y="5" width="28" height="22" fill="#000" />
      <rect x="3" y="6" width="26" height="3" fill="#c0c0c0" />
      <rect x="4" y="11" width="2" height="2" fill="#39ff88" />
      <rect x="6" y="13" width="2" height="2" fill="#39ff88" />
      <rect x="4" y="15" width="2" height="2" fill="#39ff88" />
      <rect x="10" y="15" width="10" height="2" fill="#39ff88" />
      <rect x="4" y="20" width="16" height="2" fill="#1f8f3a" />
    </svg>
  );
}

/** Floppy disk — used for "save"/judge visuals. */
export function IconFloppy(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <rect x="4" y="4" width="24" height="24" fill="#000" />
      <rect x="5" y="5" width="22" height="22" fill="#000080" />
      <rect x="9" y="5" width="14" height="8" fill="#c0c0c0" />
      <rect x="18" y="6" width="3" height="6" fill="#000080" />
      <rect x="8" y="17" width="16" height="10" fill="#fff" />
      <rect x="10" y="19" width="12" height="1" fill="#808080" />
      <rect x="10" y="22" width="12" height="1" fill="#808080" />
    </svg>
  );
}

/** CodeArena logo mark. */
export function LogoMark(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true" {...p}>
      <rect x="0" y="0" width="7" height="7" fill="#ff3b30" />
      <rect x="9" y="0" width="7" height="7" fill="#34c759" />
      <rect x="0" y="9" width="7" height="7" fill="#0a84ff" />
      <rect x="9" y="9" width="7" height="7" fill="#ffcc00" />
      <rect x="2" y="2" width="1" height="3" fill="#fff" />
      <rect x="3" y="3" width="1" height="1" fill="#fff" />
      <rect x="11" y="12" width="3" height="1" fill="#000" />
    </svg>
  );
}
