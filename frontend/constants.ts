import { ModuleType } from './types';

export const ENTITIES = ['Alpha Corp', 'Beta Logistics', 'Gamma Industries', 'Delta Global'];
export const DEPARTMENTS = ['Procurement', 'Finance', 'IT', 'Operations', 'HR', 'Legal'];

export const DEPT_SUBDEPT_MAP: Record<string, string[]> = {
  'Procurement': ['Sourcing', 'Inventory', 'Vendor Management'],
  'IT': ['Infrastructure', 'Software Licensing', 'Tech Support'],
  'Finance': ['Accounts Payable', 'Treasury', 'Taxation'],
  'Operations': ['Logistics', 'Supply Chain'],
  'HR': ['Employee Relations', 'Recruitment'],
  'Legal': ['Compliance', 'Contracts']
};

export const ALL_SUBDEPARTMENTS = Object.values(DEPT_SUBDEPT_MAP).flat();
export const CENTERS = ['New York', 'London', 'Singapore', 'Mumbai', 'Berlin'];

export const ALL_MODULES = Object.values(ModuleType);
export const ALL_PERMISSIONS: ('create' | 'edit' | 'view' | 'delete')[] = ['create', 'edit', 'view', 'delete'];

export const COA_CATEGORIES = ['Assets', 'Liabilities', 'Expenses', 'Income'];
export const GST_TYPES = ['CGST', 'SGST', 'IGST'];
export const TRANSACTION_TYPES = ['PO', 'Invoice', 'Contract'];
