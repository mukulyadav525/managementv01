import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Users, Camera, AlertCircle, DollarSign } from 'lucide-react';
import { VisitorService, ComplaintService, SalaryPaymentService } from '@/services/supabase.service';
import { Layout } from '@/components/layout/Layout';
import { Card, StatsCard } from '@/components/common';

export const SecurityDashboardPage: React.FC = () => {
    const { user } = useAuthStore();
    const [stats, setStats] = useState({
        visitorsToday: 0,
        activeComplaints: 0,
        pendingSalary: 0,
        totalResidents: 0
    });
    const [recentVisitors, setRecentVisitors] = useState<any[]>([]);
    const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
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

            const today = new Date().toDateString();

            // Fetch Visitors
            const visitorsData = await VisitorService.getVisitors(user.societyId);
            setRecentVisitors(visitorsData.slice(0, 5));
            const visitorsToday = visitorsData.filter((v: any) =>
                v.entryTime && new Date(v.entryTime).toDateString() === today
            ).length;

            // Fetch Complaints
            const complaintsData = await ComplaintService.getComplaints(user.societyId);
            setRecentComplaints(complaintsData.slice(0, 5));
            const activeComplaints = complaintsData.filter((c: any) =>
                c.status === 'open' || c.status === 'in-progress'
            ).length;

            // Fetch Pending Salary
            const salaryData = await SalaryPaymentService.getSalaryPayments(user.uid);
            const pendingSalary = salaryData.filter((s: any) =>
                s.status === 'pending'
            ).length;

            setStats({
                visitorsToday,
                activeComplaints,
                pendingSalary,
                totalResidents: 0
            });
        } catch (error) {
            console.error('Error loading security dashboard data:', error);
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
                        <p className="mt-4 text-gray-600">Loading security dashboard...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
                    <p className="text-gray-600 mt-1">Monitoring society security and operations</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCard
                        title="Visitors Today"
                        value={stats.visitorsToday}
                        icon={Users}
                        color="blue"
                    />
                    <StatsCard
                        title="Active Complaints"
                        value={stats.activeComplaints}
                        icon={AlertCircle}
                        color="red"
                    />
                    <StatsCard
                        title="Pending Salary"
                        value={stats.pendingSalary}
                        icon={DollarSign}
                        color="green"
                    />
                    <StatsCard
                        title="CCTV Cameras"
                        value="All Online"
                        icon={Camera}
                        color="purple"
                    />
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Recent Visitors" subtitle="Latest society entries">
                        <div className="space-y-3">
                            {recentVisitors.length === 0 && (
                                <p className="text-gray-500 text-center py-4">No visitors recorded today</p>
                            )}
                            {recentVisitors.map((visitor: any) => (
                                <div key={visitor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900">{visitor.name}</p>
                                        <p className="text-sm text-gray-500">{visitor.purpose}</p>
                                    </div>
                                    <div className="text-right text-xs text-gray-500">
                                        {visitor.entryTime ? new Date(visitor.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Recent Complaints" subtitle="Latest reported issues">
                        <div className="space-y-3">
                            {recentComplaints.length === 0 && (
                                <p className="text-gray-500 text-center py-4">No recent complaints</p>
                            )}
                            {recentComplaints.map((complaint: any) => (
                                <div key={complaint.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{complaint.title}</p>
                                        <p className="text-sm text-gray-500">Flat {complaint.flatId}</p>
                                    </div>
                                    <span className={`
                                        px-3 py-1 rounded-full text-xs font-medium capitalize
                                        ${complaint.status === 'open' ? 'bg-yellow-100 text-yellow-700' : ''}
                                        ${complaint.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : ''}
                                        ${complaint.status === 'resolved' ? 'bg-green-100 text-green-700' : ''}
                                    `}>
                                        {complaint.status}
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
