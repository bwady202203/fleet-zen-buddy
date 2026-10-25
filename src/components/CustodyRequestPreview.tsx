import { useLayoutEffect, useRef, useState } from "react";
import { CustodyRequestDocument } from "./CustodyRequestPrint";

interface CustodyRequestPreviewProps {
  amount: number;
  date: string;
  requestNo: string;
}

/** Scale only the screen copy; the print document retains its physical A4 size. */
const CustodyRequestPreview = (props: CustodyRequestPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ scale: 0, width: 0, height: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const document = documentRef.current?.firstElementChild;
    if (!container || !(document instanceof HTMLElement)) return;

    const resize = () => {
      const width = document.offsetWidth;
      const height = document.offsetHeight;
      if (!width || !height) return;
      const scale = Math.min(container.clientWidth / width, 1);
      setSize({ scale, width: width * scale, height: height * scale });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    observer.observe(document);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-w-0 rounded-lg border bg-muted p-1.5 sm:p-3">
      <div ref={containerRef} className="w-full min-w-0 overflow-hidden" aria-label="معاينة طلب العهدة">
        <div className="relative mx-auto" style={{ width: size.width || "100%", height: size.height, aspectRatio: "210 / 297" }}>
          <div ref={documentRef} className="absolute left-0 top-0 w-max origin-top-left" style={{ transform: `scale(${size.scale})` }}>
            <CustodyRequestDocument {...props} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustodyRequestPreview;