import { supabase } from '@/config/supabase';

// Helper to map snake_case to camelCase
export const toCamel = (obj: any): any => {
    if (obj instanceof Date) return obj;
    if (Array.isArray(obj)) return obj.map(toCamel);
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
            acc[camelKey] = toCamel(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
};

// Helper to map camelCase to snake_case
export const toSnake = (obj: any): any => {
    if (obj instanceof Date) return obj.toISOString();
    if (Array.isArray(obj)) return obj.map(toSnake);
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const snakeKey = key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
            acc[snakeKey] = toSnake(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
};

// Generic Supabase operations
export class SupabaseService {
    static async getDocument<T>(tableName: string, docId: string): Promise<T | null> {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .eq('id', docId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null; // Not found
                throw error;
            }
            return toCamel(data) as T;
        } catch (error) {
            console.error(`Error getting document from ${tableName}:`, error);
            throw error;
        }
    }

    static async getDocuments<T>(
        tableName: string,
        queryBuilder: (query: any) => any = (q) => q
    ): Promise<T[]> {
        try {
            let q = supabase.from(tableName).select('*');
            q = queryBuilder(q);
            const { data, error } = await q;

            if (error) throw error;
            return toCamel(data) as T[];
        } catch (error) {
            console.error(`Error getting documents from ${tableName}:`, error);
            throw error;
        }
    }

    static async createDocument<T>(tableName: string, data: Partial<T>): Promise<any> {
        try {
            const { data: insertedData, error } = await supabase
                .from(tableName)
                .insert([toSnake(data)])
                .select()
                .single();

            if (error) throw error;
            return toCamel(insertedData);
        } catch (error) {
            console.error(`Error creating document in ${tableName}:`, error);
            throw error;
        }
    }

    static async updateDocument<T>(
        tableName: string,
        docId: string,
        data: Partial<T>
    ): Promise<void> {
        try {
            const { error } = await supabase
                .from(tableName)
                .update(toSnake(data))
                .eq('id', docId);

            if (error) throw error;
        } catch (error) {
            console.error(`Error updating document in ${tableName}:`, error);
            throw error;
        }
    }

    static async deleteDocument(tableName: string, docId: string): Promise<void> {
        try {
            const { error } = await supabase
                .from(tableName)
                .delete()
                .eq('id', docId);

            if (error) throw error;
        } catch (error) {
            console.error(`Error deleting document from ${tableName}:`, error);
            throw error;
        }
    }
}

// Storage services
export class StorageService {
    static async uploadFile(file: File, bucket: string, path: string): Promise<string> {
        try {
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(path, file, {
                    upsert: true
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(data.path);

            return publicUrl;
        } catch (error) {
            console.error(`Error uploading file to ${bucket}:`, error);
            throw error;
        }
    }

    static async uploadMultipleFiles(files: File[], bucket: string, basePath: string): Promise<string[]> {
        const uploadPromises = files.map((file, index) => {
            const extension = file.name.split('.').pop();
            const path = `${basePath}/${Date.now()}_${index}.${extension}`;
            return this.uploadFile(file, bucket, path);
        });
        return Promise.all(uploadPromises);
    }
}

// User services
export class UserService extends SupabaseService {
    static async updateKYC(uid: string, kycData: any) {
        return this.updateDocument(`users`, uid, { kycDocuments: kycData });
    }

    static async getUsers(societyId: string, role?: string) {
        return this.getDocuments(`users`, (q) => {
            let res = q.eq('society_id', societyId);
            if (role) res = res.eq('role', role);
            return res;
        });
    }
}

// Society-specific services
export class SocietyService extends SupabaseService {
    static async getSociety(societyId: string) {
        return this.getDocument(`societies`, societyId);
    }

    static async getFlats(societyId: string) {
        return this.getDocuments(`flats`, (q) => q.eq('society_id', societyId).order('flat_number'));
    }

    static async getFlat(_societyId: string, flatId: string) {
        return this.getDocument(`flats`, flatId);
    }

    static async updateFlat(_societyId: string, flatId: string, data: any) {
        return this.updateDocument(`flats`, flatId, data);
    }

    static async getOwnedFlats(ownerId: string) {
        return this.getDocuments(`flats`, (q) => q.eq('owner_id', ownerId).order('flat_number'));
    }

    static async getBuildings(societyId: string) {
        return this.getDocuments(`buildings`, (q) => q.eq('society_id', societyId).order('name'));
    }
}

// Payment services
export class PaymentService extends SupabaseService {
    static async getPayments(societyId: string, flatId?: string) {
        return this.getDocuments(`payments`, (q) => {
            let res = q.eq('society_id', societyId).order('created_at', { ascending: false });
            if (flatId) res = res.eq('flat_id', flatId);
            return res;
        });
    }

    static async createPayment(societyId: string, data: any) {
        return this.createDocument(`payments`, { ...data, societyId });
    }

    static async updatePaymentStatus(_societyId: string, paymentId: string, status: string) {
        return this.updateDocument(`payments`, paymentId, {
            status,
            paidDate: status === 'paid' ? new Date().toISOString() : undefined
        });
    }
}

// Visitor services
export class VisitorService extends SupabaseService {
    static async getVisitors(societyId: string, flatIds?: string[]) {
        return this.getDocuments(`visitors`, (q) => {
            let res = q.eq('society_id', societyId).order('entry_time', { ascending: false }).limit(50);
            if (flatIds && flatIds.length > 0) {
                res = res.in('flat_id', flatIds);
            }
            return res;
        });
    }

    static async createVisitor(societyId: string, data: any) {
        return this.createDocument(`visitors`, { ...data, societyId });
    }

    static async updateVisitor(_societyId: string, visitorId: string, data: any) {
        return this.updateDocument(`visitors`, visitorId, data);
    }

    static async checkoutVisitor(_societyId: string, visitorId: string) {
        return this.updateDocument(`visitors`, visitorId, {
            exitTime: new Date().toISOString(),
            status: 'exited'
        });
    }

    static async deleteVisitor(_societyId: string, visitorId: string) {
        return this.deleteDocument(`visitors`, visitorId);
    }
}

// Complaint services
export class ComplaintService extends SupabaseService {
    static async getComplaints(societyId: string, filters?: any) {
        return this.getDocuments(`complaints`, (q) => {
            let res = q.eq('society_id', societyId).order('created_at', { ascending: false });
            if (filters?.flatId) res = res.eq('flat_id', filters.flatId);
            if (filters?.status) res = res.eq('status', filters.status);
            return res;
        });
    }

    static async createComplaint(societyId: string, data: any) {
        return this.createDocument(`complaints`, { ...data, societyId });
    }

    static async updateComplaint(_societyId: string, complaintId: string, data: any) {
        return this.updateDocument(`complaints`, complaintId, data);
    }

    static async resolveComplaint(
        _societyId: string,
        complaintId: string,
        resolutionNotes: string
    ) {
        return this.updateDocument(`complaints`, complaintId, {
            status: 'resolved',
            resolutionNotes,
            resolvedAt: new Date().toISOString()
        });
    }
}

// Announcement services
export class AnnouncementService extends SupabaseService {
    static async getAnnouncements(societyId: string) {
        return this.getDocuments(`announcements`, (q) =>
            q.eq('society_id', societyId).order('created_at', { ascending: false }).limit(20)
        );
    }

    static async createAnnouncement(societyId: string, data: any) {
        return this.createDocument(`announcements`, { ...data, societyId });
    }

    static async deleteAnnouncement(_societyId: string, announcementId: string) {
        return this.deleteDocument(`announcements`, announcementId);
    }
}

// Notification services
export class NotificationService extends SupabaseService {
    static async getNotifications(userId: string) {
        return this.getDocuments(`notifications`, (q) =>
            q.eq('user_id', userId).order('created_at', { ascending: false })
        );
    }

    static async markAsRead(notificationId: string) {
        return this.updateDocument(`notifications`, notificationId, { is_read: true });
    }
}

// Rent Agreement services
export class RentAgreementService extends SupabaseService {
    static async getRentAgreements(ownerId?: string, tenantId?: string) {
        return this.getDocuments(`rent_agreements`, (q) => {
            let res = q.order('created_at', { ascending: false });
            if (ownerId) res = res.eq('owner_id', ownerId);
            if (tenantId) res = res.eq('tenant_id', tenantId);
            return res;
        });
    }

    static async createRentAgreement(data: any) {
        return this.createDocument(`rent_agreements`, data);
    }

    static async updateRentAgreement(agreementId: string, data: any) {
        return this.updateDocument(`rent_agreements`, agreementId, data);
    }

    static async deleteRentAgreement(agreementId: string) {
        return this.deleteDocument(`rent_agreements`, agreementId);
    }
}

// Salary Payment services
export class SalaryPaymentService extends SupabaseService {
    static async getSalaryPayments(guardId?: string, societyId?: string) {
        return this.getDocuments(`salary_payments`, (q) => {
            let res = q.order('created_at', { ascending: false });
            if (guardId) res = res.eq('guard_id', guardId);
            if (societyId) res = res.eq('society_id', societyId);
            return res;
        });
    }

    static async createSalaryRequest(data: any) {
        return this.createDocument(`salary_payments`, data);
    }

    static async updateSalaryPayment(paymentId: string, data: any) {
        return this.updateDocument(`salary_payments`, paymentId, data);
    }

    static async approveSalaryPayment(paymentId: string, approvedBy: string) {
        return this.updateDocument(`salary_payments`, paymentId, {
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: approvedBy
        });
    }

    static async markAsPaid(paymentId: string) {
        return this.updateDocument(`salary_payments`, paymentId, {
            status: 'paid',
            paid_at: new Date().toISOString()
        });
    }

    static async deleteSalaryPayment(paymentId: string) {
        return this.deleteDocument(`salary_payments`, paymentId);
    }
}

// CCTV Camera services
export class CCTVService extends SupabaseService {
    static async getCameras(societyId: string) {
        return this.getDocuments(`cctv_cameras`, (q) =>
            q.eq('society_id', societyId).order('created_at', { ascending: false })
        );
    }

    static async getActiveCamera(societyId: string) {
        return this.getDocuments(`cctv_cameras`, (q) =>
            q.eq('society_id', societyId).eq('is_active', true)
        );
    }

    static async createCamera(data: any) {
        return this.createDocument(`cctv_cameras`, data);
    }

    static async updateCamera(cameraId: string, data: any) {
        return this.updateDocument(`cctv_cameras`, cameraId, data);
    }

    static async deleteCamera(cameraId: string) {
        return this.deleteDocument(`cctv_cameras`, cameraId);
    }
}
