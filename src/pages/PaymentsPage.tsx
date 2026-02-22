import React, { useEffect, useState } from 'react';
import { Download, CreditCard, Plus, Trash2, Bell } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button, Card, Modal } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { PaymentService, NotificationService } from '@/services/supabase.service';
import { Payment, Flat, Building } from '@/types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '@/config/supabase';
import { toSnake, toCamel } from '@/services/supabase.service';
import { exportToCSV } from '@/utils/export';
import { Input } from '@/components/common';
import { ReceiptModal } from '@/components/payments/ReceiptModal';


declare global {
  interface Window {
    Razorpay: any;
  }
}

export const PaymentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [flats, setFlats] = useState<Flat[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');


  useEffect(() => {
    if (user?.societyId) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPayments(),
        loadFlats(),
        loadBuildings()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadBuildings = async () => {
    if (!user?.societyId) return;
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('society_id', user.societyId);
      if (error) throw error;
      setBuildings(toCamel(data) as Building[]);
    } catch (error) {
      console.error('Error loading buildings:', error);
    }
  };

  const loadFlats = async () => {
    if (!user?.societyId) return;
    try {
      const { data, error } = await supabase
        .from('flats')
        .select('*')
        .eq('society_id', user.societyId);
      if (error) throw error;
      setFlats(toCamel(data) as Flat[]);
    } catch (error) {
      console.error('Error loading flats:', error);
    }
  };

  const loadPayments = async () => {
    if (!user?.societyId) return;

    try {
      const flatId = user.role === 'admin' ? undefined : user.flatIds?.[0];
      const data = await PaymentService.getPayments(user.societyId, flatId);
      setPayments(data as Payment[]);
    } catch (error) {
      toast.error('Failed to load payments');
    }
  };

  const handlePayment = async (paymentId: string, method: string = 'upi') => {
    if (!user?.societyId) {
      toast.error('Session error: Society ID missing. Please log in again.');
      return;
    }

    const payment = payments.find(p => p.id === paymentId);
    if (!payment) {
      toast.error('Payment record not found.');
      return;
    }

    if (method === 'bypass' || method === 'Mock') {
      try {
        setLoading(true);
        await PaymentService.updatePaymentStatus(user.societyId, paymentId, 'paid');
        await supabase
          .from('payments')
          .update({ transaction_id: `MOCK_${Date.now()}` })
          .eq('id', paymentId);

        toast.success('Mock payment successful!');
        await loadPayments();
        setShowPaymentModal(false);
        return;
      } catch (error) {
        console.error('Error in mock payment:', error);
        toast.error('Failed to complete mock payment');
        return;
      } finally {
        setLoading(false);
      }
    }

    const isOverdue = new Date(payment.dueDate) < new Date() && payment.status === 'pending';
    const totalAmount = payment.amount + (isOverdue ? (payment.fineAmount || 0) : 0);

    if (isNaN(totalAmount) || totalAmount <= 0) {
      console.error('Invalid payment amount:', totalAmount, payment);
      toast.error('Invalid payment amount. Please contact support.');
      return;
    }

    const rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

    if (!rzpKey || rzpKey === 'rzp_test_placeholder') {
      console.error('Razorpay Key ID is missing or invalid:', rzpKey);
      toast.error('Payment system configuration error (Missing API Key). Please contact admin.');
      return;
    }

    // Ensure prefill data is never undefined or empty strings for mandatory fields
    const prefill = {
      name: user.name || 'Resident',
      email: user.email || '',
      contact: user.phone || ''
    };

    console.log('Initializing Razorpay with:', {
      amount: totalAmount,
      key: rzpKey.substring(0, 8) + '...',
      paymentId,
      prefill
    });

    const options = {
      key: rzpKey,
      amount: Math.round(totalAmount * 100), // Amount in paise
      currency: 'INR',
      name: 'Smart Society',
      description: `${payment.type.toUpperCase()} Payment - ${payment.month}`,
      handler: async function (response: any) {
        try {
          console.log('Razorpay success response:', response);
          await PaymentService.updatePaymentStatus(user.societyId, paymentId, 'paid');

          if (response.razorpay_payment_id) {
            await supabase
              .from('payments')
              .update({
                transaction_id: response.razorpay_payment_id,
                payment_method: method
              })
              .eq('id', paymentId);
          }

          toast.success('Payment successful!');
          await loadPayments();
          setShowPaymentModal(false);
        } catch (error) {
          console.error('Error updating payment status after success:', error);
          toast.error('Payment acknowledged, but failed to update status. Please contact admin with your Transaction ID.');
        }
      },
      prefill,
      theme: {
        color: '#2563eb'
      },
      modal: {
        ondismiss: function () {
          console.log('Razorpay modal dismissed');
        }
      }
    };

    try {
      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded. Please refresh the page.');
      }
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error('Razorpay payment failed:', response.error);
        toast.error(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (error: any) {
      console.error('Error opening Razorpay:', error);
      toast.error(error.message || 'Could not initialize payment. Please check your internet connection and try again.');
    }
  };

  const handleGenerateBills = async (formData: any) => {
    if (!user?.societyId) return;
    try {
      const { data: flatsData, error: flatsError } = await supabase
        .from('flats')
        .select('id, owner_id, occupancy_status')
        .eq('society_id', user.societyId);

      if (flatsError) throw flatsError;

      const bills = flatsData.map(flat => ({
        societyId: user.societyId,
        flatId: flat.id,
        userId: flat.owner_id, // Default to owner
        amount: formData.amount,
        fineAmount: formData.fineAmount || 0,
        fineReason: formData.fineAmount > 0 ? `Late payment penalty after ${format(new Date(formData.dueDate), 'MMM dd')}` : null,
        type: formData.type,
        month: formData.month,
        dueDate: formData.dueDate,
        status: 'pending',
        createdAt: new Date().toISOString()
      }));

      const { error } = await supabase.from('payments').insert(toSnake(bills));
      if (error) throw error;

      toast.success(`Bills generated for ${flatsData.length} units`);
      setShowBillModal(false);
      loadPayments();
    } catch (error) {
      console.error('Error generating bills:', error);
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
    return filtered.reduce((sum, p) => {
      const isOverdue = p.status === 'pending' && new Date(p.dueDate) < new Date();
      return sum + p.amount + (isOverdue ? (p.fineAmount || 0) : 0);
    }, 0);
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
            <Button variant="secondary" onClick={() => exportToCSV(payments, 'payments')}>
              <Download size={20} className="mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <p className="text-sm text-gray-600">Total Collected</p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              ₹{getTotalAmount('paid').toLocaleString()}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              ₹{getTotalAmount('pending').toLocaleString()}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-gray-600">Overdue</p>
            <p className="text-2xl font-bold text-red-600 mt-2">
              ₹{payments.filter(p => p.status === 'pending' && new Date(p.dueDate) < new Date())
                .reduce((sum, p) => sum + p.amount + (p.fineAmount || 0), 0).toLocaleString()}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-gray-600">This Month</p>
            <p className="text-2xl font-bold text-primary-600 mt-2">
              ₹{payments.filter(p =>
                format(new Date(p.createdAt), 'MM-yyyy') === format(new Date(), 'MM-yyyy')
              ).reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
            </p>
          </Card>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
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
                        <div className="font-medium text-gray-900">
                          {(() => {
                            const flat = flats.find(f => f.id === payment.flatId);
                            const building = buildings.find(b => b.id === flat?.buildingId);
                            return flat ? `${building ? building.name + ' - ' : ''}${flat.flatNumber}` : payment.flatId;
                          })()}
                        </div>
                        <div className="text-sm text-gray-500">{payment.month}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="capitalize text-gray-900">{payment.type}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">₹{(payment.amount + (payment.status === 'pending' && new Date(payment.dueDate) < new Date() ? (payment.fineAmount || 0) : 0)).toLocaleString()}</span>
                          {payment.status === 'pending' && new Date(payment.dueDate) < new Date() && (payment.fineAmount || 0) > 0 && (
                            <span className="text-xs text-red-500">Includes ₹{payment.fineAmount} fine</span>
                          )}
                        </div>
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
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setReceiptPayment(payment);
                                setShowReceiptModal(true);
                              }}
                            >
                              Receipt
                            </Button>

                          )}
                          {user?.role === 'admin' && (
                            <>
                              <button
                                onClick={async () => {
                                  try {
                                    const { data: userData, error } = await supabase
                                      .from('users')
                                      .select('*')
                                      .eq('uid', payment.userId)
                                      .single();
                                    if (error) throw error;
                                    setSelectedUser(toCamel(userData));
                                    setShowNotificationModal(true);
                                  } catch (error) {
                                    console.error('Error fetching resident for notification:', error);
                                    toast.error('Failed to load resident info');
                                  }
                                }}
                                className="text-amber-600 hover:text-amber-800"
                                title="Notify Resident"
                              >
                                <Bell size={20} />
                              </button>
                              <button
                                onClick={() => handleDelete(payment.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete"
                              >
                                <Trash2 size={20} />
                              </button>
                            </>
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
            onPay={(method) => handlePayment(selectedPayment.id, method)}
            flats={flats}
            buildings={buildings}
          />
        )}

        {/* Bill Generation Modal */}
        {showBillModal && (
          <GenerateBillModal
            isOpen={showBillModal}
            onClose={() => setShowBillModal(false)}
            onSubmit={handleGenerateBills}
            flats={flats}
            buildings={buildings}
          />
        )}

        {showNotificationModal && selectedUser && (
          <SendNotificationModal
            isOpen={showNotificationModal}
            resident={selectedUser}
            onClose={() => setShowNotificationModal(false)}
          />
        )}

        {showReceiptModal && receiptPayment && (
          <ReceiptModal
            isOpen={showReceiptModal}
            payment={receiptPayment}
            onClose={() => {
              setShowReceiptModal(false);
              setReceiptPayment(null);
            }}
            flat={flats.find(f => f.id === receiptPayment.flatId)}
            building={buildings.find(b => b.id === flats.find(f => f.id === receiptPayment.flatId)?.buildingId)}
          />
        )}
      </div>
    </Layout>

  );
};

const PaymentModal: React.FC<{
  payment: Payment;
  isOpen: boolean;
  onClose: () => void;
  onPay: (method: string) => void;
  flats: Flat[];
  buildings: Building[];
}> = ({ payment, isOpen, onClose, onPay, flats, buildings }) => {
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [receiverDetails, setReceiverDetails] = useState<any>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchReceiverDetails = async () => {
      if (!payment || !user?.societyId) return;

      try {
        if (payment.type === 'rent') {
          const flat = flats.find(f => f.id === payment.flatId);
          if (flat?.ownerId) {
            const { data } = await supabase
              .from('users')
              .select('bank_details, name')
              .eq('uid', flat.ownerId)
              .single();

            if (data) {
              setReceiverDetails({
                name: data.name,
                ...toCamel(data.bank_details || {})
              });
            }
          }
        } else {
          const { data } = await supabase
            .from('societies')
            .select('bank_details, name')
            .eq('id', user.societyId)
            .single();

          if (data) {
            setReceiverDetails({
              name: data.name,
              ...toCamel(data.bank_details || {})
            });
          }
        }
      } catch (error) {
        console.error('Error fetching receiver details:', error);
      }
    };

    fetchReceiverDetails();
  }, [payment, flats, user?.societyId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Make Payment">
      <div className="space-y-6">
        {/* Payment Details */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Unit:</span>
            <span className="font-medium">
              {(() => {
                const flat = flats.find(f => f.id === payment.flatId);
                const building = buildings.find(b => b.id === flat?.buildingId);
                return flat ? `${building ? building.name + ' - ' : ''}${flat.flatNumber}` : payment.flatId;
              })()}
            </span>
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
            <span className="text-gray-900 font-semibold">Total Amount:</span>
            <div className="text-right">
              <span className="text-xl font-bold text-primary-600">₹{(payment.amount + (new Date(payment.dueDate) < new Date() ? (payment.fineAmount || 0) : 0)).toLocaleString()}</span>
              {new Date(payment.dueDate) < new Date() && (payment.fineAmount || 0) > 0 && (
                <p className="text-xs text-red-500">(Includes ₹{payment.fineAmount} late fine)</p>
              )}
            </div>
          </div>
        </div>

        {/* Receiver Bank Details */}
        {receiverDetails && (receiverDetails.accountNumber || receiverDetails.upiId) && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h4 className="text-sm font-semibold text-blue-900 mb-3">
              Transfer to: {receiverDetails.name}
            </h4>
            <div className="space-y-2 text-sm text-blue-800">
              {receiverDetails.bankName && (
                <div className="flex justify-between">
                  <span className="text-blue-600">Bank:</span>
                  <span className="font-medium">{receiverDetails.bankName}</span>
                </div>
              )}
              {receiverDetails.accountNumber && (
                <div className="flex justify-between">
                  <span className="text-blue-600">Account No:</span>
                  <span className="font-medium font-mono">{receiverDetails.accountNumber}</span>
                </div>
              )}
              {receiverDetails.ifscCode && (
                <div className="flex justify-between">
                  <span className="text-blue-600">IFSC:</span>
                  <span className="font-medium font-mono">{receiverDetails.ifscCode}</span>
                </div>
              )}
              {receiverDetails.accountHolderName && (
                <div className="flex justify-between">
                  <span className="text-blue-600">Beneficiary:</span>
                  <span className="font-medium">{receiverDetails.accountHolderName}</span>
                </div>
              )}
              {receiverDetails.upiId && (
                <div className="flex justify-between border-t border-blue-200 pt-2 mt-2">
                  <span className="text-blue-600">UPI ID:</span>
                  <span className="font-medium font-mono">{receiverDetails.upiId}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
          <div className="space-y-2">
            {['upi', 'card', 'netbanking', 'bypass'].map((method) => (
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
                <span className="ml-3 capitalize">
                  {method === 'bypass' ? 'Bypass Payment (Mock)' : method}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={() => onPay(paymentMethod)} className="flex-1">
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
  flats: Flat[];
  buildings: Building[];
}> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    type: 'maintenance',
    amount: '',
    fineAmount: '',
    month: format(new Date(), 'MMMM yyyy'),
    dueDate: format(new Date(), 'yyyy-MM-dd')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount),
      fineAmount: formData.fineAmount ? parseFloat(formData.fineAmount) : 0
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
          label="Amount per Unit (₹)"
          type="number"
          placeholder="e.g. 2500"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
        />
        <Input
          label="Penalty after Due Date (₹)"
          type="number"
          placeholder="e.g. 500"
          value={formData.fineAmount}
          onChange={(e) => setFormData({ ...formData, fineAmount: e.target.value })}
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

const SendNotificationModal: React.FC<{
  isOpen: boolean;
  resident: any;
  onClose: () => void;
}> = ({ isOpen, resident, onClose }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: 'Payment Reminder',
    message: `Hello ${resident.name}, this is a reminder regarding your pending payment.`,
    type: 'info'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.societyId) return;

    try {
      setLoading(true);
      await NotificationService.createNotification({
        userId: resident.uid,
        societyId: user.societyId,
        title: formData.title,
        message: formData.message,
        type: formData.type as any
      });
      toast.success('Notification sent!');
      onClose();
    } catch (error) {
      toast.error('Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Send Notification to ${resident.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Message</label>
          <textarea
            className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
            rows={4}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Priority</label>
          <select
            className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
          >
            <option value="info">Information</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="error">Critical</option>
          </select>
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={loading} className="flex-1">Send Notification</Button>
        </div>
      </form>
    </Modal>
  );
};
