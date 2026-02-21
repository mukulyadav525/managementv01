import React, { useState, useEffect } from 'react';
import {
    Layout
} from '@/components/layout/Layout';
import {
    Card,
    Button
} from '@/components/common';
import {
    Plus,
    Trash2,
    Edit2,
    Heart,
    Phone,
    Vote,
    FolderOpen,
    X
} from 'lucide-react';
import {
    AmenityService,
    EmergencyService,
    PollService,
    DocumentService
} from '@/services/supabase.service';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import {
    Amenity,
    EmergencyContact,
    Poll,
    Document as DocType
} from '@/types';

export const AdminManagementPage: React.FC = () => {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'amenities' | 'contacts' | 'polls' | 'docs'>('amenities');
    const [loading, setLoading] = useState(true);

    // Data states
    const [amenities, setAmenities] = useState<Amenity[]>([]);
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [polls, setPolls] = useState<Poll[]>([]);
    const [docs, setDocs] = useState<DocType[]>([]);

    // Modal/Form states
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (user?.societyId) {
            loadData();
        }
    }, [user, activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'amenities') {
                const data = await AmenityService.getAmenities(user!.societyId);
                setAmenities(data as Amenity[]);
            } else if (activeTab === 'contacts') {
                const data = await EmergencyService.getContacts(user!.societyId);
                setContacts(data as EmergencyContact[]);
            } else if (activeTab === 'polls') {
                const data = await PollService.getPolls(user!.societyId);
                setPolls(data as Poll[]);
            } else if (activeTab === 'docs') {
                const data = await DocumentService.getDocumentsEx(user!.societyId, 'society');
                setDocs(data as DocType[]);
            }
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const data = { ...formData, societyId: user!.societyId };

            if (activeTab === 'amenities') {
                await AmenityService.createAmenity({
                    ...data,
                    bookingType: data.bookingType || 'slot',
                    status: data.status || 'available',
                    pricePerHour: Number(data.pricePerHour) || 0,
                    capacity: Number(data.capacity) || 0,
                    rules: data.rules ? data.rules.split(',').map((r: string) => r.trim()) : []
                });
            } else if (activeTab === 'contacts') {
                await EmergencyService.createContact(data);
            } else if (activeTab === 'polls') {
                const options = data.optionsString ? data.optionsString.split(',').map((o: string) => o.trim()) : ['Yes', 'No'];
                delete data.optionsString;
                await PollService.createPoll({
                    ...data,
                    createdBy: user!.uid,
                    status: 'active'
                }, options);
            } else if (activeTab === 'docs') {
                await DocumentService.createDocumentEx({
                    ...data,
                    category: 'society',
                    uploadedBy: user!.name
                });
            }

            toast.success(`${activeTab.slice(0, -1)} created successfully`);
            setShowModal(false);
            setFormData({});
            loadData();
        } catch (error) {
            toast.error('Failed to create item');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;

        try {
            if (activeTab === 'amenities') await AmenityService.deleteAmenity(id);
            if (activeTab === 'contacts') await EmergencyService.deleteContact(id);
            if (activeTab === 'polls') await PollService.deletePoll(id);
            if (activeTab === 'docs') await DocumentService.deleteDocumentEx(id);

            toast.success('Item deleted');
            loadData();
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Society Management</h1>
                        <p className="text-gray-600 mt-1">Manage community features and information</p>
                    </div>
                    <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
                        <Plus size={20} />
                        Add New {activeTab.slice(0, -1)}
                    </Button>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-gray-100 rounded-2xl w-fit">
                    {(['amenities', 'contacts', 'polls', 'docs'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${activeTab === tab
                                ? 'bg-white text-primary-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                        {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-3xl" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {activeTab === 'amenities' && amenities.map(amt => (
                            <Card key={amt.id} className="group overflow-hidden">
                                <div className="p-5">
                                    <div className="flex justify-between mb-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                            <Heart size={24} />
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="text-gray-400 hover:text-primary-600"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(amt.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-gray-900">{amt.name}</h4>
                                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{amt.description}</p>
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-xs font-bold text-gray-400">
                                        <span>{amt.status}</span>
                                        <span className="text-primary-600">₹{amt.pricePerHour}/hr</span>
                                    </div>
                                </div>
                            </Card>
                        ))}

                        {activeTab === 'contacts' && contacts.map(contact => (
                            <Card key={contact.id}>
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                                            <Phone size={24} />
                                        </div>
                                        <button onClick={() => handleDelete(contact.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                                    </div>
                                    <h4 className="font-bold text-gray-900">{contact.name}</h4>
                                    <p className="text-sm text-gray-500 font-medium">{contact.role}</p>
                                    <p className="text-lg font-mono font-black text-primary-600 mt-2">{contact.phone}</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2">{contact.category}</p>
                                </div>
                            </Card>
                        ))}

                        {activeTab === 'polls' && polls.map(poll => (
                            <Card key={poll.id}>
                                <div className="p-5">
                                    <div className="flex justify-between mb-4">
                                        <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                                            <Vote size={24} />
                                        </div>
                                        <button onClick={() => handleDelete(poll.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                                    </div>
                                    <h4 className="font-bold text-gray-900">{poll.title}</h4>
                                    <div className="mt-3 space-y-2">
                                        {poll.options?.map((opt: any) => (
                                            <div key={opt.id} className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded-lg">
                                                <span>{opt.text}</span>
                                                <span className="font-bold text-primary-600">{poll.votes?.filter((v: any) => v.optionId === opt.id).length || 0} votes</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-50 text-[10px] text-gray-400 font-bold uppercase">
                                        Ends: {poll.endsAt ? new Date(poll.endsAt).toLocaleDateString() : 'No expiry'}
                                    </div>
                                </div>
                            </Card>
                        ))}

                        {activeTab === 'docs' && docs.map(doc => (
                            <Card key={doc.id}>
                                <div className="p-5">
                                    <div className="flex justify-between mb-4">
                                        <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                                            <FolderOpen size={24} />
                                        </div>
                                        <button onClick={() => handleDelete(doc.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                                    </div>
                                    <h4 className="font-bold text-gray-900 truncate" title={doc.name}>{doc.name}</h4>
                                    <p className="text-xs text-gray-500 mt-1">{doc.docType} • {doc.fileSize}</p>
                                    <div className="mt-4 flex gap-2">
                                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                                            <Button variant="secondary" className="w-full text-xs py-2 scale-90">View</Button>
                                        </a>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg">
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Add New {activeTab.slice(0, -1)}</h3>
                                <button type="button" onClick={() => setShowModal(false)}><X /></button>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Name / Title</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-4 py-2 border rounded-xl"
                                        value={formData.name || formData.title || ''}
                                        onChange={(e) => setFormData({ ...formData, [activeTab === 'polls' ? 'title' : 'name']: e.target.value })}
                                        placeholder={activeTab === 'polls' ? 'Poll Title' : 'Item Name'}
                                    />
                                </div>

                                {activeTab === 'amenities' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2 border rounded-xl"
                                                    value={formData.location || ''}
                                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Price/hr</label>
                                                <input
                                                    type="number"
                                                    className="w-full px-4 py-2 border rounded-xl"
                                                    value={formData.pricePerHour || ''}
                                                    onChange={(e) => setFormData({ ...formData, pricePerHour: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Capacity</label>
                                                <input
                                                    type="number"
                                                    className="w-full px-4 py-2 border rounded-xl"
                                                    value={formData.capacity || ''}
                                                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Booking Type</label>
                                                <select
                                                    className="w-full px-4 py-2 border rounded-xl"
                                                    value={formData.bookingType || 'slot'}
                                                    onChange={(e) => setFormData({ ...formData, bookingType: e.target.value })}
                                                >
                                                    <option value="slot">Slot-based</option>
                                                    <option value="full_day">Full Day</option>
                                                </select>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {activeTab === 'contacts' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Role / Office</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2 border rounded-xl"
                                                    value={formData.role || ''}
                                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Phone</label>
                                                <input
                                                    required
                                                    type="text"
                                                    className="w-full px-4 py-2 border rounded-xl"
                                                    value={formData.phone || ''}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                                            <select
                                                className="w-full px-4 py-2 border rounded-xl"
                                                value={formData.category || 'society'}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            >
                                                <option value="emergency">Emergency</option>
                                                <option value="society">Society</option>
                                                <option value="medical">Medical</option>
                                                <option value="essential">Essential</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                {activeTab === 'polls' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                                            <select
                                                className="w-full px-4 py-2 border rounded-xl"
                                                value={formData.category || 'general'}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            >
                                                <option value="general">General</option>
                                                <option value="financial">Financial</option>
                                                <option value="event">Event</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Ends At</label>
                                            <input
                                                type="date"
                                                className="w-full px-4 py-2 border rounded-xl"
                                                value={formData.endsAt || ''}
                                                onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Options (Comma separated)</label>
                                            <input
                                                required
                                                type="text"
                                                className="w-full px-4 py-2 border rounded-xl"
                                                value={formData.optionsString || ''}
                                                onChange={(e) => setFormData({ ...formData, optionsString: e.target.value })}
                                                placeholder="e.g. Yes, No, Maybe"
                                            />
                                        </div>
                                    </>
                                )}

                                {activeTab === 'docs' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Doc Type</label>
                                                <input
                                                    placeholder="e.g. PDF, Image"
                                                    type="text"
                                                    className="w-full px-4 py-2 border rounded-xl"
                                                    value={formData.docType || ''}
                                                    onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">File Size</label>
                                                <input
                                                    placeholder="e.g. 1.2 MB"
                                                    type="text"
                                                    className="w-full px-4 py-2 border rounded-xl"
                                                    value={formData.fileSize || ''}
                                                    onChange={(e) => setFormData({ ...formData, fileSize: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">File URL</label>
                                            <input
                                                required
                                                type="text"
                                                className="w-full px-4 py-2 border rounded-xl"
                                                value={formData.fileUrl || ''}
                                                onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                                                placeholder="Link to file"
                                            />
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                                    <textarea
                                        className="w-full px-4 py-2 border rounded-xl"
                                        rows={2}
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                                <Button type="submit" disabled={submitting} className="flex-1">
                                    {submitting ? 'Creating...' : 'Create Item'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </Layout>
    );
};
