import React, { useState, useEffect, useRef } from 'react';
import { User, Role, NavigationTab, ModuleType, MasterRecord, MasterType, WorkflowRule, DepartmentLimit, Permission } from './types';
import { ALL_MASTER_TYPES } from './constants';
import { getDepartments } from './utils/mastersHelpers';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import UserManagement from './components/UserManagement';
import RoleConfiguration from './components/RoleConfiguration';
import WorkflowConfiguration from './components/WorkflowConfiguration';
import MastersManagement from './components/MastersManagement';
import RateContractModule from './components/RateContractModule';
import PurchaseRequestModule from './components/PurchaseRequestModule';
import PurchaseOrderModule from './components/PurchaseOrderModule';
import DirectInvoiceModule from './components/DirectInvoiceModule';
import BudgetModule from './components/BudgetModule';
import Login from './components/Login';
import { PurchaseRequest, PurchaseOrder, GRN, Invoice, RateContract, Budget, BudgetAmendment, BudgetType, BudgetControlType, BudgetValidity, ApprovalType } from './types';
import { apiGet, apiPost } from './api';

/** Normalize workflows from API so approval steps always have type (Reviewer/Approver) and userIds for correct UI behavior. */
function normalizeWorkflows(rules: WorkflowRule[]): WorkflowRule[] {
  if (!Array.isArray(rules)) return [];
  return rules.map((w) => {
    let rawChain = w.approvalChain;
    if (typeof rawChain === 'string') {
      try { rawChain = JSON.parse(rawChain); } catch { rawChain = []; }
    }
    const chain = Array.isArray(rawChain) ? rawChain : [];
    const len = chain.length;
    const approvalChain = chain.map((step: any, idx: number) => {
      const userIds = Array.isArray(step.userIds) ? step.userIds : (Array.isArray(step.user_ids) ? step.user_ids : []);
      let type = step.type === ApprovalType.REVIEWER || step.type === ApprovalType.APPROVER ? step.type : undefined;
      if (type === undefined) {
        type = len <= 1 ? ApprovalType.APPROVER : idx === len - 1 ? ApprovalType.APPROVER : ApprovalType.REVIEWER;
      }
      return { id: step.id || `step-${idx}`, type, userIds };
    });
    return { ...w, approvalChain };
  });
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const initialFetchDone = useRef(false);

  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [rateContracts, setRateContracts] = useState<RateContract[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [grns, setGrns] = useState<GRN[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetAmendments, setBudgetAmendments] = useState<BudgetAmendment[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);
  const [deptLimits, setDeptLimits] = useState<DepartmentLimit[]>([]);
  const [pendingPOFromPR, setPendingPOFromPR] = useState<PurchaseRequest | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [masters, setMasters] = useState<Record<MasterType, MasterRecord[]>>({});

  const P2P_USER_KEY = 'p2p_user';

  const handleLogout = () => {
    localStorage.removeItem(P2P_USER_KEY);
    setCurrentUser(null);
  };

  useEffect(() => {
    (async () => {
      try {
        const [rolesRes, usersRes, workflowsRes, prRes, rcRes, poRes, grnsRes, invRes, budgetsRes, amendRes, mastersRes] = await Promise.all([
          apiGet<Role[]>('roles'),
          apiGet<User[]>('users'),
          apiGet<WorkflowRule[]>('workflows'),
          apiGet<PurchaseRequest[]>('purchase-requests'),
          apiGet<RateContract[]>('rate-contracts'),
          apiGet<PurchaseOrder[]>('purchase-orders'),
          apiGet<GRN[]>('grns'),
          apiGet<Invoice[]>('invoices'),
          apiGet<Budget[]>('budgets'),
          apiGet<BudgetAmendment[]>('budget-amendments'),
          apiGet<Record<string, MasterRecord[]>>('masters'),
        ]);
        setRoles(Array.isArray(rolesRes) ? rolesRes : []);
        const usersList = Array.isArray(usersRes) ? usersRes : [];
        setUsers(usersList);
        setWorkflows(Array.isArray(workflowsRes) ? normalizeWorkflows(workflowsRes) : []);
        setPurchaseRequests(Array.isArray(prRes) ? prRes : []);
        setRateContracts(Array.isArray(rcRes) ? rcRes : []);
        setPurchaseOrders(Array.isArray(poRes) ? poRes : []);
        setGrns(Array.isArray(grnsRes) ? grnsRes : []);
        setInvoices(Array.isArray(invRes) ? invRes : []);
        setBudgets(Array.isArray(budgetsRes) ? budgetsRes : []);
        setBudgetAmendments(Array.isArray(amendRes) ? amendRes : []);
        setMasters(mastersRes && typeof mastersRes === 'object' ? mastersRes as Record<MasterType, MasterRecord[]> : {});
        const stored = localStorage.getItem(P2P_USER_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const found = usersList.find((u) => u.id === parsed.id && u.isActive);
            if (found) setCurrentUser(found);
            else localStorage.removeItem(P2P_USER_KEY);
          } catch {
            localStorage.removeItem(P2P_USER_KEY);
          }
        }
        initialFetchDone.current = true;
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!initialFetchDone.current) return;
    apiPost('purchase-requests', purchaseRequests).catch(console.error);
  }, [purchaseRequests]);
  useEffect(() => {
    if (!initialFetchDone.current) return;
    apiPost('rate-contracts', rateContracts).catch(console.error);
  }, [rateContracts]);
  useEffect(() => {
    if (!initialFetchDone.current) return;
    apiPost('purchase-orders', purchaseOrders).catch(console.error);
  }, [purchaseOrders]);
  useEffect(() => {
    if (!initialFetchDone.current) return;
    apiPost('grns', grns).catch(console.error);
  }, [grns]);
  useEffect(() => {
    if (!initialFetchDone.current) return;
    apiPost('invoices', invoices).catch(console.error);
  }, [invoices]);
  useEffect(() => {
    if (!initialFetchDone.current) return;
    apiPost('budgets', budgets).catch(console.error);
  }, [budgets]);
  useEffect(() => {
    if (!initialFetchDone.current) return;
    apiPost('budget-amendments', budgetAmendments).catch(console.error);
  }, [budgetAmendments]);
  useEffect(() => {
    if (!initialFetchDone.current) return;
    apiPost('roles', roles).catch(console.error);
  }, [roles]);
  useEffect(() => {
    if (!initialFetchDone.current) return;
    apiPost('users', users).catch(console.error);
  }, [users]);
  useEffect(() => {
    if (!initialFetchDone.current) return;
    apiPost('workflows', workflows).catch(console.error);
  }, [workflows]);
  useEffect(() => {
    if (!initialFetchDone.current) return;
    apiPost('masters', masters).catch(console.error);
  }, [masters]);

  useEffect(() => {
    const depts = getDepartments(masters);
    if (depts.length > 0) {
      setDeptLimits(depts.map((d) => ({ department: d.name, maxLimit: 1000000, isActive: true })));
    }
  }, [masters]);

  const updateMasters = (type: MasterType, records: MasterRecord[]) => {
    setMasters(prev => ({ ...prev, [type]: records }));
  };

  const hasPermission = (module: ModuleType, permission: Permission) => {
    if (!currentUser) return false;
    const userRoles = roles.filter(r => currentUser.roleIds.includes(r.id) && r.isActive);
    return userRoles.some(r => r.permissions[module]?.includes(permission));
  };

  const getMastersAllowedTypes = (): MasterType[] | null => {
    if (!currentUser) return null;
    const isSuperAdmin = roles.filter(r => currentUser.roleIds.includes(r.id)).some(r => r.name === 'Super Admin');
    if (isSuperAdmin) return null;
    const userRoles = roles.filter(r => currentUser.roleIds.includes(r.id) && r.isActive);
    const withMastersView = userRoles.filter(r => r.permissions[ModuleType.MASTERS]?.includes('view'));
    if (withMastersView.length === 0) return null;
    const merged = getMastersPermissions();
    if (!merged) return null;
    return (Object.keys(merged) as MasterType[]).filter(t => merged[t]?.includes('view'));
  };

  const getMastersPermissions = (): Partial<Record<MasterType, Permission[]>> | null => {
    if (!currentUser) return null;
    const isSuperAdmin = roles.filter(r => currentUser.roleIds.includes(r.id)).some(r => r.name === 'Super Admin');
    if (isSuperAdmin) return null;
    const userRoles = roles.filter(r => currentUser.roleIds.includes(r.id) && r.isActive);
    const withMastersView = userRoles.filter(r => r.permissions[ModuleType.MASTERS]?.includes('view'));
    if (withMastersView.length === 0) return null;
    const result: Partial<Record<MasterType, Permission[]>> = {};
    const fullPerms: Permission[] = ['create', 'edit', 'view', 'delete'];
    withMastersView.forEach(r => {
      const mp = r.mastersPermissions
        ?? (r.allowedMasterTypes?.length
          ? Object.fromEntries(r.allowedMasterTypes.map(t => [t, ['view'] as Permission[]]))
          : Object.fromEntries(ALL_MASTER_TYPES.map(t => [t, fullPerms])));
      (Object.entries(mp) as [MasterType, Permission[]][]).forEach(([type, perms]) => {
        const set = new Set(result[type] || []);
        (perms || []).forEach(p => set.add(p));
        result[type] = Array.from(set);
      });
    });
    return result;
  };

  const renderContent = () => {
    const adminTabs: NavigationTab[] = ['users', 'roles', 'workflows'];
    if (adminTabs.includes(activeTab)) {
      const isSuperAdmin = roles.filter(r => currentUser?.roleIds.includes(r.id)).some(r => r.name === 'Super Admin');
      if (!isSuperAdmin) return <div className="p-8 text-center font-bold text-slate-500">Access Denied: Admin privileges required.</div>;
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard users={users} roles={roles} />;
      case 'users': return <UserManagement users={users} setUsers={setUsers} roles={roles} masters={masters} />;
      case 'roles': return <RoleConfiguration roles={roles} setRoles={setRoles} />;
      case 'workflows': return <WorkflowConfiguration workflows={workflows} setWorkflows={setWorkflows} users={users} masters={masters} />;
      case 'masters':
        if (!hasPermission(ModuleType.MASTERS, 'view')) return <div className="p-8 text-center font-bold text-slate-500">Access Denied</div>;
        return <MastersManagement masters={masters} onUpdate={updateMasters} allowedMasterTypes={getMastersAllowedTypes()} mastersPermissions={getMastersPermissions()} />;
      case 'purchase_request':
        if (!hasPermission(ModuleType.PR, 'view')) return <div className="p-8 text-center font-bold text-slate-500">Access Denied</div>;
        return (
          <PurchaseRequestModule
            masters={masters}
            purchaseRequests={purchaseRequests}
            setPurchaseRequests={setPurchaseRequests}
            onCreatePO={(pr) => {
              setActiveTab('purchase_order');
              setPendingPOFromPR(pr);
            }}
            currentUser={currentUser!}
            workflows={workflows}
            budgets={budgets}
          />
        );
      case 'rate_contract':
        if (!hasPermission(ModuleType.RATE_CONTRACT, 'view')) return <div className="p-8 text-center font-bold text-slate-500">Access Denied</div>;
        return (
          <RateContractModule
            masters={masters}
            rateContracts={rateContracts}
            setRateContracts={setRateContracts}
            grns={grns}
            setGrns={setGrns}
            invoices={invoices}
            setInvoices={setInvoices}
            currentUser={currentUser!}
            workflows={workflows}
          />
        );
      case 'purchase_order':
        if (!hasPermission(ModuleType.PO, 'view')) return <div className="p-8 text-center font-bold text-slate-500">Access Denied</div>;
        return (
          <PurchaseOrderModule
            masters={masters}
            purchaseOrders={purchaseOrders}
            setPurchaseOrders={setPurchaseOrders}
            grns={grns}
            setGrns={setGrns}
            invoices={invoices}
            setInvoices={setInvoices}
            pendingPR={pendingPOFromPR}
            onPOCreated={() => setPendingPOFromPR(null)}
            currentUser={currentUser!}
            workflows={workflows}
            budgets={budgets}
            setBudgets={setBudgets}
          />
        );
      case 'direct_invoice':
        if (!hasPermission(ModuleType.DIRECT_INVOICE, 'view')) return <div className="p-8 text-center font-bold text-slate-500">Access Denied</div>;
        return (
          <DirectInvoiceModule
            masters={masters}
            currentUser={currentUser!}
            workflows={workflows}
            budgets={budgets}
            setBudgets={setBudgets}
          />
        );
      case 'budgets':
        if (!hasPermission(ModuleType.BUDGET, 'view')) return <div className="p-8 text-center font-bold text-slate-500">Access Denied</div>;
        return (
          <BudgetModule
            budgets={budgets}
            setBudgets={setBudgets}
            amendments={budgetAmendments}
            setAmendments={setBudgetAmendments}
            masters={masters}
            currentUser={currentUser!}
            purchaseOrders={purchaseOrders}
            purchaseRequests={purchaseRequests}
          />
        );
      default: return <Dashboard users={users} roles={roles} />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="mt-4 font-semibold text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center max-w-md">
          <p className="font-bold text-rose-700">Failed to load data</p>
          <p className="mt-2 text-sm text-rose-600">{loadError}</p>
          <p className="mt-2 text-xs text-slate-500">Ensure the backend is running and connected to PostgreSQL.</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Login
        onLogin={(user) => {
          localStorage.setItem(P2P_USER_KEY, JSON.stringify(user));
          setCurrentUser(user);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} roles={roles} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto p-8 relative">
        <header className="mb-8 flex justify-between items-center sticky top-0 bg-slate-50/80 backdrop-blur-md z-20 pb-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight capitalize">{activeTab.replace('_', ' ')}</h1>
            <p className="text-slate-500 font-semibold text-sm">Enterprise Governance Dashboard</p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="bg-white shadow-xl shadow-slate-200/50 border border-slate-100 rounded-2xl px-5 py-2.5 flex items-center space-x-4">
              <div className="text-right">
                <span className="text-sm font-black text-slate-800 block">{currentUser.name}</span>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.15em] block">{currentUser.email}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-indigo-200">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm group"
              title="Logout"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>
        <div className="max-w-7xl mx-auto">{renderContent()}</div>
      </main>
    </div>
  );
};

export default App;
