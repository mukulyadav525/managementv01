import React, { useState } from 'react';
import { Modal, Button, Input } from '@/components/common';
import { Flat } from '@/types';
import { supabase } from '@/config/supabase';
import { StorageService } from '@/services/supabase.service';
import toast from 'react-hot-toast';
import { Camera, X } from 'lucide-react';

interface AddTenantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    ownedFlats: Flat[];
    societyId: string;
    societyType?: 'tower' | 'house';
}

export const AddTenantModal: React.FC<AddTenantModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    ownedFlats,
    societyId,
    societyType
}) => {
    const isHouse = societyType === 'house';
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        flatId: '',
        moveInDate: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelation: '',
        tenantFloor: ''
    });
    const [loading, setLoading] = useState(false);
    const [selectedFloor, setSelectedFloor] = useState<string>('');
    const [kycDocs, setKycDocs] = useState<{ aadhar?: string; pan?: string }>({});
    const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});

    const uniqueFloors = Array.from(new Set(ownedFlats.map(f => f.floor))).sort((a, b) => a - b);

    const filteredFlats = ownedFlats.filter(f => {
        if (isHouse) return true;
        const isAssignable = f.occupancyStatus === 'vacant' || f.occupancyStatus === 'unassigned' || f.occupancyStatus === 'owner-occupied';
        const matchesFloor = selectedFloor ? f.floor.toString() === selectedFloor : true;
        return isAssignable && matchesFloor;
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'aadhar' | 'pan') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(prev => ({ ...prev, [type]: true }));
        try {
            const fileName = `temp_${Date.now()}_${type}.${file.name.split('.').pop()}`;
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

    const resetForm = () => {
        setFormData({
            name: '', email: '', phone: '', password: '', flatId: '',
            moveInDate: '', emergencyContactName: '', emergencyContactPhone: '',
            emergencyContactRelation: '', tenantFloor: ''
        });
        setKycDocs({});
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const selectedFlat = ownedFlats.find(f => f.id === formData.flatId);
        if (!selectedFlat) return toast.error('Please select a valid unit');

        if (isHouse) {
            if (!formData.tenantFloor) return toast.error('Please specify the floor for the tenant');
            const tenantFloorNum = parseInt(formData.tenantFloor);
            if (tenantFloorNum < 1 || (selectedFlat.totalFloors && tenantFloorNum > selectedFlat.totalFloors)) {
                return toast.error(`Invalid floor. House has ${selectedFlat.totalFloors || 'unknown'} floors.`);
            }
            if (selectedFlat.ownerLivesInHouse && selectedFlat.ownerFloorNumber === tenantFloorNum) {
                return toast.error('Cannot assign tenant to the floor where the owner lives.');
            }
            if (selectedFlat.tenantsByFloor && selectedFlat.tenantsByFloor[tenantFloorNum.toString()]) {
                return toast.error(`Floor ${tenantFloorNum} is already occupied by a tenant!`);
            }
        }

        setLoading(true);
        try {
            const { data: existingUser, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('email', formData.email)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

            let userId = '';
            if (existingUser) {
                userId = existingUser.uid;
                const newFlatIds = [...new Set([...(existingUser.flat_ids || []), formData.flatId])];
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ society_id: societyId, flat_ids: newFlatIds, status: 'active', kyc_documents: kycDocs })
                    .eq('uid', userId);
                if (updateError) throw updateError;
                toast.success('Existing occupant linked to unit!');
            } else {
                const { createClient } = await import('@supabase/supabase-js');
                const tempSupabase = createClient(
                    import.meta.env.VITE_SUPABASE_URL,
                    import.meta.env.VITE_SUPABASE_ANON_KEY,
                    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
                );

                const { data: authData, error: authError } = await tempSupabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: { data: { name: formData.name, role: 'tenant' } }
                });

                if (authError) throw authError;
                if (!authData.user) throw new Error('Failed to create user');
                userId = authData.user.id;

                const emergencyContact = formData.emergencyContactName ? {
                    name: formData.emergencyContactName,
                    phone: formData.emergencyContactPhone,
                    relation: formData.emergencyContactRelation
                } : null;

                const { error: userError } = await supabase
                    .from('users')
                    .insert([{
                        uid: userId, email: formData.email, name: formData.name, phone: formData.phone,
                        role: 'tenant', society_id: societyId, flat_ids: [formData.flatId],
                        move_in_date: formData.moveInDate || null, emergency_contact: emergencyContact,
                        status: 'active', kyc_documents: kycDocs
                    }]);
                if (userError) throw userError;
                toast.success('New tenant added successfully!');
            }

            const flatUpdate: any = { updated_at: new Date().toISOString() };
            if (isHouse) {
                const currentTenants = { ...(selectedFlat?.tenantsByFloor || {}) };
                currentTenants[formData.tenantFloor] = userId;
                flatUpdate.tenants_by_floor = currentTenants;
                flatUpdate.occupancy_status = 'tenant-occupied';
                flatUpdate.tenant_id = Object.values(currentTenants)[0] || null;
            } else {
                flatUpdate.occupancy_status = 'tenant-occupied';
                flatUpdate.tenant_id = userId;
            }

            const { error: flatError } = await supabase.from('flats').update(flatUpdate).eq('id', formData.flatId);
            if (flatError) throw flatError;

            onSuccess();
            onClose();
            resetForm();
        } catch (error: any) {
            console.error('Error adding tenant:', error);
            toast.error(error.message || 'Failed to add tenant');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Tenant">
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">Basic Information</h3>
                    <Input label="Full Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                    <Input label="Password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required placeholder="Set password for tenant" />
                    <Input label="Phone Number" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">KYC Documents</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-gray-500">Aadhar Card</label>
                            {kycDocs.aadhar ? (
                                <div className="relative group">
                                    <img src={kycDocs.aadhar} alt="Aadhar" className="w-full h-32 object-cover rounded-lg border" />
                                    <button type="button" onClick={() => setKycDocs(prev => ({ ...prev, aadhar: undefined }))} className="absolute top-1 right-1 p-1 bg-red-100 text-red-600 rounded-full"><X size={14} /></button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                                    {uploading.aadhar ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /> : <><Camera className="w-8 h-8 text-gray-400 mb-2" /><p className="text-xs text-gray-500">Upload Aadhar</p></>}
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'aadhar')} disabled={uploading.aadhar} />
                                </label>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-gray-500">PAN Card</label>
                            {kycDocs.pan ? (
                                <div className="relative group">
                                    <img src={kycDocs.pan} alt="PAN" className="w-full h-32 object-cover rounded-lg border" />
                                    <button type="button" onClick={() => setKycDocs(prev => ({ ...prev, pan: undefined }))} className="absolute top-1 right-1 p-1 bg-red-100 text-red-600 rounded-full"><X size={14} /></button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                                    {uploading.pan ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /> : <><Camera className="w-8 h-8 text-gray-400 mb-2" /><p className="text-xs text-gray-500">Upload PAN</p></>}
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'pan')} disabled={uploading.pan} />
                                </label>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">Unit Assignment</h3>
                    {!isHouse && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Floor</label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={selectedFloor} onChange={(e) => setSelectedFloor(e.target.value)}>
                                <option value="">All Floors</option>
                                {uniqueFloors.map(f => <option key={f} value={f}>Floor {f}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Unit <span className="text-red-500">*</span></label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.flatId} onChange={(e) => setFormData({ ...formData, flatId: e.target.value, tenantFloor: '' })} required>
                            <option value="">Choose a unit</option>
                            {filteredFlats.map(f => <option key={f.id} value={f.id}>{isHouse ? 'House' : 'Unit'} {f.flatNumber} {isHouse ? `(${f.totalFloors || 0} Floors)` : `(Floor ${f.floor})`}</option>)}
                        </select>
                    </div>
                    {isHouse && formData.flatId && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tenant Floor <span className="text-red-500">*</span></label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={formData.tenantFloor} onChange={(e) => setFormData({ ...formData, tenantFloor: e.target.value })} required>
                                <option value="">Select Floor</option>
                                {(() => {
                                    const house = ownedFlats.find(f => f.id === formData.flatId);
                                    if (!house) return null;
                                    return Array.from({ length: house.totalFloors || 1 }, (_, i) => i + 1).map(floor => {
                                        const isOwnerFloor = house.ownerLivesInHouse && house.ownerFloorNumber === floor;
                                        const isOccupied = house.tenantsByFloor && !!house.tenantsByFloor[floor.toString()];
                                        return <option key={floor} value={floor} disabled={isOwnerFloor || isOccupied}>Floor {floor} {isOwnerFloor ? '(Owner)' : (isOccupied ? '(Occupied)' : '(Vacant)')}</option>;
                                    });
                                })()}
                            </select>
                        </div>
                    )}
                    <Input label="Move-in Date" type="date" value={formData.moveInDate} onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })} />
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">Emergency Contact (Optional)</h3>
                    <Input label="Contact Name" value={formData.emergencyContactName} onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })} />
                    <Input label="Contact Phone" type="tel" value={formData.emergencyContactPhone} onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })} />
                    <Input label="Relation" value={formData.emergencyContactRelation} onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })} placeholder="e.g., Father, Mother, Spouse" />
                </div>

                <div className="flex gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>Cancel</Button>
                    <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Adding...' : 'Add Tenant'}</Button>
                </div>
            </form>
        </Modal>
    );
};
