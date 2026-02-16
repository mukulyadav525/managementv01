import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@/components/common';
import { CCTVCamera } from '@/types';
import { CCTVService } from '@/services/supabase.service';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface CCTVModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    camera?: CCTVCamera;
}

export const CCTVModal: React.FC<CCTVModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    camera
}) => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        location: '',
        streamUrl: '',
        recordingUrl: '',
        isActive: true,
        societyId: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (camera) {
                setFormData({
                    name: camera.name,
                    location: camera.location || '',
                    streamUrl: camera.streamUrl || '',
                    recordingUrl: camera.recordingUrl || '',
                    isActive: camera.isActive,
                    societyId: camera.societyId
                });
            } else {
                setFormData({
                    name: '',
                    location: '',
                    streamUrl: '',
                    recordingUrl: '',
                    isActive: true,
                    societyId: user?.societyId || ''
                });
            }
        }
    }, [isOpen, camera, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.societyId) return;

        if (!formData.name) {
            return toast.error('Camera name is required');
        }

        setLoading(true);
        try {
            if (camera) {
                await CCTVService.updateCamera(camera.id, formData);
                toast.success('Camera updated successfully');
            } else {
                await CCTVService.createCamera({
                    ...formData,
                    societyId: user.societyId
                });
                toast.success('Camera added successfully');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save camera');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={camera ? 'Edit CCTV Camera' : 'Add New CCTV Camera'}
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Camera Name *"
                    placeholder="e.g. Main Gate Entry"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                />

                <Input
                    label="Location"
                    placeholder="e.g. Block A, Basement Entrance"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />

                <div className="space-y-1">
                    <Input
                        label="Stream URL (Embed Link)"
                        placeholder="e.g. https://www.youtube.com/embed/..."
                        value={formData.streamUrl}
                        onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 pl-1">
                        Provide an embeddable URL for the live stream (YouTube, IP Camera portal, etc.)
                    </p>
                </div>

                <Input
                    label="Recording / History Link (Optional)"
                    placeholder="Link to cloud recordings"
                    value={formData.recordingUrl}
                    onChange={(e) => setFormData({ ...formData, recordingUrl: e.target.value })}
                />

                <div className="flex items-center gap-2 py-2">
                    <input
                        type="checkbox"
                        id="isActive"
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                        Camera is Active
                    </label>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={loading}>
                        {camera ? 'Update Camera' : 'Add Camera'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
