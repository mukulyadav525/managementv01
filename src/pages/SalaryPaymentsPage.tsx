import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Layout } from '@/components/layout/Layout';
import { DollarSign, CheckCircle, Clock, Plus, FileText } from 'lucide-react';
import { Button, Card, Modal } from '@/components/common';
import { SalaryPaymentService } from '@/services/supabase.service';
import { SalaryPayment } from '@/types';
import { SalaryReceiptModal } from '@/components/payments/SalaryReceiptModal';
import toast from 'react-hot-toast';

export const SalaryPaymentsPage: React.FC = () => {
    const { user } = useAuthStore();
    const [payments, setPayments] = useState<SalaryPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<SalaryPayment | null>(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);

    useEffect(() => {
        if (user?.uid) {
            loadPayments();
        }
    }, [user]);

    const loadPayments = async () => {
        try {
            setLoading(true);
            const data = await SalaryPaymentService.getSalaryPayments(user?.uid);
            setPayments(data as SalaryPayment[]);
        } catch (error) {
            console.error('Error loading salary payments:', error);
            toast.error('Failed to load salary history');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestSalary = async (formData: any) => {
        try {
            await SalaryPaymentService.createSalaryRequest({
                guardId: user?.uid,
                societyId: user?.societyId,
                amount: formData.amount,
                month: formData.month,
                status: 'pending',
                requestedAt: new Date().toISOString()
            });
            toast.success('Salary request submitted successfully');
            setShowRequestModal(false);
            loadPayments();
        } catch (error) {
            toast.error('Failed to submit request');
        }
    };

    const handleViewReceipt = (payment: SalaryPayment) => {
        setSelectedPayment(payment);
        setShowReceiptModal(true);
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 text-green-700';
            case 'approved':
                return 'bg-blue-100 text-blue-700';
            default:
                return 'bg-yellow-100 text-yellow-700';
        }
    };

    const formatMonth = (month: string) => {
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Salary & Payments</h1>
                        <p className="text-gray-600">View your salary history and request payments</p>
                    </div>
                    <Button onClick={() => setShowRequestModal(true)}>
                        <Plus size={20} className="mr-2" />
                        Request Salary
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                <DollarSign size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Paid</p>
                                <p className="text-2xl font-bold">
                                    ₹{payments
                                        .filter(p => p.status === 'paid')
                                        .reduce((acc, curr) => acc + curr.amount, 0)
                                        .toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Pending Requests</p>
                                <p className="text-2xl font-bold">
                                    {payments.filter(p => p.status !== 'paid').length}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Last Payment</p>
                                <p className="text-xl font-bold truncate">
                                    {payments.find(p => p.status === 'paid')?.month
                                        ? formatMonth(payments.find(p => p.status === 'paid')!.month)
                                        : 'No payments yet'}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Payment History */}
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-4 text-sm font-medium text-gray-500">Month</th>
                                    <th className="px-6 py-4 text-sm font-medium text-gray-500">Amount</th>
                                    <th className="px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                                    <th className="px-6 py-4 text-sm font-medium text-gray-500">Requested Date</th>
                                    <th className="px-6 py-4 text-sm font-medium text-gray-500">Payment Date</th>
                                    <th className="px-6 py-4 text-sm font-medium text-gray-500 text-right">Receipt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {payments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium">{formatMonth(payment.month)}</td>
                                        <td className="px-6 py-4 font-semibold text-gray-900">₹{payment.amount.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusStyle(payment.status)}`}>
                                                {payment.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(payment.requestedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {payment.status === 'paid' && (
                                                <button
                                                    onClick={() => handleViewReceipt(payment)}
                                                    className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                                                >
                                                    <FileText size={16} />
                                                    View Receipt
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {payments.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-gray-500 italic">
                                            No payment history found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {showRequestModal && (
                    <SalaryRequestModal
                        isOpen={showRequestModal}
                        onClose={() => setShowRequestModal(false)}
                        onSubmit={handleRequestSalary}
                    />
                )}

                {showReceiptModal && selectedPayment && user && (
                    <SalaryReceiptModal
                        isOpen={showReceiptModal}
                        onClose={() => setShowReceiptModal(false)}
                        payment={selectedPayment}
                        employee={user}
                    />
                )}
            </div>
        </Layout>
    );
};

const SalaryRequestModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        amount: 0,
        month: new Date().toISOString().substring(0, 7)
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Request Salary Payment">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Amount Requested (₹)</label>
                    <input
                        type="number"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                        value={formData.amount === 0 ? '' : formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                        placeholder="e.g. 15000"
                        required
                    />
                </div>
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Month</label>
                    <input
                        type="month"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                        value={formData.month}
                        onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                        required
                    />
                </div>
                <div className="flex gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button type="submit" className="flex-1">Submit Request</Button>
                </div>
            </form>
        </Modal>
    );
};
