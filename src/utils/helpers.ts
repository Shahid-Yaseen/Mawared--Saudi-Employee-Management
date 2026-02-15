import { Location } from '../types';

/**
 * Calculate distance between two geographic points using Haversine formula
 * @param point1 First location
 * @param point2 Second location
 * @returns Distance in meters
 */
export const calculateDistance = (point1: Location, point2: Location): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

/**
 * Validate if a location is within geofence
 * @param currentLocation Current user location
 * @param workLocation Work location
 * @param radius Geofence radius in meters
 * @param tolerance Additional tolerance in meters
 * @returns Validation result
 */
export const validateGeofence = (
    currentLocation: Location,
    workLocation: Location,
    radius: number,
    tolerance: number = 10
): { isValid: boolean; distance: number; message?: string } => {
    const distance = calculateDistance(currentLocation, workLocation);
    const maxDistance = radius + tolerance;

    if (distance <= maxDistance) {
        return {
            isValid: true,
            distance: Math.round(distance),
        };
    }

    return {
        isValid: false,
        distance: Math.round(distance),
        message: `You are ${Math.round(distance)}m away from work location. Maximum allowed: ${radius}m`,
    };
};

/**
 * Format distance for display
 * @param meters Distance in meters
 * @returns Formatted string
 */
export const formatDistance = (meters: number): string => {
    if (meters < 1000) {
        return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
};

/**
 * Calculate hours between two timestamps
 * @param startTime Start timestamp
 * @param endTime End timestamp
 * @returns Hours as decimal
 */
export const calculateHours = (startTime: string, endTime: string): number => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const diffMs = end - start;
    return diffMs / (1000 * 60 * 60); // Convert to hours
};

/**
 * Calculate late minutes
 * @param clockInTime Actual clock in time
 * @param expectedTime Expected clock in time
 * @returns Late minutes
 */
export const calculateLateMinutes = (
    clockInTime: string,
    expectedTime: string
): number => {
    const actual = new Date(clockInTime).getTime();
    const expected = new Date(expectedTime).getTime();
    const diffMs = actual - expected;

    if (diffMs <= 0) return 0;

    return Math.round(diffMs / (1000 * 60)); // Convert to minutes
};

/**
 * Calculate business days between two dates
 * @param startDate Start date
 * @param endDate End date
 * @returns Number of business days
 */
export const calculateBusinessDays = (startDate: Date, endDate: Date): number => {
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
        const dayOfWeek = current.getDay();
        // Count if not Friday (5) or Saturday (6) - Saudi weekend
        if (dayOfWeek !== 5 && dayOfWeek !== 6) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }

    return count;
};

/**
 * Format currency (Saudi Riyal)
 * @param amount Amount in SAR
 * @returns Formatted string
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: 'SAR',
        minimumFractionDigits: 2,
    }).format(amount);
};

/**
 * Validate Saudi National ID / Iqama
 * @param id National ID or Iqama number
 * @returns true if valid
 */
export const validateSaudiID = (id: string): boolean => {
    // Saudi ID should be 10 digits
    if (!/^\d{10}$/.test(id)) return false;

    // First digit should be 1 (Saudi) or 2 (Iqama)
    const firstDigit = parseInt(id[0]);
    if (firstDigit !== 1 && firstDigit !== 2) return false;

    return true;
};

/**
 * Get device unique identifier
 * @returns Device ID
 */
export const getDeviceId = async (): Promise<string> => {
    const Device = await import('expo-device');
    // Use device name or model as identifier
    return Device.default.modelName || Device.default.deviceName || 'unknown-device';
};

/**
 * Check if device change is allowed
 * @param lastChangeDate Last device change date
 * @param cooldownDays Cooldown period in days
 * @returns true if change is allowed
 */
export const canChangeDevice = (
    lastChangeDate: string | null,
    cooldownDays: number = 14
): boolean => {
    if (!lastChangeDate) return true;

    const lastChange = new Date(lastChangeDate);
    const now = new Date();
    const diffMs = now.getTime() - lastChange.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    return diffDays >= cooldownDays;
};

/**
 * Truncate text with ellipsis
 * @param text Text to truncate
 * @param maxLength Maximum length
 * @returns Truncated text
 */
export const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
};

/**
 * Debounce function
 * @param func Function to debounce
 * @param wait Wait time in ms
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

/**
 * Calculate working days excluding Saudi weekends (Friday & Saturday)
 * @param startDate Start date
 * @param endDate End date
 * @returns Number of working days
 */
export const calculateWorkingDays = (startDate: Date, endDate: Date): number => {
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
        const dayOfWeek = current.getDay();
        // Exclude Friday (5) and Saturday (6) - Saudi weekend
        if (dayOfWeek !== 5 && dayOfWeek !== 6) {
            count++;
        }
        current.setDate(current.getDate() + 1);
    }

    return count;
};

/**
 * Validate leave balance availability
 * @param employeeId Employee ID
 * @param leaveTypeId Leave type ID
 * @param daysRequested Days requested
 * @param leaveBalances Array of leave balances
 * @returns Validation result
 */
export const validateLeaveBalance = (
    leaveTypeId: string,
    daysRequested: number,
    leaveBalances: Array<{ leave_type_id: string; remaining_days: number }>
): { isValid: boolean; availableDays: number; message?: string } => {
    const balance = leaveBalances.find((b) => b.leave_type_id === leaveTypeId);

    if (!balance) {
        return {
            isValid: false,
            availableDays: 0,
            message: 'Leave balance not found',
        };
    }

    if (daysRequested > balance.remaining_days) {
        return {
            isValid: false,
            availableDays: balance.remaining_days,
            message: `Insufficient balance. Available: ${balance.remaining_days} days`,
        };
    }

    return {
        isValid: true,
        availableDays: balance.remaining_days,
    };
};

/**
 * Calculate overtime pay
 * @param hours Overtime hours
 * @param baseRate Base hourly rate
 * @param overtimeRate Overtime multiplier (default 1.5)
 * @returns Overtime pay amount
 */
export const calculateOvertimePay = (
    hours: number,
    baseRate: number,
    overtimeRate: number = 1.5
): number => {
    return hours * baseRate * overtimeRate;
};

/**
 * Format attendance status for display
 * @param record Attendance record
 * @returns Status object with text and color
 */
export const formatAttendanceStatus = (record: {
    status: string;
    is_late?: boolean;
    clock_out_time?: string;
}): { text: string; color: string } => {
    if (record.status === 'absent') {
        return { text: 'Absent', color: '#EF4444' };
    }

    if (record.status === 'leave') {
        return { text: 'On Leave', color: '#3B82F6' };
    }

    if (!record.clock_out_time) {
        return { text: 'Clocked In', color: '#10B981' };
    }

    if (record.is_late) {
        return { text: 'Late', color: '#F59E0B' };
    }

    return { text: 'Present', color: '#10B981' };
};

/**
 * Generate QR code data for employee
 * @param employeeId Employee ID
 * @param employeeNumber Employee number
 * @returns QR code data string
 */
export const generateEmployeeQRCode = (employeeId: string, employeeNumber: string): string => {
    return JSON.stringify({
        id: employeeId,
        number: employeeNumber,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Format time from 24h to 12h format
 * @param time Time string in HH:MM format
 * @returns Formatted time string
 */
export const formatTime12Hour = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

/**
 * Calculate GOSI contribution
 * @param salary Base salary
 * @param gosiPercentage GOSI percentage (default 10%)
 * @returns GOSI amount
 */
export const calculateGOSI = (salary: number, gosiPercentage: number = 10): number => {
    return (salary * gosiPercentage) / 100;
};
