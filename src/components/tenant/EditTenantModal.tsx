import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@/components/common';
import { User } from '@/types';
import { supabase } from '@/config/supabase';
import { StorageService } from '@/services/supabase.service';
import toast from 'react-hot-toast';
import { Camera, X } from 'lucide-react';

interface EditTenantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tenant: User | null;
}

export const EditTenantModal: React.FC<EditTenantModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    tenant
}) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        moveInDate: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelation: ''
    });
    const [kycDocs, setKycDocs] = useState<{ aadhar?: string; pan?: string }>(tenant?.kycDocuments || {});
    const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (tenant) {
            setFormData({
                name: tenant.name || '',
                phone: tenant.phone || '',
                moveInDate: tenant.moveInDate || '',
                emergencyContactName: tenant.emergencyContact?.name || '',
                emergencyContactPhone: tenant.emergencyContact?.phone || '',
                emergencyContactRelation: tenant.emergencyContact?.relation || ''
            });
            setKycDocs(tenant.kycDocuments || {});
        }
    }, [tenant]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'aadhar' | 'pan') => {
        const file = e.target.files?.[0];
        if (!file || !tenant) return;

        setUploading(prev => ({ ...prev, [type]: true }));
        try {
            const fileName = `${tenant.uid}_${type}_${Date.now()}.${file.name.split('.').pop()}`;
            const publicUrl = await StorageService.uploadFile(file, 'kyc-documents', fileName);

            setKycDocs(prev => ({ ...prev, [type]: publicUrl }));
            toast.success(`${type === 'aadhar' ? 'Aadhar' : 'PAN'} uploaded`);
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(`Failed to upload ${type}`);
        } finally {
            setUploading(prev => ({ ...prev, [type]: false }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant) return;

        setLoading(true);

        try {
            const emergencyContact = formData.emergencyContactName ? {
                name: formData.emergencyContactName,
                phone: formData.emergencyContactPhone,
                relation: formData.emergencyContactRelation
            } : null;

            const { error } = await supabase
                .from('users')
                .update({
                    name: formData.name,
                    phone: formData.phone,
                    move_in_date: formData.moveInDate || null,
                    emergency_contact: emergencyContact,
                    kyc_documents: kycDocs
                })
                .eq('uid', tenant.uid);

            if (error) throw error;

            toast.success('Tenant updated successfully');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error updating tenant:', error);
            toast.error(error.message || 'Failed to update tenant');
        } finally {
            setLoading(false);
        }
    };

    if (!tenant) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Tenant Details">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Information */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">Basic Information</h3>

                    <Input
                        label="Full Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={tenant.email}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>

                    <Input
                        label="Phone Number"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                    />

                    <Input
                        label="Move-in Date"
                        type="date"
                        value={formData.moveInDate}
                        onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                    />
                </div>

                {/* Emergency Contact */}
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">Emergency Contact</h3>

                    <Input
                        label="Contact Name"
                        value={formData.emergencyContactName}
                        onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    />

                    <Input
                        label="Contact Phone"
                        type="tel"
                        value={formData.emergencyContactPhone}
                        onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    />

                    <Input
                        label="Relation"
                        value={formData.emergencyContactRelation}
                        onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                        placeholder="e.g., Father, Mother, Spouse"
                    />
                </div>

                {/* KYC Documents */}
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">KYC Documents</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Aadhar Upload */}
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-gray-500">Aadhar Card</label>
                            {kycDocs.aadhar ? (
                                <div className="relative group">
                                    <img src={kycDocs.aadhar} alt="Aadhar" className="w-full h-32 object-cover rounded-lg border" />
                                    <button
                                        type="button"
                                        onClick={() => setKycDocs(prev => ({ ...prev, aadhar: undefined }))}
                                        className="absolute top-1 right-1 p-1 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        {uploading.aadhar ? (
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                                        ) : (
                                            <>
                                                <Camera className="w-8 h-8 text-gray-400 mb-2" />
                                                <p className="text-xs text-gray-500">Upload Aadhar</p>
                                            </>
                                        )}
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'aadhar')} disabled={uploading.aadhar} />
                                </label>
                            )}
                        </div>

                        {/* PAN Upload */}
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-gray-500">PAN Card</label>
                            {kycDocs.pan ? (
                                <div className="relative group">
                                    <img src={kycDocs.pan} alt="PAN" className="w-full h-32 object-cover rounded-lg border" />
                                    <button
                                        type="button"
                                        onClick={() => setKycDocs(prev => ({ ...prev, pan: undefined }))}
                                        className="absolute top-1 right-1 p-1 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        {uploading.pan ? (
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                                        ) : (
                                            <>
                                                <Camera className="w-8 h-8 text-gray-400 mb-2" />
                                                <p className="text-xs text-gray-500">Upload PAN</p>
                                            </>
                                        )}
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'pan')} disabled={uploading.pan} />
                                </label>
                            )}
                        </div>
                    </div>
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
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
