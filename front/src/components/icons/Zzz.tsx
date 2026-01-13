// src/components/icons/Zzz.tsx
import * as React from "react";
import type { LucideProps } from "lucide-react";

export const Zzz = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Z maior (topo) */}
      <path d="M16 4h7l-7 7h7" />
      {/* Z médio (meio) */}
      <path d="M8 10h6l-6 6h6" />
      {/* Z menor (base) */}
      <path d="M1 16h5l-5 5h5" />
    </svg>
  )
);

Zzz.displayName = "Zzz";
