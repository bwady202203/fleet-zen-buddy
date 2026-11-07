export const ACCOUNTING_DASHBOARD_PATH = "/?tab=accounting";

// Restricted module users keep their existing home; this never grants access.
export const getAccountingReturnPath = (sammanOnly = false): string =>
  sammanOnly ? "/" : ACCOUNTING_DASHBOARD_PATH;