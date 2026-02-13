import React, { useEffect, useState } from 'react';
import { Bell, Plus, Trash2, Tag, Calendar } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button, Card, Modal, Input } from '@/components/common';
import { useAuthStore } from '@/stores/authStore';
import { AnnouncementService, toSnake } from '@/services/supabase.service';
import { Announcement } from '@/types';
import { supabase } from '@/config/supabase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export const AnnouncementsPage: React.FC = () => {
    const { user } = useAuthStore();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (user?.societyId) {
            loadAnnouncements();
        }
    }, [user]);

    const loadAnnouncements = async () => {
        if (!user?.societyId) return;
        try {
            setLoading(true);
            const data = await AnnouncementService.getAnnouncements(user.societyId);
            setAnnouncements(data as Announcement[]);
        } catch (error) {
            toast.error('Failed to load announcements');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAnnouncement = async (formData: any) => {
        if (!user?.societyId) return;
        try {
            const { error } = await supabase
                .from('announcements')
                .insert([toSnake({
                    title: formData.title,
                    content: formData.content,
                    category: formData.category,
                    priority: formData.priority,
                    societyId: user.societyId,
                    createdBy: user.uid,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                })]);
            if (error) throw error;
            toast.success('Announcement published');
            setShowModal(false);
            loadAnnouncements();
        } catch (error: any) {
            toast.error(error.message || 'Failed to publish announcement');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this announcement?')) return;
        try {
            await AnnouncementService.deleteAnnouncement(user!.societyId, id);
            toast.success('Announcement deleted');
            loadAnnouncements();
        } catch (error) {
            toast.error('Failed to delete announcement');
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-700';
            case 'normal': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
                        <p className="text-gray-600 mt-1">Broadcast news and updates to all residents</p>
                    </div>
                    {(user?.role === 'admin' || user?.role === 'security') && (
                        <Button onClick={() => setShowModal(true)}>
                            <Plus size={20} className="mr-2" />
                            New Announcement
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        </div>
                    ) : announcements.length === 0 ? (
                        <Card className="text-center py-12">
                            <Bell size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-500">No announcements yet</p>
                        </Card>
                    ) : (
                        announcements.map((announcement) => (
                            <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className={`p-3 rounded-lg ${getPriorityColor(announcement.priority)}`}>
                                            <Bell size={24} />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-bold text-gray-900">{announcement.title}</h3>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(announcement.priority)}`}>
                                                    {announcement.priority}
                                                </span>
                                            </div>
                                            <p className="text-gray-600">{announcement.content}</p>
                                            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                                                <div className="flex items-center gap-1 uppercase">
                                                    <Tag size={14} /> {announcement.category}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={14} /> {format(new Date(announcement.createdAt), 'MMM dd, yyyy')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {(user?.role === 'admin' || (user?.role === 'security' && announcement.createdBy === user.uid)) && (
                                        <button onClick={() => handleDelete(announcement.id)} className="text-red-400 hover:text-red-600">
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                </div>
                            </Card>
                        ))
                    )}
                </div>

                {showModal && (
                    <AnnouncementModal
                        isOpen={showModal}
                        onClose={() => setShowModal(false)}
                        onSubmit={handleAddAnnouncement}
                    />
                )}
            </div>
        </Layout>
    );
};

const AnnouncementModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData?: Announcement | null;
}> = ({ isOpen, onClose, onSubmit, initialData }) => {
    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        content: initialData?.content || '',
        category: initialData?.category || 'general',
        priority: initialData?.priority || 'normal'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Announcement">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Title"
                    placeholder="e.g. Annual General Meeting"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500 h-32"
                        placeholder="Detailed message..."
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        required
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                        >
                            <option value="general">General</option>
                            <option value="event">Event</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="security">Security</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-primary-500"
                        >
                            <option value="normal">Normal</option>
                            <option value="high">High / Urgent</option>
                        </select>
                    </div>
                </div>
                <div className="flex gap-3 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button type="submit" className="flex-1">Publish</Button>
                </div>
            </form>
        </Modal>
    );
};
