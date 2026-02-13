import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Layout } from '@/components/layout/Layout';
import { DollarSign, CheckCircle, Clock, Search, User, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Modal } from '@/components/common';
import { SalaryPaymentService, UserService } from '@/services/supabase.service';
import { SalaryPayment, User as UserType } from '@/types';
import toast from 'react-hot-toast';

export const AdminSalaryPage: React.FC = () => {
    const { user: currentUser } = useAuthStore();
    const [payments, setPayments] = useState<SalaryPayment[]>([]);
    const [employees, setEmployees] = useState<UserType[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    useEffect(() => {
        if (currentUser?.societyId) {
            loadInitialData();
        }
    }, [currentUser]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [paymentsData, guardsData] = await Promise.all([
                SalaryPaymentService.getSalaryPayments(undefined, currentUser?.societyId),
                UserService.getUsers(currentUser?.societyId!)
            ]);

            setPayments(paymentsData as SalaryPayment[]);
            // Filter both security and staff roles
            setEmployees((guardsData as UserType[]).filter((u: UserType) => ['security', 'staff'].includes(u.role)));
        } catch (error) {
            console.error('Error loading admin salary data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleDirectPayment = async (formData: any) => {
        if (!currentUser?.societyId) return;
        try {
            setLoading(true);
            await SalaryPaymentService.createSalaryRequest({
                societyId: currentUser.societyId,
                guardId: formData.employeeId,
                amount: formData.amount,
                month: formData.month,
                status: 'paid',
                requestedAt: new Date().toISOString(),
                paidAt: new Date().toISOString(),
                approvedAt: new Date().toISOString(),
                approvedBy: currentUser.uid,
                notes: formData.notes
            });
            toast.success('Salary payment recorded successfully');
            setShowPaymentModal(false);
            loadInitialData();
        } catch (error) {
            toast.error('Failed to process payment');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSalary = async (paymentId: string) => {
        if (!window.confirm('Are you sure you want to delete this salary record?')) return;
        try {
            await SalaryPaymentService.deleteSalaryPayment(paymentId);
            toast.success('Salary record deleted');
            loadInitialData();
        } catch (error) {
            toast.error('Failed to delete record');
        }
    };

    const handleApprove = async (paymentId: string) => {
        try {
            await SalaryPaymentService.updateSalaryPayment(paymentId, {
                status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: currentUser?.uid
            });
            toast.success('Salary request approved');
            loadInitialData();
        } catch (error) {
            toast.error('Failed to approve request');
        }
    };

    const handleMarkPaid = async (paymentId: string) => {
        const notes = prompt('Enter payment reference or notes:');
        try {
            await SalaryPaymentService.updateSalaryPayment(paymentId, {
                status: 'paid',
                paid_at: new Date().toISOString(),
                notes: notes || undefined
            });
            toast.success('Salary marked as paid');
            loadInitialData();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const getEmployeeName = (employeeId: string) => {
        const employee = employees.find((e: UserType) => e.uid === employeeId);
        return employee ? employee.name : 'Unknown Employee';
    };

    const filteredPayments = payments.filter((p: SalaryPayment) => {
        const statusMatch = filterStatus === 'all' || p.status === filterStatus;
        const employeeName = getEmployeeName(p.guardId).toLowerCase();
        const searchMatch = employeeName.includes(searchQuery.toLowerCase()) ||
            p.month.includes(searchQuery);
        return statusMatch && searchMatch;
    });

    const formatMonth = (month: string) => {
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-blue-100 text-blue-800',
            paid: 'bg-green-100 text-green-800'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    if (loading) {
        return (
            <Layout>
                <div className="p-8 text-center text-gray-500 flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mr-2"></div>
                    Loading salary management...
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Salary Management</h1>
                        <p className="text-gray-600">Review and process employee and staff salary requests</p>
                    </div>
                    <Button onClick={() => setShowPaymentModal(true)}>
                        <Plus size={20} className="mr-2" />
                        Pay Salary
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Pending Requests</p>
                                <p className="text-2xl font-bold">{payments.filter(p => p.status === 'pending').length}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Approved</p>
                                <p className="text-2xl font-bold">{payments.filter(p => p.status === 'approved').length}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                                <DollarSign size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Paid (Month)</p>
                                <p className="text-2xl font-bold">
                                    ₹{payments
                                        .filter((p: SalaryPayment) => p.status === 'paid')
                                        .reduce((acc: number, curr: SalaryPayment) => acc + curr.amount, 0)
                                        .toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by name or month..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-primary-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-4 py-2 border rounded-lg focus:ring-primary-500"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="paid">Paid</option>
                    </select>
                </div>

                {/* Table */}
                <Card className="overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-4 text-sm font-medium text-gray-500">Employee</th>
                                <th className="px-6 py-4 text-sm font-medium text-gray-500">Month</th>
                                <th className="px-6 py-4 text-sm font-medium text-gray-500">Amount</th>
                                <th className="px-6 py-4 text-sm font-medium text-gray-500">Requested On</th>
                                <th className="px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                                <th className="px-6 py-4 text-sm font-medium text-gray-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredPayments.map((payment) => (
                                <tr key={payment.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                                <User size={16} className="text-gray-500" />
                                            </div>
                                            <div>
                                                <div className="font-medium">{getEmployeeName(payment.guardId)}</div>
                                                <div className="text-xs text-gray-500 capitalize">
                                                    {employees.find(e => e.uid === payment.guardId)?.role || 'Staff'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">{formatMonth(payment.month)}</td>
                                    <td className="px-6 py-4 font-semibold text-gray-900">₹{payment.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(payment.requestedAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">{getStatusBadge(payment.status)}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        {payment.status === 'pending' && (
                                            <Button size="sm" onClick={() => handleApprove(payment.id)}>
                                                Approve
                                            </Button>
                                        )}
                                        {payment.status === 'approved' && (
                                            <Button size="sm" variant="secondary" onClick={() => handleMarkPaid(payment.id)}>
                                                Mark Paid
                                            </Button>
                                        )}
                                        {payment.status === 'paid' && (
                                            <span className="text-xs text-green-600 font-medium mr-2">Paid on {new Date(payment.paidAt!).toLocaleDateString()}</span>
                                        )}
                                        <button
                                            onClick={() => handleDeleteSalary(payment.id)}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center"
                                            title="Delete Record"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredPayments.length === 0 && (
                        <div className="p-8 text-center text-gray-500 italic">No salary requests found matching filters.</div>
                    )}
                </Card>

                {showPaymentModal && (
                    <DirectPaymentModal
                        isOpen={showPaymentModal}
                        onClose={() => setShowPaymentModal(false)}
                        onSubmit={handleDirectPayment}
                        employees={employees}
                    />
                )}
            </div>
        </Layout>
    );
};

const DirectPaymentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    employees: UserType[];
}> = ({ isOpen, onClose, onSubmit, employees }) => {
    const [formData, setFormData] = useState({
        employeeId: '',
        amount: 0,
        month: new Date().toISOString().substring(0, 7), // YYYY-MM
        notes: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Direct Salary Payment">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Select Employee</label>
                    <select
                        className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                        value={formData.employeeId}
                        onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                        required
                    >
                        <option value="">Select an employee...</option>
                        {/* Grouping by role */}
                        <optgroup label="Security Guards">
                            {employees.filter(e => e.role === 'security').map(emp => (
                                <option key={emp.uid} value={emp.uid}>
                                    {emp.name}
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label="Society Staff">
                            {employees.filter(e => e.role === 'staff').map(emp => (
                                <option key={emp.uid} value={emp.uid}>
                                    {emp.name}
                                </option>
                            ))}
                        </optgroup>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
                        <input
                            type="number"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                            value={formData.amount === 0 ? '' : formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Salary Month</label>
                        <input
                            type="month"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                            value={formData.month}
                            onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Notes / Reference</label>
                    <textarea
                        className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                        rows={3}
                        placeholder="Payment details (e.g., Cash, UTR No.)"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                </div>

                <div className="flex gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button type="submit" className="flex-1">Record Payment</Button>
                </div>
            </form>
        </Modal>
    );
};
