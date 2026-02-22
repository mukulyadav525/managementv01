import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { ClipboardList, Bell, DollarSign } from 'lucide-react';
import { ComplaintService, SalaryPaymentService, AnnouncementService } from '@/services/supabase.service';
import { Layout } from '@/components/layout/Layout';
import { Card, StatsCard } from '@/components/common';

export const StaffDashboardPage: React.FC = () => {
    const { user } = useAuthStore();
    const [stats, setStats] = useState({
        activeComplaints: 0,
        recentAnnouncements: 0,
        pendingSalary: 0
    });
    const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
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

            const complaintsData = await ComplaintService.getComplaints(user.societyId);
            setRecentComplaints(complaintsData.slice(0, 5));
            const activeComplaints = complaintsData.filter((c: any) =>
                c.status === 'open' || c.status === 'in-progress'
            ).length;

            const announcementsData = await AnnouncementService.getAnnouncements(user.societyId);
            setRecentAnnouncements(announcementsData.slice(0, 5));

            const salaryData = await SalaryPaymentService.getSalaryPayments(user.uid);
            const pendingSalaryCount = salaryData.filter((s: any) => s.status === 'pending').length;

            setStats({
                activeComplaints,
                recentAnnouncements: announcementsData.length,
                pendingSalary: pendingSalaryCount
            });
        } catch (error) {
            console.error('Error loading staff dashboard:', error);
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
                    <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
                    <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatsCard
                        title="Active Complaints"
                        value={stats.activeComplaints}
                        icon={ClipboardList}
                        color="red"
                    />
                    <StatsCard
                        title="Announcements"
                        value={stats.recentAnnouncements}
                        icon={Bell}
                        color="blue"
                    />
                    <StatsCard
                        title="Pending Salary"
                        value={stats.pendingSalary}
                        icon={DollarSign}
                        color="green"
                    />
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Society Announcements" subtitle="Latest notices">
                        <div className="space-y-3">
                            {recentAnnouncements.length === 0 && (
                                <p className="text-gray-500 text-center py-4">No recent announcements</p>
                            )}
                            {recentAnnouncements.map((announcement: any) => (
                                <div key={announcement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{announcement.title}</p>
                                        <p className="text-sm text-gray-500">{new Date(announcement.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${announcement.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {announcement.priority}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Active Complaints" subtitle="Tasks assigned or reported">
                        <div className="space-y-3">
                            {recentComplaints.length === 0 && (
                                <p className="text-gray-500 text-center py-4">No recent complaints</p>
                            )}
                            {recentComplaints.map((complaint: any) => (
                                <div key={complaint.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{complaint.title}</p>
                                        <p className="text-sm text-gray-500 capitalize">{complaint.category || 'General'}</p>
                                    </div>
                                    <span className={`
                                        px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${complaint.status === 'resolved' ? 'bg-green-100 text-green-700' : ''}
                                        ${complaint.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : ''}
                                        ${complaint.status === 'open' ? 'bg-yellow-100 text-yellow-700' : ''}
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
