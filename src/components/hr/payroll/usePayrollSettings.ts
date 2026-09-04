import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_COLUMN_ORDER,
  DEFAULT_SETTINGS,
  PayrollColumnKey,
  PayrollSettings,
} from "./types";

const STORAGE_PREFIX = "payroll-settings";

const sanitize = (raw: unknown): PayrollSettings => {
  const parsed = (raw ?? {}) as Partial<PayrollSettings>;
  const order = Array.isArray(parsed.order)
    ? (parsed.order.filter((k) => DEFAULT_COLUMN_ORDER.includes(k)) as PayrollColumnKey[])
    : [];
  const merged: PayrollColumnKey[] = [
    ...order,
    ...DEFAULT_COLUMN_ORDER.filter((k) => !order.includes(k)),
  ];
  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    order: merged,
    visible: { ...DEFAULT_SETTINGS.visible, ...(parsed.visible ?? {}) },
  };
};

/** إعدادات كشف الرواتب محفوظة محليًا لكل نوع كشف */
export const usePayrollSettings = (sheetType: string = "monthly") => {
  const storageKey = `${STORAGE_PREFIX}:${sheetType}`;
  const [settings, setSettings] = useState<PayrollSettings>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? sanitize(JSON.parse(stored)) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch {
      /* تجاهل امتلاء التخزين */
    }
  }, [settings, storageKey]);

  const update = useCallback(<K extends keyof PayrollSettings>(key: K, value: PayrollSettings[K]) => {
    setSettings((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  const toggleColumn = useCallback((key: PayrollColumnKey, value?: boolean) => {
    setSettings((prev) => ({
      ...prev,
      visible: { ...prev.visible, [key]: value ?? !prev.visible[key] },
    }));
  }, []);

  const setOrder = useCallback((order: PayrollColumnKey[]) => {
    setSettings((prev) => ({ ...prev, order }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  return { settings, setSettings, update, toggleColumn, setOrder, reset };
};
