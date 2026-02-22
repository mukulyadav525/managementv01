import React, { useState, useEffect } from 'react';
import { FileText, Download, Shield, Eye, Search, Plus, Trash2, FolderOpen, Lock, Globe, X } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Card, Button, StatsCard } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

import { DocumentService } from '@/services/supabase.service';
import { Document as DocType } from '@/types';

export const DocumentsPage: React.FC = () => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'society' | 'personal'>('society');
    const [searchQuery, setSearchQuery] = useState('');
    const [documents, setDocuments] = useState<DocType[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (user?.societyId) {
            loadDocs();
        }
    }, [user]);

    const loadDocs = async () => {
        setLoading(true);
        try {
            // Fetch everything the user has access to
            const data = await DocumentService.getDocumentsEx(user!.societyId);
            setDocuments(data as DocType[]);
        } catch (error) {
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const filteredDocs = documents.filter(doc =>
        doc.category === activeTab &&
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this document?')) return;
        try {
            await DocumentService.deleteDocumentEx(id);
            toast.success('Document removed from vault');
            loadDocs();
        } catch (error) {
            toast.error('Failed to delete document');
        }
    };

    const handleUpload = () => {
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await DocumentService.createDocumentEx({
                ...formData,
                societyId: user!.societyId,
                category: activeTab,
                uploadedBy: user!.uid, // Use UUID
                ownerId: activeTab === 'personal' ? user!.uid : undefined // Use UUID
            });

            toast.success('Document uploaded successfully');
            setShowModal(false);
            setFormData({});
            loadDocs();
        } catch (error) {
            toast.error('Failed to upload document');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Layout>
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Document Vault</h1>
                        <p className="text-gray-600 mt-1">Access society documents and manage your personal files</p>
                    </div>
                    {(activeTab === 'personal' || ['admin', 'security'].includes(user?.role || '')) && (
                        <Button onClick={handleUpload} className="flex items-center gap-2">
                            <Plus size={20} />
                            Upload Document
                        </Button>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatsCard title="Total Documents" value={documents.length} icon={FolderOpen} color="blue" />
                    <StatsCard title="Society Docs" value={documents.filter(d => d.category === 'society').length} icon={Globe} color="green" />
                    <StatsCard title="Private Files" value={documents.filter(d => d.category === 'personal').length} icon={Lock} color="purple" />
                </div>

                {/* Filters & Tabs */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        <button
                            onClick={() => setActiveTab('society')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'society' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Society Documents
                        </button>
                        <button
                            onClick={() => setActiveTab('personal')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'personal' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Personal Vault
                        </button>
                    </div>
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Document Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-2xl"></div>)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredDocs.length === 0 ? (
                            <div className="col-span-full py-20 text-center flex flex-col items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                <FolderOpen className="text-gray-300 mb-4" size={64} />
                                <h3 className="text-xl font-bold text-gray-700">No documents found</h3>
                                <p className="text-sm text-gray-500 mt-2">Try adjusting your search or upload a new file.</p>
                            </div>
                        ) : (
                            filteredDocs.map(doc => (
                                <Card key={doc.id} className="group hover:shadow-lg transition-all border-none shadow-sm shadow-gray-200/50">
                                    <div className="p-5 flex flex-col h-full">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="bg-primary-50 text-primary-600 p-3 rounded-2xl group-hover:bg-primary-600 group-hover:text-white transition-colors">
                                                <FileText size={24} />
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <a
                                                    href={doc.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                                                >
                                                    <Eye size={16} />
                                                </a>
                                                <button
                                                    onClick={() => handleDelete(doc.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                    disabled={doc.category === 'society' && user?.role !== 'admin'}
                                                    title={doc.category === 'society' && user?.role !== 'admin' ? "Only admins can delete society documents" : "Delete"}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900 leading-tight mb-1 truncate" title={doc.name}>{doc.name}</h4>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-4">
                                                <span>{doc.docType}</span>
                                                {doc.fileSize && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{doc.fileSize}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-400 font-medium">Uploaded on</span>
                                                <span className="text-xs font-bold text-gray-700">{new Date(doc.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <a
                                                href={doc.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 bg-slate-900 text-white hover:bg-primary-600 rounded-xl transition-all shadow-md shadow-slate-200"
                                            >
                                                <Download size={16} />
                                            </a>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {/* Privacy Notice */}
                <div className="bg-slate-900 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-10 blur-2xl w-64 h-64 bg-primary-400 rounded-full"></div>
                    <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl text-primary-400">
                        <Shield size={40} />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h4 className="text-xl font-bold text-white mb-2">Secure & Private</h4>
                        <p className="text-slate-400 text-sm max-w-xl">
                            Personal documents are encrypted and visible only to you. Society documents are curated by authorized committee members to ensure transparency and trust in the community.
                        </p>
                    </div>
                    <Button variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100 min-w-[140px]">
                        Learn More
                    </Button>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg">
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Upload New {activeTab === 'society' ? 'Society' : 'Personal'} Document</h3>
                                <button type="button" onClick={() => setShowModal(false)}><X /></button>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Document Name</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-4 py-2 border rounded-xl"
                                        value={formData.name || ''}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Society Bylaws"
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Doc Type</label>
                                        <input
                                            placeholder="e.g. PDF, Image"
                                            required
                                            type="text"
                                            className="w-full px-4 py-2 border rounded-xl"
                                            value={formData.docType || ''}
                                            onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
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
                            </div>

                            <div className="flex gap-4">
                                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
                                <Button type="submit" disabled={submitting} className="flex-1">
                                    {submitting ? 'Uploading...' : 'Upload Document'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </Layout>
    );
};
