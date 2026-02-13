import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Layout } from '@/components/layout/Layout';
import { DollarSign, Calendar, CheckCircle, Clock } from 'lucide-react';
import { Button, Input, Modal } from '@/components/common';
import { SalaryPaymentService } from '@/services/supabase.service';
import { SalaryPayment } from '@/types';
import toast from 'react-hot-toast';

export const SalaryPaymentsPage: React.FC = () => {
    const { user } = useAuthStore();
    const [payments, setPayments] = useState<SalaryPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestForm, setRequestForm] = useState({
        amount: '',
        month: '',
        notes: ''
    });

    useEffect(() => {
        loadPayments();
    }, [user]);

    const loadPayments = async () => {
        if (!user?.uid) return;

        try {
            setLoading(true);
            const data = await SalaryPaymentService.getSalaryPayments(user.uid) as SalaryPayment[];
            setPayments(data);
        } catch (error) {
            console.error('Error loading salary payments:', error);
            toast.error('Failed to load salary payments');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestSalary = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.uid || !user?.societyId) return;

        try {
            await SalaryPaymentService.createSalaryRequest({
                guard_id: user.uid,
                society_id: user.societyId,
                amount: parseFloat(requestForm.amount),
                month: requestForm.month,
                notes: requestForm.notes,
                status: 'pending'
            });

            toast.success('Salary request submitted successfully!');
            setShowRequestModal(false);
            setRequestForm({ amount: '', month: '', notes: '' });
            loadPayments();
        } catch (error) {
            console.error('Error requesting salary:', error);
            toast.error('Failed to submit salary request');
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-blue-100 text-blue-800',
            paid: 'bg-green-100 text-green-800'
        };

        const icons = {
            pending: Clock,
            approved: CheckCircle,
            paid: CheckCircle
        };

        const Icon = icons[status as keyof typeof icons] || Clock;

        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles]}`}>
                <Icon className="w-4 h-4" />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const formatMonth = (month: string) => {
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading salary payments...</div>
            </div>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Salary Payments</h1>
                        <p className="text-gray-600 mt-1">Manage your salary requests and payment history</p>
                    </div>
                    <Button onClick={() => setShowRequestModal(true)}>
                        <DollarSign className="w-4 h-4 mr-2" />
                        Request Salary
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Pending Requests</p>
                                <p className="text-2xl font-bold mt-1">
                                    {payments.filter(p => p.status === 'pending').length}
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-yellow-50">
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Approved</p>
                                <p className="text-2xl font-bold mt-1">
                                    {payments.filter(p => p.status === 'approved').length}
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-blue-50">
                                <CheckCircle className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Paid</p>
                                <p className="text-2xl font-bold mt-1">
                                    {payments.filter(p => p.status === 'paid').length}
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-green-50">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payments List */}
                <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b">
                        <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
                    </div>

                    {payments.length === 0 ? (
                        <div className="p-12 text-center">
                            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No salary requests yet</p>
                            <p className="text-sm text-gray-400 mt-1">Click "Request Salary" to submit your first request</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {payments.map((payment) => (
                                <div key={payment.id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4 mb-2">
                                                <h3 className="font-semibold text-gray-900">
                                                    ₹{payment.amount.toLocaleString()}
                                                </h3>
                                                {getStatusBadge(payment.status)}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {formatMonth(payment.month)}
                                                </span>
                                                <span>
                                                    Requested: {new Date(payment.requestedAt).toLocaleDateString()}
                                                </span>
                                                {payment.paidAt && (
                                                    <span className="text-green-600">
                                                        Paid: {new Date(payment.paidAt).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                            {payment.notes && (
                                                <p className="text-sm text-gray-500 mt-2">{payment.notes}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Request Salary Modal */}
                <Modal
                    isOpen={showRequestModal}
                    onClose={() => setShowRequestModal(false)}
                    title="Request Salary Payment"
                >
                    <form onSubmit={handleRequestSalary} className="space-y-4">
                        <Input
                            label="Amount"
                            type="number"
                            value={requestForm.amount}
                            onChange={(e) => setRequestForm({ ...requestForm, amount: e.target.value })}
                            required
                            placeholder="Enter amount"
                        />

                        <Input
                            label="Month"
                            type="month"
                            value={requestForm.month}
                            onChange={(e) => setRequestForm({ ...requestForm, month: e.target.value })}
                            required
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes (Optional)
                            </label>
                            <textarea
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                rows={3}
                                value={requestForm.notes}
                                onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                                placeholder="Add any additional notes..."
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setShowRequestModal(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1">
                                Submit Request
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </Layout>
    );
};
