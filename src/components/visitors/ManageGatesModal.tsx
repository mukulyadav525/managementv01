import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@/components/common';
import { Gate } from '@/types';
import { GateService } from '@/services/supabase.service';
import { Plus, Trash2, Phone, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

interface ManageGatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    societyId: string;
    onSuccess?: () => void;
}

export const ManageGatesModal: React.FC<ManageGatesModalProps> = ({
    isOpen,
    onClose,
    societyId,
    onSuccess
}) => {
    const [gates, setGates] = useState<Gate[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newGate, setNewGate] = useState({ name: '', phone: '' });

    useEffect(() => {
        if (isOpen && societyId) {
            loadGates();
        }
    }, [isOpen, societyId]);

    const loadGates = async () => {
        setLoading(true);
        try {
            const data = await GateService.getGates(societyId);
            setGates(data as Gate[]);
        } catch (error) {
            toast.error('Failed to load gates');
        } finally {
            setLoading(false);
        }
    };

    const handleAddGate = async () => {
        if (!newGate.name) {
            toast.error('Gate name is required');
            return;
        }
        try {
            await GateService.createGate({
                society_id: societyId,
                name: newGate.name,
                phone: newGate.phone,
                status: 'active'
            });
            toast.success('Gate added');
            setNewGate({ name: '', phone: '' });
            setIsAdding(false);
            loadGates();
            onSuccess?.();
        } catch (error) {
            toast.error('Failed to add gate');
        }
    };

    const handleDeleteGate = async (id: string) => {
        if (!window.confirm('Delete this gate? This will remove it from the support list.')) return;
        try {
            await GateService.deleteGate(id);
            toast.success('Gate deleted');
            loadGates();
            onSuccess?.();
        } catch (error) {
            toast.error('Failed to delete gate');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manage Society Gates">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">Configure entry points and security contact details.</p>
                    <Button
                        size="sm"
                        onClick={() => setIsAdding(true)}
                        disabled={isAdding}
                        className="flex items-center gap-1"
                    >
                        <Plus size={16} /> Add Gate
                    </Button>
                </div>

                {isAdding && (
                    <div className="p-4 bg-primary-50 rounded-xl space-y-3 border border-primary-100">
                        <Input
                            label="Gate Name (e.g., Main Gate)"
                            value={newGate.name}
                            onChange={(e) => setNewGate({ ...newGate, name: e.target.value })}
                            placeholder="East Gate, Service Entrance..."
                        />
                        <Input
                            label="Security Contact Number"
                            value={newGate.phone}
                            onChange={(e) => setNewGate({ ...newGate, phone: e.target.value })}
                            placeholder="+91 XXXXX XXXXX"
                        />
                        <div className="flex gap-2 justify-end pt-2">
                            <Button variant="secondary" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleAddGate}>Save Gate</Button>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-8">Loading gates...</div>
                    ) : gates.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <p className="text-sm text-gray-400">No gates configured</p>
                        </div>
                    ) : (
                        gates.map((gate) => (
                            <div key={gate.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-primary-200 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-50 rounded-lg text-primary-600">
                                        <Shield size={20} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{gate.name}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <Phone size={12} /> {gate.phone || 'No contact info'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${gate.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {gate.status}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteGate(gate.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="pt-4 border-t">
                    <Button variant="secondary" className="w-full" onClick={onClose}>Close</Button>
                </div>
            </div>
        </Modal>
    );
};
