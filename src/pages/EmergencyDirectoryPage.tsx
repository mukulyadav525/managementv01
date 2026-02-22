import React, { useState } from 'react';
import { Phone, Shield, LifeBuoy, Heart, Wrench, Search, MapPin, Plus, Trash2, X } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, Button } from '@/components/common';
import { EmergencyService } from '@/services/supabase.service';
import { useAuthStore } from '@/stores/authStore';
import { EmergencyContact } from '@/types';
import toast from 'react-hot-toast';

export const EmergencyDirectoryPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState<any>({
        category: 'society'
    });

    React.useEffect(() => {
        if (user?.societyId) {
            loadContacts();
        }
    }, [user]);

    const loadContacts = async () => {
        setLoading(true);
        try {
            const data = await EmergencyService.getContacts(user!.societyId);
            setContacts(data as EmergencyContact[]);
        } catch (error) {
            toast.error('Failed to load contacts');
        } finally {
            setLoading(false);
        }
    };

    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this contact?')) return;
        try {
            await EmergencyService.deleteContact(id);
            toast.success('Contact deleted');
            loadContacts();
        } catch (error) {
            toast.error('Delete failed');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await EmergencyService.createContact({
                ...formData,
                societyId: user!.societyId
            });

            toast.success('Contact added successfully');
            setShowModal(false);
            setFormData({ category: 'society' });
            loadContacts();
        } catch (error) {
            toast.error('Failed to add contact');
        } finally {
            setSubmitting(false);
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'emergency': return <Shield className="text-red-500" size={24} />;
            case 'society': return <LifeBuoy className="text-blue-500" size={24} />;
            case 'medical': return <Heart className="text-green-500" size={24} />;
            case 'essential': return <Wrench className="text-orange-500" size={24} />;
            default: return <Phone className="text-gray-500" size={24} />;
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'emergency': return 'bg-red-50 border-red-100';
            case 'society': return 'bg-blue-50 border-blue-100';
            case 'medical': return 'bg-green-50 border-green-100';
            case 'essential': return 'bg-orange-50 border-orange-100';
            default: return 'bg-gray-50 border-gray-100';
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Emergency Directory</h1>
                        <p className="text-gray-600 mt-1">Quick access to essential services and society helpdesk</p>
                    </div>
                    {user?.role === 'admin' && (
                        <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
                            <Plus size={20} />
                            Add Contact
                        </Button>
                    )}
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-gray-100 rounded-2xl" />)}
                    </div>
                ) : (
                    <>
                        {/* Quick Search */}
                        <div className="max-w-xl">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by name, category, or service..."
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Emergency Hotline (Standout Cards) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {contacts.filter(c => c.category === 'emergency').map(contact => (
                                <div key={contact.id} className="bg-red-600 rounded-2xl p-6 text-white shadow-lg shadow-red-200 hover:scale-[1.02] transition-transform cursor-pointer overflow-hidden relative group">
                                    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                                        <Shield size={120} />
                                    </div>
                                    <p className="text-red-100 text-sm font-medium uppercase tracking-wider mb-1">{contact.name}</p>
                                    <div className="flex justify-between items-start">
                                        <h2 className="text-3xl font-black mb-4">{contact.phone}</h2>
                                        {user?.role === 'admin' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(contact.id); }}
                                                className="p-1.5 bg-white/10 hover:bg-white/30 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <a
                                        href={`tel:${contact.phone}`}
                                        className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-bold backdrop-blur-sm transition-colors"
                                    >
                                        <Phone size={16} />
                                        Call Now
                                    </a>
                                </div>
                            ))}
                        </div>

                        {/* Directory Sections */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {['society', 'medical', 'essential'].map(cat => {
                                const sectionContacts = filteredContacts.filter(c => c.category === cat);
                                if (sectionContacts.length === 0) return null;

                                return (
                                    <Card key={cat} className="flex flex-col h-full border-none shadow-sm shadow-gray-200">
                                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${getCategoryColor(cat)}`}>
                                                    {getCategoryIcon(cat)}
                                                </div>
                                                <h3 className="font-bold text-lg text-gray-900 capitalize">{cat} Services</h3>
                                            </div>
                                            <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">{sectionContacts.length} Contacts</span>
                                        </div>
                                        <div className="p-2 flex-1">
                                            {sectionContacts.map(contact => (
                                                <div key={contact.id} className="p-3 hover:bg-gray-50 rounded-xl transition-colors group">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{contact.name}</h4>
                                                            {contact.role && <p className="text-xs text-gray-500 font-medium italic">{contact.role}</p>}
                                                        </div>
                                                        <a
                                                            href={`tel:${contact.phone}`}
                                                            className="p-2 bg-gray-100 text-gray-600 hover:bg-primary-600 hover:text-white rounded-full transition-all"
                                                        >
                                                            <Phone size={14} />
                                                        </a>
                                                        {user?.role === 'admin' && (
                                                            <button
                                                                onClick={() => handleDelete(contact.id)}
                                                                className="p-2 bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-full transition-all"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {contact.description && <p className="text-sm text-gray-600 mb-3">{contact.description}</p>}
                                                    <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-50 mt-1">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-gray-400">Primary:</span>
                                                            <span className="font-mono font-bold text-gray-900">{contact.phone}</span>
                                                        </div>
                                                        {contact.email && (
                                                            <div className="flex items-center justify-between text-sm">
                                                                <span className="text-gray-400">Email:</span>
                                                                <span className="text-primary-600 hover:underline cursor-pointer">{contact.email}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Help Notice */}
                        <div className="bg-primary-50 rounded-2xl p-6 border border-primary-100 flex flex-col md:flex-row items-center gap-6">
                            <div className="bg-white p-4 rounded-xl shadow-sm">
                                <MapPin className="text-primary-600" size={32} />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h4 className="font-bold text-gray-900 text-lg">Suggest a Contact?</h4>
                                <p className="text-gray-600">If you want to add a new emergency number or local service to this directory, please inform the society admin.</p>
                            </div>
                            <Button variant="secondary" className="whitespace-nowrap">
                                Contact Admin
                            </Button>
                        </div>
                    </>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg">
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Add New Contact</h3>
                                <button type="button" onClick={() => setShowModal(false)}><X /></button>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Name / Service</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-4 py-2 border rounded-xl"
                                        value={formData.name || ''}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Electrician, Water Tanker"
                                    />
                                </div>

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

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Email (Optional)</label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-2 border rounded-xl"
                                        value={formData.email || ''}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>

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
                                    {submitting ? 'Adding...' : 'Add Contact'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </Layout>
    );
};
