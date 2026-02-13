import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { StorageService, UserService } from '@/services/supabase.service';
import toast from 'react-hot-toast';

export const TenantKYC: React.FC = () => {
    const { user, setUser } = useAuthStore();
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'aadhar' | 'pan') => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        try {
            setUploading(true);
            const path = `kyc/${user.uid}/${type}_${Date.now()}.${file.name.split('.').pop()}`;
            const publicUrl = await StorageService.uploadFile(file, 'kyc-documents', path);

            const updatedKYC = {
                ...user.kycDocuments,
                [type]: publicUrl
            };

            await UserService.updateKYC(user.uid, updatedKYC);

            // Update local state
            setUser({
                ...user,
                kycDocuments: updatedKYC
            });

            toast.success(`${type.toUpperCase()} uploaded successfully`);
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error(`Failed to upload ${type.toUpperCase()}: ${(error as any).message}`);
        } finally {
            setUploading(false);
        }
    };

    if (!user) return null;

    return (
        <Card title="KYC Verification" className="mt-6">
            <div className="space-y-6">
                <p className="text-gray-600 text-sm">
                    Please upload at least one identity proof (Aadhar Card or PAN Card) to complete your verification.
                    This is required by your society and flat owner.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Aadhar Card */}
                    <div className="border rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${user.kycDocuments?.aadhar ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                {user.kycDocuments?.aadhar ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">Aadhar Card</p>
                                <p className="text-xs text-gray-500">
                                    {user.kycDocuments?.aadhar ? 'Verified/Uploaded' : 'Action Required'}
                                </p>
                            </div>
                        </div>
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*,.pdf"
                                onChange={(e) => handleFileUpload(e, 'aadhar')}
                                disabled={uploading}
                            />
                            <div className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm">
                                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                {user.kycDocuments?.aadhar ? 'Replace' : 'Upload'}
                            </div>
                        </label>
                    </div>

                    {/* PAN Card */}
                    <div className="border rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${user.kycDocuments?.pan ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                {user.kycDocuments?.pan ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">PAN Card</p>
                                <p className="text-xs text-gray-500">
                                    {user.kycDocuments?.pan ? 'Verified/Uploaded' : 'Action Required'}
                                </p>
                            </div>
                        </div>
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*,.pdf"
                                onChange={(e) => handleFileUpload(e, 'pan')}
                                disabled={uploading}
                            />
                            <div className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm">
                                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                {user.kycDocuments?.pan ? 'Replace' : 'Upload'}
                            </div>
                        </label>
                    </div>
                </div>

                {(user.kycDocuments?.aadhar || user.kycDocuments?.pan) ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700 text-sm">
                        <CheckCircle size={16} />
                        Document uploaded. Your owner will review it shortly.
                    </div>
                ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2 text-yellow-700 text-sm">
                        <AlertCircle size={16} />
                        At least one identity proof (Aadhar or PAN) is mandatory.
                    </div>
                )}
            </div>
        </Card>
    );
};
