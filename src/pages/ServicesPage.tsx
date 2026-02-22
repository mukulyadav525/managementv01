import React, { useEffect, useState } from 'react';
import { Wrench, Plus, Search, Edit2, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button, Card, StatsCard } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { ServiceRequestService, SocietyService } from '@/services/supabase.service';
import { ServiceRequest, Flat } from '@/types';
import { ServiceRequestModal } from '@/components/services/ServiceRequestModal';
import toast from 'react-hot-toast';

export const ServicesPage: React.FC = () => {
    const { user } = useAuthStore();
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [flats, setFlats] = useState<Flat[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | undefined>();

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        if (!user?.societyId) return;
        try {
            setLoading(true);
            const [reqsData, flatsData] = await Promise.all([
                ServiceRequestService.getRequests(user.societyId,
                    (user.role === 'admin' || user.role === 'staff') ? undefined : { requesterId: user.uid }
                ),
                SocietyService.getFlats(user.societyId)
            ]);
            setRequests(reqsData as ServiceRequest[]);
            setFlats(flatsData as Flat[]);
        } catch (error) {
            console.error('Error loading service requests:', error);
            toast.error('Failed to load services data');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to cancel this request?')) return;
        try {
            await ServiceRequestService.deleteRequest(id);
            toast.success('Request cancelled');
            loadData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to cancel request');
        }
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await ServiceRequestService.updateRequest(id, { status });
            toast.success('Status updated');
            loadData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update status');
        }
    };

    const getFlatNumber = (flatId: string) => {
        const flat = flats.find(f => f.id === flatId);
        return flat ? `Flat ${flat.flatNumber}` : 'Unknown';
    };

    const filteredRequests = requests.filter(req =>
        req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getFlatNumber(req.flatId).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        inProgress: requests.filter(r => r.status === 'in_progress').length,
        resolved: requests.filter(r => r.status === 'resolved').length
    };

    const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
                        <p className="text-gray-600 mt-1">Request and track maintenance services</p>
                    </div>
                    {user?.role !== 'security' && (
                        <Button
                            onClick={() => {
                                setSelectedRequest(undefined);
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Request Service
                        </Button>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCard title="Total Requests" value={stats.total} icon={Wrench} color="blue" />
                    <StatsCard title="Pending" value={stats.pending} icon={AlertCircle} color="yellow" />
                    <StatsCard title="In Progress" value={stats.inProgress} icon={Clock} color="purple" />
                    <StatsCard title="Resolved" value={stats.resolved} icon={CheckCircle} color="green" />
                </div>

                <Card>
                    <div className="p-4 border-b border-gray-100">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search requests..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-900">Request Details</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-900">Residence</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-900">Preferred Time</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-900">Status</th>
                                    <th className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                                            Loading requests...
                                        </td>
                                    </tr>
                                ) : filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            No service requests found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map((req) => (
                                        <tr key={req.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-gray-900">{req.title}</p>
                                                    <p className="text-xs text-gray-500 capitalize">{req.category}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {getFlatNumber(req.flatId)}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {req.preferredTime || 'Not specified'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${req.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                                        req.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
                                                            req.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                                'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {req.status.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {isAdminOrStaff && req.status !== 'resolved' && (
                                                        <select
                                                            className="text-xs border rounded p-1"
                                                            value={req.status}
                                                            onChange={(e) => handleStatusUpdate(req.id, e.target.value)}
                                                        >
                                                            <option value="pending">Pending</option>
                                                            <option value="in_progress">In Progress</option>
                                                            <option value="resolved">Resolved</option>
                                                        </select>
                                                    )}
                                                    {(user?.uid === req.requesterId || isAdminOrStaff) && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedRequest(req);
                                                                    setIsModalOpen(true);
                                                                }}
                                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(req.id)}
                                                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <ServiceRequestModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadData}
                request={selectedRequest}
            />
        </Layout>
    );
};
