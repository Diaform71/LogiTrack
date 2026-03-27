import { Timestamp } from 'firebase/firestore';

export type UserRole = 'ADMIN' | 'MEMBER';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: Timestamp;
}

export type ContactType = 'CLIENT' | 'SUPPLIER';

export interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface ContactInfo {
  type: 'phone' | 'email';
  value: string;
}

export interface Contact {
  id: string;
  name: string;
  type: ContactType;
  addresses: Address[];
  contacts: ContactInfo[];
  notes: string;
  createdAt: Timestamp;
}

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskType = 'PICKUP' | 'DELIVERY';

export interface Task {
  id: string;
  contactId: string;
  contactName: string;
  type: TaskType;
  address: Address;
  dateTime: Timestamp;
  status: TaskStatus;
  assignedTo?: string;
  assignedName?: string;
  notes: string;
  completedAt?: Timestamp;
  createdAt: Timestamp;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  used: boolean;
  expiresAt: Timestamp;
}
