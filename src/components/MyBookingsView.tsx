import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Ticket, X } from 'lucide-react';
import {
  Airline,
  Airport,
  Booking,
  BookingStatus,
  Flight,
  Passenger,
  Payment,
  RefundPolicy,
  Seat,
  User,
} from '../types/skybook';
import { formatCurrency, formatDateTime, resolveRefundPolicy } from '../data/seedData';

interface MyBookingsViewProps {
  bookings: Booking[];
  flights: Flight[];
  airlines: Airline[];
  airports: Airport[];
  passengers: Passenger[];
  payments: Payment[];
  seats: Seat[];
  users: User[];
  refundPolicies: RefundPolicy[];
  currentUser: User | null;
  onOpenAuth: () => void;
  onCancelBooking: (bookingId: number, policyId: number, refundAmount: number) => void;
  onBrowseFlights: () => void;
}

export function MyBookingsView({
  bookings,
  flights,
  airlines,
  airports,
  passengers,
  payments,
  seats,
  users,
  refundPolicies,
  currentUser,
  onOpenAuth,
  onCancelBooking,
  onBrowseFlights,
}: MyBookingsViewProps) {
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'ALL'>('ALL');
  const [expandedId, setExpandedId] = useState<number | null>(bookings[0]?.booking_id ?? null);
  const [cancellingBookingId, setCancellingBookingId] = useState<number | null>(null);

  const flightMap = useMemo(() => new Map(flights.map((f) => [f.flight_id, f])), [flights]);
  const airlineMap = useMemo(() => new Map(airlines.map((a) => [a.airline_id, a])), [airlines]);
  const airportMap = useMemo(() => new Map(airports.map((a) => [a.airport_id, a])), [airports]);
  const seatMap = useMemo(() => new Map(seats.map((s) => [s.seat_id, s])), [seats]);
  const userMap = useMemo(() => new Map(users.map((u) => [u.user_id, u])), [users]);
  const paymentByBooking = useMemo(() => new Map(payments.map((p) => [p.booking_id, p])), [payments]);
  const policyMap = useMemo(() => new Map(refundPolicies.map((rp) => [rp.policy_id, rp])), [refundPolicies]);

  const visibleBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        if (!currentUser) return false;
        if (currentUser.role !== 'admin' && b.user_id !== currentUser.user_id) return false;
        if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime());
  }, [bookings, currentUser, statusFilter]);

  const cancellingBooking = cancellingBookingId
    ? bookings.find((b) => b.booking_id === cancellingBookingId)
    : null;
  const cancellingFlight = cancellingBooking ? flightMap.get(cancellingBooking.flight_id) : null;
  const refundQuote =
    cancellingBooking && cancellingFlight
      ? resolveRefundPolicy(cancellingFlight.departure_time, refundPolicies)
      : null;

  if (!currentUser) {
    return (
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16">
        <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Ticket className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h1 className="font-display text-xl font-bold text-slate-900">Sign in to view bookings</h1>
          <p className="mt-2 text-sm text-slate-600">
            Access your confirmed itineraries, seat numbers, payment receipts, and automated refund cancellations.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="mt-5 px-5 py-2.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {currentUser.role === 'admin' ? 'All Customer Bookings' : 'My Bookings'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {currentUser.role === 'admin'
              ? 'Viewing all reservations across customer accounts.'
              : `Reservations for ${currentUser.full_name} · ${currentUser.email}`}
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          {(['ALL', 'CONFIRMED', 'CANCELLED'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status === 'ALL' ? 'All' : status === 'CONFIRMED' ? 'Confirmed' : 'Cancelled'}
            </button>
          ))}
        </div>
      </div>

      {visibleBookings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Ticket className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h2 className="font-display text-lg font-semibold text-slate-900">No bookings found</h2>
          <p className="mt-1 text-sm text-slate-500">
            Reserve a flight to inspect seat assignments, receipts, and refund cancellation rules here.
          </p>
          <button
            type="button"
            onClick={onBrowseFlights}
            className="mt-5 px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold cursor-pointer"
          >
            Search Flights
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleBookings.map((booking) => {
            const flight = flightMap.get(booking.flight_id);
            const airline = flight ? airlineMap.get(flight.airline_id) : undefined;
            const origin = flight ? airportMap.get(flight.origin_id) : undefined;
            const dest = flight ? airportMap.get(flight.dest_id) : undefined;
            const payment = paymentByBooking.get(booking.booking_id);
            const bookingPassengers = passengers.filter((p) => p.booking_id === booking.booking_id);
            const owner = userMap.get(booking.user_id);
            const appliedPolicy = payment?.policy_id ? policyMap.get(payment.policy_id) : undefined;
            const isExpanded = expandedId === booking.booking_id;
            const dep = flight ? formatDateTime(flight.departure_time) : null;
            const bookedAt = formatDateTime(booking.booking_date);

            return (
              <article key={booking.booking_id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-slate-500">
                      <span className="font-semibold text-slate-900">Booking #{booking.booking_id}</span>
                      <span aria-hidden="true">·</span>
                      <span>Booked {bookedAt.shortDate}, {bookedAt.time}</span>
                      {currentUser.role === 'admin' && owner && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-sans text-slate-700">{owner.full_name}</span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-baseline gap-2.5">
                      <span className="font-display text-lg font-bold text-slate-900">
                        {origin?.city} ({origin?.iata_code}) → {dest?.city} ({dest?.iata_code})
                      </span>
                      <span className="text-sm text-slate-500">
                        {airline?.name} · <span className="font-mono">{flight?.flight_no}</span>
                      </span>
                    </div>

                    {dep && (
                      <div className="text-xs text-slate-500 tabular-nums">
                        Departure {dep.date} at <span className="font-mono text-slate-700">{dep.time}</span> ·{' '}
                        {bookingPassengers.length} {bookingPassengers.length === 1 ? 'passenger' : 'passengers'}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="lg:text-right">
                      <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                        {formatCurrency(booking.total_amount)}
                      </div>
                      <div className="text-xs font-medium">
                        <span
                          className={
                            booking.status === 'CONFIRMED'
                              ? 'text-emerald-700'
                              : booking.status === 'CANCELLED'
                              ? 'text-red-700'
                              : 'text-amber-700'
                          }
                        >
                          {booking.status === 'CONFIRMED'
                            ? 'Confirmed'
                            : booking.status === 'CANCELLED'
                            ? 'Cancelled'
                            : 'Pending'}
                        </span>
                        {payment && (
                          <span className="text-slate-500">
                            {' '}· {payment.method} ({payment.payment_status === 'REFUNDED' ? 'Refunded' : 'Paid'})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {booking.status === 'CONFIRMED' && (
                        <button
                          type="button"
                          onClick={() => setCancellingBookingId(booking.booking_id)}
                          className="px-3.5 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Cancel & Refund
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : booking.booking_id)}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        Details
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-200 bg-[#F8FAFC] p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Passengers Table */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-slate-600">Passengers & Assigned Seats</h3>
                      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
                        {bookingPassengers.map((p) => {
                          const seat = seatMap.get(p.seat_id);
                          return (
                            <div key={p.passenger_id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                              <div>
                                <div className="font-medium text-slate-900">{p.full_name}</div>
                                <div className="text-xs text-slate-500 font-mono">
                                  Passport {p.passport_no} · DOB {p.date_of_birth}
                                </div>
                              </div>
                              <div className="text-right font-mono text-xs tabular-nums">
                                <div className="font-semibold text-slate-900">Seat {seat?.seat_no ?? '—'}</div>
                                <div className="text-slate-500">{seat?.class ?? '—'}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Payment & Refund Record */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-slate-600">Payment & Policy Record</h3>
                      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Payment ID</span>
                          <span className="font-mono tabular-nums text-slate-900">#{payment?.payment_id ?? '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Method</span>
                          <span className="text-slate-900">{payment?.method ?? '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Paid Amount</span>
                          <span className="font-mono tabular-nums text-slate-900">
                            {payment ? formatCurrency(payment.amount) : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Payment Status</span>
                          <span className="font-medium text-slate-900">{payment?.payment_status ?? '—'}</span>
                        </div>
                        {appliedPolicy && (
                          <div className="pt-2 border-t border-slate-100 flex justify-between">
                            <span className="text-slate-500">Automatic Refund ({appliedPolicy.refund_percent}%)</span>
                            <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                              {formatCurrency(
                                payment?.refunded_amount ??
                                  Math.round((booking.total_amount * appliedPolicy.refund_percent) / 100)
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Cancel & Automatic Refund Modal */}
      {cancellingBooking && cancellingFlight && refundQuote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 id="cancel-modal-title" className="font-display text-lg font-bold text-slate-900">
                Cancel Booking #{cancellingBooking.booking_id}
              </h2>
              <button
                type="button"
                onClick={() => setCancellingBookingId(null)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label="Close cancellation dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-sm text-slate-600">
                Cancelling releases all reserved seats back to <span className="font-mono text-slate-900">AVAILABLE</span>, calculates your refund from the <span className="font-mono text-slate-900">Refund_Policy</span> table, and writes a status transition to <span className="font-mono text-slate-900">Booking_Audit</span>.
              </p>

              <div className="border border-slate-200 rounded-lg p-4 bg-[#F8FAFC] space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Time Until Departure</span>
                  <span className="font-mono tabular-nums text-slate-900">{refundQuote.hoursBefore} hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Matched Policy</span>
                  <span className="font-medium text-slate-900">Policy #{refundQuote.policy.policy_id} ({refundQuote.policy.refund_percent}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Original Fare Paid</span>
                  <span className="font-mono tabular-nums text-slate-900">{formatCurrency(cancellingBooking.total_amount)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="font-semibold text-slate-900">Automatic Refund Credit</span>
                  <span className="font-mono text-lg font-bold text-emerald-700 tabular-nums">
                    {formatCurrency(Math.round((cancellingBooking.total_amount * refundQuote.policy.refund_percent) / 100))}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCancellingBookingId(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const refundAmount = Math.round(
                      (cancellingBooking.total_amount * refundQuote.policy.refund_percent) / 100
                    );
                    onCancelBooking(cancellingBooking.booking_id, refundQuote.policy.policy_id, refundAmount);
                    setCancellingBookingId(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-sm font-semibold cursor-pointer"
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
