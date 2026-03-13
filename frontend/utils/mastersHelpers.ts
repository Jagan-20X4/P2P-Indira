import { MasterRecord, MasterType } from '../types';

export type MastersByType = Record<MasterType, MasterRecord[]>;

/** Active departments from masters (for dropdowns). */
export function getDepartments(masters: MastersByType): MasterRecord[] {
  const list = masters['Department'] || [];
  return list.filter((d) => d.status === 'Active');
}

/** Subdepartments mapped to the given department (by department name). Used in RC/PR/PO/Invoice forms. */
export function getSubdepartmentsForDepartment(masters: MastersByType, departmentName: string): MasterRecord[] {
  const departments = masters['Department'] || [];
  const subdepartments = masters['Subdepartment'] || [];
  const dept = departments.find((d) => d.name === departmentName);
  if (!dept) return [];
  const ids: string[] = Array.isArray((dept as any).subdepartmentIds) ? (dept as any).subdepartmentIds : [];
  return subdepartments.filter((s) => ids.includes(s.id) && s.status === 'Active');
}

/** All active subdepartments (for workflow rule dropdown, etc.). */
export function getAllSubdepartments(masters: MastersByType): MasterRecord[] {
  const list = masters['Subdepartment'] || [];
  return list.filter((s) => s.status === 'Active');
}
