import { useEffect, useRef, useState } from "react";
import { FileWarning, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = workerUrl;

export default function DataDocumentPreview({ url, mimeType, title, expanded = false }: {
  url: string; mimeType: string; title: string; expanded?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "200px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || mimeType !== "application/pdf") return;
    let stopped = false;
    const task = getDocument(url);
    setLoading(true); setError(false);
    const element = container.current;
    if (element) element.replaceChildren();
    (async () => {
      try {
        const pdf = await task.promise;
        for (let number = 1; number <= pdf.numPages; number++) {
          if (stopped || !element) break;
          const page = await pdf.getPage(number);
          const original = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: Math.min((expanded ? 1100 : 600) / original.width, 2) });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
          canvas.className = "w-full h-auto border-b border-border";
          canvas.setAttribute("aria-label", `${title} — صفحة ${number}`);
          const context = canvas.getContext("2d");
          if (!context) throw new Error("canvas unavailable");
          await page.render({ canvasContext: context, viewport }).promise;
          if (!stopped) element.appendChild(canvas);
          page.cleanup();
          if (!stopped) setLoading(false);
        }
      } catch { if (!stopped) { setError(true); setLoading(false); } }
    })();
    return () => { stopped = true; void task.destroy(); };
  }, [url, mimeType, visible, attempt, expanded, title]);
  return <div className={expanded ? "relative bg-muted/30" : "relative h-72 overflow-auto bg-muted/30"}>
    {mimeType === "application/pdf" ? <>
      <div ref={container} className="min-h-32" />
      {loading && !error && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
    </> : <div ref={container} className={expanded ? "flex justify-center" : "h-full flex items-center justify-center"}>
      <img key={attempt} src={url} alt={title} loading="lazy" className={expanded ? "max-w-full h-auto" : "w-full h-full object-contain"} onError={() => setError(true)} />
    </div>}
    {error && <div className="absolute inset-0 flex flex-col gap-3 items-center justify-center bg-muted text-muted-foreground"><FileWarning /><span>تعذر عرض المستند</span><Button variant="outline" size="sm" onClick={() => { setError(false); setAttempt(x => x + 1); }}>إعادة المحاولة</Button></div>}
  </div>;
}