import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
    Users,
    Camera,
    AlertCircle,
    DollarSign,
    Megaphone,
    ShieldCheck,
    MapPin
} from 'lucide-react';
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

            // Fetch Data in parallel for better performance
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

            const pendingSalaryCount = salaryRequests.filter((s: any) =>
                s.status === 'pending'
            ).length;

            const activeCamerasCount = (cameras as any[]).filter((c: any) => c.isActive).length;

            setRecentVisitors(visitors.slice(0, 4));
            setRecentComplaints(complaints.filter((c: any) => c.status !== 'resolved').slice(0, 3));
            setAnnouncements(announcementsData.slice(0, 3));

            setStats({
                visitorsToday: visitorsTodayCount,
                activeComplaints: activeComplaintsCount,
                pendingSalary: pendingSalaryCount,
                activeCameras: activeCamerasCount,
                totalCameras: (cameras as any[]).length
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
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
                        <p className="text-gray-600 mt-1">Society monitoring and access control</p>
                    </div>
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-medium text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p className="text-xs text-primary-600 font-bold uppercase tracking-wider">Gate Active</p>
                    </div>
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
                        title="CCTV Streams"
                        value={`${stats.activeCameras}/${stats.totalCameras} Online`}
                        icon={Camera}
                        color="purple"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sidebar: Quick Actions & Notices */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card title="Quick Actions">
                            <div className="space-y-3">
                                <Button
                                    variant="secondary"
                                    className="w-full justify-start gap-3 h-auto py-3 bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100"
                                    onClick={() => navigate('/visitors')}
                                >
                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                        <Users size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-sm">New Visitor</p>
                                        <p className="text-[10px] opacity-70 italic">Register gateway entry</p>
                                    </div>
                                </Button>

                                <Button
                                    variant="secondary"
                                    className="w-full justify-start gap-3 h-auto py-3 bg-red-50 border-red-100 text-red-700 hover:bg-red-100"
                                    onClick={() => navigate('/emergencies')}
                                >
                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                        <ShieldCheck size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-sm">Emergency Info</p>
                                        <p className="text-[10px] opacity-70 italic">Critical contacts</p>
                                    </div>
                                </Button>

                                <Button
                                    variant="secondary"
                                    className="w-full justify-start gap-3 h-auto py-3 bg-purple-50 border-purple-100 text-purple-700 hover:bg-purple-100"
                                    onClick={() => navigate('/cctv')}
                                >
                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                        <Camera size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-sm">CCTV Monitor</p>
                                        <p className="text-[10px] opacity-70 italic">Live feed status</p>
                                    </div>
                                </Button>
                            </div>
                        </Card>

                        <Card title="Latest Notices" actions={
                            <button onClick={() => navigate('/announcements')} className="text-xs text-primary-600 font-bold hover:underline">View All</button>
                        }>
                            <div className="space-y-4">
                                {announcements.length === 0 && (
                                    <p className="text-gray-500 text-center py-4 text-xs italic">No recent notices</p>
                                )}
                                {announcements.map((ann) => (
                                    <div key={ann.id} className="border-l-4 border-primary-500 pl-3 py-1">
                                        <p className="text-sm font-bold text-gray-900 truncate">{ann.title}</p>
                                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{ann.content}</p>
                                        <p className="text-[10px] text-gray-400 mt-2 font-mono uppercase tracking-tighter">
                                            {new Date(ann.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Main Feed: Visitors & Complaints */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card title="Recent Activity" subtitle="Today's visitors" actions={
                            <Button variant="secondary" size="sm" onClick={() => navigate('/visitors')}>View History</Button>
                        }>
                            <div className="space-y-3">
                                {recentVisitors.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        <Users className="mx-auto text-gray-300 mb-2 opacity-20" size={48} />
                                        <p className="text-gray-400 text-sm">No visitor movements registered today</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {recentVisitors.map((visitor: any) => (
                                            <div key={visitor.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-primary-200 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center font-bold text-primary-600">
                                                        {visitor.name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-gray-900">{visitor.name}</p>
                                                        <p className="text-[11px] text-gray-500">{visitor.purpose}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded shadow-sm inline-block">
                                                        {visitor.entryTime ? new Date(visitor.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-1">Flat {visitor.flatId}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>

                        <Card title="Unresolved Complaints" subtitle="Needs security attention" actions={
                            <Button variant="secondary" size="sm" onClick={() => navigate('/complaints')}>Go to Hub</Button>
                        }>
                            <div className="space-y-3">
                                {recentComplaints.length === 0 ? (
                                    <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        <AlertCircle className="mx-auto text-gray-300 mb-2 opacity-20" size={48} />
                                        <p className="text-gray-400 text-sm italic">All clear! No active complaints.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {recentComplaints.map((complaint: any) => (
                                            <div key={complaint.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                                                        <Megaphone size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-gray-900 truncate">{complaint.title}</p>
                                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                                            <MapPin size={10} /> Flat {complaint.flatId}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`
                                                    px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap
                                                    ${complaint.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}
                                                `}>
                                                    {complaint.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
