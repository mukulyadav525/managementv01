# 🏢 Smart Society & Rental Management System

A comprehensive web-based platform for managing apartments, societies, landlords, tenants, and residents. Built with React, TypeScript, and Firebase.

## ✨ Features

### 👥 Multi-Role Support
- **Society Admin/RWA**: Complete society management
- **Landlord/Flat Owner**: Tenant & rental management
- **Tenant/Resident**: View payments, raise complaints
- **Security Guard**: Visitor management
- **Maintenance Staff**: Complaint resolution

### 🏘️ Core Modules

#### 1. **Visitor Management**
- Digital visitor entry logging
- QR code/OTP-based visitor passes
- Real-time approval system
- Entry/exit tracking
- Visitor history

#### 2. **Payment Management**
- Rent payment tracking
- Maintenance bill generation
- Online payment integration (UPI, Cards, Net Banking)
- Automated receipts
- Payment reminders & overdue alerts

#### 3. **Complaint Management**
- Raise maintenance complaints
- Category-based tracking (Plumbing, Electrical, etc.)
- Priority levels (High, Medium, Low)
- Image attachments
- Status tracking (Open, In-Progress, Resolved)
- Staff assignment

#### 4. **Dashboard & Analytics**
- Real-time statistics
- Occupancy tracking
- Payment analytics
- Complaint metrics
- Recent activity feed

#### 5. **Additional Features** (Extensible)
- Flat & resident directory
- Notice board announcements
- Facility booking
- Vehicle management
- Staff management
- Document storage

## 🛠️ Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router v6
- **Backend**: Firebase
  - Authentication
  - Cloud Firestore (Database)
  - Cloud Storage (File uploads)
  - Cloud Functions (Automation)
  - Hosting
- **UI Components**: Lucide React Icons
- **Charts**: Recharts
- **Forms**: React Hook Form
- **Date Handling**: date-fns
- **Notifications**: React Hot Toast
- **QR Codes**: qrcode.react

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase account

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd society-management
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add Project"
   - Follow the setup wizard

2. **Enable Firebase Services**
   - **Authentication**: Enable Email/Password sign-in
   - **Firestore Database**: Create database in production mode
   - **Storage**: Enable Cloud Storage
   - **Hosting**: Set up hosting (optional for deployment)

3. **Get Firebase Configuration**
   - Go to Project Settings > General
   - Scroll to "Your apps" section
   - Click web icon (</>) to add a web app
   - Copy the configuration object

4. **Update Firebase Config**
   - Open `src/config/firebase.ts`
   - Replace the configuration with your Firebase credentials:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

### Step 4: Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

### Step 5: Create Initial Data

You'll need to manually create some initial data in Firestore:

1. **Create a Society Document**
```
Collection: societies
Document ID: society_1
Fields:
{
  name: "Green Valley Apartments",
  address: {
    street: "123 Main St",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001"
  },
  totalFlats: 100,
  totalBuildings: 4,
  contactEmail: "admin@greenvalley.com",
  contactPhone: "+91 1234567890",
  createdAt: <current timestamp>
}
```

2. **Create Test User**
```
Collection: users
Document ID: <use Firebase Auth UID>
Fields:
{
  uid: "<Firebase Auth UID>",
  email: "admin@society.com",
  name: "Admin User",
  phone: "+91 9876543210",
  role: "admin",
  societyId: "society_1",
  flatIds: [],
  status: "active",
  createdAt: <current timestamp>
}
```

3. **Create some Flats**
```
Collection: societies/{societyId}/flats
Document ID: flat_1
Fields:
{
  buildingId: "A",
  flatNumber: "A-101",
  floor: 1,
  bhkType: "2BHK",
  area: 1200,
  ownerId: "",
  occupancyStatus: "vacant",
  parkingSlots: ["A-P1"],
  createdAt: <current timestamp>
}
```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
The app will run on `http://localhost:3000`

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 🔐 Default Login Credentials

After setting up Firebase Authentication, create test users:

- **Admin**: admin@society.com / password123
- **Owner**: owner@society.com / password123
- **Tenant**: tenant@society.com / password123
- **Security**: security@society.com / password123

## 📁 Project Structure

```
society-management/
├── public/                 # Static assets
├── src/
│   ├── components/        # React components
│   │   ├── common/       # Reusable UI components
│   │   ├── layout/       # Layout components
│   │   ├── auth/         # Authentication components
│   │   └── ...           # Feature-specific components
│   ├── config/           # Configuration files
│   │   └── firebase.ts   # Firebase configuration
│   ├── pages/            # Page components
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── VisitorsPage.tsx
│   │   ├── PaymentsPage.tsx
│   │   └── ComplaintsPage.tsx
│   ├── services/         # API services
│   │   └── firebase.service.ts
│   ├── stores/           # State management (Zustand)
│   │   └── authStore.ts
│   ├── types/            # TypeScript types
│   │   └── index.ts
│   ├── utils/            # Utility functions
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── firebase.json          # Firebase configuration
├── firestore.rules       # Firestore security rules
├── storage.rules         # Storage security rules
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## 🔒 Security Rules

The application includes comprehensive Firestore and Storage security rules:

- **Role-based access control** (RBAC)
- **Document-level permissions**
- **Flat ownership validation**
- **Society membership verification**

## 🌐 Deployment to Firebase Hosting

```bash
# Login to Firebase
firebase login

# Initialize Firebase (if not done)
firebase init

# Build the project
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

Your app will be live at: `https://YOUR_PROJECT_ID.web.app`

## 📱 Future Enhancements

- [ ] Mobile apps (React Native / Flutter)
- [ ] WhatsApp notifications
- [ ] Email notifications
- [ ] Payment gateway integration (Razorpay/Stripe)
- [ ] Facial recognition for visitors
- [ ] CCTV integration
- [ ] IoT device integration
- [ ] Community marketplace
- [ ] Event management
- [ ] Amenity booking system
- [ ] Accounting & reports module
- [ ] Multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🐛 Known Issues

- Image upload progress not shown
- Receipt generation needs implementation
- Payment gateway integration pending

## 📧 Support

For support, email: support@societymanager.com

## 🙏 Acknowledgments

- React Team
- Firebase Team
- Tailwind CSS
- Open source community

---

**Built with ❤️ for better society management**
