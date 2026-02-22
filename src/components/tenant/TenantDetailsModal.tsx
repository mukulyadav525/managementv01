import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@/components/common';
import { User, RentAgreement } from '@/types';
import { Mail, Phone, Calendar, Users, FileText, Car, CreditCard, ExternalLink } from 'lucide-react';
import { PaymentService, RentAgreementService } from '@/services/supabase.service';

interface TenantDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenant: User | null;
    vehicles?: any[];
    flatNumber?: string;
}

export const TenantDetailsModal: React.FC<TenantDetailsModalProps> = ({
    isOpen,
    onClose,
    tenant,
    vehicles = [],
    flatNumber
}) => {
    const [payments, setPayments] = useState<any[]>([]);
    const [agreement, setAgreement] = useState<RentAgreement | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (tenant && isOpen) {
            loadInitialData();
        }
    }, [tenant, isOpen]);

    const loadInitialData = async () => {
        if (!tenant) return;
        setLoading(true);
        try {
            const [allPayments, rentAgreements] = await Promise.all([
                PaymentService.getDocuments('payments', (q) =>
                    q.eq('user_id', tenant.uid).order('created_at', { ascending: false }).limit(10)
                ),
                RentAgreementService.getRentAgreements(undefined, tenant.uid)
            ]);
            setPayments(allPayments);
            if (rentAgreements && (rentAgreements as RentAgreement[]).length > 0) {
                setAgreement((rentAgreements as RentAgreement[])[0]);
            } else {
                setAgreement(null);
            }
        } catch (error) {
            console.error('Error loading tenant data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!tenant) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Tenant Details - ${tenant.name}`}>
            <div className="space-y-6">
                {/* Personal Information */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3">
                            <Mail className="text-gray-400 mt-1" size={18} />
                            <div>
                                <p className="text-xs text-gray-500">Email</p>
                                <p className="text-sm font-medium text-gray-900">{tenant.email}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Phone className="text-gray-400 mt-1" size={18} />
                            <div>
                                <p className="text-xs text-gray-500">Phone</p>
                                <p className="text-sm font-medium text-gray-900">{tenant.phone}</p>
                            </div>
                        </div>
                        {tenant.moveInDate && (
                            <div className="flex items-start gap-3">
                                <Calendar className="text-gray-400 mt-1" size={18} />
                                <div>
                                    <p className="text-xs text-gray-500">Move-in Date</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {new Date(tenant.moveInDate).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        )}
                        {flatNumber && (
                            <div className="flex items-start gap-3">
                                <FileText className="text-gray-400 mt-1" size={18} />
                                <div>
                                    <p className="text-xs text-gray-500">Flat Number</p>
                                    <p className="text-sm font-medium text-gray-900">{flatNumber}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Emergency Contact */}
                {tenant.emergencyContact && (
                    <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Emergency Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start gap-3">
                                <Users className="text-gray-400 mt-1" size={18} />
                                <div>
                                    <p className="text-xs text-gray-500">Name</p>
                                    <p className="text-sm font-medium text-gray-900">{tenant.emergencyContact.name}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="text-gray-400 mt-1" size={18} />
                                <div>
                                    <p className="text-xs text-gray-500">Phone</p>
                                    <p className="text-sm font-medium text-gray-900">{tenant.emergencyContact.phone}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Users className="text-gray-400 mt-1" size={18} />
                                <div>
                                    <p className="text-xs text-gray-500">Relation</p>
                                    <p className="text-sm font-medium text-gray-900 capitalize">{tenant.emergencyContact.relation}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* KYC Documents */}
                <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">KYC Documents</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-500 mb-2">Aadhar Card</p>
                            {tenant.kycDocuments?.aadhar ? (
                                <a href={tenant.kycDocuments.aadhar} target="_blank" rel="noopener noreferrer">
                                    <img
                                        src={tenant.kycDocuments.aadhar}
                                        alt="Aadhar"
                                        className="w-full h-32 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                                    />
                                </a>
                            ) : (
                                <div className="w-full h-32 bg-gray-50 border border-dashed rounded-lg flex items-center justify-center text-gray-400 text-sm">
                                    Not Uploaded
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 mb-2">PAN Card</p>
                            {tenant.kycDocuments?.pan ? (
                                <a href={tenant.kycDocuments.pan} target="_blank" rel="noopener noreferrer">
                                    <img
                                        src={tenant.kycDocuments.pan}
                                        alt="PAN"
                                        className="w-full h-32 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                                    />
                                </a>
                            ) : (
                                <div className="w-full h-32 bg-gray-50 border border-dashed rounded-lg flex items-center justify-center text-gray-400 text-sm">
                                    Not Uploaded
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Vehicles */}
                {vehicles && vehicles.length > 0 && (
                    <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3 flex items-center gap-2">
                            <Car size={16} /> Registered Vehicles
                        </h3>
                        <div className="space-y-2">
                            {vehicles.map((vehicle, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{vehicle.type || vehicle.vehicleType}</p>
                                        <p className="text-xs text-gray-500">{vehicle.model}</p>
                                    </div>
                                    <p className="text-sm font-mono font-semibold text-gray-700">
                                        {vehicle.vehicle_number || vehicle.vehicleNumber}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Rent Agreement */}
                {tenant.role === 'tenant' && (
                    <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3 flex items-center gap-2">
                            <FileText size={16} /> Rent Agreement
                        </h3>
                        {agreement ? (
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500">Duration</p>
                                        <p className="text-sm font-medium">
                                            {new Date(agreement.startDate).toLocaleDateString()} - {agreement.endDate ? new Date(agreement.endDate).toLocaleDateString() : 'Present'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Status</p>
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${agreement.status === 'active' ? 'bg-green-100 text-green-700' :
                                                agreement.status === 'expired' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {agreement.status}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Monthly Rent</p>
                                        <p className="text-sm font-medium text-gray-900">₹{agreement.monthlyRent.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Security Deposit</p>
                                        <p className="text-sm font-medium text-gray-900">₹{agreement.securityDeposit.toLocaleString()}</p>
                                    </div>
                                </div>
                                {agreement.agreementDocument && (
                                    <div className="pt-2">
                                        <a
                                            href={agreement.agreementDocument}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                                        >
                                            <ExternalLink size={16} /> View Full Agreement
                                        </a>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                <p className="text-sm text-gray-500 italic">No rent agreement generated yet</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Payment History */}
                <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3 flex items-center gap-2">
                        <CreditCard size={16} /> Recent Payments
                    </h3>
                    {loading ? (
                        <p className="text-sm text-gray-500 text-center py-4">Loading...</p>
                    ) : payments.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No payment history</p>
                    ) : (
                        <div className="space-y-2">
                            {payments.map((payment) => (
                                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 capitalize">{payment.type}</p>
                                        <p className="text-xs text-gray-500">
                                            {payment.paidDate
                                                ? new Date(payment.paidDate).toLocaleDateString()
                                                : `Due: ${new Date(payment.dueDate).toLocaleDateString()}`
                                            }
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-semibold ${payment.status === 'paid' ? 'text-green-600' :
                                            payment.status === 'pending' ? 'text-yellow-600' :
                                                'text-red-600'
                                            }`}>
                                            ₹{payment.amount.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-500 capitalize">{payment.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="pt-4">
                    <Button onClick={onClose} className="w-full">Close</Button>
                </div>
            </div>
        </Modal>
    );
};
