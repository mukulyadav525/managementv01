# ⚡ Quick Start Guide

Get your Society Management System running in 10 minutes!

## 🚀 Super Quick Setup (For Testing)

### 1. Install Dependencies
```bash
cd society-management
npm install
```

### 2. Supabase Setup (2 minutes)
1. Go to https://supabase.com/dashboard
2. Create new project
   - Set a production password
   - Choose your nearest region
3. Go to **Settings > API** and copy:
   - `Project URL`
   - `anon` public API key

### 3. Configure Environment
Create a `.env` file in the root and add:
```env
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 4. Database Setup
Go to the **SQL Editor** in Supabase and run the scripts found in `supabase/migrations/` to set up your tables and RLS policies.

### 5. Create Initial Data

**In Supabase Dashboard > Table Editor:**

1. Create collection `societies` with document `society_1`:
```json
{
  "name": "Test Society",
  "address": {
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "totalFlats": 100,
  "totalBuildings": 4,
  "contactEmail": "admin@test.com",
  "contactPhone": "+91 1234567890",
  "createdAt": [Use current ISO timestamp]
}
```

2. Create collection `users` with your auth user's UID:
```json
{
  "uid": "YOUR_AUTH_UID",
  "email": "admin@test.com",
  "name": "Admin",
  "phone": "+91 1234567890",
  "role": "admin",
  "societyId": "society_1",
  "flatIds": [],
  "status": "active",
  "createdAt": [Use Firebase Timestamp.now()]
}
```

### 6. Run the App
```bash
npm run dev
```

Go to `http://localhost:3000` and login!

---

## 📱 Default Test Accounts

After setup, create these users in Supabase Authentication:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@test.com | Admin@123 |
| Owner | owner@test.com | Owner@123 |
| Tenant | tenant@test.com | Tenant@123 |
| Security | security@test.com | Security@123 |

Remember to create corresponding user documents in Firestore!

---

## 🎯 What You Get

✅ **Dashboard** - Real-time stats and analytics
✅ **Visitor Management** - QR codes, approvals, tracking
✅ **Payment System** - Track rent & maintenance
✅ **Complaint Management** - Raise and resolve issues
✅ **Multi-role Support** - Admin, Owner, Tenant, Security
✅ **Responsive Design** - Works on all devices

---

## 🔥 Deploy to Firebase Hosting

```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting
```

Your app will be live at: `https://YOUR_PROJECT.web.app`

---

## 📚 Full Documentation

- [Complete Setup Guide](SETUP_GUIDE.md) - Detailed step-by-step instructions
- [README](README.md) - Full feature list and documentation
- [Sample Data](sample-data.json) - Sample data for reference

---

## 🆘 Common Issues

**Login not working?**
- Check Firebase Auth is enabled
- Verify user document exists in Firestore

**Permission errors?**
- Deploy Firestore rules: `firebase deploy --only firestore:rules`

**Build fails?**
- Run `npm install` again
- Clear cache: `rm -rf node_modules package-lock.json`

---

## 🎉 Next Steps

1. Add more flats in Firestore
2. Create test users with different roles
3. Test all features
4. Customize branding
5. Deploy to production

**Enjoy your Society Management System! 🏢**
