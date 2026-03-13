-- Subdepartments: create as standalone master records (no department link on subdepartment).
-- Department mapping: each Department row has data.subdepartmentIds = array of subdepartment ids.

INSERT INTO masters (master_type, id, name, status, data) VALUES
('Subdepartment', 'sub-0', 'Sourcing', 'Active', '{}'::jsonb),
('Subdepartment', 'sub-1', 'Inventory', 'Active', '{}'::jsonb),
('Subdepartment', 'sub-2', 'Vendor Management', 'Active', '{}'::jsonb),
('Subdepartment', 'sub-3', 'Infrastructure', 'Active', '{}'::jsonb),
('Subdepartment', 'sub-4', 'Software Licensing', 'Active', '{}'::jsonb),
('Subdepartment', 'sub-5', 'Tech Support', 'Active', '{}'::jsonb),
('Subdepartment', 'sub-6', 'Accounts Payable', 'Active', '{}'::jsonb),
('Subdepartment', 'sub-7', 'Treasury', 'Active', '{}'::jsonb),
('Subdepartment', 'sub-8', 'Taxation', 'Active', '{}'::jsonb),
('Subdepartment', 'sub-9', 'Logistics', 'Active', '{}'::jsonb),
('Subdepartment', 'sub-10', 'Supply Chain', 'Active', '{}'::jsonb),
('Subdepartment', 'sub-11', 'Employee Relations', 'Active', '{}'::jsonb),
('Subdepartment', 'sub-12', 'Recruitment', 'Active', '{}'::jsonb),
('Subdepartment', 'sub-13', 'Compliance', 'Active', '{}'::jsonb),
('Subdepartment', 'sub-14', 'Contracts', 'Active', '{}'::jsonb)
ON CONFLICT (master_type, id) DO NOTHING;

-- Department data: set subdepartmentIds so each department has its mapped subdepartments.
UPDATE masters SET data = '{"subdepartmentIds": ["sub-0", "sub-1", "sub-2"]}'::jsonb WHERE master_type = 'Department' AND id = 'dept-0';
UPDATE masters SET data = '{"subdepartmentIds": ["sub-6", "sub-7", "sub-8"]}'::jsonb WHERE master_type = 'Department' AND id = 'dept-1';
UPDATE masters SET data = '{"subdepartmentIds": ["sub-3", "sub-4", "sub-5"]}'::jsonb WHERE master_type = 'Department' AND id = 'dept-2';
UPDATE masters SET data = '{"subdepartmentIds": ["sub-9", "sub-10"]}'::jsonb WHERE master_type = 'Department' AND id = 'dept-3';
UPDATE masters SET data = '{"subdepartmentIds": ["sub-11", "sub-12"]}'::jsonb WHERE master_type = 'Department' AND id = 'dept-4';
UPDATE masters SET data = '{"subdepartmentIds": ["sub-13", "sub-14"]}'::jsonb WHERE master_type = 'Department' AND id = 'dept-5';
