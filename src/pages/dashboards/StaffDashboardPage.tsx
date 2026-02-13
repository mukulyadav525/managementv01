import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { ClipboardList, Bell, DollarSign } from 'lucide-react';
import { ComplaintService, SalaryPaymentService, AnnouncementService, SocietyService } from '@/services/supabase.service';
import { Layout } from '@/components/layout/Layout';
import { Card, StatsCard } from '@/components/common';
import { Home, Calendar } from 'lucide-react';

export const StaffDashboardPage: React.FC = () => {
    const { user } = useAuthStore();
    const [stats, setStats] = useState({
        activeComplaints: 0,
        recentAnnouncements: 0,
        pendingSalary: 0
    });
    const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
    const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
    const [mappedFlats, setMappedFlats] = useState<string[]>([]);
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

            // Fetch Complaints
            const complaintsData = await ComplaintService.getComplaints(user.societyId);
            setRecentComplaints(complaintsData.slice(0, 5));
            const activeComplaints = complaintsData.filter((c: any) =>
                c.status === 'open' || c.status === 'in-progress'
            ).length;

            // Fetch Announcements
            const announcementsData = await AnnouncementService.getAnnouncements(user.societyId);
            setRecentAnnouncements(announcementsData.slice(0, 5));
            const recentAnnouncementsCount = announcementsData.length;

            // Fetch Pending Salary
            const salaryData = await SalaryPaymentService.getSalaryPayments(user.uid);
            const pendingSalaryCount = salaryData.filter((s: any) =>
                s.status === 'pending'
            ).length;

            setStats({
                activeComplaints,
                recentAnnouncements: recentAnnouncementsCount,
                pendingSalary: pendingSalaryCount
            });

            // Fetch Flat details if mapped
            if (user.flatIds && user.flatIds.length > 0) {
                const allFlats = await SocietyService.getFlats(user.societyId);
                const numbers = allFlats
                    .filter((f: any) => user.flatIds.includes(f.id))
                    .map((f: any) => f.flatNumber);
                setMappedFlats(numbers);
            }
        } catch (error) {
            console.error('Error loading staff dashboard data:', error);
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
                        <p className="mt-4 text-gray-600">Loading staff dashboard...</p>
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
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Staff Dashboard</h1>
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${(user as any)?.staffType === 'society_staff'
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}>
                            {(user as any)?.staffType === 'society_staff' ? 'Society Staff' : 'Domestic Staff'}
                        </span>
                        {mappedFlats.length > 0 && (
                            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                                <Home size={14} className="text-gray-400" />
                                Mapped to Flat {mappedFlats.join(', ')}
                            </span>
                        )}
                        <span className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                            <Calendar size={14} /> {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                        </span>
                    </div>
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
                        title="Recent Announcements"
                        value={stats.recentAnnouncements}
                        icon={Bell}
                        color="blue"
                    />
                    <StatsCard
                        title="Pending Salary Requests"
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
                                    <div>
                                        <p className="font-medium text-gray-900">{announcement.title}</p>
                                        <p className="text-sm text-gray-500">{new Date(announcement.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${announcement.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {announcement.priority}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Active Complaints" subtitle="Tasks assigned/reported">
                        <div className="space-y-3">
                            {recentComplaints.length === 0 && (
                                <p className="text-gray-500 text-center py-4">No recent complaints</p>
                            )}
                            {recentComplaints.map((complaint: any) => (
                                <div key={complaint.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{complaint.title}</p>
                                        <p className="text-sm text-gray-500">Status: {complaint.status}</p>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {new Date(complaint.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </Layout>
    );
};
