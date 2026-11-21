export type UserRole = 'customer' | 'admin';

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  password_hash: string;
  phone: string;
  role: UserRole;
}

export interface Airline {
  airline_id: number;
  name: string;
  iata_code: string;
  country: string;
}

export interface Airport {
  airport_id: number;
  name: string;
  iata_code: string;
  city: string;
  country: string;
}

export interface Aircraft {
  aircraft_id: number;
  model: string;
  total_seats: number;
  airline_id: number;
}

export interface Flight {
  flight_id: number;
  flight_no: string;
  airline_id: number;
  aircraft_id: number;
  origin_id: number;
  dest_id: number;
  departure_time: string; // ISO string e.g. 2026-11-24T08:30:00
  arrival_time: string;
  base_price: number; // Economy base fare in Tk
}

export type SeatClass = 'First' | 'Business' | 'Economy';
export type SeatStatus = 'AVAILABLE' | 'BOOKED';

export interface Seat {
  seat_id: number;
  seat_no: string;
  class: SeatClass;
  status: SeatStatus;
  flight_id: number;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface Booking {
  booking_id: number;
  booking_date: string;
  status: BookingStatus;
  total_amount: number;
  user_id: number;
  flight_id: number;
}

export interface Passenger {
  passenger_id: number;
  full_name: string;
  passport_no: string;
  date_of_birth: string;
  booking_id: number;
  seat_id: number;
}

export type PaymentMethod = 'Card' | 'bKash' | 'Nagad' | 'Bank Transfer';
export type PaymentStatus = 'PAID' | 'REFUNDED' | 'PENDING';

export interface Payment {
  payment_id: number;
  method: PaymentMethod;
  amount: number;
  payment_status: PaymentStatus;
  paid_at: string;
  booking_id: number;
  policy_id: number | null;
  refunded_amount?: number;
}

export interface RefundPolicy {
  policy_id: number;
  min_hours_before: number;
  refund_percent: number;
  label: string;
}

export interface BookingAudit {
  audit_id: number;
  old_status: BookingStatus | 'NEW';
  new_status: BookingStatus;
  changed_at: string;
  booking_id: number;
}

export type AppView = 'flights' | 'bookings' | 'admin';
