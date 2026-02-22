import React, { useState } from 'react';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { Modal, Button } from '@/components/common';
import { SocietyService } from '@/services/supabase.service';
import toast from 'react-hot-toast';

interface TowerDef {
    id: string;
    name: string;
    floors: number;
    unitsPerFloor: number;
}

interface BulkUnitGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    societyId: string;
    onSuccess: () => void;
}

export const BulkUnitGeneratorModal: React.FC<BulkUnitGeneratorModalProps> = ({ isOpen, onClose, societyId, onSuccess }) => {
    const [towers, setTowers] = useState<TowerDef[]>([
        { id: crypto.randomUUID(), name: 'Tower A', floors: 10, unitsPerFloor: 4 }
    ]);
    const [loading, setLoading] = useState(false);

    const handleAddTower = () => {
        setTowers([...towers, { id: crypto.randomUUID(), name: `Tower ${String.fromCharCode(65 + towers.length)}`, floors: 10, unitsPerFloor: 4 }]);
    };

    const handleRemoveTower = (id: string) => {
        if (towers.length === 1) return;
        setTowers(towers.filter(t => t.id !== id));
    };

    const updateTower = (id: string, field: keyof TowerDef, value: string | number) => {
        setTowers(towers.map(t => {
            if (t.id === id) {
                return { ...t, [field]: value };
            }
            return t;
        }));
    };

    const totalUnitsGenerated = towers.reduce((sum, t) => sum + (t.floors * t.unitsPerFloor), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        for (const t of towers) {
            if (!t.name.trim()) return toast.error('All towers must have a name');
            if (t.floors < 1) return toast.error(`Floors for ${t.name} must be at least 1`);
            if (t.unitsPerFloor < 1) return toast.error(`Units per floor for ${t.name} must be at least 1`);
        }

        try {
            setLoading(true);
            toast.loading(`Generating ${towers.length} towers and ${totalUnitsGenerated} units...`, { id: 'bulk-gen' });

            await SocietyService.bulkGenerateTowers(societyId, towers);

            toast.success('Successfully generated buildings and units!', { id: 'bulk-gen' });
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Core error:', error);
            toast.error(error.message || 'Failed to generate setup', { id: 'bulk-gen' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Bulk Tower & Unit Setup">
            <form onSubmit={handleSubmit} className="space-y-6">

                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start gap-3 text-sm">
                    <Building2 className="shrink-0 mt-0.5" size={18} />
                    <p>
                        Define your towers below. We will automatically create the buildings and generate units
                        (e.g., Tower A, Floor 1, Unit 101, 102...).
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="font-semibold text-gray-900">Define Towers</h3>
                        <div className="text-sm font-medium text-primary-600">
                            Total Units Generated: {totalUnitsGenerated}
                        </div>
                    </div>

                    {towers.map((tower) => (
                        <div key={tower.id} className="p-4 border border-gray-200 rounded-lg flex items-start gap-4 bg-gray-50">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Tower Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        value={tower.name}
                                        onChange={(e) => updateTower(tower.id, 'name', e.target.value)}
                                        placeholder="e.g. Tower A"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Total Floors</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        value={tower.floors}
                                        onChange={(e) => updateTower(tower.id, 'floors', parseInt(e.target.value) || 0)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Units per Floor</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        value={tower.unitsPerFloor}
                                        onChange={(e) => updateTower(tower.id, 'unitsPerFloor', parseInt(e.target.value) || 0)}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleRemoveTower(tower.id)}
                                disabled={towers.length === 1}
                                className={`mt-6 p-2 rounded-md transition-colors ${towers.length === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:bg-red-50 hover:text-red-700'}`}
                                title="Remove Tower"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>

                <Button type="button" variant="secondary" onClick={handleAddTower} className="w-full border-dashed">
                    <Plus size={18} className="mr-2" /> Add Another Tower
                </Button>

                <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={loading} disabled={totalUnitsGenerated === 0}>
                        Generate Setup
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
