import { GlowingEffectDemo } from "@/components/ui/glowing-effect-demo";

export default function GlowingShowcase() {
  return (
    <main className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Glowing Effect Components
          </h1>
          <p className="text-xl text-muted-foreground">
            Beautiful, interactive cards with mouse-tracking glowing borders.
            Hover over any card to see the effect in action.
          </p>
        </div>

        <div className="space-y-4">
          <GlowingEffectDemo />
        </div>

        <div className="mt-12 rounded-lg border border-border bg-muted/50 p-6">
          <h2 className="mb-4 text-lg font-semibold">Usage</h2>
          <pre className="overflow-auto rounded bg-muted p-4 text-sm">
{`import { GlowingEffect } from "@/components/ui/glowing-effect";

// Wrap your card content with GlowingEffect
<div className="relative h-full rounded-[1.25rem] border-[0.75px] border-border p-2">
  <GlowingEffect
    spread={40}
    glow={true}
    disabled={false}
    proximity={64}
    inactiveZone={0.01}
    borderWidth={3}
  />
  <div className="relative flex h-full flex-col">
    {/* Your card content here */}
  </div>
</div>`}
          </pre>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-muted/50 p-6">
          <h2 className="mb-4 text-lg font-semibold">Props</h2>
          <div className="space-y-2 text-sm">
            <p><span className="font-mono">spread</span> - Width of glow spread (default: 20)</p>
            <p><span className="font-mono">glow</span> - Enable/disable the glow effect (default: false)</p>
            <p><span className="font-mono">disabled</span> - Disable interaction (default: true)</p>
            <p><span className="font-mono">proximity</span> - Distance from element to trigger glow (default: 0)</p>
            <p><span className="font-mono">inactiveZone</span> - Inner zone where glow doesn't trigger (default: 0.7)</p>
            <p><span className="font-mono">borderWidth</span> - Width of glow border (default: 1)</p>
            <p><span className="font-mono">movementDuration</span> - Duration of glow movement animation (default: 2)</p>
            <p><span className="font-mono">variant</span> - "default" or "white" for different glow colors</p>
          </div>
        </div>
      </div>
    </main>
  );
}
