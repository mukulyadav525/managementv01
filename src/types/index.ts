export type UserRole = 'admin' | 'owner' | 'tenant' | 'security' | 'staff';

export type OccupancyStatus = 'owner-occupied' | 'rented' | 'vacant';

export type PaymentStatus = 'pending' | 'paid' | 'overdue';

export type PaymentType = 'rent' | 'maintenance' | 'water' | 'electricity' | 'other';

export type ComplaintStatus = 'open' | 'in-progress' | 'resolved' | 'closed';

export type ComplaintPriority = 'low' | 'medium' | 'high';

export type VisitorStatus = 'pending' | 'approved' | 'rejected' | 'exited';

export type VaccinationStatus = 'pending' | 'vaccinated';

export type ServiceStatus = 'pending' | 'in_progress' | 'resolved' | 'cancelled';

export type ServiceCategory = 'plumbing' | 'electrical' | 'cleaning' | 'carpentry' | 'other';

export interface User {
  uid: string;
  name: string;
  email: string;
  phone: string;
  profilePicture?: string;
  role: UserRole;
  societyId: string;
  flatIds: string[];
  status: 'active' | 'inactive';
  kycDocuments?: {
    aadhar?: string;
    pan?: string;
    photo?: string;
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  moveInDate?: string;
  createdAt: string;
  updatedAt: string;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
    upiId?: string;
  };
}

export interface Society {
  id: string;
  name: string;
  address: {
    street: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
  };
  totalFlats: number;
  totalBuildings: number;
  registrationDate: string;
  contactEmail: string;
  contactPhone: string;
  logo?: string;
  amenities: string[];
  settings: {
    maintenanceDay: number;
    latePaymentPenalty: number;
    visitorApprovalRequired: boolean;
  };
  createdAt: string;
  updatedAt: string;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
    upiId?: string;
  };
}

export interface Building {
  id: string;
  name: string;
  totalFloors: number;
  totalFlats: number;
  createdAt: string;
}

export interface Flat {
  id: string;
  buildingId: string;
  flatNumber: string;
  floor: number;
  bhkType: string;
  area: number;
  ownerId: string;
  currentTenantId?: string;
  occupancyStatus: OccupancyStatus;
  parkingSlots: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RentAgreement {
  id: string;
  flatId: string;
  ownerId: string;
  tenantId: string;
  startDate: string;
  endDate?: string;
  monthlyRent: number;
  securityDeposit: number;
  agreementDocument?: string;
  status: 'active' | 'expired' | 'terminated';
  terms: {
    noticePeriod?: number;
    incrementPercentage?: number;
    includesParking?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  type: PaymentType;
  flatId: string;
  userId: string;
  amount: number;
  fineAmount?: number;
  fineReason?: string;
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  paymentMethod?: string;
  transactionId?: string;
  receiptUrl?: string;
  month?: string;
  description?: string;
  societyId: string;
  createdAt: string;
}

export interface MaintenanceBill {
  id: string;
  flatId: string;
  month: string;
  amount: number;
  breakdown: {
    maintenance: number;
    waterCharges: number;
    parkingCharges: number;
    other: number;
  };
  dueDate: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface Visitor {
  id: string;
  name: string;
  phone: string;
  flatId: string;
  purpose: string;
  vehicleNumber?: string;
  entryTime: string;
  exitTime?: string;
  approvedBy?: string;
  visitorType: 'guest' | 'delivery' | 'service';
  vType?: 'guest' | 'delivery' | 'service';
  photoUrl?: string;
  status: VisitorStatus;
  passCode?: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  flatId: string;
  raisedBy: string;
  category: string;
  title: string;
  description: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assignedTo?: string;
  images: string[];
  resolutionNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: 'normal' | 'high';
  createdBy: string;
  targetAudience: 'all' | 'owners' | 'tenants';
  attachments: string[];
  expiryDate?: string;
  createdAt: string;
}

export interface FacilityBooking {
  id: string;
  facilityType: string;
  flatId: string;
  bookedBy: string;
  bookingDate: string;
  timeSlot: {
    start: string;
    end: string;
  };
  status: 'confirmed' | 'cancelled';
  charges: number;
  createdAt: string;
}

export interface Staff {
  id: string;
  userId: string;
  name: string;
  role: string;
  phone: string;
  joiningDate: string;
  salary: number;
  status: 'active' | 'inactive';
  shift?: {
    start: string;
    end: string;
  };
  documents: string[];
}

export interface Vehicle {
  id: string;
  flatId: string;
  ownerId: string;
  vehicleNumber: string;
  vehicleType: string;
  model: string;
  color: string;
  parkingSlot?: string;
  rcDocument?: string;
  createdAt: string;
}

export interface Helper {
  id: string;
  name: string;
  phone: string;
  serviceType: string;
  servedFlats: string[];
  photo?: string;
  kycDocuments?: {
    aadhar?: string;
    photo?: string;
  };
  verificationStatus: 'pending' | 'verified' | 'rejected';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  societyId: string;
  isRead: boolean;
  createdAt: string;
}

export type SalaryPaymentStatus = 'pending' | 'approved' | 'paid';

export interface SalaryPayment {
  id: string;
  societyId: string;
  guardId: string;
  amount: number;
  month: string; // Format: 'YYYY-MM'
  status: SalaryPaymentStatus;
  requestedAt: string;
  approvedAt?: string;
  paidAt?: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CCTVCamera {
  id: string;
  societyId: string;
  name: string;
  location?: string;
  streamUrl?: string;
  recordingUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Pet {
  id: string;
  societyId: string;
  flatId: string;
  ownerId: string;
  name: string;
  type: string;
  breed?: string;
  vaccinationStatus: VaccinationStatus;
  vaccinationDate?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequest {
  id: string;
  societyId: string;
  flatId: string;
  requesterId: string;
  category: ServiceCategory;
  title: string;
  description?: string;
  preferredTime?: string;
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Amenity {
  id: string;
  societyId: string;
  name: string;
  description?: string;
  location?: string;
  capacity?: number;
  bookingType: 'slot' | 'full_day';
  rules: string[];
  imageUrl?: string;
  status: 'available' | 'maintenance' | 'closed';
  pricePerHour?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AmenityBooking {
  id: string;
  amenityId: string;
  userId: string;
  societyId: string;
  flatId: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  totalPrice?: number;
  notes?: string;
  createdAt: string;
}

export interface EmergencyContact {
  id: string;
  societyId: string;
  category: 'emergency' | 'society' | 'medical' | 'essential';
  name: string;
  role?: string;
  phone: string;
  phone2?: string;
  email?: string;
  description?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface Poll {
  id: string;
  societyId: string;
  title: string;
  description?: string;
  category: 'financial' | 'event' | 'general';
  status: 'active' | 'closed';
  endsAt?: string;
  createdBy: string;
  createdAt: string;
  options?: PollOption[];
  myVote?: PollVote;
  votes?: PollVote[];
  totalVotes?: number;
}

export interface PollOption {
  id: string;
  pollId: string;
  text: string;
  orderIndex: number;
  voteCount?: number;
}

export interface PollVote {
  id: string;
  pollId: string;
  optionId: string;
  userId: string;
  flatId: string;
  createdAt: string;
}

export interface Document {
  id: string;
  societyId: string;
  name: string;
  category: 'society' | 'personal';
  docType: string;
  fileSize?: string;
  fileUrl: string;
  isPublic: boolean;
  uploadedBy: string;
  ownerId?: string;
  createdAt: string;
}

export interface Gate {
  id: string;
  societyId: string;
  name: string;
  phone?: string;
  status: 'active' | 'closed' | 'maintenance';
  createdAt: string;
  updatedAt: string;
}
