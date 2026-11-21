import {
  Aircraft,
  Airline,
  Airport,
  Booking,
  BookingAudit,
  Flight,
  Passenger,
  Payment,
  RefundPolicy,
  Seat,
  SeatClass,
  User,
} from '../types/skybook';

export const CLASS_MULTIPLIER: Record<SeatClass, number> = {
  Economy: 1.0,
  Business: 1.85,
  First: 3.1,
};

export function getSeatPrice(basePrice: number, seatClass: SeatClass): number {
  return Math.round(basePrice * CLASS_MULTIPLIER[seatClass]);
}

export function formatCurrency(amount: number): string {
  return `Tk ${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

export function formatDateTime(iso: string): { date: string; time: string; shortDate: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    shortDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}

export function formatDuration(departureIso: string, arrivalIso: string): string {
  const diffMs = Math.max(0, new Date(arrivalIso).getTime() - new Date(departureIso).getTime());
  const totalMin = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return `${hours}h ${mins.toString().padStart(2, '0')}m`;
}

export function getDurationMinutes(departureIso: string, arrivalIso: string): number {
  return Math.max(0, Math.round((new Date(arrivalIso).getTime() - new Date(departureIso).getTime()) / 60000));
}

export function generateSeatsForFlight(
  flightId: number,
  startingSeatId: number,
  bookedSeatNos: string[] = []
): Seat[] {
  const seats: Seat[] = [];
  let nextId = startingSeatId;
  const bookedSet = new Set(bookedSeatNos);

  // Rows 1-2: First Class (A, C, D, F — 4 seats per row = 8 seats)
  for (let row = 1; row <= 2; row++) {
    for (const col of ['A', 'C', 'D', 'F']) {
      const seatNo = `${row}${col}`;
      seats.push({
        seat_id: nextId++,
        seat_no: seatNo,
        class: 'First',
        status: bookedSet.has(seatNo) ? 'BOOKED' : 'AVAILABLE',
        flight_id: flightId,
      });
    }
  }

  // Rows 3-5: Business Class (A, C, D, F — 4 seats per row = 12 seats)
  for (let row = 3; row <= 5; row++) {
    for (const col of ['A', 'C', 'D', 'F']) {
      const seatNo = `${row}${col}`;
      seats.push({
        seat_id: nextId++,
        seat_no: seatNo,
        class: 'Business',
        status: bookedSet.has(seatNo) ? 'BOOKED' : 'AVAILABLE',
        flight_id: flightId,
      });
    }
  }

  // Rows 6-11: Economy Class (A, B, C, D, E, F — 6 seats per row = 36 seats)
  for (let row = 6; row <= 11; row++) {
    for (const col of ['A', 'B', 'C', 'D', 'E', 'F']) {
      const seatNo = `${row}${col}`;
      seats.push({
        seat_id: nextId++,
        seat_no: seatNo,
        class: 'Economy',
        status: bookedSet.has(seatNo) ? 'BOOKED' : 'AVAILABLE',
        flight_id: flightId,
      });
    }
  }

  return seats; // 56 interactive cabin seats per flight
}

export function resolveRefundPolicy(
  departureIso: string,
  policies: RefundPolicy[],
  nowMs: number = Date.now()
): { hoursBefore: number; policy: RefundPolicy } {
  const hoursBefore = Math.max(0, Math.round((new Date(departureIso).getTime() - nowMs) / 3600000));
  const sorted = [...policies].sort((a, b) => b.min_hours_before - a.min_hours_before);
  const matched = sorted.find((p) => hoursBefore >= p.min_hours_before) ?? sorted[sorted.length - 1];
  return { hoursBefore, policy: matched };
}

export const INITIAL_USERS: User[] = [
  {
    user_id: 1,
    full_name: 'MD Shihab Ahmmed',
    email: 'shihab@skybook.com',
    password_hash: '$2y$10$demo_customer_hash_shihab',
    phone: '+880 1711-221810',
    role: 'customer',
  },
  {
    user_id: 2,
    full_name: 'Jobayer Mazhar Labib',
    email: 'admin@skybook.com',
    password_hash: '$2y$10$demo_admin_hash_labib',
    phone: '+880 1812-495042',
    role: 'admin',
  },
  {
    user_id: 3,
    full_name: 'Md. Shahnur Rahman Chowdhury',
    email: 'shahnur@skybook.com',
    password_hash: '$2y$10$demo_customer_hash_shahnur',
    phone: '+880 1922-494642',
    role: 'customer',
  },
];

export const INITIAL_AIRLINES: Airline[] = [
  { airline_id: 1, name: 'Biman Bangladesh Airlines', iata_code: 'BG', country: 'Bangladesh' },
  { airline_id: 2, name: 'US-Bangla Airlines', iata_code: 'BS', country: 'Bangladesh' },
  { airline_id: 3, name: 'Emirates', iata_code: 'EK', country: 'United Arab Emirates' },
  { airline_id: 4, name: 'Singapore Airlines', iata_code: 'SQ', country: 'Singapore' },
  { airline_id: 5, name: 'Qatar Airways', iata_code: 'QR', country: 'Qatar' },
];

export const INITIAL_AIRPORTS: Airport[] = [
  { airport_id: 1, name: 'Hazrat Shahjalal International Airport', iata_code: 'DAC', city: 'Dhaka', country: 'Bangladesh' },
  { airport_id: 2, name: 'Shah Amanat International Airport', iata_code: 'CGP', city: 'Chittagong', country: 'Bangladesh' },
  { airport_id: 3, name: "Cox's Bazar Airport", iata_code: 'CXB', city: "Cox's Bazar", country: 'Bangladesh' },
  { airport_id: 4, name: 'Dubai International Airport', iata_code: 'DXB', city: 'Dubai', country: 'United Arab Emirates' },
  { airport_id: 5, name: 'Singapore Changi Airport', iata_code: 'SIN', city: 'Singapore', country: 'Singapore' },
  { airport_id: 6, name: 'Hamad International Airport', iata_code: 'DOH', city: 'Doha', country: 'Qatar' },
  { airport_id: 7, name: 'London Heathrow Airport', iata_code: 'LHR', city: 'London', country: 'United Kingdom' },
  { airport_id: 8, name: 'Suvarnabhumi Airport', iata_code: 'BKK', city: 'Bangkok', country: 'Thailand' },
];

export const INITIAL_AIRCRAFT: Aircraft[] = [
  { aircraft_id: 1, model: 'Boeing 787-9 Dreamliner', total_seats: 56, airline_id: 1 },
  { aircraft_id: 2, model: 'Boeing 737-800', total_seats: 56, airline_id: 2 },
  { aircraft_id: 3, model: 'Boeing 777-300ER', total_seats: 56, airline_id: 3 },
  { aircraft_id: 4, model: 'Airbus A350-900', total_seats: 56, airline_id: 4 },
  { aircraft_id: 5, model: 'Airbus A350-1000', total_seats: 56, airline_id: 5 },
  { aircraft_id: 6, model: 'Dash 8-Q400', total_seats: 56, airline_id: 1 },
];

export const INITIAL_REFUND_POLICIES: RefundPolicy[] = [
  { policy_id: 1, min_hours_before: 72, refund_percent: 90, label: 'Flexible Window (72+ hours prior)' },
  { policy_id: 2, min_hours_before: 24, refund_percent: 60, label: 'Standard Window (24–71 hours prior)' },
  { policy_id: 3, min_hours_before: 6, refund_percent: 25, label: 'Late Cancellation (6–23 hours prior)' },
  { policy_id: 4, min_hours_before: 0, refund_percent: 0, label: 'Departure Cutoff (< 6 hours prior)' },
];

export const INITIAL_FLIGHTS: Flight[] = [
  {
    flight_id: 101,
    flight_no: 'BG 347',
    airline_id: 1,
    aircraft_id: 1,
    origin_id: 1, // DAC
    dest_id: 4, // DXB
    departure_time: '2026-11-24T08:30:00',
    arrival_time: '2026-11-24T13:15:00',
    base_price: 420,
  },
  {
    flight_id: 102,
    flight_no: 'EK 583',
    airline_id: 3,
    aircraft_id: 3,
    origin_id: 1, // DAC
    dest_id: 4, // DXB
    departure_time: '2026-11-24T19:40:00',
    arrival_time: '2026-11-25T00:10:00',
    base_price: 510,
  },
  {
    flight_id: 103,
    flight_no: 'SQ 447',
    airline_id: 4,
    aircraft_id: 4,
    origin_id: 1, // DAC
    dest_id: 5, // SIN
    departure_time: '2026-11-25T23:55:00',
    arrival_time: '2026-11-26T06:05:00',
    base_price: 460,
  },
  {
    flight_id: 104,
    flight_no: 'BS 141',
    airline_id: 2,
    aircraft_id: 2,
    origin_id: 1, // DAC
    dest_id: 3, // CXB
    departure_time: '2026-11-24T09:15:00',
    arrival_time: '2026-11-24T10:20:00',
    base_price: 78,
  },
  {
    flight_id: 105,
    flight_no: 'QR 639',
    airline_id: 5,
    aircraft_id: 5,
    origin_id: 1, // DAC
    dest_id: 6, // DOH
    departure_time: '2026-11-26T04:15:00',
    arrival_time: '2026-11-26T09:30:00',
    base_price: 485,
  },
  {
    flight_id: 106,
    flight_no: 'BG 201',
    airline_id: 1,
    aircraft_id: 1,
    origin_id: 1, // DAC
    dest_id: 7, // LHR
    departure_time: '2026-11-27T11:00:00',
    arrival_time: '2026-11-27T21:40:00',
    base_price: 790,
  },
  {
    flight_id: 107,
    flight_no: 'BS 213',
    airline_id: 2,
    aircraft_id: 2,
    origin_id: 1, // DAC
    dest_id: 8, // BKK
    departure_time: '2026-11-25T10:30:00',
    arrival_time: '2026-11-25T13:55:00',
    base_price: 265,
  },
  {
    flight_id: 108,
    flight_no: 'BG 415',
    airline_id: 1,
    aircraft_id: 6,
    origin_id: 1, // DAC
    dest_id: 2, // CGP
    departure_time: '2026-11-24T14:20:00',
    arrival_time: '2026-11-24T15:10:00',
    base_price: 62,
  },
];

// Generate cabin seats for all initial flights with realistic pre-booked seats
const PREBOOKED_BY_FLIGHT: Record<number, string[]> = {
  101: ['1A', '2F', '3A', '3C', '4D', '6A', '6B', '6C', '7D', '7E', '8A', '8F', '9B', '9C'],
  102: ['1C', '3D', '4A', '6D', '6E', '7A', '7B', '8C', '8D', '9A', '10F'],
  103: ['1A', '1D', '3A', '3C', '5A', '5F', '6A', '6B', '7C', '7D', '8B', '8E', '9D', '10A', '10B'],
  104: ['3A', '6A', '6B', '6C', '7A', '7F', '8D', '8E', '9A', '9B', '9C', '10C', '10D', '11A', '11B', '11C'],
  105: ['2A', '3F', '4C', '6E', '6F', '7B', '8A', '8B', '9F'],
  106: ['1A', '1F', '2C', '3A', '3D', '4A', '4C', '5D', '6A', '6B', '6F', '7A', '7D', '8C', '8D', '9A', '9E', '10B'],
  107: ['3C', '6A', '6D', '7E', '8A', '8F', '9C'],
  108: ['6A', '6B', '7C', '7D', '8A', '9B'],
};

export function buildInitialSeats(): Seat[] {
  const allSeats: Seat[] = [];
  let cursor = 1001;
  for (const flight of INITIAL_FLIGHTS) {
    const flightSeats = generateSeatsForFlight(
      flight.flight_id,
      cursor,
      PREBOOKED_BY_FLIGHT[flight.flight_id] ?? []
    );
    allSeats.push(...flightSeats);
    cursor += flightSeats.length;
  }
  return allSeats;
}

export const INITIAL_SEATS: Seat[] = buildInitialSeats();

function findSeatId(flightId: number, seatNo: string): number {
  const seat = INITIAL_SEATS.find((s) => s.flight_id === flightId && s.seat_no === seatNo);
  return seat ? seat.seat_id : 1001;
}

export const INITIAL_BOOKINGS: Booking[] = [
  {
    booking_id: 5001,
    booking_date: '2026-11-12T10:15:00',
    status: 'CONFIRMED',
    total_amount: 1197,
    user_id: 1,
    flight_id: 101,
  },
  {
    booking_id: 5002,
    booking_date: '2026-11-15T14:42:00',
    status: 'CONFIRMED',
    total_amount: 920,
    user_id: 1,
    flight_id: 103,
  },
  {
    booking_id: 5003,
    booking_date: '2026-11-16T09:20:00',
    status: 'CONFIRMED',
    total_amount: 2449,
    user_id: 3,
    flight_id: 106,
  },
  {
    booking_id: 5004,
    booking_date: '2026-11-17T18:05:00',
    status: 'CANCELLED',
    total_amount: 510,
    user_id: 3,
    flight_id: 102,
  },
  {
    booking_id: 5005,
    booking_date: '2026-11-18T11:30:00',
    status: 'CONFIRMED',
    total_amount: 234,
    user_id: 1,
    flight_id: 104,
  },
];

export const INITIAL_PASSENGERS: Passenger[] = [
  {
    passenger_id: 7001,
    full_name: 'MD Shihab Ahmmed',
    passport_no: 'A04921842',
    date_of_birth: '2002-05-14',
    booking_id: 5001,
    seat_id: findSeatId(101, '3A'),
  },
  {
    passenger_id: 7002,
    full_name: 'Tanvir Ahmed',
    passport_no: 'A05193011',
    date_of_birth: '2001-11-03',
    booking_id: 5001,
    seat_id: findSeatId(101, '6A'),
  },
  {
    passenger_id: 7003,
    full_name: 'MD Shihab Ahmmed',
    passport_no: 'A04921842',
    date_of_birth: '2002-05-14',
    booking_id: 5002,
    seat_id: findSeatId(103, '6A'),
  },
  {
    passenger_id: 7004,
    full_name: 'Nusrat Jahan',
    passport_no: 'A08834219',
    date_of_birth: '2003-02-22',
    booking_id: 5002,
    seat_id: findSeatId(103, '6B'),
  },
  {
    passenger_id: 7005,
    full_name: 'Md. Shahnur Rahman Chowdhury',
    passport_no: 'B02249464',
    date_of_birth: '2001-08-19',
    booking_id: 5003,
    seat_id: findSeatId(106, '1A'),
  },
  {
    passenger_id: 7006,
    full_name: 'Md. Shahnur Rahman Chowdhury',
    passport_no: 'B02249464',
    date_of_birth: '2001-08-19',
    booking_id: 5004,
    seat_id: findSeatId(102, '6D'),
  },
  {
    passenger_id: 7007,
    full_name: 'MD Shihab Ahmmed',
    passport_no: 'A04921842',
    date_of_birth: '2002-05-14',
    booking_id: 5005,
    seat_id: findSeatId(104, '6A'),
  },
  {
    passenger_id: 7008,
    full_name: 'Farhana Islam',
    passport_no: 'A07119023',
    date_of_birth: '2002-09-10',
    booking_id: 5005,
    seat_id: findSeatId(104, '6B'),
  },
  {
    passenger_id: 7009,
    full_name: 'Rafiqul Islam',
    passport_no: 'A07119024',
    date_of_birth: '1974-03-27',
    booking_id: 5005,
    seat_id: findSeatId(104, '6C'),
  },
];

export const INITIAL_PAYMENTS: Payment[] = [
  {
    payment_id: 9001,
    method: 'Card',
    amount: 1197,
    payment_status: 'PAID',
    paid_at: '2026-11-12T10:16:12',
    booking_id: 5001,
    policy_id: null,
  },
  {
    payment_id: 9002,
    method: 'bKash',
    amount: 920,
    payment_status: 'PAID',
    paid_at: '2026-11-15T14:43:05',
    booking_id: 5002,
    policy_id: null,
  },
  {
    payment_id: 9003,
    method: 'Bank Transfer',
    amount: 2449,
    payment_status: 'PAID',
    paid_at: '2026-11-16T09:22:40',
    booking_id: 5003,
    policy_id: null,
  },
  {
    payment_id: 9004,
    method: 'Card',
    amount: 510,
    payment_status: 'REFUNDED',
    paid_at: '2026-11-17T18:06:15',
    booking_id: 5004,
    policy_id: 1,
    refunded_amount: 459,
  },
  {
    payment_id: 9005,
    method: 'Nagad',
    amount: 234,
    payment_status: 'PAID',
    paid_at: '2026-11-18T11:31:02',
    booking_id: 5005,
    policy_id: null,
  },
];

export const INITIAL_AUDITS: BookingAudit[] = [
  {
    audit_id: 1,
    old_status: 'PENDING',
    new_status: 'CONFIRMED',
    changed_at: '2026-11-12T10:16:12',
    booking_id: 5001,
  },
  {
    audit_id: 2,
    old_status: 'PENDING',
    new_status: 'CONFIRMED',
    changed_at: '2026-11-15T14:43:05',
    booking_id: 5002,
  },
  {
    audit_id: 3,
    old_status: 'PENDING',
    new_status: 'CONFIRMED',
    changed_at: '2026-11-16T09:22:40',
    booking_id: 5003,
  },
  {
    audit_id: 4,
    old_status: 'PENDING',
    new_status: 'CONFIRMED',
    changed_at: '2026-11-17T18:06:15',
    booking_id: 5004,
  },
  {
    audit_id: 5,
    old_status: 'CONFIRMED',
    new_status: 'CANCELLED',
    changed_at: '2026-11-18T08:14:29',
    booking_id: 5004,
  },
  {
    audit_id: 6,
    old_status: 'PENDING',
    new_status: 'CONFIRMED',
    changed_at: '2026-11-18T11:31:02',
    booking_id: 5005,
  },
];
