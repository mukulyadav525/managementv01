import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@/components/common';
import { RentAgreementService, SocietyService, UserService, StorageService } from '@/services/supabase.service';
import { RentAgreement, Society, User, Flat, Building } from '@/types';
import { generateRentAgreementPDF } from '@/utils/rentAgreementGenerator';
import { useAuthStore } from '@/stores/authStore';
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
    const { user } = useAuthStore();
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        monthlyRent: '',
        securityDeposit: '',
        agreementDocument: '',
        status: 'active',
        terms: {} as any
    });
    const [isSystemGenerated, setIsSystemGenerated] = useState(false);
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
            let agreementUrl = formData.agreementDocument;

            if (isSystemGenerated) {
                setLoading(true);
                // Fetch all necessary data for PDF generation
                const [society, owner, tenant, flat] = await Promise.all([
                    SocietyService.getSociety(user!.societyId),
                    UserService.getUser(ownerId),
                    UserService.getUser(tenantId),
                    SocietyService.getFlat(user!.societyId, flatId)
                ]);

                if (!society || !owner || !tenant || !flat) {
                    throw new Error('Failed to fetch details for agreement generation');
                }

                // UserService.getUser returns a User object which uses 'uid' not 'id'
                // But the RentAgreement record in DB needs ids. 
                // Let's ensure we are using the correct properties.

                let building: Building | undefined;
                if ((flat as Flat).buildingId) {
                    building = await SocietyService.getBuilding((flat as Flat).buildingId) as Building;
                }

                const pdfBlob = generateRentAgreementPDF({
                    society: society as Society,
                    owner: owner as User,
                    tenant: tenant as User,
                    flat: flat as Flat,
                    building,
                    agreement: {
                        startDate: formData.startDate,
                        endDate: formData.endDate,
                        monthlyRent: parseFloat(formData.monthlyRent),
                        securityDeposit: parseFloat(formData.securityDeposit),
                        terms: formData.terms
                    }
                });

                const fileName = `agreement_${tenantId}_${Date.now()}.pdf`;
                const path = `rent-agreements/${user!.societyId}/${fileName}`;
                const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

                agreementUrl = await StorageService.uploadFile(file, 'documents', path);
            }

            const data = {
                flatId,
                tenantId,
                ownerId,
                startDate: formData.startDate,
                endDate: formData.endDate || null,
                monthlyRent: parseFloat(formData.monthlyRent),
                securityDeposit: parseFloat(formData.securityDeposit),
                agreementDocument: agreementUrl,
                status: formData.status,
                terms: formData.terms
            };

            if (existingAgreement) {
                await RentAgreementService.updateRentAgreement(existingAgreement.id, data);
                toast.success('Rent agreement updated successfully');
            } else {
                await RentAgreementService.createRentAgreement(data);
                toast.success('Rent agreement generated & saved');
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

                <div className="flex items-center gap-2 py-2">
                    <input
                        type="checkbox"
                        id="isSystemGenerated"
                        checked={isSystemGenerated}
                        onChange={(e) => setIsSystemGenerated(e.target.checked)}
                        className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    />
                    <label htmlFor="isSystemGenerated" className="text-sm font-medium text-gray-900">
                        System Generated Agreement (Auto-generate PDF)
                    </label>
                </div>

                {!isSystemGenerated && (
                    <Input
                        label="Agreement Document URL (Google Drive/OneDrive)"
                        type="url"
                        value={formData.agreementDocument}
                        onChange={(e) => setFormData({ ...formData, agreementDocument: e.target.value })}
                        placeholder="https://drive.google.com/..."
                        required
                    />
                )}

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
