import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Building2,
  Users,
  DollarSign,
  Bell,
  ClipboardList,
  Car,
  Settings,
  LogOut,
  UserCircle,
  Camera,
  Wallet
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getDashboardPath } from '@/utils/roleUtils';
import { SocietyService } from '@/services/supabase.service';
import { Society, Flat } from '@/types';

interface NavItem {
  name: string;
  path: string;
  icon: any;
  roles: string[];
}

const getNavItems = (userRole: string): NavItem[] => {
  const dashboardPath = getDashboardPath(userRole as any);

  return [
    { name: 'Dashboard', path: dashboardPath, icon: Home, roles: ['admin', 'owner', 'tenant', 'security', 'staff'] },
    { name: 'My Tenants', path: '/owner/tenants', icon: Users, roles: ['owner'] },
    { name: 'My Staff', path: '/owner/staff', icon: UserCircle, roles: ['owner', 'tenant'] },
    { name: 'Flats', path: '/flats', icon: Building2, roles: ['admin', 'owner'] },
    { name: 'Residents', path: '/residents', icon: Users, roles: ['admin'] },
    { name: 'Staff', path: '/admin/staff', icon: UserCircle, roles: ['admin'] },
    { name: 'Residents', path: '/security/residents', icon: Users, roles: ['security'] },
    { name: 'Salaries', path: '/admin/salary', icon: Wallet, roles: ['admin'] },
    { name: 'Visitors', path: '/visitors', icon: UserCircle, roles: ['admin', 'owner', 'tenant', 'security', 'staff'] },
    { name: 'CCTV', path: '/security/cctv', icon: Camera, roles: ['admin', 'security'] },
    { name: 'Payments', path: '/payments', icon: DollarSign, roles: ['admin', 'owner', 'tenant'] },
    { name: 'My Salary', path: '/salary/requests', icon: Wallet, roles: ['security', 'staff'] },
    { name: 'Complaints', path: '/complaints', icon: ClipboardList, roles: ['admin', 'owner', 'tenant', 'security', 'staff'] },
    { name: 'Announcements', path: '/announcements', icon: Bell, roles: ['admin', 'owner', 'tenant', 'security', 'staff'] },
    { name: 'Vehicles', path: '/vehicles', icon: Car, roles: ['admin', 'owner', 'tenant', 'staff'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin'] },
  ];
};

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const [societyName, setSocietyName] = useState('Society Manager');
  const [flatNumbers, setFlatNumbers] = useState<string>('');

  useEffect(() => {
    const fetchSidebarData = async () => {
      if (!user?.societyId) return;
      try {
        const societyData = await SocietyService.getSociety(user.societyId);
        if (societyData) {
          setSocietyName((societyData as Society).name);
        }

        if (user.flatIds && user.flatIds.length > 0) {
          const flats = await SocietyService.getFlats(user.societyId);
          const myFlats = (flats as Flat[]).filter(f => user.flatIds.includes(f.id));
          setFlatNumbers(myFlats.map(f => `Flat ${f.flatNumber}`).join(', '));
        }
      } catch (error) {
        console.error('Error fetching sidebar metadata:', error);
      }
    };

    fetchSidebarData();
  }, [user]);

  if (!user) return null;

  const navItems = getNavItems(user.role);
  const filteredNavItems = navItems.filter(item =>
    item.roles.includes(user.role)
  );

  return (
    <div className="w-64 bg-slate-900 text-slate-100 min-h-screen flex flex-col shadow-xl">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Building2 className="text-primary-400" size={24} />
          <span className="truncate">{societyName}</span>
        </h1>
        <div className="mt-4 flex items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="text-sm font-medium text-white truncate w-32">{user?.name}</p>
            <p className="text-xs text-slate-400 capitalize">
              {user?.role} {flatNumbers && `• ${flatNumbers}`}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/50'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-all duration-200"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};
