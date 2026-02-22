import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Layout } from '@/components/layout/Layout';
import { DollarSign, CheckCircle, Clock, Search, User, Plus, Trash2, FileText } from 'lucide-react';
import { Button, Card, Modal } from '@/components/common';
import { SalaryPaymentService, UserService } from '@/services/supabase.service';
import { SalaryPayment, User as UserType } from '@/types';
import { SalaryReceiptModal } from '@/components/payments/SalaryReceiptModal';
import toast from 'react-hot-toast';

export const AdminSalaryPage: React.FC = () => {
    const { user: currentUser } = useAuthStore();
    const [payments, setPayments] = useState<SalaryPayment[]>([]);
    const [employees, setEmployees] = useState<UserType[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<SalaryPayment | null>(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [receiptEmployee, setReceiptEmployee] = useState<UserType | null>(null);

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

    const handleDirectPayment = async (paymentId: string | null, formData: any) => {
        if (!currentUser?.societyId) return;

        const processPaymentUpdate = async (method: string, txId: string) => {
            if (paymentId) {
                await SalaryPaymentService.updateSalaryPayment(paymentId, {
                    status: 'paid',
                    paidAt: new Date().toISOString(),
                    paymentMethod: method,
                    transactionId: txId,
                    notes: formData.notes
                });
            } else {
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
                    paymentMethod: method,
                    transactionId: txId,
                    notes: formData.notes
                });
            }
        };

        if (formData.paymentMethod === 'bypass') {
            try {
                setLoading(true);
                await processPaymentUpdate('bypass', `MOCK_SALARY_${Date.now()}`);
                toast.success('Salary payment recorded successfully (Bypass)');
                setShowPaymentModal(false);
                loadInitialData();
            } catch (error) {
                toast.error('Failed to process payment');
            } finally {
                setLoading(false);
            }
            return;
        }

        // Razorpay logic
        const rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (!rzpKey || rzpKey === 'rzp_test_placeholder') {
            toast.error('Razorpay API Key missing. Please use Bypass or configure Netlify.');
            return;
        }

        if (isNaN(formData.amount) || formData.amount <= 0) {
            toast.error('Invalid salary amount');
            return;
        }

        const employee = employees.find(e => e.uid === formData.employeeId);

        const options = {
            key: rzpKey,
            amount: Math.round(formData.amount * 100),
            currency: 'INR',
            name: 'Smart Society',
            description: `Salary Payment - ${formData.month}`,
            handler: async function (response: any) {
                try {
                    console.log('Razorpay salary payment success:', response);
                    setLoading(true);
                    await processPaymentUpdate('razorpay', response.razorpay_payment_id);
                    toast.success('Salary paid successfully via Razorpay');
                    setShowPaymentModal(false);
                    await loadInitialData();
                } catch (error) {
                    console.error('Error updating salary status:', error);
                    toast.error('Payment successful, but failed to update status in database. Please contact support.');
                } finally {
                    setLoading(false);
                }
            },
            prefill: {
                name: employee?.name || 'Employee',
                email: employee?.email || '',
                contact: employee?.phone || ''
            },
            theme: { color: '#4f46e5' },
            modal: {
                ondismiss: function () {
                    console.log('Razorpay modal dismissed');
                }
            }
        };

        try {
            if (!(window as any).Razorpay) {
                throw new Error('Razorpay SDK not loaded. Please refresh the page.');
            }
            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                console.error('Razorpay salary payment failed:', response.error);
                toast.error(`Payment failed: ${response.error.description}`);
            });
            rzp.open();
        } catch (error: any) {
            console.error('Error opening Razorpay for salary:', error);
            toast.error(error.message || 'Could not initialize Razorpay. Please try again.');
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
                approvedAt: new Date().toISOString(),
                approvedBy: currentUser?.uid
            });
            toast.success('Salary request approved');
            loadInitialData();
        } catch (error) {
            toast.error('Failed to approve request');
        }
    };

    const handleViewReceipt = (payment: SalaryPayment) => {
        const employee = employees.find(e => e.uid === payment.guardId);
        if (employee) {
            setReceiptEmployee(employee);
            setSelectedPayment(payment);
            setShowReceiptModal(true);
        } else {
            toast.error('Employee details not found');
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
                    <Button onClick={() => {
                        setSelectedPayment(null);
                        setShowPaymentModal(true);
                    }}>
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
                                            <Button size="sm" variant="secondary" onClick={() => {
                                                setSelectedPayment(payment);
                                                setShowPaymentModal(true);
                                            }}>
                                                Pay Now
                                            </Button>
                                        )}
                                        {payment.status === 'paid' && (
                                            <div className="inline-flex items-center gap-2">
                                                <span className="text-xs text-green-600 font-medium">Paid on {new Date(payment.paidAt!).toLocaleDateString()}</span>
                                                <button
                                                    onClick={() => handleViewReceipt(payment)}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="View Receipt"
                                                >
                                                    <FileText size={16} />
                                                </button>
                                            </div>
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
                        onSubmit={(data) => handleDirectPayment(selectedPayment?.id || null, data)}
                        employees={employees}
                        initialData={selectedPayment ? {
                            employeeId: selectedPayment.guardId,
                            amount: selectedPayment.amount,
                            month: selectedPayment.month,
                            notes: selectedPayment.notes || ''
                        } : undefined}
                    />
                )}

                {showReceiptModal && selectedPayment && receiptEmployee && (
                    <SalaryReceiptModal
                        isOpen={showReceiptModal}
                        onClose={() => setShowReceiptModal(false)}
                        payment={selectedPayment}
                        employee={receiptEmployee}
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
    initialData?: {
        employeeId: string;
        amount: number;
        month: string;
        notes: string;
    }
}> = ({ isOpen, onClose, onSubmit, employees, initialData }) => {
    const [formData, setFormData] = useState({
        employeeId: initialData?.employeeId || '',
        amount: initialData?.amount || 0,
        month: initialData?.month || new Date().toISOString().substring(0, 7), // YYYY-MM
        notes: initialData?.notes || '',
        paymentMethod: 'razorpay'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Process Salary Payment" : "Direct Salary Payment"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Select Employee</label>
                    <select
                        className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                        value={formData.employeeId}
                        onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                        required
                        disabled={!!initialData}
                    >
                        <option value="">Select an employee...</option>
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
                            className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                            value={formData.amount === 0 ? '' : formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                            required
                            disabled={!!initialData}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Salary Month</label>
                        <input
                            type="month"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
                            value={formData.month}
                            onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                            required
                            disabled={!!initialData}
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <div className="grid grid-cols-2 gap-3">
                        {['razorpay', 'bypass'].map((method) => (
                            <label
                                key={method}
                                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${formData.paymentMethod === method
                                    ? 'border-indigo-600 bg-indigo-50'
                                    : 'border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    value={method}
                                    checked={formData.paymentMethod === method}
                                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                    className="w-4 h-4 text-indigo-600"
                                />
                                <span className="ml-3 text-sm font-medium capitalize">
                                    {method === 'bypass' ? 'Bypass (Mock)' : method}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Notes / Reference</label>
                    <textarea
                        className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                        rows={3}
                        placeholder="Payment details or internal notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                </div>

                <div className="flex gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button type="submit" className="flex-1">
                        {formData.paymentMethod === 'bypass' ? 'Record Payment' : 'Pay via Razorpay'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
