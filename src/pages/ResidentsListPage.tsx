import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Users, Search, Phone, Mail, Home, Shield, UserPlus } from 'lucide-react';
import { UserService } from '@/services/supabase.service';
import { User } from '@/types';
import toast from 'react-hot-toast';
import { Layout } from '@/components/layout/Layout';
import { Card, StatsCard } from '@/components/common';

export const ResidentsListPage: React.FC = () => {
    const { user } = useAuthStore();
    const [residents, setResidents] = useState<User[]>([]);
    const [filteredResidents, setFilteredResidents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');

    useEffect(() => {
        loadResidents();
    }, [user]);

    useEffect(() => {
        filterResidents();
    }, [searchQuery, roleFilter, residents]);

    const loadResidents = async () => {
        if (!user?.societyId) return;

        try {
            setLoading(true);
            const data = await UserService.getUsers(user.societyId) as User[];
            // Filter out security guards (show only owners, tenants, admins)
            const filteredData = data.filter((u: User) => u.role !== 'security');
            setResidents(filteredData);
            setFilteredResidents(filteredData);
        } catch (error) {
            console.error('Error loading residents:', error);
            toast.error('Failed to load residents');
        } finally {
            setLoading(false);
        }
    };

    const filterResidents = () => {
        let filtered = residents;

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (r) =>
                    r.name?.toLowerCase().includes(query) ||
                    r.email?.toLowerCase().includes(query) ||
                    r.phone?.toLowerCase().includes(query)
            );
        }

        // Apply role filter
        if (roleFilter !== 'all') {
            filtered = filtered.filter((r) => r.role === roleFilter);
        }

        setFilteredResidents(filtered);
    };

    const getRoleBadge = (role: string) => {
        const styles = {
            admin: 'bg-purple-100 text-purple-700 border-purple-200',
            owner: 'bg-blue-100 text-blue-700 border-blue-200',
            tenant: 'bg-emerald-100 text-emerald-700 border-emerald-200'
        };

        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[role as keyof typeof styles] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                {role.toUpperCase()}
            </span>
        );
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600 font-medium">Loading residents directory...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Residents Directory</h1>
                        <p className="text-gray-500 mt-1 font-medium">Search and contact society residents</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCard
                        title="Total Residents"
                        value={residents.length}
                        icon={Users}
                        color="blue"
                    />
                    <StatsCard
                        title="Home Owners"
                        value={residents.filter(r => r.role === 'owner').length}
                        icon={Home}
                        color="purple"
                    />
                    <StatsCard
                        title="Tenants"
                        value={residents.filter(r => r.role === 'tenant').length}
                        icon={UserPlus}
                        color="green"
                    />
                    <StatsCard
                        title="Administrators"
                        value={residents.filter(r => r.role === 'admin').length}
                        icon={Shield}
                        color="purple"
                    />
                </div>

                {/* Filters */}
                <Card className="p-2 border-slate-100 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-2">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search by name, email, or phone number..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border-none rounded-2xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-gray-900 font-medium placeholder:text-gray-400"
                            />
                        </div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-6 py-4 bg-gray-50/50 border-none rounded-2xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all text-gray-900 font-bold appearance-none cursor-pointer min-w-[160px]"
                        >
                            <option value="all">All Roles</option>
                            <option value="admin">Administrators</option>
                            <option value="owner">Property Owners</option>
                            <option value="tenant">Regular Tenants</option>
                        </select>
                    </div>
                </Card>

                {/* Residents List */}
                <Card className="overflow-hidden border-slate-100 shadow-sm">
                    {filteredResidents.length === 0 ? (
                        <div className="p-20 text-center">
                            <Users className="w-16 h-16 text-gray-300 mx-auto mb-6" />
                            <h3 className="text-xl font-bold text-gray-900">No residents found</h3>
                            <p className="text-gray-500 mt-2 font-medium">We couldn't find any residents matching your current filters.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Resident</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact Details</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Property</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredResidents.map((resident) => (
                                        <tr key={resident.uid} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold shrink-0">
                                                        {resident.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900">{resident.name}</div>
                                                        <div className="mt-0.5">{getRoleBadge(resident.role)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="space-y-1">
                                                    {resident.phone && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <Phone size={14} className="text-gray-400" />
                                                            {resident.phone}
                                                        </div>
                                                    )}
                                                    {resident.email && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <Mail size={14} className="text-gray-400" />
                                                            <span className="truncate max-w-[200px]">{resident.email}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                                                {resident.flatIds?.length ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                        {resident.flatIds.length} Property Mapped
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">No flats mapped</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors bg-primary-50 px-3 py-1.5 rounded-lg">
                                                    VIEW PROFILE
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>
        </Layout>
    );
};
