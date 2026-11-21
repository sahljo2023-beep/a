import { IronSessionData } from "iron-session";

declare module "iron-session" {
  interface IronSessionData {
    user?: {
      id: string;
      username: string;
      role: "ADMIN" | "VIEWER" | "EMPLOYEE_KIOSK";
      display_name: string;
    };
    deviceToken?: string; // للـ kiosk فقط
  }
}

// ============================================================
// Types للـ API Responses
// ============================================================

export type ApiResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

// ============================================================
// Types للموظفين
// ============================================================
export interface EmployeePublic {
  id: string;
  name: string;
  active: boolean;
  hired_at: string;
  left_at?: string;
  default_hotel_id?: string;
}

// ============================================================
// Types للبصمة
// ============================================================
export interface PunchRequest {
  employee_name: string;
  pin: string;
  hotel_id: string;
  type: "IN" | "OUT";
}

export interface PunchResult {
  success: boolean;
  employee_name: string;
  hotel_name: string;
  shift_name?: string;
  punch_type: "IN" | "OUT";
  timestamp: string; // ISO بتوقيت عمّان
  message: string;
}

// ============================================================
// Types للتأخير
// ============================================================
export interface LateClaimRequest {
  late_employee_id: string;
  waiting_employee_id: string;
  hotel_id: string;
  shift_id: string;
  date: string; // YYYY-MM-DD
  shift_start: string; // ISO
  actual_arrival: string; // ISO
}

// ============================================================
// Types للدبل
// ============================================================
export interface DoubleAllocationInput {
  employee_id: string;
  hours: number;
}

export interface DoubleEventRequest {
  original_employee_id: string;
  hotel_id: string;
  shift_id: string;
  date: string;
  allocations: DoubleAllocationInput[];
  notes?: string;
}

// ============================================================
// Types للجهاز
// ============================================================
export interface DeviceInfo {
  id: string;
  name: string;
  hotel_id: string;
  hotel_name: string;
  active: boolean;
  registered_at: string;
  last_seen_at?: string;
}

// ============================================================
// Types للمعاملات المالية
// ============================================================
export interface FinancialSummary {
  employee_id: string;
  employee_name: string;
  double_due: string;        // Decimal string
  late_claims_due: string;
  total_paid: string;
  total_received: string;
  time_comp_minutes: number;
  balance: string;
}

// ============================================================
// Pagination
// ============================================================
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
