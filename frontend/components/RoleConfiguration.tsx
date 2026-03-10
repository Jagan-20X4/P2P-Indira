
import React, { useState } from 'react';
import { Role, ModuleType, Permission } from '../types';
import { ALL_MODULES, ALL_PERMISSIONS } from '../constants';

interface RoleConfigurationProps {
  roles: Role[];
  setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
}

const RoleConfiguration: React.FC<RoleConfigurationProps> = ({ roles, setRoles }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [isRoleActive, setIsRoleActive] = useState(true);
  
  const getEmptyPermissions = () => ALL_MODULES.reduce((acc, mod) => ({ ...acc, [mod]: [] }), {} as Record<ModuleType, Permission[]>);

  const [permissions, setPermissions] = useState<Record<ModuleType, Permission[]>>(getEmptyPermissions());

  const togglePermission = (module: ModuleType, permission: Permission) => {
    setPermissions(prev => {
      const current = prev[module] || [];
      const updated = current.includes(permission)
        ? current.filter(p => p !== permission)
        : [...current, permission];
      return { ...prev, [module]: updated };
    });
  };

  const handleToggleStatus = (id: string) => {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setRoles(prev => prev.map(r => r.id === editingId ? { 
        ...r, 
        name: roleName, 
        permissions,
        isActive: isRoleActive
      } : r));
    } else {
      const newRole: Role = {
        id: Math.random().toString(36).substr(2, 9),
        name: roleName,
        permissions,
        isActive: isRoleActive
      };
      setRoles(prev => [...prev, newRole]);
    }
    closeModal();
  };

  const openModal = (role?: Role) => {
    if (role) {
      setEditingId(role.id);
      setRoleName(role.name);
      setIsRoleActive(role.isActive);
      const normalized = { ...getEmptyPermissions(), ...role.permissions };
      setPermissions(normalized);
    } else {
      setEditingId(null);
      setRoleName('');
      setIsRoleActive(true);
      setPermissions(getEmptyPermissions());
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setRoleName('');
    setIsRoleActive(true);
    setPermissions(getEmptyPermissions());
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this role? This might affect assigned users.')) {
      setRoles(prev => prev.filter(r => r.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Security Roles</h3>
          <p className="text-sm text-slate-500">Define access control and permissions for different roles.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          <span>Create New Role</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div key={role.id} className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative ${!role.isActive ? 'opacity-60 grayscale-[0.5]' : ''}`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-colors ${role.isActive ? 'bg-slate-50 border-slate-100 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50' : 'bg-slate-100 border-slate-200 text-slate-300'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div className="flex space-x-1 items-center">
                <button 
                  onClick={() => handleToggleStatus(role.id)}
                  title={role.isActive ? 'Deactivate Role' : 'Activate Role'}
                  className={`p-1.5 rounded-lg transition-colors ${role.isActive ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={role.isActive ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                  </svg>
                </button>
                <button onClick={() => openModal(role)} className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                <button onClick={() => handleDelete(role.id)} className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
              </div>
            </div>
            <div className="flex items-center space-x-2 mb-2">
              <h4 className="text-lg font-bold text-slate-800">{role.name}</h4>
              {!role.isActive && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">Inactive</span>}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase">Active Permissions</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(role.permissions).map(([mod, perms]) => (
                  (perms as any[]).length > 0 && (
                    <span key={mod} className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {mod}: {(perms as any[]).length}
                    </span>
                  )
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{editingId ? 'Edit Role' : 'Role Builder'}</h2>
                <p className="text-sm text-slate-500">Configure access levels across all modules.</p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block mb-2">Role Name</label>
                  <input 
                    required 
                    value={roleName} 
                    onChange={e => setRoleName(e.target.value)} 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    placeholder="e.g. Accounts Manager" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 block mb-2">Status</label>
                  <div className="flex items-center h-10">
                    <button 
                      type="button"
                      onClick={() => setIsRoleActive(!isRoleActive)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all ${isRoleActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                    >
                      <div className={`w-3 h-3 rounded-full ${isRoleActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span className="text-sm font-medium">{isRoleActive ? 'Active' : 'Inactive'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Module Name</th>
                      {ALL_PERMISSIONS.map(p => (
                        <th key={p} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">{p}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ALL_MODULES.map(module => (
                      <tr key={module} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">{module}</td>
                        {ALL_PERMISSIONS.map(permission => (
                          <td key={permission} className="px-6 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => togglePermission(module, permission)}
                              className={`w-6 h-6 rounded border-2 flex items-center justify-center mx-auto transition-all ${
                                (permissions[module] || []).includes(permission)
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'border-slate-300 bg-white text-transparent hover:border-blue-400'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end space-x-3 bg-slate-50">
              <button type="button" onClick={closeModal} className="px-6 py-2 text-slate-600 font-medium hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200">Cancel</button>
              <button 
                onClick={handleSaveRole}
                className="px-8 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!roleName}
              >
                {editingId ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleConfiguration;
