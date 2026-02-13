import React, { useEffect, useState } from 'react';
import {
    Building2,
    Users,
    DollarSign,
    AlertCircle,
    TrendingUp,
    Home,
    KeyRound
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { StatsCard, Card, Button } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import {
    PaymentService,
    ComplaintService,
    SocietyService
} from '@/services/supabase.service';

export const OwnerDashboardPage: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [myFlats, setMyFlats] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalProperties: 0,
        rentedProperties: 0,
        ownerOccupied: 0,
        pendingRentPayments: 0,
        tenantComplaints: 0,
        monthlyRentalIncome: 0
    });
    const [payments, setPayments] = useState<any[]>([]);
    const [complaints, setComplaints] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, [user]);

    const loadDashboardData = async () => {
        if (!user?.societyId || !user?.flatIds) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // Load buildings for name lookup
            const buildingsData = await SocietyService.getBuildings(user.societyId);
            const buildingMap = new Map(buildingsData.map((b: any) => [b.id, b.name]));

            // Load owner's flats
            const allFlats = await SocietyService.getFlats(user.societyId);
            const ownerFlats = allFlats.filter((f: any) => user.flatIds.includes(f.id));

            // Enrich flats with building name
            const enrichedFlats = ownerFlats.map((f: any) => ({
                ...f,
                buildingName: buildingMap.get(f.buildingId) || 'Unknown Building'
            }));
            setMyFlats(enrichedFlats);

            const totalProperties = ownerFlats.length;

            // Load payments for owner's properties
            const allPayments = await PaymentService.getPayments(user.societyId);
            const ownerPayments = allPayments.filter((p: any) => user.flatIds.includes(p.flatId));
            setPayments(ownerPayments);

            // Fetch actual tenants to verify occupancy status
            const allTenants = await SocietyService.getDocuments('users', (q) =>
                q.eq('society_id', user.societyId).eq('role', 'tenant')
            );

            // Map flats to occupancy status based on tenants
            const flatIds = ownerFlats.map((f: any) => f.id);
            const rentedFlatIds = new Set<string>();
            if (allTenants) {
                (allTenants as any[]).forEach((t: any) => {
                    if (t.flat_ids) {
                        t.flat_ids.forEach((fid: string) => {
                            if (flatIds.includes(fid)) {
                                rentedFlatIds.add(fid);
                            }
                        });
                    }
                });
            }

            const rentedProperties = rentedFlatIds.size; // Count based on actual tenants found
            const ownerOccupied = ownerFlats.filter((f: any) => f.occupancyStatus === 'owner-occupied').length;

            const pendingRentPayments = ownerPayments.filter(
                (p: any) => p.status === 'pending' && p.type === 'rent'
            ).length;

            const monthlyRentalIncome = ownerPayments
                .filter((p: any) => p.status === 'paid' && p.type === 'rent')
                .reduce((sum: number, p: any) => sum + p.amount, 0);

            // Load complaints for owner's properties
            const allComplaints = await ComplaintService.getComplaints(user.societyId);
            const ownerComplaints = allComplaints.filter((c: any) => user.flatIds.includes(c.flatId));
            setComplaints(ownerComplaints);

            const tenantComplaints = ownerComplaints.filter(
                (c: any) => c.status === 'open' || c.status === 'in-progress'
            ).length;

            setStats({
                totalProperties,
                rentedProperties,
                ownerOccupied,
                pendingRentPayments,
                tenantComplaints,
                monthlyRentalIncome
            });
        } catch (error) {
            console.error('Error loading owner dashboard:', error);
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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
                        <p className="text-gray-600 mt-1">Manage your properties and tenants</p>
                    </div>
                    <Button onClick={() => navigate('/owner/tenants')}>
                        <Users className="mr-2" size={18} />
                        Manage Tenants
                    </Button>
                </div>

                {/* My Properties Section */}
                <div className="grid grid-cols-1 gap-6">
                    <Card title="My Properties">
                        {myFlats.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No properties found</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {myFlats.map((flat) => (
                                    <div key={flat.id} className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">Flat {flat.flatNumber}</h3>
                                                <p className="text-sm text-gray-500">{flat.buildingName}</p>
                                            </div>
                                            <div className={`
                                                px-2 py-1 rounded text-xs font-medium capitalize
                                                ${flat.occupancyStatus === 'vacant' ? 'bg-red-100 text-red-700' : ''}
                                                ${flat.occupancyStatus === 'rented' ? 'bg-green-100 text-green-700' : ''}
                                                ${flat.occupancyStatus === 'owner-occupied' ? 'bg-blue-100 text-blue-700' : ''}
                                            `}>
                                                {flat.occupancyStatus.replace('-', ' ')}
                                            </div>
                                        </div>
                                        <div className="space-y-1 text-sm text-gray-600 mt-4">
                                            <div className="flex justify-between">
                                                <span>Floor:</span>
                                                <span className="font-medium">{flat.floor}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Area:</span>
                                                <span className="font-medium">{flat.area} sq ft</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Type:</span>
                                                <span className="font-medium">{flat.bhkType}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatsCard
                        title="Total Properties"
                        value={stats.totalProperties}
                        icon={Home}
                        color="blue"
                    />
                    <StatsCard
                        title="Rented Out"
                        value={stats.rentedProperties}
                        icon={KeyRound}
                        color="green"
                    />
                    <StatsCard
                        title="Owner Occupied"
                        value={stats.ownerOccupied}
                        icon={Building2}
                        color="purple"
                    />
                    <StatsCard
                        title="Pending Rent"
                        value={stats.pendingRentPayments}
                        icon={DollarSign}
                        color="yellow"
                    />
                    <StatsCard
                        title="Tenant Issues"
                        value={stats.tenantComplaints}
                        icon={AlertCircle}
                        color="red"
                    />
                    <StatsCard
                        title="Rental Income"
                        value={`₹${stats.monthlyRentalIncome.toLocaleString()}`}
                        icon={TrendingUp}
                        color="green"
                    />
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Recent Rent Payments" subtitle="From your tenants">
                        <div className="space-y-3">
                            {payments.filter((p: any) => p.type === 'rent').length === 0 && (
                                <p className="text-gray-500 text-center py-4">No rent payments recorded</p>
                            )}
                            {payments
                                .filter((p: any) => p.type === 'rent')
                                .slice(0, 5)
                                .map((payment: any) => (
                                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="font-medium text-gray-900">Flat {payment.flatId}</p>
                                            <p className="text-sm text-gray-500">
                                                {payment.paidDate
                                                    ? new Date(payment.paidDate).toLocaleDateString()
                                                    : 'Pending'
                                                }
                                            </p>
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

                    <Card title="Property Complaints" subtitle="From tenants">
                        <div className="space-y-3">
                            {complaints.filter((c: any) => c.status === 'open' || c.status === 'in-progress').length === 0 && (
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
