import { cn } from "@/lib/utils";
import React, { ReactNode, memo } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = memo(({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        "relative h-full w-full bg-zinc-900 text-white transition-bg",
        className
      )}
      {...props}
    >
      <style>{`
        @supports (background: linear-gradient(45deg, #000, #000)) {
          .aurora-bg-layer {
            background-image: 
              repeating-linear-gradient(100deg, rgba(255,255,255,.05) 0%, rgba(255,255,255,.05) 7%, transparent 10%, transparent 12%, rgba(255,255,255,.05) 16%),
              repeating-linear-gradient(100deg, rgb(59, 130, 246) 10%, rgb(165, 180, 252) 15%, rgb(191, 219, 254) 20%, rgb(221, 214, 254) 25%, rgb(96, 165, 250) 30%);
            background-size: 300% 200%;
            background-position: 50% 50%;
            animation: aurora-shift 60s linear infinite;
            filter: blur(10px);
            will-change: background-position;
            transform: translateZ(0);
            backface-visibility: hidden;
          }
          
          @keyframes aurora-shift {
            0% { background-position: 50% 50%, 50% 50%; }
            100% { background-position: 350% 50%, 350% 50%; }
          }
          
          @media (prefers-reduced-motion: reduce) {
            .aurora-bg-layer {
              animation: none;
            }
          }
        }
      `}</style>
      
      <div className="absolute inset-0 overflow-hidden" style={{ transform: 'translateZ(0)' }}>
        <div 
          className={cn(
            "aurora-bg-layer absolute inset-0 opacity-60",
            showRadialGradient && "mask-radial-gradient"
          )}
          style={showRadialGradient ? {
            maskImage: 'radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%)'
          } : undefined}
        />
      </div>
      
      {children}
    </div>
  );
});

AuroraBackground.displayName = "AuroraBackground";
