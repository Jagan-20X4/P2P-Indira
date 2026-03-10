
import React from 'react';
import { User, Role } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  users: User[];
  roles: Role[];
}

const Dashboard: React.FC<DashboardProps> = ({ users, roles }) => {
  const activeUsersCount = users.filter(u => u.isActive).length;
  
  const stats = [
    { label: 'System Users', value: users.length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Active Roles', value: roles.length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Governance Nodes', value: 5, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Security Protocols', value: 6, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  // Distribution by Subdepartment (flatten multi-assignments)
  const deptMap: Record<string, number> = {};
  users.forEach(u => {
    if (u.subDepartments && u.subDepartments.length > 0) {
      u.subDepartments.forEach(sd => {
        deptMap[sd] = (deptMap[sd] || 0) + 1;
      });
    } else {
      deptMap['Unassigned'] = (deptMap['Unassigned'] || 0) + 1;
    }
  });

  const data = Object.entries(deptMap).map(([name, count]) => ({ name, count })).slice(0, 5);
  if (data.length === 0) {
    data.push({ name: 'N/A', count: 0 });
  }

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 group hover:shadow-xl transition-all duration-300">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <div className="mt-2 flex items-baseline">
              <p className={`text-4xl font-black tracking-tight ${stat.color}`}>{stat.value}</p>
            </div>
            <div className={`mt-6 h-1.5 w-full rounded-full ${stat.bg}`}>
              <div className={`h-1.5 rounded-full ${stat.color.replace('text', 'bg')} transition-all duration-1000`} style={{ width: '75%' }}></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Access Distribution</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Subdepartment Metric</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} 
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" radius={[12, 12, 0, 0]} barSize={40}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <h3 className="text-xl font-black text-white tracking-tight uppercase mb-8 relative z-10">Governance Logs</h3>
          <div className="space-y-6 relative z-10">
            <div className="flex items-start space-x-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shadow-lg shadow-emerald-500/50"></div>
              <div>
                <p className="text-sm font-bold text-slate-100">Protocol Assignment Update</p>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Multi-Access Synced • 02:45 PM</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
