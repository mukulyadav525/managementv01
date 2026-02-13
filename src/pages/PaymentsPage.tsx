import React, { useEffect, useState } from 'react';
import { Download, CreditCard, Plus, Trash2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button, Card, Modal } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { PaymentService } from '@/services/supabase.service';
import { Payment } from '@/types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '@/config/supabase';
import { toSnake } from '@/services/supabase.service';
import { Input } from '@/components/common';

export const PaymentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

  useEffect(() => {
    if (user?.societyId) {
      loadPayments();
    }
  }, [user]);

  const loadPayments = async () => {
    if (!user?.societyId) return;

    try {
      setLoading(true);
      const flatId = user.role === 'admin' ? undefined : user.flatIds?.[0];
      const data = await PaymentService.getPayments(user.societyId, flatId);
      setPayments(data as Payment[]);
    } catch (error) {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (paymentId: string) => {
    if (!user?.societyId) return;

    try {
      await PaymentService.updatePaymentStatus(user.societyId, paymentId, 'paid');
      toast.success('Payment successful!');
      loadPayments();
      setShowPaymentModal(false);
    } catch (error) {
      toast.error('Payment failed');
    }
  };

  const handleGenerateBills = async (formData: any) => {
    if (!user?.societyId) return;
    try {
      const { data: flats, error: flatsError } = await supabase
        .from('flats')
        .select('id, owner_id, occupancy_status')
        .eq('society_id', user.societyId);

      if (flatsError) throw flatsError;

      const bills = flats.map(flat => ({
        societyId: user.societyId,
        flatId: flat.id,
        userId: flat.owner_id, // Default to owner
        amount: formData.amount,
        type: formData.type,
        month: formData.month,
        dueDate: formData.dueDate,
        status: 'pending',
        createdAt: new Date().toISOString()
      }));

      const { error } = await supabase.from('payments').insert(toSnake(bills));
      if (error) throw error;

      toast.success(`Bills generated for ${flats.length} flats`);
      setShowBillModal(false);
      loadPayments();
    } catch (error) {
      toast.error('Failed to generate bills');
    }
  };

  const handleDelete = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;
    try {
      const { error } = await supabase.from('payments').delete().eq('id', paymentId);
      if (error) throw error;
      toast.success('Payment record deleted');
      loadPayments();
    } catch (error) {
      toast.error('Failed to delete payment');
    }
  };

  const filteredPayments = payments.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'overdue') {
      return p.status === 'pending' && new Date(p.dueDate) < new Date();
    }
    return p.status === filter;
  });

  const getTotalAmount = (status?: string) => {
    const filtered = status
      ? payments.filter(p => p.status === status)
      : payments;
    return filtered.reduce((sum, p) => sum + p.amount, 0);
  };

  const getStatusColor = (payment: Payment) => {
    if (payment.status === 'paid') return 'bg-green-100 text-green-700';
    if (new Date(payment.dueDate) < new Date()) return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-600 mt-1">Manage rent and maintenance payments</p>
          </div>
          <div className="flex gap-2">
            {user?.role === 'admin' && (
              <Button onClick={() => setShowBillModal(true)}>
                <Plus size={20} className="mr-2" />
                Generate Bills
              </Button>
            )}
            <Button variant="secondary">
              <Download size={20} className="mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <p className="text-sm text-gray-600">Total Collected</p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              ₹{getTotalAmount('paid').toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              ₹{getTotalAmount('pending').toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <p className="text-sm text-gray-600">Overdue</p>
            <p className="text-2xl font-bold text-red-600 mt-2">
              ₹{payments.filter(p => p.status === 'pending' && new Date(p.dueDate) < new Date())
                .reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <p className="text-sm text-gray-600">This Month</p>
            <p className="text-2xl font-bold text-primary-600 mt-2">
              ₹{payments.filter(p =>
                format(new Date(p.createdAt), 'MM-yyyy') === format(new Date(), 'MM-yyyy')
              ).reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {['all', 'pending', 'paid', 'overdue'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Payments Table */}
        <Card>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flat</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{payment.flatId}</div>
                        <div className="text-sm text-gray-500">{payment.month}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="capitalize text-gray-900">{payment.type}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-gray-900">₹{payment.amount.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(payment.dueDate), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(payment)}`}>
                          {payment.status === 'pending' && new Date(payment.dueDate) < new Date()
                            ? 'overdue'
                            : payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          {payment.status === 'pending' ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setShowPaymentModal(true);
                              }}
                            >
                              Pay Now
                            </Button>
                          ) : (
                            <button className="text-primary-600 hover:text-primary-700">
                              View Receipt
                            </button>
                          )}
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDelete(payment.id)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Payment Modal */}
        {selectedPayment && (
          <PaymentModal
            payment={selectedPayment}
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false);
              setSelectedPayment(null);
            }}
            onPay={() => handlePayment(selectedPayment.id)}
          />
        )}
        {/* Bill Generation Modal */}
        {showBillModal && (
          <GenerateBillModal
            isOpen={showBillModal}
            onClose={() => setShowBillModal(false)}
            onSubmit={handleGenerateBills}
          />
        )}
      </div>
    </Layout>
  );
};

// Payment Modal Component
const PaymentModal: React.FC<{
  payment: Payment;
  isOpen: boolean;
  onClose: () => void;
  onPay: () => void;
}> = ({ payment, isOpen, onClose, onPay }) => {
  const [paymentMethod, setPaymentMethod] = useState('upi');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Make Payment">
      <div className="space-y-6">
        {/* Payment Details */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Flat:</span>
            <span className="font-medium">{payment.flatId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Type:</span>
            <span className="font-medium capitalize">{payment.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Month:</span>
            <span className="font-medium">{payment.month}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2">
            <span className="text-gray-900 font-semibold">Amount:</span>
            <span className="text-xl font-bold text-primary-600">₹{payment.amount.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
          <div className="space-y-2">
            {['upi', 'card', 'netbanking'].map((method) => (
              <label
                key={method}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${paymentMethod === method
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method}
                  checked={paymentMethod === method}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="ml-3 capitalize">{method}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onPay} className="flex-1">
            Pay ₹{payment.amount.toLocaleString()}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const GenerateBillModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    type: 'maintenance',
    amount: '',
    month: format(new Date(), 'MMMM yyyy'),
    dueDate: format(new Date(), 'yyyy-MM-dd')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount)
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Society Bills">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bill Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
          >
            <option value="maintenance">Maintenance</option>
            <option value="rent">Rent</option>
            <option value="water">Water</option>
            <option value="electricity">Electricity</option>
            <option value="other">Other</option>
          </select>
        </div>
        <Input
          label="Amount per Flat (₹)"
          type="number"
          placeholder="e.g. 2500"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
        />
        <Input
          label="Month"
          placeholder="e.g. October 2023"
          value={formData.month}
          onChange={(e) => setFormData({ ...formData, month: e.target.value })}
          required
        />
        <Input
          label="Due Date"
          type="date"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          required
        />
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1">Generate for All</Button>
        </div>
      </form>
    </Modal>
  );
};
