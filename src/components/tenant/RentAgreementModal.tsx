import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@/components/common';
import { RentAgreementService } from '@/services/supabase.service';
import { RentAgreement } from '@/types';
import toast from 'react-hot-toast';

interface RentAgreementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    flatId: string;
    tenantId: string;
    ownerId: string;
    existingAgreement?: RentAgreement | null;
}

export const RentAgreementModal: React.FC<RentAgreementModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    flatId,
    tenantId,
    ownerId,
    existingAgreement
}) => {
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        monthlyRent: '',
        securityDeposit: '',
        agreementDocument: '',
        status: 'active',
        terms: {}
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (existingAgreement) {
            setFormData({
                startDate: existingAgreement.startDate || '',
                endDate: existingAgreement.endDate || '',
                monthlyRent: existingAgreement.monthlyRent?.toString() || '',
                securityDeposit: existingAgreement.securityDeposit?.toString() || '',
                agreementDocument: existingAgreement.agreementDocument || '',
                status: existingAgreement.status || 'active',
                terms: existingAgreement.terms || {}
            });
        } else {
            setFormData({
                startDate: '',
                endDate: '',
                monthlyRent: '',
                securityDeposit: '',
                agreementDocument: '',
                status: 'active',
                terms: {}
            });
        }
    }, [existingAgreement, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = {
                flatId,
                tenantId,
                ownerId,
                startDate: formData.startDate,
                endDate: formData.endDate || null,
                monthlyRent: parseFloat(formData.monthlyRent),
                securityDeposit: parseFloat(formData.securityDeposit),
                agreementDocument: formData.agreementDocument,
                status: formData.status,
                terms: formData.terms
            };

            if (existingAgreement) {
                await RentAgreementService.updateRentAgreement(existingAgreement.id, data);
                toast.success('Rent agreement updated successfully');
            } else {
                await RentAgreementService.createRentAgreement(data);
                toast.success('Rent agreement created successfully');
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving rent agreement:', error);
            toast.error(error.message || 'Failed to save rent agreement');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={existingAgreement ? 'Edit Rent Agreement' : 'Generate Rent Agreement'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Start Date"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        required
                    />
                    <Input
                        label="End Date (Optional)"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Monthly Rent (₹)"
                        type="number"
                        value={formData.monthlyRent}
                        onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                        required
                    />
                    <Input
                        label="Security Deposit (₹)"
                        type="number"
                        value={formData.securityDeposit}
                        onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                        required
                    />
                </div>

                <Input
                    label="Agreement Document URL (Google Drive/OneDrive)"
                    type="url"
                    value={formData.agreementDocument}
                    onChange={(e) => setFormData({ ...formData, agreementDocument: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    required
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="terminated">Terminated</option>
                    </select>
                </div>

                <div className="flex gap-3 pt-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1"
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : existingAgreement ? 'Update Agreement' : 'Generate Agreement'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
