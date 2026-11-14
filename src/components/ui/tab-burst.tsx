import * as React from "react";

const PARTICLES = 12;
const BURST_MS = 620;

type Burst = { id: number; x: number; y: number };

/**
 * Simple burst + soft illumination played at the click point inside the
 * enclosing tab trigger. Colors follow the trigger's own text color.
 */
export function TabBurst() {
  const hostRef = React.useRef<HTMLSpanElement>(null);
  const [bursts, setBursts] = React.useState<Burst[]>([]);
  const timers = React.useRef<number[]>([]);

  React.useEffect(() => {
    const host = hostRef.current;
    const trigger = host?.closest('[role="tab"]');
    if (!trigger) return;

    let seq = 0;
    const spawn = (x: number, y: number) => {
      const id = ++seq;
      setBursts((prev) => [...prev.slice(-2), { id, x, y }]);
      const timer = window.setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== id));
      }, BURST_MS);
      timers.current.push(timer);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (typeof event.button === "number" && event.button !== 0) return;
      const rect = trigger.getBoundingClientRect();
      spawn(event.clientX - rect.left, event.clientY - rect.top);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const rect = trigger.getBoundingClientRect();
      spawn(rect.width / 2, rect.height / 2);
    };

    trigger.addEventListener("pointerdown", onPointerDown);
    trigger.addEventListener("keydown", onKeyDown);
    return () => {
      trigger.removeEventListener("pointerdown", onPointerDown);
      trigger.removeEventListener("keydown", onKeyDown);
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current = [];
    };
  }, []);

  return (
    <span ref={hostRef} className="tab-burst-layer" aria-hidden="true">
      {bursts.map((burst) => (
        <span
          key={burst.id}
          className="tab-burst"
          style={{ left: burst.x, top: burst.y }}
        >
          <span className="tab-burst-flash" />
          {Array.from({ length: PARTICLES }).map((_, index) => {
            const angle =
              (index / PARTICLES) * Math.PI * 2 + (burst.id % 3) * 0.35;
            const distance = 15 + ((index * 7 + burst.id * 5) % 13);
            return (
              <span
                key={index}
                className="tab-burst-dot"
                style={
                  {
                    "--tx": `${Math.cos(angle) * distance}px`,
                    "--ty": `${Math.sin(angle) * distance}px`,
                    animationDelay: `${(index % 4) * 16}ms`,
                  } as React.CSSProperties
                }
              />
            );
          })}
        </span>
      ))}
    </span>
  );
}
