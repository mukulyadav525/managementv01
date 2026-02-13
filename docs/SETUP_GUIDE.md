# 🚀 Complete Setup Guide - Society Management System

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Firebase Project Setup](#firebase-project-setup)
3. [Local Development Setup](#local-development-setup)
4. [Database Initialization](#database-initialization)
5. [Testing the Application](#testing-the-application)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- ✅ **npm** (comes with Node.js) or **yarn**
- ✅ **Git** - [Download](https://git-scm.com/)
- ✅ **Google Account** (for Firebase)
- ✅ **Code Editor** (VS Code recommended)
- ✅ **Firebase CLI** (we'll install this)

---

## Firebase Project Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `society-management` (or your choice)
4. Enable/Disable Google Analytics (your choice)
5. Click **"Create project"**
6. Wait for project creation to complete

### Step 2: Register Web App

1. In Firebase Console, click the **web icon** `</>`
2. Register app nickname: `Society Manager Web`
3. Check **"Also set up Firebase Hosting"**
4. Click **"Register app"**
5. **IMPORTANT**: Copy the Firebase configuration object shown
6. Click **"Continue to console"**

### Step 3: Enable Authentication

1. In left sidebar, click **"Authentication"**
2. Click **"Get started"**
3. Click **"Email/Password"** under Sign-in methods
4. **Enable** Email/Password
5. Click **"Save"**

### Step 4: Create Firestore Database

1. In left sidebar, click **"Firestore Database"**
2. Click **"Create database"**
3. Select **"Start in production mode"**
4. Choose a location (closest to your users)
5. Click **"Enable"**

### Step 5: Enable Cloud Storage

1. In left sidebar, click **"Storage"**
2. Click **"Get started"**
3. Click **"Next"** (keep production mode)
4. Select same location as Firestore
5. Click **"Done"**

### Step 6: Set up Firebase Hosting

1. In left sidebar, click **"Hosting"**
2. Click **"Get started"**
3. Install Firebase CLI (see next section)

---

## Local Development Setup

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

Verify installation:
```bash
firebase --version
```

### Step 2: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd society-management

# Install dependencies
npm install
```

### Step 3: Configure Firebase

1. Create `.env` file in project root:
```bash
cp .env.example .env
```

2. Open `.env` and add your Firebase config:
```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

3. Update `src/config/firebase.ts` to use environment variables:

```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};
```

### Step 4: Login to Firebase

```bash
firebase login
```

### Step 5: Initialize Firebase in Project

```bash
firebase init
```

Select:
- ✅ Firestore
- ✅ Hosting
- ✅ Storage

Follow prompts:
- Use existing project: Select your project
- Firestore rules: `firestore.rules`
- Firestore indexes: `firestore.indexes.json`
- Public directory: `dist`
- Single-page app: **Yes**
- GitHub deploys: **No** (for now)
- Storage rules: `storage.rules`

### Step 6: Deploy Security Rules

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

---

## Database Initialization

### Option 1: Manual Setup (Recommended for Learning)

1. Go to Firebase Console > Firestore Database
2. Click **"Start collection"**

#### Create Society

```
Collection ID: societies
Document ID: society_1

Fields:
name: "Sunshine Apartments"
address: {
  street: "123 Main Street",
  area: "Downtown",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400001"
}
totalFlats: 120
totalBuildings: 4
contactEmail: "admin@sunshine.com"
contactPhone: "+91 9876543210"
amenities: ["Gym", "Swimming Pool", "Clubhouse", "Parking"]
settings: {
  maintenanceDay: 5,
  latePaymentPenalty: 50,
  visitorApprovalRequired: true
}
createdAt: [Click "Current timestamp"]
updatedAt: [Click "Current timestamp"]
```

#### Create Admin User

1. First, register via the app at `/login` > Register
2. Or use Firebase Console > Authentication > Add user
   - Email: admin@sunshine.com
   - Password: Admin@123

3. After user creation, add user document:

```
Collection: users
Document ID: [Use the UID from Authentication]

Fields:
uid: "[Same as document ID]"
email: "admin@sunshine.com"
name: "Admin User"
phone: "+91 9876543210"
role: "admin"
societyId: "society_1"
flatIds: []
status: "active"
createdAt: [Current timestamp]
updatedAt: [Current timestamp]
```

#### Create Sample Flats

```
Collection: societies/society_1/flats
Document ID: flat_a101

Fields:
buildingId: "A"
flatNumber: "A-101"
floor: 1
bhkType: "2BHK"
area: 1200
ownerId: ""
currentTenantId: ""
occupancyStatus: "vacant"
parkingSlots: ["A-P1"]
createdAt: [Current timestamp]
updatedAt: [Current timestamp]
```

Create more flats by duplicating and changing values.

### Option 2: Seed Script (Advanced)

Create `scripts/seed.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seed() {
  // Add seed data here
  await db.collection('societies').doc('society_1').set({
    name: 'Sunshine Apartments',
    // ... rest of fields
  });
}

seed().then(() => {
  console.log('Database seeded!');
  process.exit(0);
});
```

---

## Testing the Application

### Step 1: Start Development Server

```bash
npm run dev
```

The app will run on `http://localhost:3000`

### Step 2: Test Login

1. Go to `http://localhost:3000/login`
2. Use credentials:
   - Email: admin@sunshine.com
   - Password: Admin@123

### Step 3: Test Features

✅ **Dashboard**: Should show stats
✅ **Visitors**: Add a visitor entry
✅ **Payments**: View payment records
✅ **Complaints**: Create a complaint

### Common Test Scenarios

1. **Add Visitor**:
   - Go to Visitors page
   - Click "Add Visitor"
   - Fill form and submit

2. **Make Payment**:
   - Go to Payments page
   - Click "Pay Now" on pending payment
   - Complete payment flow

3. **Raise Complaint**:
   - Go to Complaints page
   - Click "New Complaint"
   - Fill form with images
   - Submit

---

## Deployment

### Step 1: Build for Production

```bash
npm run build
```

This creates optimized files in `dist/` folder.

### Step 2: Test Production Build Locally

```bash
npm run preview
```

### Step 3: Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

Your app will be live at:
```
https://YOUR_PROJECT_ID.web.app
https://YOUR_PROJECT_ID.firebaseapp.com
```

### Step 4: Custom Domain (Optional)

1. Go to Firebase Console > Hosting
2. Click "Add custom domain"
3. Follow verification steps
4. Add DNS records to your domain provider

---

## Troubleshooting

### Issue: Firebase Config Error

**Error**: "Firebase: Error (auth/invalid-api-key)"

**Solution**: 
- Verify Firebase config in `.env` file
- Ensure all values are correct
- Check for extra spaces or quotes

### Issue: Permission Denied

**Error**: "Missing or insufficient permissions"

**Solution**:
- Deploy Firestore rules: `firebase deploy --only firestore:rules`
- Check user document has correct `societyId`
- Verify user role is set correctly

### Issue: Images Not Uploading

**Error**: Storage upload fails

**Solution**:
- Deploy storage rules: `firebase deploy --only storage:rules`
- Check Firebase Storage is enabled
- Verify file size is under 5MB

### Issue: Build Fails

**Error**: TypeScript errors

**Solution**:
```bash
# Clear cache
rm -rf node_modules
rm package-lock.json

# Reinstall
npm install

# Try build again
npm run build
```

### Issue: Development Server Not Starting

**Solution**:
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill the process or use different port
# Edit vite.config.ts to change port
```

---

## Next Steps

After successful setup:

1. ✅ Create more user accounts with different roles
2. ✅ Add more flats and buildings
3. ✅ Test all modules thoroughly
4. ✅ Customize branding and colors
5. ✅ Set up automated backups
6. ✅ Configure email notifications
7. ✅ Integrate payment gateway
8. ✅ Add more features as needed

---

## Support & Resources

- 📚 [Firebase Documentation](https://firebase.google.com/docs)
- 📚 [React Documentation](https://react.dev)
- 📚 [Tailwind CSS Docs](https://tailwindcss.com/docs)
- 🐛 [Report Issues](https://github.com/your-repo/issues)
- 💬 [Community Forum](https://your-forum-link)

---

**Need Help?** Contact: support@societymanager.com

---

## Checklist

Use this checklist to track your setup:

- [ ] Node.js installed
- [ ] Firebase project created
- [ ] Web app registered in Firebase
- [ ] Authentication enabled
- [ ] Firestore database created
- [ ] Storage enabled
- [ ] Firebase CLI installed
- [ ] Project cloned
- [ ] Dependencies installed
- [ ] .env file configured
- [ ] Firebase initialized
- [ ] Security rules deployed
- [ ] Society document created
- [ ] Admin user created
- [ ] Sample flats added
- [ ] Dev server tested
- [ ] Production build successful
- [ ] Deployed to Firebase Hosting

🎉 **Congratulations!** Your Society Management System is ready!
