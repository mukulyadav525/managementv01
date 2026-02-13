import { db } from './src/config/firebase';
import { doc, writeBatch, Timestamp } from 'firebase/firestore';

export const seedDatabase = async (adminUid: string) => {
    const batch = writeBatch(db);

    // 1. Create Society
    const societyId = 'society_1';
    const societyRef = doc(db, 'societies', societyId);
    batch.set(societyRef, {
        name: "Sunshine Apartments",
        address: {
            street: "123 Main Street",
            area: "Downtown",
            city: "Mumbai",
            state: "Maharashtra",
            pincode: "400001"
        },
        totalFlats: 4,
        totalBuildings: 1,
        contactEmail: "admin@sunshine.com",
        contactPhone: "+91 9876543210",
        amenities: ["Gym", "Swimming Pool", "Clubhouse", "Parking"],
        settings: {
            maintenanceDay: 5,
            latePaymentPenalty: 50,
            visitorApprovalRequired: true
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    });

    // 2. Create User Profile
    const userRef = doc(db, 'users', adminUid);
    batch.set(userRef, {
        uid: adminUid,
        email: "your-email@example.com", // This will be updated by the caller
        name: "Admin User",
        phone: "+91 9876543210",
        role: "admin",
        societyId: societyId,
        flatIds: [],
        status: "active",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    });

    // 3. Create Sample Flats
    const flats = [
        { id: 'flat_a101', number: 'A-101', floor: 1 },
        { id: 'flat_a102', number: 'A-102', floor: 1 },
        { id: 'flat_b201', number: 'B-201', floor: 2 },
    ];

    flats.forEach(flat => {
        const flatRef = doc(db, `societies/${societyId}/flats`, flat.id);
        batch.set(flatRef, {
            buildingId: "A",
            flatNumber: flat.number,
            floor: flat.floor,
            bhkType: "2BHK",
            area: 1200,
            occupancyStatus: "vacant",
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
    });

    await batch.commit();
    console.log('Database seeded successfully!');
};
