
import React, { useState } from 'react';
import { User, Role, MasterRecord, MasterType, ModuleType } from '../types';
import { DEPT_SUBDEPT_MAP } from '../constants';
import BulkImport from './BulkImport';
import MultiSelect from './MultiSelect';

interface UserManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  roles: Role[];
  masters: Record<MasterType, MasterRecord[]>;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, setUsers, roles, masters }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<any>({
    employeeId: '',
    name: '',
    centerNames: [],
    departments: [],
    subDepartments: [],
    phoneNumber: '',
    email: '',
    entityNames: [],
    roleIds: [],
    isActive: true,
    password: '',
    confirmPassword: ''
  });

  const getSubdepartmentOptions = () => {
    if (formData.departments.length === 0) {
      return Object.values(DEPT_SUBDEPT_MAP).flat();
    }
    const options = formData.departments.flatMap((d: string) => DEPT_SUBDEPT_MAP[d] || []);
    return Array.from(new Set(options)) as string[];
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || formData.password) {
      if (formData.password !== formData.confirmPassword) {
        alert("Passwords do not match");
        return;
      }
    }

    if (editingId) {
      setUsers(prev => prev.map(user => 
        user.id === editingId ? {
          ...user,
          ...formData
        } : user
      ));
    } else {
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData
      };
      setUsers(prev => [...prev, newUser]);
    }
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      employeeId: '',
      name: '',
      centerNames: [],
      departments: [],
      subDepartments: [],
      phoneNumber: '',
      email: '',
      entityNames: [],
      roleIds: [],
      isActive: true,
      password: '',
      confirmPassword: ''
    });
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({
      ...user,
      password: '',
      confirmPassword: ''
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = (id: string) => {
    setUsers(prev => prev.map(user => 
      user.id === id ? { ...user, isActive: !user.isActive } : user
    ));
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      setUsers(prev => prev.filter(user => user.id !== id));
    }
  };

  const getRoleNames = (ids: string[]) => ids.map(id => roles.find(r => r.id === id)?.name || 'N/A').join(', ');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">User Directory</h3>
          <p className="text-sm text-slate-500">Manage your workforce, update credentials and control access assignments.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setIsImportOpen(true)}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            <span>Bulk Import</span>
          </button>
          <button 
            onClick={() => { closeModal(); setIsModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            <span>Create User</span>
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Organization</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Roles</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((user) => (
              <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${!user.isActive ? 'opacity-60 bg-slate-50/50' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mr-3 ${user.isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${user.isActive ? 'text-slate-800' : 'text-slate-500'}`}>{user.name}</p>
                      <p className="text-xs text-slate-500">{user.employeeId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-600">{user.email}</p>
                  <p className="text-xs text-slate-400">{user.phoneNumber}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-600 font-bold uppercase tracking-tight">Center: <span className="text-slate-500 font-medium normal-case">{user.centerNames.join(', ')}</span></p>
                    <p className="text-xs text-slate-600 font-bold uppercase tracking-tight">Dept: <span className="text-slate-500 font-medium normal-case">{user.departments.join(', ')}</span></p>
                    <p className="text-xs text-slate-600 font-bold uppercase tracking-tight">Subdept: <span className="text-slate-500 font-medium normal-case">{user.subDepartments.join(', ')}</span></p>
                    <p className="text-xs text-slate-600 font-bold uppercase tracking-tight">Entity: <span className="text-slate-500 font-medium normal-case">{user.entityNames.join(', ')}</span></p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {user.roleIds.map(rid => (
                      <span key={rid} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${user.isActive ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {roles.find(r => r.id === rid)?.name || 'N/A'}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => handleToggleStatus(user.id)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                      user.isActive 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' 
                        : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <button onClick={() => handleEdit(user)} className="text-slate-400 hover:text-blue-600 p-1 rounded-lg hover:bg-blue-50 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(user.id)} className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl my-auto animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingId ? 'Edit User Credentials' : 'Create System Identity'}</h2>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">L4 Identity Governance Protocol</p>
              </div>
              <button onClick={closeModal} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all hover:bg-slate-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Employee ID</label>
                  <input required value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all font-bold text-slate-700" placeholder="e.g. EMP-101" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Full Name</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all font-bold text-slate-700" placeholder="Johnathan Doe" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Email Address</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all font-bold text-slate-700" placeholder="john@enterprise.com" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Phone Number</label>
                  <input required value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all font-bold text-slate-700" placeholder="+1 (555) 000-0000" />
                </div>

                <div className="space-y-1.5">
                  <MultiSelect 
                    label="Center Name(s)" 
                    options={masters.Center.map(c => c.name)} 
                    selected={formData.centerNames} 
                    onChange={val => setFormData({...formData, centerNames: val})} 
                    placeholder="Select Multiple Centers..."
                  />
                </div>
                <div className="space-y-1.5">
                  <MultiSelect 
                    label="Entity Name(s)" 
                    options={masters.Entity.map(e => e.name)} 
                    selected={formData.entityNames} 
                    onChange={val => setFormData({...formData, entityNames: val})} 
                    placeholder="Select Multiple Entities..."
                  />
                </div>
                <div className="space-y-1.5">
                  <MultiSelect 
                    label="Department(s)" 
                    options={masters.Department.map(d => d.name)} 
                    selected={formData.departments} 
                    onChange={val => setFormData({...formData, departments: val})} 
                    placeholder="Select Multiple Depts..."
                  />
                </div>
                <div className="space-y-1.5">
                  <MultiSelect 
                    label="Subdepartment(s)" 
                    options={getSubdepartmentOptions()} 
                    selected={formData.subDepartments} 
                    onChange={val => setFormData({...formData, subDepartments: val})} 
                    placeholder="Select Multiple Subdepts..."
                  />
                </div>
                <div className="space-y-1.5">
                  <MultiSelect 
                    label="Assigned Role(s)" 
                    options={roles.filter(r => r.isActive).map(r => r.name)} 
                    selected={formData.roleIds.map((id: string) => roles.find(r => r.id === id)?.name || id)} 
                    onChange={names => {
                      const ids = names.map(name => roles.find(r => r.name === name)?.id || name);
                      setFormData({...formData, roleIds: ids});
                    }} 
                    placeholder="Select Multiple Roles..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Protocol Status</label>
                  <div className="pt-1">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all ${formData.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${formData.isActive ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-slate-400'}`} />
                      <span className="text-xs font-bold uppercase tracking-widest">{formData.isActive ? 'Active' : 'Inactive'}</span>
                    </button>
                  </div>
                </div>

                {formData.roleIds.length > 0 && (
                  <div className="col-span-full mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Aggregated Role Permissions</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {Object.values(ModuleType).map(module => {
                        const aggregatedPerms = Array.from(new Set(
                          formData.roleIds.flatMap(rid => roles.find(r => r.id === rid)?.permissions[module] || [])
                        ));
                        if (aggregatedPerms.length === 0) return null;
                        return (
                          <div key={module} className="space-y-1">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{module}</p>
                            <div className="flex flex-wrap gap-1">
                              {aggregatedPerms.map(p => (
                                <span key={p} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[8px] font-bold uppercase text-slate-600">
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Password {editingId && <span className="text-[8px] font-normal normal-case italic">(Leave blank to keep current)</span>}</label>
                  <input required={!editingId} type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Confirm Protocol</label>
                  <input required={!editingId || formData.password} type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:bg-white outline-none transition-all" />
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-8">
                <button type="button" onClick={closeModal} className="px-8 py-3 bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all">Discard Changes</button>
                <button type="submit" className="px-12 py-3 bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
                  {editingId ? 'Sync Protocol' : 'Deploy Identity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isImportOpen && (
        <BulkImport 
          type="users" 
          roles={roles} 
          onImport={(data) => {
            setUsers(prev => [...prev, ...data]);
          }} 
          onClose={() => setIsImportOpen(false)} 
        />
      )}
    </div>
  );
};

export default UserManagement;
