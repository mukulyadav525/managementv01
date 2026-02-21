import React, { useState } from 'react';
import { Phone, Shield, LifeBuoy, Heart, Wrench, Search, MapPin } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, Button } from '@/components/common';

interface EmergencyContact {
    id: string;
    category: 'emergency' | 'society' | 'medical' | 'essential';
    name: string;
    role?: string;
    phone: string;
    phone2?: string;
    email?: string;
    description?: string;
}

export const EmergencyDirectoryPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');

    const contacts: EmergencyContact[] = [
        // Emergency Services
        { id: '1', category: 'emergency', name: 'Police Control Room', phone: '100', description: 'National emergency number for police' },
        { id: '2', category: 'emergency', name: 'Fire Station', phone: '101', description: 'National emergency number for fire services' },
        { id: '3', category: 'emergency', name: 'Ambulance', phone: '102', description: 'National emergency number for medical emergencies' },
        { id: '4', category: 'emergency', name: 'Women Helpline', phone: '1091', description: '24/7 helpline for women in distress' },

        // Society Specific
        { id: 's1', category: 'society', name: 'Security Main Gate', role: 'Security Office', phone: '011-2345-6789', description: '24/7 Security desk at main entrance' },
        { id: 's2', category: 'society', name: 'Society Manager', role: 'Admin Office', phone: '+91-98765-43210', email: 'manager@society.com', description: 'Office hours: 10 AM - 6 PM' },
        { id: 's3', category: 'society', name: 'Maintenance Desk', role: 'Helpdesk', phone: '+91-98765-43211', description: 'For plumbing, electrical, and lift issues' },

        // Medical & Essential
        { id: 'm1', category: 'medical', name: 'City Hospital', phone: '011-4567-8900', description: 'Nearest Multi-speciality Hospital (2.5 km)' },
        { id: 'm2', category: 'medical', name: 'Apollo Pharmacy', phone: '011-4567-8901', description: '24/7 Pharmacy with home delivery' },
        { id: 'e1', category: 'essential', name: 'Electricity Board', role: 'Local Division', phone: '1912', description: 'Power outage and fault reporting' },
        { id: 'e2', category: 'essential', name: 'Water Department', role: 'Municipal Corp', phone: '1916', description: 'Water supply complaints' },
    ];

    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Emergency Directory</h1>
                    <p className="text-gray-600 mt-1">Quick access to essential services and society helpdesk</p>
                </div>

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
                            <h2 className="text-3xl font-black mb-4">{contact.phone}</h2>
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
            </div>
        </Layout>
    );
};
