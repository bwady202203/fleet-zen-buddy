export interface DriverReportLoad { driver_name: string; delivery_date: string; delivery_weight: number; commission: number }
export function summarizeTransportDrivers<T extends DriverReportLoad>(loads: T[], start = "", end = "", driver = "") {
  const rows = loads.filter(row => (!start || row.delivery_date >= start) && (!end || row.delivery_date <= end) && (!driver || row.driver_name === driver));
  const grouped = new Map<string, { driver: string; count: number; weight: number; commissionCents: number }>();
  for (const row of rows) {
    const value = grouped.get(row.driver_name) ?? { driver: row.driver_name, count: 0, weight: 0, commissionCents: 0 };
    value.count++; value.weight += row.delivery_weight; value.commissionCents += Math.round(row.commission * 100);
    grouped.set(row.driver_name, value);
  }
  const summaries = [...grouped.values()].sort((a,b) => a.driver.localeCompare(b.driver, "ar")).map(value => ({ driver: value.driver, count: value.count, weight: Math.round(value.weight * 1000) / 1000, commission: value.commissionCents / 100 }));
  return { rows, summaries, count: rows.length, weight: Math.round(rows.reduce((sum,row) => sum + row.delivery_weight, 0) * 1000) / 1000, commission: rows.reduce((sum,row) => sum + Math.round(row.commission * 100), 0) / 100 };
}