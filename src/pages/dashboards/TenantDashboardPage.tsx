import React, { useEffect, useState } from 'react';
import {
    DollarSign,
    AlertCircle,
    UserCheck,
    Bell,
    FileText,
    Calendar
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { StatsCard, Card, Button } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import {
    PaymentService,
    ComplaintService,
    VisitorService
} from '@/services/supabase.service';
import { TenantKYC } from '@/components/tenant/TenantKYC';
import toast from 'react-hot-toast';

export const TenantDashboardPage: React.FC = () => {
    const { user } = useAuthStore();
    const [stats, setStats] = useState({
        pendingPayments: 0,
        myComplaints: 0,
        myVisitors: 0,
        nextDueDate: '',
        totalPaid: 0
    });
    const [payments, setPayments] = useState<any[]>([]);
    const [complaints, setComplaints] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadDashboardData();
        }
    }, [user]);

    const handleQuickPay = async (paymentId: string) => {
        try {
            await PaymentService.updatePaymentStatus(user!.societyId, paymentId, 'paid');
            toast.success('Payment successful!');
            loadDashboardData();
        } catch (error) {
            toast.error('Payment failed');
        }
    };

    const loadDashboardData = async () => {
        if (!user?.societyId || !user?.uid) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // Load tenant's payments
            const allPayments = await PaymentService.getPayments(user.societyId);
            const myPayments = allPayments.filter((p: any) => p.userId === user.uid);
            setPayments(myPayments);

            const pendingPayments = myPayments.filter((p: any) => p.status === 'pending').length;
            const totalPaid = myPayments
                .filter((p: any) => p.status === 'paid')
                .reduce((sum: number, p: any) => sum + p.amount, 0);

            // Find next due date
            const pendingWithDates = myPayments
                .filter((p: any) => p.status === 'pending' && p.dueDate)
                .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            const nextDueDate = pendingWithDates.length > 0
                ? new Date((pendingWithDates[0] as any).dueDate).toLocaleDateString()
                : 'None';

            // Load tenant's complaints
            const allComplaints = await ComplaintService.getComplaints(user.societyId);
            const myComplaints = allComplaints.filter((c: any) => c.raisedBy === user.uid);
            setComplaints(myComplaints);

            const openComplaints = myComplaints.filter(
                (c: any) => c.status === 'open' || c.status === 'in-progress'
            ).length;

            // Load tenant's visitors
            const allVisitors = await VisitorService.getVisitors(user.societyId);
            const myVisitors = allVisitors.filter((v: any) =>
                user.flatIds && user.flatIds.includes(v.flatId)
            );
            const thisMonth = new Date().getMonth();
            const thisYear = new Date().getFullYear();
            const monthVisitors = myVisitors.filter((v: any) => {
                if (!v.entryTime) return false;
                const visitDate = new Date(v.entryTime);
                return visitDate.getMonth() === thisMonth && visitDate.getFullYear() === thisYear;
            }).length;

            setStats({
                pendingPayments,
                myComplaints: openComplaints,
                myVisitors: monthVisitors,
                nextDueDate,
                totalPaid
            });
        } catch (error) {
            console.error('Error loading tenant dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[400px]">
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
                    <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
                    <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
                </div>

                {/* KYC Section */}
                <TenantKYC />

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatsCard
                        title="Pending Payments"
                        value={stats.pendingPayments}
                        icon={DollarSign}
                        color="yellow"
                    />
                    <StatsCard
                        title="My Complaints"
                        value={stats.myComplaints}
                        icon={AlertCircle}
                        color="red"
                    />
                    <StatsCard
                        title="This Month's Visitors"
                        value={stats.myVisitors}
                        icon={UserCheck}
                        color="blue"
                    />
                    <StatsCard
                        title="Next Due Date"
                        value={stats.nextDueDate}
                        icon={Calendar}
                        color="yellow"
                    />
                    <StatsCard
                        title="Total Paid"
                        value={`₹${stats.totalPaid.toLocaleString()}`}
                        icon={FileText}
                        color="green"
                    />
                    <StatsCard
                        title="Announcements"
                        value="View All"
                        icon={Bell}
                        color="purple"
                    />
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Recent Payments" subtitle="Your payment history">
                        <div className="space-y-3">
                            {payments.length === 0 && (
                                <p className="text-gray-500 text-center py-4">No payments recorded</p>
                            )}
                            {payments.slice(0, 5).map((payment: any) => (
                                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900 capitalize">{payment.type}</p>
                                        <p className="text-sm text-gray-500">
                                            {payment.dueDate
                                                ? `Due: ${new Date(payment.dueDate).toLocaleDateString()}`
                                                : 'No due date'
                                            }
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-semibold ${payment.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                                            ₹{payment.amount.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-500 capitalize">{payment.status}</p>
                                    </div>
                                    {payment.status === 'pending' && (
                                        <Button
                                            size="sm"
                                            className="ml-4"
                                            onClick={() => handleQuickPay(payment.id)}
                                        >
                                            Pay Now
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title="My Complaints" subtitle="Track your complaints">
                        <div className="space-y-3">
                            {complaints.length === 0 && (
                                <p className="text-gray-500 text-center py-4">No complaints raised</p>
                            )}
                            {complaints.slice(0, 5).map((complaint: any) => (
                                <div key={complaint.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900">{complaint.title}</p>
                                        <p className="text-sm text-gray-500 capitalize">{complaint.category || 'General'}</p>
                                    </div>
                                    <span className={`
                        px-3 py-1 rounded-full text-xs font-medium
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
