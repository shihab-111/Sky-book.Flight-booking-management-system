import { useMemo, useState } from 'react';
import {
  Aircraft,
  Airline,
  Airport,
  AppView,
  Booking,
  BookingAudit,
  Flight,
  Passenger,
  Payment,
  PaymentMethod,
  RefundPolicy,
  Seat,
  SeatClass,
  User,
} from './types/skybook';
import {
  generateSeatsForFlight,
  INITIAL_AIRCRAFT,
  INITIAL_AIRLINES,
  INITIAL_AIRPORTS,
  INITIAL_AUDITS,
  INITIAL_BOOKINGS,
  INITIAL_FLIGHTS,
  INITIAL_PASSENGERS,
  INITIAL_PAYMENTS,
  INITIAL_REFUND_POLICIES,
  INITIAL_SEATS,
  INITIAL_USERS,
} from './data/seedData';
import { Navbar } from './components/Navbar';
import { FlightSearchView } from './components/FlightSearchView';
import { BookingFlowModal, PassengerDraft } from './components/BookingFlowModal';
import { MyBookingsView } from './components/MyBookingsView';
import { AdminConsoleView } from './components/AdminConsoleView';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('flights');

  // Relational tables in reactive state (mirroring SkyBook 3NF ERD)
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(INITIAL_USERS[0]);
  const [airlines, setAirlines] = useState<Airline[]>(INITIAL_AIRLINES);
  const [airports, setAirports] = useState<Airport[]>(INITIAL_AIRPORTS);
  const [aircraft, setAircraft] = useState<Aircraft[]>(INITIAL_AIRCRAFT);
  const [flights, setFlights] = useState<Flight[]>(INITIAL_FLIGHTS);
  const [seats, setSeats] = useState<Seat[]>(INITIAL_SEATS);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [passengers, setPassengers] = useState<Passenger[]>(INITIAL_PASSENGERS);
  const [payments, setPayments] = useState<Payment[]>(INITIAL_PAYMENTS);
  const [refundPolicies] = useState<RefundPolicy[]>(INITIAL_REFUND_POLICIES);
  const [audits, setAudits] = useState<BookingAudit[]>(INITIAL_AUDITS);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeBookingFlight, setActiveBookingFlight] = useState<{
    flight: Flight;
    preferredClass: SeatClass | 'All';
  } | null>(null);

  const airlineMap = useMemo(() => new Map(airlines.map((a) => [a.airline_id, a])), [airlines]);
  const airportMap = useMemo(() => new Map(airports.map((a) => [a.airport_id, a])), [airports]);
  const aircraftMap = useMemo(() => new Map(aircraft.map((a) => [a.aircraft_id, a])), [aircraft]);

  // Auth handlers
  const handleRegister = (draft: Omit<User, 'user_id' | 'password_hash'>): User => {
    const nextId = Math.max(0, ...users.map((u) => u.user_id)) + 1;
    const created: User = {
      ...draft,
      user_id: nextId,
      password_hash: `$2y$10$registered_${nextId}`,
    };
    setUsers((prev) => [...prev, created]);
    return created;
  };

  // Transactional Booking Creation (mirrors SELECT ... FOR UPDATE + INSERT + TRIGGER)
  const handleConfirmBooking = (payload: {
    flight_id: number;
    passengers: PassengerDraft[];
    paymentMethod: PaymentMethod;
    totalAmount: number;
  }): { booking_id: number; payment_id: number } | { error: string } => {
    if (!currentUser) {
      return { error: 'Please sign in before confirming a reservation.' };
    }

    const seatIds = new Set(payload.passengers.map((p) => p.seat_id));
    const conflict = seats.find((s) => seatIds.has(s.seat_id) && s.status === 'BOOKED');
    if (conflict) {
      return { error: `Seat ${conflict.seat_no} is no longer available. Please choose another seat.` };
    }

    const nowIso = new Date().toISOString().slice(0, 19);
    const nextBookingId = Math.max(5000, ...bookings.map((b) => b.booking_id)) + 1;
    const nextPaymentId = Math.max(9000, ...payments.map((p) => p.payment_id)) + 1;
    let nextPassengerId = Math.max(7000, ...passengers.map((p) => p.passenger_id)) + 1;
    const nextAuditId = Math.max(0, ...audits.map((a) => a.audit_id)) + 1;

    const newBooking: Booking = {
      booking_id: nextBookingId,
      booking_date: nowIso,
      status: 'CONFIRMED',
      total_amount: payload.totalAmount,
      user_id: currentUser.user_id,
      flight_id: payload.flight_id,
    };

    const newPassengers: Passenger[] = payload.passengers.map((draft) => ({
      passenger_id: nextPassengerId++,
      full_name: draft.full_name,
      passport_no: draft.passport_no,
      date_of_birth: draft.date_of_birth,
      booking_id: nextBookingId,
      seat_id: draft.seat_id,
    }));

    const newPayment: Payment = {
      payment_id: nextPaymentId,
      method: payload.paymentMethod,
      amount: payload.totalAmount,
      payment_status: 'PAID',
      paid_at: nowIso,
      booking_id: nextBookingId,
      policy_id: null,
    };

    const newAudit: BookingAudit = {
      audit_id: nextAuditId,
      old_status: 'PENDING',
      new_status: 'CONFIRMED',
      changed_at: nowIso,
      booking_id: nextBookingId,
    };

    setSeats((prev) =>
      prev.map((s) => (seatIds.has(s.seat_id) ? { ...s, status: 'BOOKED' } : s))
    );
    setBookings((prev) => [newBooking, ...prev]);
    setPassengers((prev) => [...prev, ...newPassengers]);
    setPayments((prev) => [...prev, newPayment]);
    setAudits((prev) => [...prev, newAudit]);

    return { booking_id: nextBookingId, payment_id: nextPaymentId };
  };

  // Stored Procedure Equivalent: Cancel booking, apply Refund_Policy, release seats, write Booking_Audit
  const handleCancelBooking = (bookingId: number, policyId: number, refundAmount: number) => {
    const nowIso = new Date().toISOString().slice(0, 19);
    const releasedSeatIds = new Set(
      passengers.filter((p) => p.booking_id === bookingId).map((p) => p.seat_id)
    );

    setBookings((prev) =>
      prev.map((b) => (b.booking_id === bookingId ? { ...b, status: 'CANCELLED' } : b))
    );
    setPayments((prev) =>
      prev.map((p) =>
        p.booking_id === bookingId
          ? { ...p, payment_status: 'REFUNDED', policy_id: policyId, refunded_amount: refundAmount }
          : p
      )
    );
    setSeats((prev) =>
      prev.map((s) => (releasedSeatIds.has(s.seat_id) ? { ...s, status: 'AVAILABLE' } : s))
    );
    setAudits((prev) => [
      ...prev,
      {
        audit_id: Math.max(0, ...prev.map((a) => a.audit_id)) + 1,
        old_status: 'CONFIRMED',
        new_status: 'CANCELLED',
        changed_at: nowIso,
        booking_id: bookingId,
      },
    ]);
  };

  // Admin CRUD handlers
  const handleSaveFlight = (draft: Omit<Flight, 'flight_id'>, editingId?: number) => {
    if (editingId) {
      setFlights((prev) =>
        prev.map((f) => (f.flight_id === editingId ? { ...draft, flight_id: editingId } : f))
      );
    } else {
      const nextFlightId = Math.max(100, ...flights.map((f) => f.flight_id)) + 1;
      const nextSeatStart = Math.max(1000, ...seats.map((s) => s.seat_id)) + 1;
      const generatedSeats = generateSeatsForFlight(nextFlightId, nextSeatStart, []);
      setFlights((prev) => [...prev, { ...draft, flight_id: nextFlightId }]);
      setSeats((prev) => [...prev, ...generatedSeats]);
    }
  };

  const handleDeleteFlight = (flightId: number): string | null => {
    if (bookings.some((b) => b.flight_id === flightId)) {
      return 'Cannot delete flight: existing bookings reference this flight_id (FK constraint).';
    }
    setFlights((prev) => prev.filter((f) => f.flight_id !== flightId));
    setSeats((prev) => prev.filter((s) => s.flight_id !== flightId));
    return null;
  };

  const handleSaveAirline = (draft: Omit<Airline, 'airline_id'>, editingId?: number) => {
    if (editingId) {
      setAirlines((prev) =>
        prev.map((a) => (a.airline_id === editingId ? { ...draft, airline_id: editingId } : a))
      );
    } else {
      const nextId = Math.max(0, ...airlines.map((a) => a.airline_id)) + 1;
      setAirlines((prev) => [...prev, { ...draft, airline_id: nextId }]);
    }
  };

  const handleDeleteAirline = (airlineId: number): string | null => {
    if (flights.some((f) => f.airline_id === airlineId) || aircraft.some((ac) => ac.airline_id === airlineId)) {
      return 'Cannot delete airline: active aircraft or scheduled flights reference this airline_id.';
    }
    setAirlines((prev) => prev.filter((a) => a.airline_id !== airlineId));
    return null;
  };

  const handleSaveAirport = (draft: Omit<Airport, 'airport_id'>, editingId?: number) => {
    if (editingId) {
      setAirports((prev) =>
        prev.map((a) => (a.airport_id === editingId ? { ...draft, airport_id: editingId } : a))
      );
    } else {
      const nextId = Math.max(0, ...airports.map((a) => a.airport_id)) + 1;
      setAirports((prev) => [...prev, { ...draft, airport_id: nextId }]);
    }
  };

  const handleDeleteAirport = (airportId: number): string | null => {
    if (flights.some((f) => f.origin_id === airportId || f.dest_id === airportId)) {
      return 'Cannot delete airport: scheduled flights depart from or arrive at this airport_id.';
    }
    setAirports((prev) => prev.filter((a) => a.airport_id !== airportId));
    return null;
  };

  const handleSaveAircraft = (draft: Omit<Aircraft, 'aircraft_id'>, editingId?: number) => {
    if (editingId) {
      setAircraft((prev) =>
        prev.map((a) => (a.aircraft_id === editingId ? { ...draft, aircraft_id: editingId } : a))
      );
    } else {
      const nextId = Math.max(0, ...aircraft.map((a) => a.aircraft_id)) + 1;
      setAircraft((prev) => [...prev, { ...draft, aircraft_id: nextId }]);
    }
  };

  const handleDeleteAircraft = (aircraftId: number): string | null => {
    if (flights.some((f) => f.aircraft_id === aircraftId)) {
      return 'Cannot delete aircraft: scheduled flights are currently assigned to this aircraft_id.';
    }
    setAircraft((prev) => prev.filter((a) => a.aircraft_id !== aircraftId));
    return null;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      <Navbar
        activeView={activeView}
        onNavigate={setActiveView}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      <main className="flex-1">
        {activeView === 'flights' && (
          <FlightSearchView
            flights={flights}
            airlines={airlines}
            airports={airports}
            aircraft={aircraft}
            seats={seats}
            onSelectFlight={(flight, preferredClass) =>
              setActiveBookingFlight({ flight, preferredClass })
            }
          />
        )}

        {activeView === 'bookings' && (
          <MyBookingsView
            bookings={bookings}
            flights={flights}
            airlines={airlines}
            airports={airports}
            passengers={passengers}
            payments={payments}
            seats={seats}
            users={users}
            refundPolicies={refundPolicies}
            currentUser={currentUser}
            onOpenAuth={() => setAuthModalOpen(true)}
            onCancelBooking={handleCancelBooking}
            onBrowseFlights={() => setActiveView('flights')}
          />
        )}

        {activeView === 'admin' && (
          <AdminConsoleView
            currentUser={currentUser}
            onSwitchToAdmin={() => {
              const adminUser = users.find((u) => u.role === 'admin');
              if (adminUser) setCurrentUser(adminUser);
            }}
            flights={flights}
            airlines={airlines}
            airports={airports}
            aircraft={aircraft}
            seats={seats}
            bookings={bookings}
            audits={audits}
            refundPolicies={refundPolicies}
            onSaveFlight={handleSaveFlight}
            onDeleteFlight={handleDeleteFlight}
            onSaveAirline={handleSaveAirline}
            onDeleteAirline={handleDeleteAirline}
            onSaveAirport={handleSaveAirport}
            onDeleteAirport={handleDeleteAirport}
            onSaveAircraft={handleSaveAircraft}
            onDeleteAircraft={handleDeleteAircraft}
          />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>SkyBook Flight Ticket Booking System · North South University · CSE 311L Group 06</p>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setActiveView('flights')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Search Flights
            </button>
            <button
              type="button"
              onClick={() => setActiveView('bookings')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              My Bookings
            </button>
            <button
              type="button"
              onClick={() => setActiveView('admin')}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Admin
            </button>
          </div>
        </div>
      </footer>

      {activeBookingFlight && (
        <BookingFlowModal
          flight={activeBookingFlight.flight}
          airline={airlineMap.get(activeBookingFlight.flight.airline_id)}
          origin={airportMap.get(activeBookingFlight.flight.origin_id)}
          dest={airportMap.get(activeBookingFlight.flight.dest_id)}
          plane={aircraftMap.get(activeBookingFlight.flight.aircraft_id)}
          flightSeats={seats.filter((s) => s.flight_id === activeBookingFlight.flight.flight_id)}
          refundPolicies={refundPolicies}
          currentUser={currentUser}
          preferredClass={activeBookingFlight.preferredClass}
          onRequireAuth={() => setAuthModalOpen(true)}
          onClose={() => setActiveBookingFlight(null)}
          onConfirmBooking={handleConfirmBooking}
        />
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        users={users}
        onLogin={setCurrentUser}
        onRegister={handleRegister}
        onLogout={() => setCurrentUser(null)}
      />
    </div>
  );
}
