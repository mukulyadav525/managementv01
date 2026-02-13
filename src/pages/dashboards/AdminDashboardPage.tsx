import React, { useEffect, useState } from 'react';
import {
    Building2,
    Users,
    DollarSign,
    AlertCircle,
    TrendingUp,
    Home,
    UserCheck,
    Shield
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { StatsCard, Card } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import {
    PaymentService,
    ComplaintService,
    VisitorService,
    SocietyService,
    UserService
} from '@/services/supabase.service';

export const AdminDashboardPage: React.FC = () => {
    const { user } = useAuthStore();
    const [stats, setStats] = useState({
        totalFlats: 0,
        occupiedFlats: 0,
        vacantFlats: 0,
        totalResidents: 0,
        pendingPayments: 0,
        openComplaints: 0,
        todayVisitors: 0,
        totalRevenue: 0,
        totalTenants: 0,
        totalSecurity: 0,
        totalStaff: 0
    });
    const [payments, setPayments] = useState<any[]>([]);
    const [complaints, setComplaints] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, [user]);

    const loadDashboardData = async () => {
        if (!user?.societyId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // Load payments (all society payments)
            const paymentsData = await PaymentService.getPayments(user.societyId);
            setPayments(paymentsData);
            const pendingPayments = paymentsData.filter((p: any) => p.status === 'pending').length;
            const totalRevenue = paymentsData
                .filter((p: any) => p.status === 'paid')
                .reduce((sum: number, p: any) => sum + p.amount, 0);

            // Load complaints (all society complaints)
            const complaintsData = await ComplaintService.getComplaints(user.societyId);
            setComplaints(complaintsData);
            const openComplaintsCount = complaintsData.filter((c: any) =>
                c.status === 'open' || c.status === 'in-progress'
            ).length;

            // Load today's visitors
            const visitors = await VisitorService.getVisitors(user.societyId);
            const today = new Date().toDateString();
            const todayVisitors = visitors.filter((v: any) =>
                v.entryTime && new Date(v.entryTime).toDateString() === today
            ).length;

            // Load flats for stats
            const flats = await SocietyService.getFlats(user.societyId);
            const totalFlats = flats.length;
            const occupiedFlats = flats.filter((f: any) =>
                f.occupancyStatus === 'rented' || f.occupancyStatus === 'owner-occupied'
            ).length;
            const vacantFlats = totalFlats - occupiedFlats;

            // Load tenants
            const tenants = await UserService.getUsers(user.societyId, 'tenant');
            const totalTenants = tenants.length;

            // Load Security & Staff counts
            const allUsers = await UserService.getUsers(user.societyId);
            const totalSecurity = allUsers.filter((u: any) => u.role === 'security').length;
            const totalStaff = allUsers.filter((u: any) => u.role === 'staff').length;

            setStats({
                totalFlats,
                occupiedFlats,
                vacantFlats,
                totalResidents: occupiedFlats,
                pendingPayments,
                openComplaints: openComplaintsCount,
                todayVisitors,
                totalRevenue,
                totalTenants,
                totalSecurity,
                totalStaff
            });
        } catch (error) {
            console.error('Error loading admin dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading dashboard...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-600 mt-1">Society-wide management and analytics</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCard
                        title="Total Flats"
                        value={stats.totalFlats}
                        icon={Home}
                        color="blue"
                    />
                    <StatsCard
                        title="Occupied"
                        value={stats.occupiedFlats}
                        icon={Building2}
                        color="green"
                    />
                    <StatsCard
                        title="Vacant"
                        value={stats.vacantFlats}
                        icon={Building2}
                        color="blue"
                    />
                    <StatsCard
                        title="Total Residents"
                        value={stats.totalResidents}
                        icon={Users}
                        color="purple"
                    />
                    <StatsCard
                        title="Pending Payments"
                        value={stats.pendingPayments}
                        icon={DollarSign}
                        color="yellow"
                    />
                    <StatsCard
                        title="Open Complaints"
                        value={stats.openComplaints}
                        icon={AlertCircle}
                        color="red"
                    />
                    <StatsCard
                        title="Today's Visitors"
                        value={stats.todayVisitors}
                        icon={UserCheck}
                        color="purple"
                    />
                    <StatsCard
                        title="Total Revenue"
                        value={`₹${stats.totalRevenue.toLocaleString()}`}
                        icon={TrendingUp}
                        color="green"
                    />
                    <StatsCard
                        title="Total Tenants"
                        value={stats.totalTenants}
                        icon={Users}
                        color="purple"
                    />
                    <StatsCard
                        title="Security Guards"
                        value={stats.totalSecurity}
                        icon={Shield}
                        color="blue"
                    />
                    <StatsCard
                        title="Society Staff"
                        value={stats.totalStaff}
                        icon={Users}
                        color="purple"
                    />
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Recent Payments" subtitle="Latest transactions across society">
                        <div className="space-y-3">
                            {payments.length === 0 && (
                                <p className="text-gray-500 text-center py-4">No payments recorded</p>
                            )}
                            {payments.slice(0, 5).map((payment: any) => (
                                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900">Flat {payment.flatId}</p>
                                        <p className="text-sm text-gray-500">{payment.type}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-semibold ${payment.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                                            ₹{payment.amount.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-500 capitalize">{payment.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Critical Complaints" subtitle="High priority issues">
                        <div className="space-y-3">
                            {complaints.filter((c: any) => c.priority === 'high' && (c.status === 'open' || c.status === 'in-progress')).length === 0 && (
                                <p className="text-gray-500 text-center py-4">No critical complaints</p>
                            )}
                            {complaints
                                .filter((c: any) => c.priority === 'high' && (c.status === 'open' || c.status === 'in-progress'))
                                .slice(0, 5)
                                .map((complaint: any) => (
                                    <div key={complaint.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">{complaint.title}</p>
                                            <p className="text-sm text-gray-500">Flat {complaint.flatId}</p>
                                        </div>
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                            {complaint.priority}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </Card>
                </div>
            </div>
        </Layout>
    );
};
