import { LookupRef } from './api.models';

export interface Activity {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  imageUrl?: string | null;
  icon?: string | null;
  active: boolean;
}

export interface Coach {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  bioAr?: string;
  bioEn?: string;
  photoUrl?: string | null;
  certifications?: string[];
  activities?: LookupRef[];
  branches?: LookupRef[];
  active: boolean;
}

export interface Branch {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  city?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string;
  whatsapp?: string;
  operatingHours?: string;
  active: boolean;
}

export interface ScheduleEntry {
  id: string;
  branchId: string;
  activityId?: string;
  coachId?: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  seatsLeft: number;
  waitingListCount?: number;
  ageMin?: number | null;
  ageMax?: number | null;
  genderScope?: string;
  membershipPlanIds?: string[];
  /** joined display fields (present in public schedule payloads) */
  activity?: LookupRef | null;
  coach?: LookupRef | null;
  branch?: LookupRef | null;
  branchNameAr?: string;
  branchNameEn?: string;
  activityNameAr?: string;
  activityNameEn?: string;
  coachNameAr?: string;
  coachNameEn?: string;
}
