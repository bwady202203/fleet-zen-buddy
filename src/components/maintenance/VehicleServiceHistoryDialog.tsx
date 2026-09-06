import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Zap, CircleDot, Droplets, Disc3, Calendar, Gauge, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehicleName: string;
  licensePlate?: string;
}

interface WorkEntry {
  date: string;
  text: string;
}

interface OilEntry {
  date: string;
  mileage: number;
  cost: number | null;
  notes: string | null;
}

const KEYWORDS = {
  electrical: "أعمال كهرباء",
  tires: "تغيير الكفرات",
  puncture: "أعمال بنشر",
} as const;

type WorkKey = keyof typeof KEYWORDS;

const extractDate = (line: string, fallback: string) => {
  const m = line.match(/\((\d{4}-\d{2}-\d{2})\)/);
  return m ? m[1] : fallback;
};

const cleanLine = (line: string, keyword: string) =>
  line
    .replace(keyword, "")
    .replace(/\(\d{4}-\d{2}-\d{2}\)/, "")
    .replace(/^\s*[-:،]\s*/, "")
    .trim();

export const VehicleServiceHistoryDialog = ({
  open,
  onOpenChange,
  vehicleId,
  vehicleName,
  licensePlate,
}: Props) => {
  const [loading, setLoading] = useState(false);
  const [works, setWorks] = useState<Record<WorkKey, WorkEntry[]>>({
    electrical: [],
    tires: [],
    puncture: [],
  });
  const [oil, setOil] = useState<OilEntry[]>([]);

  useEffect(() => {
    if (!open || !vehicleId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const [reqRes, oilRes] = await Promise.all([
        supabase
          .from("maintenance_requests")
          .select("description, created_at, completed_date")
          .eq("vehicle_id", vehicleId)
          .order("created_at", { ascending: false }),
        supabase
          .from("oil_change_records")
          .select("date, mileage, cost, notes")
          .eq("vehicle_id", vehicleId)
          .order("date", { ascending: false }),
      ]);

      if (cancelled) return;

      const grouped: Record<WorkKey, WorkEntry[]> = { electrical: [], tires: [], puncture: [] };
      (reqRes.data || []).forEach((r) => {
        const fallback = (r.completed_date || r.created_at || "").split("T")[0];
        (r.description || "").split("\n").forEach((line) => {
          (Object.keys(KEYWORDS) as WorkKey[]).forEach((key) => {
            if (line.includes(KEYWORDS[key])) {
              grouped[key].push({
                date: extractDate(line, fallback),
                text: cleanLine(line, KEYWORDS[key]),
              });
            }
          });
        });
      });
      (Object.keys(grouped) as WorkKey[]).forEach((k) =>
        grouped[k].sort((a, b) => (a.date < b.date ? 1 : -1))
      );

      setWorks(grouped);
      setOil((oilRes.data || []) as OilEntry[]);
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, vehicleId]);

  const renderWorks = (key: WorkKey, empty: string) => {
    const list = works[key];
    if (list.length === 0) {
      return <div className="py-10 text-center text-sm text-muted-foreground">{empty}</div>;
    }
    return (
      <div className="space-y-2">
        {list.map((entry, i) => (
          <div key={i} className="rounded-xl border p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Calendar className="h-4 w-4 text-primary" />
              {entry.date || "بدون تاريخ"}
            </div>
            {entry.text && (
              <div className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{entry.text}</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            سجل صيانة {vehicleName}
            {licensePlate && <Badge variant="outline">{licensePlate}</Badge>}
          </DialogTitle>
          <DialogDescription>تاريخ أعمال الكهرباء والكفرات والزيت والبنشر لهذه المركبة</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            جارٍ تحميل السجل...
          </div>
        ) : (
          <Tabs defaultValue="electrical" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="electrical" className="gap-1">
                <Zap className="h-4 w-4" /> الكهرباء
              </TabsTrigger>
              <TabsTrigger value="tires" className="gap-1">
                <CircleDot className="h-4 w-4" /> الكفرات
              </TabsTrigger>
              <TabsTrigger value="oil" className="gap-1">
                <Droplets className="h-4 w-4" /> الزيت
              </TabsTrigger>
              <TabsTrigger value="puncture" className="gap-1">
                <Disc3 className="h-4 w-4" /> البنشر
              </TabsTrigger>
            </TabsList>

            <TabsContent value="electrical" className="mt-4">
              {renderWorks("electrical", "لا يوجد سجل أعمال كهرباء لهذه المركبة")}
            </TabsContent>
            <TabsContent value="tires" className="mt-4">
              {renderWorks("tires", "لا يوجد سجل تغيير كفرات لهذه المركبة")}
            </TabsContent>
            <TabsContent value="puncture" className="mt-4">
              {renderWorks("puncture", "لا يوجد سجل أعمال بنشر لهذه المركبة")}
            </TabsContent>
            <TabsContent value="oil" className="mt-4">
              {oil.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  لا يوجد سجل تغيير زيت لهذه المركبة
                </div>
              ) : (
                <div className="space-y-2">
                  {oil.map((o, i) => (
                    <div key={i} className="rounded-xl border p-3">
                      <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
                        <span className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          {o.date}
                        </span>
                        <span className="flex items-center gap-2">
                          <Gauge className="h-4 w-4 text-primary" />
                          {o.mileage.toLocaleString()} كم
                        </span>
                        {o.cost != null && <Badge variant="secondary">{o.cost.toLocaleString()} ر.س</Badge>}
                      </div>
                      {o.notes && (
                        <div className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{o.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
