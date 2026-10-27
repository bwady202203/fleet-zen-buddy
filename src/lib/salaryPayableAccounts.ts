interface AccountParent {
  id: string;
  code: string;
  name_ar: string;
  parent_id: string | null;
}

export function isUnderSalaryPayable(parentId: string | null, accounts: AccountParent[]): boolean {
  const visited = new Set<string>();
  let currentId = parentId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const account = accounts.find(item => item.id === currentId);
    if (!account) return false;
    const name = account.name_ar.replace(/[\u064B-\u0652\u0640]/g, "").replace(/^ال/, "").trim();
    if (account.code === "20404" || name === "رواتب مستحقة") return true;
    currentId = account.parent_id;
  }
  return false;
}

export function salaryPayableMetadata(enabled: boolean, fields: { hire_date: string; basic_salary: string; job_title: string }) {
  if (!enabled) return { hire_date: null, basic_salary: null, job_title: null };
  const rawSalary = fields.basic_salary.trim().replace(/,/g, ".");
  const basicSalary = rawSalary === "" ? null : Number(rawSalary);
  if (basicSalary !== null && (!Number.isFinite(basicSalary) || basicSalary < 0)) {
    throw new Error("أدخل راتبًا أساسيًا صحيحًا غير سالب");
  }
  return {
    hire_date: fields.hire_date || null,
    basic_salary: basicSalary,
    job_title: fields.job_title.trim() || null,
  };
}