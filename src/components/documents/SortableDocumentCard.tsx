import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { ArrowRight, ArrowLeft, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SortableDocumentCard({ id, title, children, disabled, first, last, onMove, onSelect, selected }: {
  id: string; title: string; children: ReactNode; disabled: boolean; first: boolean; last: boolean;
  onMove: (direction: number) => void; onSelect?: () => void; selected?: boolean;
}) {
  const { setNodeRef, attributes, listeners, isDragging, isOver } = useSortable({ id, disabled });
  return <Card ref={setNodeRef} onFocusCapture={onSelect} onClick={onSelect}
    className={`overflow-hidden rounded-lg ${isDragging ? "opacity-50" : ""} ${isOver || selected ? "ring-2 ring-primary" : ""}`}>
    <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1">
      <Button size="icon" variant="ghost" className="touch-none shrink-0" title="سحب لتغيير الترتيب" aria-label={`ترتيب ${title}`} disabled={disabled} {...attributes} {...listeners}><GripVertical className="h-4 w-4" /></Button>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" title="نقل للخلف" aria-label={`نقل ${title} للخلف`} disabled={disabled || first} onClick={() => onMove(-1)}><ArrowRight className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" title="نقل للأمام" aria-label={`نقل ${title} للأمام`} disabled={disabled || last} onClick={() => onMove(1)}><ArrowLeft className="h-4 w-4" /></Button>
      </div>
    </div>
    {children}
  </Card>;
}