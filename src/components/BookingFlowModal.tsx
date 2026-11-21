import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, CreditCard, ShieldCheck, X } from 'lucide-react';
import {
  Aircraft,
  Airline,
  Airport,
  Flight,
  PaymentMethod,
  RefundPolicy,
  Seat,
  SeatClass,
  User,
} from '../types/skybook';
import { formatCurrency, formatDateTime, formatDuration, getSeatPrice } from '../data/seedData';

export interface PassengerDraft {
  seat_id: number;
  seat_no: string;
  seat_class: SeatClass;
  price: number;
  full_name: string;
  passport_no: string;
  date_of_birth: string;
}

interface BookingFlowModalProps {
  flight: Flight;
  airline?: Airline;
  origin?: Airport;
  dest?: Airport;
  plane?: Aircraft;
  flightSeats: Seat[];
  refundPolicies: RefundPolicy[];
  currentUser: User | null;
  preferredClass: SeatClass | 'All';
  onRequireAuth: () => void;
  onClose: () => void;
  onConfirmBooking: (payload: {
    flight_id: number;
    passengers: PassengerDraft[];
    paymentMethod: PaymentMethod;
    totalAmount: number;
  }) => { booking_id: number; payment_id: number } | { error: string };
}

export function BookingFlowModal({
  flight,
  airline,
  origin,
  dest,
  plane,
  flightSeats,
  refundPolicies,
  currentUser,
  preferredClass,
  onRequireAuth,
  onClose,
  onConfirmBooking,
}: BookingFlowModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [highlightClass, setHighlightClass] = useState<SeatClass | 'All'>(preferredClass);
  const [passengers, setPassengers] = useState<Record<number, { full_name: string; passport_no: string; date_of_birth: string }>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card');
  const [cardLast4, setCardLast4] = useState('4242');
  const [mobileWalletNo, setMobileWalletNo] = useState('01711-221810');
  const [error, setError] = useState('');
  const [confirmedReceipt, setConfirmedReceipt] = useState<{ booking_id: number; payment_id: number } | null>(null);

  const dep = formatDateTime(flight.departure_time);
  const arr = formatDateTime(flight.arrival_time);
  const duration = formatDuration(flight.departure_time, flight.arrival_time);

  const seatMapById = useMemo(() => new Map(flightSeats.map((s) => [s.seat_id, s])), [flightSeats]);

  const selectedSeats = useMemo(
    () =>
      selectedSeatIds
        .map((id) => seatMapById.get(id))
        .filter((s): s is Seat => Boolean(s)),
    [selectedSeatIds, seatMapById]
  );

  const totalAmount = useMemo(
    () => selectedSeats.reduce((sum, seat) => sum + getSeatPrice(flight.base_price, seat.class), 0),
    [selectedSeats, flight.base_price]
  );

  const cabinRows = useMemo(() => {
    const grouped = new Map<number, { rowNum: number; seatClass: SeatClass; seats: Seat[] }>();
    for (const s of flightSeats) {
      const match = s.seat_no.match(/^(\d+)/);
      const rowNum = match ? Number(match[1]) : 0;
      const existing = grouped.get(rowNum);
      if (existing) {
        existing.seats.push(s);
      } else {
        grouped.set(rowNum, { rowNum, seatClass: s.class, seats: [s] });
      }
    }
    return Array.from(grouped.values()).sort((a, b) => a.rowNum - b.rowNum);
  }, [flightSeats]);

  const toggleSeat = (seat: Seat) => {
    if (seat.status === 'BOOKED') return;
    setError('');
    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.seat_id)) {
        return prev.filter((id) => id !== seat.seat_id);
      }
      if (prev.length >= 6) {
        setError('You can reserve up to 6 seats in a single booking.');
        return prev;
      }
      return [...prev, seat.seat_id];
    });
  };

  const goToPassengers = () => {
    if (selectedSeats.length === 0) {
      setError('Select at least one open seat to continue.');
      return;
    }
    setError('');
    // Seed passenger form entries cleanly
    setPassengers((prev) => {
      const next = { ...prev };
      selectedSeats.forEach((seat, idx) => {
        if (!next[seat.seat_id]) {
          next[seat.seat_id] = {
            full_name: idx === 0 && currentUser ? currentUser.full_name : '',
            passport_no: idx === 0 ? 'A04921842' : '',
            date_of_birth: idx === 0 ? '2002-05-14' : '',
          };
        }
      });
      return next;
    });
    setStep(2);
  };

  const goToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    for (const seat of selectedSeats) {
      const p = passengers[seat.seat_id];
      if (!p || !p.full_name.trim() || !p.passport_no.trim() || !p.date_of_birth) {
        setError(`Complete full name, passport number, and date of birth for seat ${seat.seat_no}.`);
        return;
      }
    }
    setStep(3);
  };

  const handleFinalizeBooking = () => {
    setError('');
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    const drafts: PassengerDraft[] = selectedSeats.map((seat) => ({
      seat_id: seat.seat_id,
      seat_no: seat.seat_no,
      seat_class: seat.class,
      price: getSeatPrice(flight.base_price, seat.class),
      full_name: passengers[seat.seat_id].full_name.trim(),
      passport_no: passengers[seat.seat_id].passport_no.trim().toUpperCase(),
      date_of_birth: passengers[seat.seat_id].date_of_birth,
    }));

    const result = onConfirmBooking({
      flight_id: flight.flight_id,
      passengers: drafts,
      paymentMethod,
      totalAmount,
    });

    if ('error' in result) {
      setError(result.error);
      return;
    }

    setConfirmedReceipt(result);
    setStep(4);
  };

  const renderSeatButton = (seat: Seat) => {
    const isBooked = seat.status === 'BOOKED';
    const isSelected = selectedSeatIds.includes(seat.seat_id);
    const dimmed = highlightClass !== 'All' && seat.class !== highlightClass;

    return (
      <button
        key={seat.seat_id}
        type="button"
        disabled={isBooked}
        onClick={() => toggleSeat(seat)}
        title={`Seat ${seat.seat_no} · ${seat.class} · ${isBooked ? 'Booked' : formatCurrency(getSeatPrice(flight.base_price, seat.class))}`}
        className={`h-10 w-10 sm:w-11 rounded-md border font-mono text-xs font-medium transition-colors flex items-center justify-center tabular-nums ${
          isBooked
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            : isSelected
            ? 'bg-[#1D4ED8] border-[#1D4ED8] text-white font-semibold cursor-pointer'
            : dimmed
            ? 'bg-white border-slate-200 text-slate-400 opacity-50 hover:opacity-100 hover:border-slate-400 cursor-pointer'
            : 'bg-white border-slate-300 text-slate-800 hover:border-[#1D4ED8] hover:text-[#1D4ED8] cursor-pointer'
        }`}
        aria-label={`Seat ${seat.seat_no}, ${seat.class}, ${isBooked ? 'booked' : isSelected ? 'selected' : 'available'}`}
      >
        {isBooked ? '×' : isSelected ? <Check className="w-4 h-4" /> : seat.seat_no}
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-flow-title"
    >
      <div className="min-h-full flex items-start justify-center p-3 sm:p-6">
        <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-xl overflow-hidden my-4">
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                <span className="font-semibold text-slate-900">{flight.flight_no}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {origin?.iata_code} → {dest?.iata_code}
                </span>
                <span aria-hidden="true">·</span>
                <span>{dep.date}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {dep.time}–{arr.time} ({duration})
                </span>
              </div>
              <h2 id="booking-flow-title" className="font-display text-lg font-bold text-slate-900 mt-0.5">
                {step === 1 && '01. Choose Cabin Seats'}
                {step === 2 && '02. Passenger Details'}
                {step === 3 && '03. Payment & Refund Policy'}
                {step === 4 && 'Booking Confirmed'}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer shrink-0"
              aria-label="Close booking dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step progress rail */}
          {step < 4 && (
            <div className="px-5 sm:px-6 py-3 bg-[#F8FAFC] border-b border-slate-200 flex items-center gap-6 text-xs overflow-x-auto">
              {[
                { num: 1, label: 'Seat Selection' },
                { num: 2, label: 'Passengers' },
                { num: 3, label: 'Payment' },
              ].map((s) => (
                <div
                  key={s.num}
                  className={`flex items-center gap-2 whitespace-nowrap shrink-0 ${
                    step === s.num
                      ? 'text-[#1D4ED8] font-semibold'
                      : step > s.num
                      ? 'text-slate-800 font-medium'
                      : 'text-slate-400'
                  }`}
                >
                  <span className="font-mono tabular-nums">0{s.num}.</span>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mx-5 sm:mx-6 mt-5 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Step 4: Confirmed Receipt / Boarding Pass */}
          {step === 4 && confirmedReceipt ? (
            <div className="p-6 sm:p-8 max-w-2xl mx-auto">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display text-xl font-bold text-slate-900">
                    Reservation #{confirmedReceipt.booking_id} Confirmed
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Seats locked and marked booked, payment #{confirmedReceipt.payment_id} recorded via {paymentMethod}, and an entry has been written to the Booking Audit log.
                  </p>
                </div>
              </div>

              <div className="mt-6 border border-slate-200 rounded-xl divide-y divide-slate-200">
                <div className="p-5 flex flex-wrap items-center justify-between gap-4 bg-[#F8FAFC]">
                  <div>
                    <div className="text-xs text-slate-500">{airline?.name} · {plane?.model}</div>
                    <div className="font-mono text-lg font-bold text-slate-900 mt-0.5">
                      {origin?.iata_code} → {dest?.iata_code} · {flight.flight_no}
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-xs text-slate-500">{dep.date}</div>
                    <div className="text-base font-semibold text-slate-900">{dep.time} → {arr.time}</div>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="text-xs font-semibold text-slate-500">Assigned Passengers & Seats</div>
                  <div className="divide-y divide-slate-100">
                    {selectedSeats.map((seat) => {
                      const p = passengers[seat.seat_id];
                      return (
                        <div key={seat.seat_id} className="py-2.5 flex items-center justify-between text-sm">
                          <div>
                            <div className="font-medium text-slate-900">{p?.full_name}</div>
                            <div className="text-xs text-slate-500 font-mono">
                              Passport {p?.passport_no.toUpperCase()} · DOB {p?.date_of_birth}
                            </div>
                          </div>
                          <div className="text-right font-mono tabular-nums">
                            <div className="font-semibold text-slate-900">Seat {seat.seat_no}</div>
                            <div className="text-xs text-slate-500">{seat.class}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-5 flex items-center justify-between text-sm">
                  <span className="text-slate-600">Total Paid ({paymentMethod})</span>
                  <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              {/* Left Primary Area */}
              <div className="lg:col-span-8 p-5 sm:p-6">
                {step === 1 && (
                  <div className="space-y-6">
                    {/* Class filter & Legend */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                        {(['All', 'First', 'Business', 'Economy'] as (SeatClass | 'All')[]).map((cls) => (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => setHighlightClass(cls)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                              highlightClass === cls
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {cls}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded border border-slate-300 bg-white inline-block" />
                          Open
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-[#1D4ED8] inline-flex items-center justify-center text-white text-[10px]">
                            ✓
                          </span>
                          Selected
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-slate-100 border border-slate-200 inline-flex items-center justify-center text-slate-400 text-[10px]">
                            ×
                          </span>
                          Booked
                        </span>
                      </div>
                    </div>

                    {/* Aircraft Cabin Layout */}
                    <div className="border border-slate-200 rounded-xl p-4 sm:p-6 bg-[#F8FAFC] overflow-x-auto">
                      <div className="min-w-[360px] max-w-lg mx-auto space-y-5">
                        <div className="text-center pb-3 border-b border-slate-200 text-xs font-medium text-slate-500">
                          Forward Cabin · {plane?.model ?? 'Aircraft'}
                        </div>

                        {(['First', 'Business', 'Economy'] as SeatClass[]).map((cabin) => {
                          const rows = cabinRows.filter((r) => r.seatClass === cabin);
                          if (rows.length === 0) return null;
                          const isWide = cabin !== 'Economy';

                          return (
                            <div key={cabin} className="space-y-2.5">
                              <div className="flex items-center justify-between text-xs pt-2">
                                <span className="font-semibold text-slate-800">{cabin} Class</span>
                                <span className="font-mono text-slate-500 tabular-nums">
                                  {formatCurrency(getSeatPrice(flight.base_price, cabin))} / seat
                                </span>
                              </div>

                              <div className="space-y-2">
                                {rows.map(({ rowNum, seats }) => {
                                  const leftSeats = isWide ? seats.slice(0, 2) : seats.slice(0, 3);
                                  const rightSeats = isWide ? seats.slice(2, 4) : seats.slice(3, 6);
                                  return (
                                    <div key={rowNum} className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5">
                                        {leftSeats.map(renderSeatButton)}
                                      </div>
                                      <span className="w-8 text-center font-mono text-xs text-slate-400 tabular-nums">
                                        {rowNum}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        {rightSeats.map(renderSeatButton)}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <form id="passenger-form" onSubmit={goToPayment} className="space-y-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-600">
                        Enter legal passport details for each reserved seat.
                      </p>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Change Seats
                      </button>
                    </div>

                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
                      {selectedSeats.map((seat, idx) => {
                        const val = passengers[seat.seat_id] ?? {
                          full_name: '',
                          passport_no: '',
                          date_of_birth: '',
                        };
                        return (
                          <div key={seat.seat_id} className="p-4 sm:p-5 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-semibold text-slate-900">
                                Passenger {idx + 1} · Seat <span className="font-mono">{seat.seat_no}</span>
                              </span>
                              <span className="text-xs text-slate-500 font-mono tabular-nums">
                                {seat.class} · {formatCurrency(getSeatPrice(flight.base_price, seat.class))}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <label className="block text-xs font-medium text-slate-600">
                                  Full Name
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={val.full_name}
                                  onChange={(e) =>
                                    setPassengers((prev) => ({
                                      ...prev,
                                      [seat.seat_id]: { ...val, full_name: e.target.value },
                                    }))
                                  }
                                  placeholder="Full name as on passport"
                                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-xs font-medium text-slate-600">
                                  Passport Number
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={val.passport_no}
                                  onChange={(e) =>
                                    setPassengers((prev) => ({
                                      ...prev,
                                      [seat.seat_id]: { ...val, passport_no: e.target.value },
                                    }))
                                  }
                                  placeholder="A04921842"
                                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-mono text-slate-900 uppercase focus:outline-none focus:border-[#1D4ED8]"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="block text-xs font-medium text-slate-600">
                                  Date of Birth
                                </label>
                                <input
                                  type="date"
                                  required
                                  value={val.date_of_birth}
                                  onChange={(e) =>
                                    setPassengers((prev) => ({
                                      ...prev,
                                      [seat.seat_id]: { ...val, date_of_birth: e.target.value },
                                    }))
                                  }
                                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </form>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-600">
                        Select a payment method to simulate checkout and confirm your seats.
                      </p>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Edit Passengers
                      </button>
                    </div>

                    {!currentUser && (
                      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-amber-900">
                          Sign in to attach this booking to your customer account.
                        </p>
                        <button
                          type="button"
                          onClick={onRequireAuth}
                          className="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                        >
                          Sign In Now
                        </button>
                      </div>
                    )}

                    {/* Payment method selector */}
                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-slate-600">Payment Method</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {(['Card', 'bKash', 'Nagad', 'Bank Transfer'] as PaymentMethod[]).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPaymentMethod(m)}
                            className={`px-3 py-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                              paymentMethod === m
                                ? 'border-[#1D4ED8] bg-[#1D4ED8]/5 text-[#1D4ED8] font-semibold'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>

                      <div className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFC] grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {paymentMethod === 'Card' ? (
                          <>
                            <div className="space-y-1">
                              <label className="block text-xs font-medium text-slate-600">Card Number (Simulated)</label>
                              <input
                                type="text"
                                value={`•••• •••• •••• ${cardLast4}`}
                                onChange={(e) => setCardLast4(e.target.value.slice(-4))}
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs font-medium text-slate-600">Cardholder</label>
                              <input
                                type="text"
                                defaultValue={currentUser?.full_name ?? 'Passenger'}
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="sm:col-span-2 space-y-1">
                            <label className="block text-xs font-medium text-slate-600">
                              {paymentMethod} Account / Reference Number
                            </label>
                            <input
                              type="text"
                              value={mobileWalletNo}
                              onChange={(e) => setMobileWalletNo(e.target.value)}
                              className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-mono"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Refund Policy transparency table */}
                    <div className="space-y-2.5">
                      <div className="text-xs font-semibold text-slate-600">Applicable Refund Policy Schedule</div>
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500">
                            <tr>
                              <th className="text-left font-semibold px-4 py-2.5">Cancellation Window</th>
                              <th className="text-right font-semibold px-4 py-2.5">Min. Hours Before</th>
                              <th className="text-right font-semibold px-4 py-2.5">Refund Rate</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {refundPolicies.map((rp) => (
                              <tr key={rp.policy_id}>
                                <td className="px-4 py-2.5 text-slate-700">{rp.label}</td>
                                <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-600">
                                  {rp.min_hours_before}h
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900">
                                  {rp.refund_percent}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Sticky Summary Column */}
              <aside className="lg:col-span-4 p-5 sm:p-6 bg-[#F8FAFC] flex flex-col justify-between gap-6">
                <div className="space-y-5">
                  <div>
                    <h3 className="font-display text-sm font-bold text-slate-900">Booking Summary</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {airline?.name} · {flight.flight_no}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Selected Seats</span>
                      <span className="font-mono tabular-nums">{selectedSeats.length} / 6 max</span>
                    </div>

                    {selectedSeats.length === 0 ? (
                      <p className="text-sm text-slate-500 py-3">
                        Click open seats on the cabin map to add them to your itinerary.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedSeats.map((seat) => (
                          <div key={seat.seat_id} className="flex items-center justify-between text-sm">
                            <span className="text-slate-700">
                              Seat <strong className="font-mono">{seat.seat_no}</strong> · {seat.class}
                            </span>
                            <span className="font-mono font-medium text-slate-900 tabular-nums">
                              {formatCurrency(getSeatPrice(flight.base_price, seat.class))}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-slate-900">Total Fare</span>
                    <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {step === 1 && (
                    <button
                      type="button"
                      disabled={selectedSeats.length === 0}
                      onClick={goToPassengers}
                      className="w-full py-2.5 px-4 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:bg-slate-200 disabled:text-slate-500 text-white text-sm font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      Continue to Passengers
                    </button>
                  )}

                  {step === 2 && (
                    <button
                      type="submit"
                      form="passenger-form"
                      className="w-full py-2.5 px-4 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      Review & Pay
                    </button>
                  )}

                  {step === 3 && (
                    <button
                      type="button"
                      onClick={handleFinalizeBooking}
                      className="w-full py-2.5 px-4 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      Confirm & Pay {formatCurrency(totalAmount)}
                    </button>
                  )}

                  <div className="flex items-start gap-2 text-xs text-slate-500">
                    <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>Row-level seat locking prevents concurrent double-booking on checkout.</span>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
