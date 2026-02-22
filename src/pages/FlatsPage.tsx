import React, { useEffect, useState } from 'react';
import { Plus, Building as BuildingIcon, Edit2, Trash2, Home } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button, Card, Modal, Input } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { SocietyService, toSnake } from '@/services/supabase.service';
import { Flat, Building } from '@/types';
import { supabase } from '@/config/supabase';
import toast from 'react-hot-toast';
import { predictFloor } from '@/utils/flat.utils';
import { BulkUnitGeneratorModal } from '@/components/society/BulkUnitGeneratorModal';
import { AssignOccupantsModal } from '@/components/society/AssignOccupantsModal';

export const FlatsPage: React.FC = () => {
    const { user } = useAuthStore();
    const [flats, setFlats] = useState<Flat[]>([]);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [residents, setResidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showBuildingListModal, setShowBuildingListModal] = useState(false);
    const [showBuildingModal, setShowBuildingModal] = useState(false);
    const [showBulkGeneratorModal, setShowBulkGeneratorModal] = useState(false);
    const [assignOccupantsUnit, setAssignOccupantsUnit] = useState<Flat | null>(null);
    const [editingFlat, setEditingFlat] = useState<Flat | null>(null);
    const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
    const [selectedFlats, setSelectedFlats] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (user?.societyId) {
            loadInitialData();
        }
    }, [user]);

    const loadInitialData = async () => {
        if (!user?.societyId) return;
        try {
            setLoading(true);

            // Fetch flats
            try {
                const flatsData = user.role === 'owner'
                    ? await SocietyService.getOwnedFlats(user.uid)
                    : await SocietyService.getFlats(user.societyId);
                setFlats(flatsData as Flat[]);
            } catch (err: any) {
                console.error('Error loading flats:', err);
                toast.error('Failed to load flats data. Please check permissions.');
            }

            // Fetch buildings
            try {
                const buildingsData = await SocietyService.getBuildings(user.societyId);
                setBuildings(buildingsData as Building[]);
            } catch (err: any) {
                console.error('Error loading buildings:', err);
                toast.error('Failed to load building data. Please check permissions.');
            }

            // Fetch residents for owner/tenant name display
            try {
                const { data: usersData } = await supabase
                    .from('users')
                    .select('uid, name, role')
                    .eq('society_id', user.societyId);
                setResidents(usersData || []);
            } catch (err: any) {
                console.error('Error loading residents:', err);
            }

        } catch (error) {
            console.error('Core loading error:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const loadFlats = async () => {
        if (!user?.societyId) return;
        try {
            let data;
            if (user.role === 'owner') {
                data = await SocietyService.getOwnedFlats(user.uid);
            } else {
                data = await SocietyService.getFlats(user.societyId);
            }
            setFlats(data as Flat[]);
        } catch (error) {
            console.error('Error loading flats:', error);
            toast.error('Failed to load flats');
        }
    };

    const handleSaveFlat = async (formData: any) => {
        if (!user?.societyId) return;

        try {
            const flatData = {
                ...formData,
                societyId: user.societyId,
                updatedAt: new Date().toISOString()
            };

            if (editingFlat) {
                const { error } = await supabase
                    .from('flats')
                    .update(toSnake(flatData))
                    .eq('id', editingFlat.id);
                if (error) throw error;
                toast.success('Flat updated successfully');
            } else {
                const { error } = await supabase
                    .from('flats')
                    .insert([toSnake({
                        ...flatData,
                        id: crypto.randomUUID(),
                        createdAt: new Date().toISOString()
                    })]);
                if (error) throw error;
                toast.success('Flat added successfully');
            }
            setShowModal(false);
            setEditingFlat(null);
            loadFlats();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save flat');
        }
    };

    const handleDeleteFlat = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this flat?')) return;

        try {
            const { error } = await supabase.from('flats').delete().eq('id', id);
            if (error) throw error;
            toast.success('Flat deleted');
            setSelectedFlats(new Set());
            loadFlats();
        } catch (error) {
            toast.error('Failed to delete flat');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedFlats.size === 0) return;
        if (!window.confirm(`Delete ${selectedFlats.size} selected unit(s)? This cannot be undone.`)) return;
        try {
            const ids = Array.from(selectedFlats);
            const { error } = await supabase.from('flats').delete().in('id', ids);
            if (error) throw error;
            toast.success(`${ids.length} unit(s) deleted`);
            setSelectedFlats(new Set());
            loadFlats();
        } catch (error) {
            toast.error('Failed to delete selected units');
        }
    };

    const toggleSelectFlat = (id: string) => {
        setSelectedFlats(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedFlats.size === flats.length) {
            setSelectedFlats(new Set());
        } else {
            setSelectedFlats(new Set(flats.map(f => f.id)));
        }
    };

    const handleSaveBuilding = async (formData: any) => {
        if (!user?.societyId) return;
        // Extract bhkType — it's not a buildings column, only used to bulk-update flats
        const { bhkType, ...buildingData } = formData;
        try {
            if (editingBuilding) {
                await SocietyService.updateBuilding(editingBuilding.id, buildingData);
                // Propagate BHK update to all existing flats in this building
                if (bhkType) {
                    await supabase
                        .from('flats')
                        .update({ bhk_type: bhkType })
                        .eq('building_id', editingBuilding.id);
                }
                toast.success('Building updated and unit types refreshed');
            } else {
                await SocietyService.createBuilding(user.societyId, buildingData);
                toast.success('Building added');
            }
            setShowBuildingModal(false);
            await loadInitialData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save building');
        }
    };

    const handleDeleteBuilding = async (id: string) => {
        if (!window.confirm('Are you sure? Removing a building will not delete individual flats, but will break their building reference.')) return;
        try {
            await SocietyService.deleteBuilding(id);
            toast.success('Building removed');
            loadInitialData();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete building');
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {user?.role === 'owner' ? 'My Flats' : 'Property Management'}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {user?.role === 'owner' ? 'View your allotted flats' : 'Manage buildings and flats in the society'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {user?.role === 'admin' && (
                            <>
                                {selectedFlats.size > 0 && (
                                    <Button variant="danger" onClick={handleBulkDelete}>
                                        <Trash2 size={18} className="mr-2" />
                                        Delete {selectedFlats.size} Selected
                                    </Button>
                                )}
                                <Button variant="secondary" onClick={() => setShowBuildingListModal(true)}>
                                    <BuildingIcon size={20} className="mr-2" />
                                    Manage Buildings
                                </Button>
                                <Button variant="secondary" onClick={() => setShowBulkGeneratorModal(true)}>
                                    <BuildingIcon size={20} className="mr-2" />
                                    Bulk Setup Units
                                </Button>
                                <Button onClick={() => { setEditingFlat(null); setShowModal(true); }}>
                                    <Plus size={20} className="mr-2" />
                                    Add Unit
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                            <BuildingIcon size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Buildings</p>
                            <p className="text-2xl font-bold">{buildings.length}</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                            <Home size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Flats</p>
                            <p className="text-2xl font-bold">{flats.length}</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                            <Home size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Occupied</p>
                            <p className="text-2xl font-bold">
                                {flats.filter(f => f.occupancyStatus !== 'vacant').length}
                            </p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
                            <Home size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Vacant</p>
                            <p className="text-2xl font-bold">
                                {flats.filter(f => f.occupancyStatus === 'vacant').length}
                            </p>
                        </div>
                    </Card>
                </div>

                <Card>
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        {user?.role === 'admin' && (
                                            <th className="px-4 py-3">
                                                <input type="checkbox"
                                                    checked={flats.length > 0 && selectedFlats.size === flats.length}
                                                    onChange={toggleSelectAll}
                                                    className="w-4 h-4 cursor-pointer"
                                                />
                                            </th>
                                        )}
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Flat No</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Building</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Floor</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Occupant</th>
                                        {user?.role === 'admin' && (
                                            <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {flats.length > 0 ? flats.map((flat) => {
                                        const building = buildings.find(b => b.id === flat.buildingId);
                                        const owner = residents.find((r: any) => r.uid === flat.ownerId);
                                        const tenant = residents.find((r: any) => r.uid === flat.tenantId);
                                        return (
                                            <tr key={flat.id} className={`hover:bg-gray-50 ${selectedFlats.has(flat.id) ? 'bg-blue-50' : ''}`}>
                                                {user?.role === 'admin' && (
                                                    <td className="px-4 py-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedFlats.has(flat.id)}
                                                            onChange={() => toggleSelectFlat(flat.id)}
                                                            className="w-4 h-4 cursor-pointer"
                                                        />
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 font-medium">{flat.flatNumber}</td>
                                                <td className="px-6 py-4">{building?.name || '--'}</td>
                                                <td className="px-6 py-4">{flat.bhkType}</td>
                                                <td className="px-6 py-4">{flat.floor}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${flat.occupancyStatus === 'vacant' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                                                        }`}>
                                                        {flat.occupancyStatus === 'owner-occupied' ? 'Owner Occupied' :
                                                            flat.occupancyStatus === 'rented' ? 'Tenant Occupied' :
                                                                'Vacant'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {owner ? (
                                                        <div className="text-sm font-medium text-gray-800">{owner.name}</div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    )}
                                                    {tenant && (
                                                        <div className="text-xs text-blue-500">+ {tenant.name} (tenant)</div>
                                                    )}
                                                </td>
                                                {user?.role === 'admin' && (
                                                    <td className="px-6 py-4 space-x-2">
                                                        <button
                                                            onClick={() => setAssignOccupantsUnit(flat)}
                                                            className="text-primary-600 hover:text-primary-800 text-sm font-medium border border-primary-200 px-2 py-1 rounded bg-primary-50"
                                                        >
                                                            Assign Occupants
                                                        </button>
                                                        <button onClick={() => { setEditingFlat(flat); setShowModal(true); }} className="text-blue-600 hover:text-blue-800">
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button onClick={() => handleDeleteFlat(flat.id)} className="text-red-600 hover:text-red-800">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                No flats found. Add buildings and flats to get started.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                {showModal && (
                    <FlatModal
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        onSubmit={handleSaveFlat}
                        initialData={editingFlat}
                        buildings={buildings}
                        societyType={user?.societyType}
                    />
                )}

                {showBulkGeneratorModal && user?.societyId && (
                    <BulkUnitGeneratorModal
                        isOpen={showBulkGeneratorModal}
                        onClose={() => setShowBulkGeneratorModal(false)}
                        societyId={user.societyId}
                        onSuccess={loadInitialData}
                    />
                )}

                {assignOccupantsUnit && user?.societyId && (
                    <AssignOccupantsModal
                        isOpen={!!assignOccupantsUnit}
                        onClose={() => setAssignOccupantsUnit(null)}
                        unit={assignOccupantsUnit}
                        societyId={user.societyId}
                        societyType={user.societyType}
                        onSuccess={loadFlats}
                    />
                )}

                {showBuildingListModal && (
                    <BuildingListModal
                        isOpen={showBuildingListModal}
                        onClose={() => setShowBuildingListModal(false)}
                        buildings={buildings}
                        onAdd={() => { setEditingBuilding(null); setShowBuildingModal(true); }}
                        onEdit={(b) => { setEditingBuilding(b); setShowBuildingModal(true); }}
                        onDelete={handleDeleteBuilding}
                    />
                )}

                {showBuildingModal && (
                    <BuildingModal
                        isOpen={showBuildingModal}
                        onClose={() => setShowBuildingModal(false)}
                        onSubmit={handleSaveBuilding}
                        initialData={editingBuilding}
                    />
                )}
            </div>
        </Layout>
    );
};

const BuildingListModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    buildings: Building[];
    onAdd: () => void;
    onEdit: (b: Building) => void;
    onDelete: (id: string) => void;
}> = ({ isOpen, onClose, buildings, onAdd, onEdit, onDelete }) => (
    <Modal isOpen={isOpen} onClose={onClose} title="Society Buildings">
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button size="sm" onClick={onAdd}>
                    <Plus size={16} className="mr-1" /> Add Building
                </Button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
                {buildings.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No buildings added yet.</p>
                ) : (
                    <div className="divide-y">
                        {buildings.map(b => (
                            <div key={b.id} className="py-3 flex justify-between items-center group">
                                <div>
                                    <h4 className="font-medium text-gray-900">{b.name}</h4>
                                    <p className="text-xs text-gray-500">{b.totalFloors} Floors • {b.totalFlats || 0} Flats</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onEdit(b)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => onDelete(b.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="pt-4">
                <Button variant="secondary" onClick={onClose} className="w-full">Close</Button>
            </div>
        </div>
    </Modal>
);

const BuildingModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData?: Building | null;
}> = ({ isOpen, onClose, onSubmit, initialData }) => {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        totalFloors: initialData?.totalFloors || 1,
        totalFlats: initialData?.totalFlats || 0,
        bhkType: '2BHK' // Added BHK Type for bulk updates
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Building' : 'Add New Building'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Building Name"
                    placeholder="e.g. Building A, Wing B"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                />
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Total Floors"
                        type="number"
                        min={1}
                        value={formData.totalFloors}
                        onChange={(e) => setFormData({ ...formData, totalFloors: parseInt(e.target.value) || 1 })}
                        required
                    />
                    <Input
                        label="Capacity (Flats)"
                        type="number"
                        min={0}
                        value={formData.totalFlats}
                        onChange={(e) => setFormData({ ...formData, totalFlats: parseInt(e.target.value) || 0 })}
                        required
                    />
                </div>
                {initialData && (
                    <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm">
                        <p className="font-semibold mb-1">Update Units Feature</p>
                        <p>Change the BHK Type below to apply it to <strong>all</strong> existing flats in this building instantly.</p>
                    </div>
                )}
                <Input
                    label="Default BHK Type"
                    value={formData.bhkType}
                    onChange={(e) => setFormData({ ...formData, bhkType: e.target.value })}
                    placeholder="e.g. 2BHK, 3BHK"
                    required
                />
                <div className="flex gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button type="submit" className="flex-1">Save Building</Button>
                </div>
            </form>
        </Modal>
    );
};

const FlatModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData?: Flat | null;
    buildings: Building[];
    societyType?: 'tower' | 'house';
}> = ({ isOpen, onClose, onSubmit, initialData, buildings, societyType }) => {
    const isHouse = societyType === 'house';

    const [formData, setFormData] = useState({
        buildingId: initialData?.buildingId || '',
        flatNumber: initialData?.flatNumber || '',
        floor: initialData?.floor ?? 1,
        totalFloors: initialData?.totalFloors || 1,
        unitType: isHouse ? 'house' : 'flat',
        bhkType: initialData?.bhkType || '2BHK',
        area: initialData?.area || 1200,
        occupancyStatus: (initialData?.occupancyStatus || 'vacant') as any
    });

    const selectedBuilding = buildings.find(b => b.id === formData.buildingId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!isHouse && !formData.buildingId) {
            return toast.error('Please select a building');
        }

        if (!isHouse && selectedBuilding) {
            if (formData.floor < 1) {
                return toast.error('Floor number must be at least 1');
            }
            if (formData.floor > selectedBuilding.totalFloors) {
                return toast.error(`Invalid floor. Building ${selectedBuilding.name} only has ${selectedBuilding.totalFloors} floors.`);
            }
        }

        if (isHouse && (!formData.totalFloors || formData.totalFloors < 1)) {
            return toast.error('Total floors for a house must be at least 1');
        }

        // Clean up data based on type
        const submitData = { ...formData };
        if (isHouse) {
            submitData.buildingId = null as any;
            submitData.floor = 0; // Or null, but keeping it 0 to avoid breaking sorting if any exists
        } else {
            submitData.totalFloors = null as any;
        }

        onSubmit(submitData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Flat' : 'Add New Flat'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {!isHouse && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Building <span className="text-red-500">*</span></label>
                        <select
                            value={formData.buildingId}
                            onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                            required={!isHouse}
                        >
                            <option value="">Select Building</option>
                            {buildings.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <Input
                    label={isHouse ? "House Number" : "Flat Number"}
                    value={formData.flatNumber}
                    onChange={(e) => {
                        const val = e.target.value;
                        const predicted = !isHouse ? predictFloor(val) : 0;
                        setFormData({
                            ...formData,
                            flatNumber: val,
                            floor: val ? (predicted || formData.floor) : formData.floor
                        });
                    }}
                    required
                />

                {isHouse ? (
                    <Input
                        label="Total Floors in House"
                        type="number"
                        min="1"
                        value={formData.totalFloors}
                        onChange={(e) => setFormData({ ...formData, totalFloors: parseInt(e.target.value) || 1 })}
                        required={isHouse}
                        helperText="The total number of levels available for allocation."
                    />
                ) : (
                    <Input
                        label="Floor"
                        type="number"
                        value={formData.floor}
                        onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 0 })}
                        required={!isHouse}
                        helperText={selectedBuilding ? `Predicted Floor: ${predictFloor(formData.flatNumber)} | Max Floors: ${selectedBuilding.totalFloors}` : `Predicted: ${predictFloor(formData.flatNumber)}`}
                    />
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">BHK Type</label>
                    <select
                        value={formData.bhkType}
                        onChange={(e) => setFormData({ ...formData, bhkType: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                    >
                        <option value="1BHK">1 BHK</option>
                        <option value="2BHK">2 BHK</option>
                        <option value="3BHK">3 BHK</option>
                        <option value="4BHK">4 BHK</option>
                    </select>
                </div>
                <Input
                    label="Area (sq ft)"
                    type="number"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: parseInt(e.target.value) || 0 })}
                    required
                />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                        value={formData.occupancyStatus}
                        onChange={(e) => setFormData({ ...formData, occupancyStatus: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                    >
                        <option value="vacant">Vacant</option>
                        <option value="owner-occupied">Owner Occupied</option>
                        <option value="rented">Tenant Occupied</option>
                    </select>
                </div>
                <div className="flex gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button type="submit" className="flex-1">Save Flat</Button>
                </div>
            </form>
        </Modal>
    );
};


