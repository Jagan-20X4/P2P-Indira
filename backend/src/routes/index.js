import { Router } from 'express';
import { query, rowsToCamel, objToSnake } from '../db.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, message: 'API is up' });
});

// JSON columns that may be stored as TEXT/JSON (not JSONB) and need parsing after retrieval
const JSON_COLUMNS = {
  workflows: ['approvalChain'],
  roles: ['permissions', 'allowedMasterTypes', 'mastersPermissions'],
  users: ['centerNames', 'departments', 'subDepartments', 'entityNames', 'roleIds'],
  purchase_requests: ['centerNames', 'items', 'attachments'],
  rate_contracts: ['items', 'attachments'],
  purchase_orders: ['centerNames', 'items', 'attachments'],
  grns: ['items', 'attachments'],
  invoices: ['items', 'attachments'],
};

// Generic handler: GET all from table, return camelCase rows with parsed JSON columns
async function getAll(table) {
  const res = await query(`SELECT * FROM ${table}`);
  const rows = rowsToCamel(res.rows);
  const jsonCols = JSON_COLUMNS[table] || [];
  if (jsonCols.length === 0) return rows;
  return rows.map(row => {
    const out = { ...row };
    for (const col of jsonCols) {
      if (typeof out[col] === 'string') {
        try { out[col] = JSON.parse(out[col]); } catch {}
      }
    }
    return out;
  });
}

// Build upsert for tables with many columns - use raw column list and JSON for jsonb
function buildUpsert(table, pk, columns, body) {
  if (!Array.isArray(body)) return Promise.resolve();
  const cols = columns.map((c) => (c.includes('_') ? c : c.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')));
  return Promise.all(
    body.map((row) => {
      const s = objToSnake(row);
      const vals = cols.map((c) => {
        const v = s[c];
        if (v === undefined) return null;
        if (typeof v === 'object' && v !== null) return JSON.stringify(v);
        return v;
      });
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const setClause = cols.filter((c) => c !== pk).map((c) => `${c} = $${cols.indexOf(c) + 1}`).join(', ');
      return query(
        `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${pk}) DO UPDATE SET ${setClause}`,
        vals
      );
    })
  );
}

// --- ROLES ---
const ROLES_COLS = ['id', 'name', 'is_active', 'permissions', 'allowed_master_types', 'masters_permissions'];
router.get('/roles', async (req, res) => {
  try {
    const rows = await getAll('roles');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router.post('/roles', async (req, res) => {
  try {
    await buildUpsert('roles', 'id', ROLES_COLS, req.body);
    const rows = await getAll('roles');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- USERS ---
const USERS_COLS = ['id', 'employee_id', 'name', 'center_names', 'departments', 'sub_departments', 'phone_number', 'email', 'entity_names', 'role_ids', 'is_active', 'password_hash'];
router.get('/users', async (req, res) => {
  try {
    const rows = await getAll('users');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router.post('/users', async (req, res) => {
  try {
    await buildUpsert('users', 'id', USERS_COLS, req.body);
    const rows = await getAll('users');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- WORKFLOWS ---
const WORKFLOWS_COLS = ['id', 'entity_name', 'module_type', 'sub_department', 'center_name', 'min_amount', 'max_amount', 'approval_chain', 'is_active'];
router.get('/workflows', async (req, res) => {
  try {
    const rows = await getAll('workflows');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router.post('/workflows', async (req, res) => {
  try {
    await query('DELETE FROM workflows');
    await buildUpsert('workflows', 'id', WORKFLOWS_COLS, req.body);
    const rows = await getAll('workflows');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- PURCHASE REQUESTS ---
const PR_COLS = ['id', 'entity_name', 'vendor_id', 'vendor_site_id', 'transaction_type', 'valid_from', 'valid_to', 'frequency', 'department', 'sub_department', 'payment_terms', 'terms_and_conditions_id', 'center_names', 'items', 'amount', 'remarks', 'attachments', 'status', 'current_step_index', 'is_unbudgeted', 'unbudgeted_justification', 'unbudgeted_attachment_url', 'rejection_remarks', 'created_by', 'created_at', 'shipping_address_id', 'billing_address_id'];
router.get('/purchase-requests', async (req, res) => {
  try {
    const rows = await getAll('purchase_requests');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router.post('/purchase-requests', async (req, res) => {
  try {
    await buildUpsert('purchase_requests', 'id', PR_COLS, req.body);
    const rows = await getAll('purchase_requests');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- RATE CONTRACTS ---
const RC_COLS = ['id', 'entity_name', 'vendor_id', 'vendor_site_id', 'transaction_type', 'valid_from', 'valid_to', 'frequency', 'department', 'sub_department', 'payment_terms', 'terms_and_conditions_id', 'items', 'amount', 'remarks', 'attachments', 'status', 'current_step_index', 'rejection_remarks', 'created_by', 'created_at', 'shipping_address_id', 'billing_address_id'];
router.get('/rate-contracts', async (req, res) => {
  try {
    const rows = await getAll('rate_contracts');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router.post('/rate-contracts', async (req, res) => {
  try {
    await buildUpsert('rate_contracts', 'id', RC_COLS, req.body);
    const rows = await getAll('rate_contracts');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- PURCHASE ORDERS ---
const PO_COLS = ['id', 'entity_name', 'vendor_id', 'vendor_site_id', 'transaction_type', 'valid_from', 'valid_to', 'frequency', 'department', 'sub_department', 'payment_terms', 'terms_and_conditions_id', 'center_names', 'items', 'tds', 'gst', 'amount', 'remarks', 'attachments', 'status', 'current_step_index', 'is_unbudgeted', 'unbudgeted_justification', 'unbudgeted_attachment_url', 'rejection_remarks', 'created_by', 'created_at', 'required_date', 'shipping_address_id', 'billing_address_id', 'is_advance_po', 'advance_percentage'];
router.get('/purchase-orders', async (req, res) => {
  try {
    const rows = await getAll('purchase_orders');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router.post('/purchase-orders', async (req, res) => {
  try {
    await buildUpsert('purchase_orders', 'id', PO_COLS, req.body);
    const rows = await getAll('purchase_orders');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- GRNs ---
const GRN_COLS = ['id', 'entity_name', 'rate_contract_id', 'purchase_order_id', 'vendor_site_id', 'location', 'department', 'sub_department', 'invoice_number', 'items', 'amount', 'remarks', 'attachments', 'status', 'current_step_index', 'rejection_remarks', 'created_by', 'created_at', 'shipping_address_id', 'billing_address_id', 'tds', 'gst'];
router.get('/grns', async (req, res) => {
  try {
    const rows = await getAll('grns');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router.post('/grns', async (req, res) => {
  try {
    await buildUpsert('grns', 'id', GRN_COLS, req.body);
    const rows = await getAll('grns');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- INVOICES ---
const INV_COLS = ['id', 'entity_name', 'grn_id', 'vendor_site_id', 'location', 'department', 'sub_department', 'items', 'amount', 'status', 'current_step_index', 'rejection_remarks', 'created_by', 'created_at', 'attachments', 'shipping_address_id', 'billing_address_id', 'tds', 'gst'];
router.get('/invoices', async (req, res) => {
  try {
    const rows = await getAll('invoices');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router.post('/invoices', async (req, res) => {
  try {
    await buildUpsert('invoices', 'id', INV_COLS, req.body);
    const rows = await getAll('invoices');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- BUDGETS ---
const BUDGET_COLS = ['id', 'financial_year', 'entity_name', 'location_name', 'cost_center_name', 'coa_code', 'budget_type', 'amount', 'consumed_amount', 'control_type', 'validity', 'is_active'];
router.get('/budgets', async (req, res) => {
  try {
    const rows = await getAll('budgets');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router.post('/budgets', async (req, res) => {
  try {
    await buildUpsert('budgets', 'id', BUDGET_COLS, req.body);
    const rows = await getAll('budgets');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- BUDGET AMENDMENTS ---
const AMEND_COLS = ['id', 'budget_id', 'type', 'amount', 'target_budget_id', 'justification', 'status', 'requested_by', 'approved_by', 'created_at'];
router.get('/budget-amendments', async (req, res) => {
  try {
    const rows = await getAll('budget_amendments');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
router.post('/budget-amendments', async (req, res) => {
  try {
    await buildUpsert('budget_amendments', 'id', AMEND_COLS, req.body);
    const rows = await getAll('budget_amendments');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- MASTERS ---
// GET: return { "Vendor": [...], "Vendor Site": [...], ... } (each row = { id, name, status, ...data })
router.get('/masters', async (req, res) => {
  try {
    const res_ = await query('SELECT * FROM masters ORDER BY master_type, id');
    const byType = {};
    for (const row of res_.rows) {
      const { master_type, id, name, status, data } = row;
      const rec = { id, name, status, ...(data || {}) };
      if (!byType[master_type]) byType[master_type] = [];
      byType[master_type].push(rec);
    }
    res.json(byType);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// POST: body = { "Vendor": [...], "Vendor Site": [...], ... }; replace all masters per type
router.post('/masters', async (req, res) => {
  try {
    const payload = req.body;
    if (payload && typeof payload === 'object') {
      for (const [masterType, records] of Object.entries(payload)) {
        if (!Array.isArray(records)) continue;
        await query('DELETE FROM masters WHERE master_type = $1', [masterType]);
        for (const rec of records) {
          const { id, name, status, ...rest } = rec;
          const data = { ...rest };
          await query(
            `INSERT INTO masters (master_type, id, name, status, data) VALUES ($1, $2, $3, $4, $5)`,
            [masterType, id || '', name, status || 'Active', JSON.stringify(data)]
          );
        }
      }
    }
    const res_ = await query('SELECT * FROM masters ORDER BY master_type, id');
    const byType = {};
    for (const row of res_.rows) {
      const { master_type, id, name, status, data } = row;
      const rec = { id, name, status, ...(data || {}) };
      if (!byType[master_type]) byType[master_type] = [];
      byType[master_type].push(rec);
    }
    res.json(byType);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
