import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Users, Camera, AlertCircle, DollarSign, UserCheck, ShieldCheck } from 'lucide-react';
import {
    VisitorService,
    ComplaintService,
    SalaryPaymentService,
    CCTVService,
    AnnouncementService
} from '@/services/supabase.service';
import { Layout } from '@/components/layout/Layout';
import { Card, StatsCard, Button } from '@/components/common';
import { useNavigate } from 'react-router-dom';

export const SecurityDashboardPage: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        visitorsToday: 0,
        activeComplaints: 0,
        pendingSalary: 0,
        activeCameras: 0,
        totalCameras: 0
    });
    const [recentVisitors, setRecentVisitors] = useState<any[]>([]);
    const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.societyId) {
            loadDashboardData();
        }
    }, [user]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const today = new Date().toDateString();

            const [visitors, complaints, salaryRequests, cameras, announcementsData] = await Promise.all([
                VisitorService.getVisitors(user!.societyId),
                ComplaintService.getComplaints(user!.societyId),
                SalaryPaymentService.getSalaryPayments(user!.uid),
                CCTVService.getCameras(user!.societyId),
                AnnouncementService.getAnnouncements(user!.societyId)
            ]);

            const visitorsTodayCount = visitors.filter((v: any) =>
                v.entryTime && new Date(v.entryTime).toDateString() === today
            ).length;

            const activeComplaintsCount = complaints.filter((c: any) =>
                c.status === 'open' || c.status === 'in-progress'
            ).length;

            const pendingSalaryCount = salaryRequests.filter((s: any) => s.status === 'pending').length;
            const activeCamerasCount = (cameras as any[]).filter((c: any) => c.isActive).length;

            setRecentVisitors(visitors.slice(0, 5));
            setRecentComplaints(complaints.filter((c: any) => c.status !== 'resolved').slice(0, 5));
            setAnnouncements(announcementsData.slice(0, 5));

            setStats({
                visitorsToday: visitorsTodayCount,
                activeComplaints: activeComplaintsCount,
                pendingSalary: pendingSalaryCount,
                activeCameras: activeCamerasCount,
                totalCameras: (cameras as any[]).length
            });
        } catch (error) {
            console.error('Error loading security dashboard:', error);
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
                    <h1 className="text-2xl font-bold text-gray-900">Security Dashboard</h1>
                    <p className="text-gray-600 mt-1">Society monitoring and access control</p>
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
                        title="Salary Status"
                        value={stats.pendingSalary > 0 ? `${stats.pendingSalary} Pending` : 'Up to date'}
                        icon={DollarSign}
                        color="green"
                    />
                    <StatsCard
                        title="CCTV Online"
                        value={`${stats.activeCameras}/${stats.totalCameras}`}
                        icon={Camera}
                        color="purple"
                    />
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                        variant="secondary"
                        className="flex items-center gap-2 justify-center"
                        onClick={() => navigate('/visitors')}
                    >
                        <UserCheck size={18} />
                        Register Visitor
                    </Button>
                    <Button
                        variant="secondary"
                        className="flex items-center gap-2 justify-center"
                        onClick={() => navigate('/emergencies')}
                    >
                        <ShieldCheck size={18} />
                        Emergency Contacts
                    </Button>
                    <Button
                        variant="secondary"
                        className="flex items-center gap-2 justify-center"
                        onClick={() => navigate('/cctv')}
                    >
                        <Camera size={18} />
                        CCTV Monitor
                    </Button>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Recent Visitors" subtitle="Latest gate activity">
                        <div className="space-y-3">
                            {recentVisitors.length === 0 && (
                                <p className="text-gray-500 text-center py-4">No visitors today</p>
                            )}
                            {recentVisitors.map((visitor: any) => (
                                <div key={visitor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900">{visitor.name}</p>
                                        <p className="text-sm text-gray-500">{visitor.purpose || 'No purpose'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-700">
                                            {visitor.entryTime ? new Date(visitor.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </p>
                                        <p className="text-xs text-gray-500">Flat {visitor.flatId}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Unresolved Complaints" subtitle="Needs attention">
                        <div className="space-y-3">
                            {recentComplaints.length === 0 && (
                                <p className="text-gray-500 text-center py-4">No active complaints</p>
                            )}
                            {recentComplaints.map((complaint: any) => (
                                <div key={complaint.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{complaint.title}</p>
                                        <p className="text-sm text-gray-500 capitalize">{complaint.category || 'General'}</p>
                                    </div>
                                    <span className={`
                                        px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${complaint.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}
                                    `}>
                                        {complaint.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="Latest Announcements" subtitle="Society notices">
                        <div className="space-y-3">
                            {announcements.length === 0 && (
                                <p className="text-gray-500 text-center py-4">No recent announcements</p>
                            )}
                            {announcements.map((ann: any) => (
                                <div key={ann.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{ann.title}</p>
                                        <p className="text-sm text-gray-500">{new Date(ann.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ann.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {ann.priority}
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
