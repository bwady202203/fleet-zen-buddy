import { expect, test } from "bun:test";
import { isUnderSalaryPayable, salaryPayableMetadata } from "./salaryPayableAccounts";

const accounts = [
  { id: "salary", code: "20404", name_ar: "رواتب مستحقة ", parent_id: "liability" },
  { id: "employee", code: "2040401", name_ar: "موظف", parent_id: "salary" },
  { id: "expense", code: "5109", name_ar: "الرواتب التشغيلية", parent_id: null },
];

test("employment fields apply only beneath salary payable accounts", () => {
  expect(isUnderSalaryPayable("salary", accounts)).toBe(true);
  expect(isUnderSalaryPayable("employee", accounts)).toBe(true);
  expect(isUnderSalaryPayable("expense", accounts)).toBe(false);
  expect(isUnderSalaryPayable(null, accounts)).toBe(false);
});

test("saves hire date, basic salary and job title for salary payable accounts", () => {
  expect(salaryPayableMetadata(true, { hire_date: "2026-10-01", basic_salary: "3500.75", job_title: "محاسب" }))
    .toEqual({ hire_date: "2026-10-01", basic_salary: 3500.75, job_title: "محاسب" });
});

test("does not save employment data to other accounts", () => {
  expect(salaryPayableMetadata(false, { hire_date: "2026-10-01", basic_salary: "3500.75", job_title: "محاسب" }))
    .toEqual({ hire_date: null, basic_salary: null, job_title: null });
});

test("supports decimal comma and rejects invalid salaries", () => {
  expect(salaryPayableMetadata(true, { hire_date: "", basic_salary: "3500,75", job_title: "" }).basic_salary).toBe(3500.75);
  expect(() => salaryPayableMetadata(true, { hire_date: "", basic_salary: "-1", job_title: "" })).toThrow();
});