import React, { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Home
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { StatsCard, Card } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import {
  PaymentService,
  ComplaintService,
  VisitorService,
  SocietyService
} from '@/services/supabase.service';
import { TenantKYC } from '@/components/tenant/TenantKYC';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalFlats: 0,
    occupiedFlats: 0,
    pendingPayments: 0,
    openComplaints: 0,
    todayVisitors: 0,
    totalRevenue: 0
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

      // Load payments
      const paymentsData = await PaymentService.getPayments(user.societyId);
      setPayments(paymentsData);
      const pendingPayments = paymentsData.filter((p: any) => p.status === 'pending').length;
      const totalRevenue = paymentsData
        .filter((p: any) => p.status === 'paid')
        .reduce((sum: number, p: any) => sum + p.amount, 0);

      // Load complaints
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
      const occupiedFlats = flats.filter((f: any) => f.occupancyStatus !== 'vacant').length;

      setStats({
        totalFlats,
        occupiedFlats,
        pendingPayments,
        openComplaints: openComplaintsCount,
        todayVisitors,
        totalRevenue
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
        </div>

        {/* KYC Section for Tenants */}
        {user?.role === 'tenant' && <TenantKYC />}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsCard
            title="Total Flats"
            value={stats.totalFlats}
            icon={Home}
            color="blue"
            trend={{ value: 0, isPositive: true }}
          />
          <StatsCard
            title="Occupied Flats"
            value={stats.occupiedFlats}
            icon={Building2}
            color="green"
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
            icon={Users}
            color="purple"
          />
          <StatsCard
            title="Total Revenue"
            value={`₹${stats.totalRevenue.toLocaleString()}`}
            icon={TrendingUp}
            color="green"
          />
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Recent Payments" subtitle="Last 5 transactions">
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
                    <p className="text-xs text-gray-500">{payment.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Open Complaints" subtitle="Requires attention">
            <div className="space-y-3">
              {stats.openComplaints === 0 && (
                <p className="text-gray-500 text-center py-4">No open complaints</p>
              )}
              {complaints
                .filter((c: any) => c.status === 'open' || c.status === 'in-progress')
                .slice(0, 5)
                .map((complaint: any) => (
                  <div key={complaint.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{complaint.title}</p>
                      <p className="text-sm text-gray-500">Flat {complaint.flatId}</p>
                    </div>
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-medium
                      ${complaint.priority === 'high' ? 'bg-red-100 text-red-700' : ''}
                      ${complaint.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : ''}
                      ${complaint.priority === 'low' ? 'bg-blue-100 text-blue-700' : ''}
                    `}>
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
