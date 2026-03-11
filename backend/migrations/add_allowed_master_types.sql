-- Add granular Masters Control permissions per role.
-- Run this if your roles table doesn't have allowed_master_types yet.
ALTER TABLE roles ADD COLUMN IF NOT EXISTS allowed_master_types JSONB DEFAULT NULL;
-- Per sub-module create/edit/view/delete (masters sub-module table).
ALTER TABLE roles ADD COLUMN IF NOT EXISTS masters_permissions JSONB DEFAULT NULL;
