import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Search, ShieldAlert, Trash2, X } from 'lucide-react';
import {
  Aircraft,
  Airline,
  Airport,
  Booking,
  BookingAudit,
  Flight,
  RefundPolicy,
  Seat,
  User,
} from '../types/skybook';
import { formatCurrency, formatDateTime } from '../data/seedData';

type AdminTab = 'flights' | 'airlines' | 'airports' | 'aircraft' | 'audit' | 'policies';

interface AdminConsoleViewProps {
  currentUser: User | null;
  onSwitchToAdmin: () => void;
  flights: Flight[];
  airlines: Airline[];
  airports: Airport[];
  aircraft: Aircraft[];
  seats: Seat[];
  bookings: Booking[];
  audits: BookingAudit[];
  refundPolicies: RefundPolicy[];
  onSaveFlight: (flight: Omit<Flight, 'flight_id'>, editingId?: number) => void;
  onDeleteFlight: (flightId: number) => string | null;
  onSaveAirline: (airline: Omit<Airline, 'airline_id'>, editingId?: number) => void;
  onDeleteAirline: (airlineId: number) => string | null;
  onSaveAirport: (airport: Omit<Airport, 'airport_id'>, editingId?: number) => void;
  onDeleteAirport: (airportId: number) => string | null;
  onSaveAircraft: (ac: Omit<Aircraft, 'aircraft_id'>, editingId?: number) => void;
  onDeleteAircraft: (aircraftId: number) => string | null;
}

export function AdminConsoleView({
  currentUser,
  onSwitchToAdmin,
  flights,
  airlines,
  airports,
  aircraft,
  seats,
  audits,
  refundPolicies,
  onSaveFlight,
  onDeleteFlight,
  onSaveAirline,
  onDeleteAirline,
  onSaveAirport,
  onDeleteAirport,
  onSaveAircraft,
  onDeleteAircraft,
}: AdminConsoleViewProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('flights');
  const [query, setQuery] = useState('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);

  // Flight form state
  const [flightNo, setFlightNo] = useState('');
  const [flightAirlineId, setFlightAirlineId] = useState<number>(airlines[0]?.airline_id ?? 1);
  const [flightAircraftId, setFlightAircraftId] = useState<number>(aircraft[0]?.aircraft_id ?? 1);
  const [flightOriginId, setFlightOriginId] = useState<number>(airports[0]?.airport_id ?? 1);
  const [flightDestId, setFlightDestId] = useState<number>(airports[1]?.airport_id ?? 2);
  const [flightDep, setFlightDep] = useState('2026-11-28T09:00');
  const [flightArr, setFlightArr] = useState('2026-11-28T14:00');
  const [flightPrice, setFlightPrice] = useState('380');

  // Airline form state
  const [airlineName, setAirlineName] = useState('');
  const [airlineCode, setAirlineCode] = useState('');
  const [airlineCountry, setAirlineCountry] = useState('');

  // Airport form state
  const [airportName, setAirportName] = useState('');
  const [airportCode, setAirportCode] = useState('');
  const [airportCity, setAirportCity] = useState('');
  const [airportCountry, setAirportCountry] = useState('');

  // Aircraft form state
  const [acModel, setAcModel] = useState('');
  const [acSeats, setAcSeats] = useState('56');
  const [acAirlineId, setAcAirlineId] = useState<number>(airlines[0]?.airline_id ?? 1);

  const airlineMap = useMemo(() => new Map(airlines.map((a) => [a.airline_id, a])), [airlines]);
  const airportMap = useMemo(() => new Map(airports.map((a) => [a.airport_id, a])), [airports]);
  const aircraftMap = useMemo(() => new Map(aircraft.map((a) => [a.aircraft_id, a])), [aircraft]);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-16">
        <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center">
          <ShieldAlert className="w-8 h-8 text-amber-700 mx-auto mb-3" />
          <h1 className="font-display text-xl font-bold text-slate-900">Administrator Access Required</h1>
          <p className="mt-2 text-sm text-slate-600">
            SkyBook enforces role-based access control. Sign in with an administrator account to manage airlines, airports, aircraft, flights, and audit logs.
          </p>
          <button
            type="button"
            onClick={onSwitchToAdmin}
            className="mt-5 px-5 py-2.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold cursor-pointer"
          >
            Switch to Demo Admin Account
          </button>
        </div>
      </section>
    );
  }

  const openCreateModal = () => {
    setFeedbackError(null);
    setEditingId(undefined);
    if (activeTab === 'flights') {
      setFlightNo('');
      setFlightAirlineId(airlines[0]?.airline_id ?? 1);
      setFlightAircraftId(aircraft[0]?.aircraft_id ?? 1);
      setFlightOriginId(airports[0]?.airport_id ?? 1);
      setFlightDestId(airports[1]?.airport_id ?? 2);
      setFlightDep('2026-11-28T09:00');
      setFlightArr('2026-11-28T13:30');
      setFlightPrice('390');
    } else if (activeTab === 'airlines') {
      setAirlineName('');
      setAirlineCode('');
      setAirlineCountry('');
    } else if (activeTab === 'airports') {
      setAirportName('');
      setAirportCode('');
      setAirportCity('');
      setAirportCountry('');
    } else if (activeTab === 'aircraft') {
      setAcModel('');
      setAcSeats('56');
      setAcAirlineId(airlines[0]?.airline_id ?? 1);
    }
    setModalOpen(true);
  };

  const openEditFlight = (f: Flight) => {
    setFeedbackError(null);
    setEditingId(f.flight_id);
    setFlightNo(f.flight_no);
    setFlightAirlineId(f.airline_id);
    setFlightAircraftId(f.aircraft_id);
    setFlightOriginId(f.origin_id);
    setFlightDestId(f.dest_id);
    setFlightDep(f.departure_time.slice(0, 16));
    setFlightArr(f.arrival_time.slice(0, 16));
    setFlightPrice(String(f.base_price));
    setModalOpen(true);
  };

  const openEditAirline = (al: Airline) => {
    setFeedbackError(null);
    setEditingId(al.airline_id);
    setAirlineName(al.name);
    setAirlineCode(al.iata_code);
    setAirlineCountry(al.country);
    setModalOpen(true);
  };

  const openEditAirport = (ap: Airport) => {
    setFeedbackError(null);
    setEditingId(ap.airport_id);
    setAirportName(ap.name);
    setAirportCode(ap.iata_code);
    setAirportCity(ap.city);
    setAirportCountry(ap.country);
    setModalOpen(true);
  };

  const openEditAircraft = (ac: Aircraft) => {
    setFeedbackError(null);
    setEditingId(ac.aircraft_id);
    setAcModel(ac.model);
    setAcSeats(String(ac.total_seats));
    setAcAirlineId(ac.airline_id);
    setModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);

    if (activeTab === 'flights') {
      if (flightOriginId === flightDestId) {
        setFeedbackError('Origin and destination airports cannot be the same (SQL CHECK constraint).');
        return;
      }
      onSaveFlight(
        {
          flight_no: flightNo.trim().toUpperCase(),
          airline_id: Number(flightAirlineId),
          aircraft_id: Number(flightAircraftId),
          origin_id: Number(flightOriginId),
          dest_id: Number(flightDestId),
          departure_time: `${flightDep}:00`,
          arrival_time: `${flightArr}:00`,
          base_price: Math.max(10, Number(flightPrice) || 100),
        },
        editingId
      );
    } else if (activeTab === 'airlines') {
      onSaveAirline(
        {
          name: airlineName.trim(),
          iata_code: airlineCode.trim().toUpperCase().slice(0, 2),
          country: airlineCountry.trim(),
        },
        editingId
      );
    } else if (activeTab === 'airports') {
      onSaveAirport(
        {
          name: airportName.trim(),
          iata_code: airportCode.trim().toUpperCase().slice(0, 3),
          city: airportCity.trim(),
          country: airportCountry.trim(),
        },
        editingId
      );
    } else if (activeTab === 'aircraft') {
      onSaveAircraft(
        {
          model: acModel.trim(),
          total_seats: Math.max(12, Number(acSeats) || 56),
          airline_id: Number(acAirlineId),
        },
        editingId
      );
    }

    setModalOpen(false);
  };

  const handleDelete = (type: AdminTab, id: number) => {
    setFeedbackError(null);
    let err: string | null = null;
    if (type === 'flights') err = onDeleteFlight(id);
    if (type === 'airlines') err = onDeleteAirline(id);
    if (type === 'airports') err = onDeleteAirport(id);
    if (type === 'aircraft') err = onDeleteAircraft(id);
    if (err) setFeedbackError(err);
  };

  const q = query.trim().toLowerCase();

  const filteredFlights = flights.filter((f) => {
    if (!q) return true;
    const orig = airportMap.get(f.origin_id)?.iata_code ?? '';
    const dest = airportMap.get(f.dest_id)?.iata_code ?? '';
    const al = airlineMap.get(f.airline_id)?.name ?? '';
    return `${f.flight_no} ${orig} ${dest} ${al}`.toLowerCase().includes(q);
  });

  const filteredAirlines = airlines.filter(
    (a) => !q || `${a.name} ${a.iata_code} ${a.country}`.toLowerCase().includes(q)
  );
  const filteredAirports = airports.filter(
    (a) => !q || `${a.name} ${a.iata_code} ${a.city} ${a.country}`.toLowerCase().includes(q)
  );
  const filteredAircraft = aircraft.filter((ac) => {
    if (!q) return true;
    const al = airlineMap.get(ac.airline_id)?.name ?? '';
    return `${ac.model} ${al}`.toLowerCase().includes(q);
  });

  const sortedAudits = [...audits].sort(
    (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  );

  const navTabs: { id: AdminTab; label: string; count: number }[] = [
    { id: 'flights', label: 'Flights', count: flights.length },
    { id: 'airlines', label: 'Airlines', count: airlines.length },
    { id: 'airports', label: 'Airports', count: airports.length },
    { id: 'aircraft', label: 'Aircraft', count: aircraft.length },
    { id: 'audit', label: 'Booking Audit Trail', count: audits.length },
    { id: 'policies', label: 'Refund Policies', count: refundPolicies.length },
  ];

  const supportsCreate = activeTab === 'flights' || activeTab === 'airlines' || activeTab === 'airports' || activeTab === 'aircraft';

  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar Navigation (SaaS dashboard layout) */}
        <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-3 space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500">
            Database Entities
          </div>
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setQuery('');
                  setFeedbackError(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#1D4ED8]/8 text-[#1D4ED8] font-semibold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <span className="truncate">{tab.label}</span>
                <span className="font-mono text-xs tabular-nums text-slate-400">{tab.count}</span>
              </button>
            );
          })}
        </aside>

        {/* Main Admin Table Viewport */}
        <div className="lg:col-span-9 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">
                Admin / {navTabs.find((t) => t.id === activeTab)?.label}
              </p>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                {navTabs.find((t) => t.id === activeTab)?.label}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {supportsCreate && (
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter records..."
                    className="h-10 pl-9 pr-3 w-48 sm:w-56 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>
              )}

              {supportsCreate && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="h-10 px-4 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add {activeTab === 'flights' ? 'Flight' : activeTab === 'airlines' ? 'Airline' : activeTab === 'airports' ? 'Airport' : 'Aircraft'}
                </button>
              )}
            </div>
          </div>

          {feedbackError && (
            <div className="px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 flex items-center justify-between gap-3">
              <span>{feedbackError}</span>
              <button
                type="button"
                onClick={() => setFeedbackError(null)}
                className="text-xs font-semibold underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              {/* FLIGHTS TABLE */}
              {activeTab === 'flights' && (
                <table className="w-full text-sm">
                  <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs text-slate-500">
                    <tr>
                      <th className="text-left font-semibold px-5 py-3">Flight</th>
                      <th className="text-left font-semibold px-5 py-3">Airline & Aircraft</th>
                      <th className="text-left font-semibold px-5 py-3">Route</th>
                      <th className="text-left font-semibold px-5 py-3">Departure</th>
                      <th className="text-right font-semibold px-5 py-3">Base Fare</th>
                      <th className="text-right font-semibold px-5 py-3">Seats Open</th>
                      <th className="text-right font-semibold px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredFlights.map((f) => {
                      const al = airlineMap.get(f.airline_id);
                      const ac = aircraftMap.get(f.aircraft_id);
                      const orig = airportMap.get(f.origin_id);
                      const dest = airportMap.get(f.dest_id);
                      const fSeats = seats.filter((s) => s.flight_id === f.flight_id);
                      const openSeats = fSeats.filter((s) => s.status === 'AVAILABLE').length;
                      const dep = formatDateTime(f.departure_time);

                      return (
                        <tr key={f.flight_id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3 font-mono font-semibold text-slate-900">{f.flight_no}</td>
                          <td className="px-5 py-3">
                            <div className="text-slate-900 font-medium">{al?.name}</div>
                            <div className="text-xs text-slate-500">{ac?.model}</div>
                          </td>
                          <td className="px-5 py-3 font-mono text-slate-800">
                            {orig?.iata_code} → {dest?.iata_code}
                          </td>
                          <td className="px-5 py-3 font-mono text-xs text-slate-600 tabular-nums">
                            {dep.shortDate} · {dep.time}
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-medium text-slate-900 tabular-nums">
                            {formatCurrency(f.base_price)}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                            {openSeats} / {fSeats.length}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditFlight(f)}
                                className="p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                                aria-label={`Edit ${f.flight_no}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete('flights', f.flight_id)}
                                className="p-2 rounded-md text-slate-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                aria-label={`Delete ${f.flight_no}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* AIRLINES TABLE */}
              {activeTab === 'airlines' && (
                <table className="w-full text-sm">
                  <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs text-slate-500">
                    <tr>
                      <th className="text-left font-semibold px-5 py-3">ID</th>
                      <th className="text-left font-semibold px-5 py-3">IATA</th>
                      <th className="text-left font-semibold px-5 py-3">Airline Name</th>
                      <th className="text-left font-semibold px-5 py-3">Country</th>
                      <th className="text-right font-semibold px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAirlines.map((al) => (
                      <tr key={al.airline_id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3 font-mono text-xs text-slate-500 tabular-nums">#{al.airline_id}</td>
                        <td className="px-5 py-3 font-mono font-semibold text-slate-900">{al.iata_code}</td>
                        <td className="px-5 py-3 font-medium text-slate-900">{al.name}</td>
                        <td className="px-5 py-3 text-slate-600">{al.country}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditAirline(al)}
                              className="p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                              aria-label={`Edit ${al.name}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete('airlines', al.airline_id)}
                              className="p-2 rounded-md text-slate-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                              aria-label={`Delete ${al.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* AIRPORTS TABLE */}
              {activeTab === 'airports' && (
                <table className="w-full text-sm">
                  <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs text-slate-500">
                    <tr>
                      <th className="text-left font-semibold px-5 py-3">IATA</th>
                      <th className="text-left font-semibold px-5 py-3">Airport Name</th>
                      <th className="text-left font-semibold px-5 py-3">City</th>
                      <th className="text-left font-semibold px-5 py-3">Country</th>
                      <th className="text-right font-semibold px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAirports.map((ap) => (
                      <tr key={ap.airport_id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3 font-mono font-semibold text-slate-900">{ap.iata_code}</td>
                        <td className="px-5 py-3 font-medium text-slate-900">{ap.name}</td>
                        <td className="px-5 py-3 text-slate-700">{ap.city}</td>
                        <td className="px-5 py-3 text-slate-600">{ap.country}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditAirport(ap)}
                              className="p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                              aria-label={`Edit ${ap.name}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete('airports', ap.airport_id)}
                              className="p-2 rounded-md text-slate-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                              aria-label={`Delete ${ap.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* AIRCRAFT TABLE */}
              {activeTab === 'aircraft' && (
                <table className="w-full text-sm">
                  <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs text-slate-500">
                    <tr>
                      <th className="text-left font-semibold px-5 py-3">ID</th>
                      <th className="text-left font-semibold px-5 py-3">Aircraft Model</th>
                      <th className="text-left font-semibold px-5 py-3">Owning Airline</th>
                      <th className="text-right font-semibold px-5 py-3">Total Seats</th>
                      <th className="text-right font-semibold px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAircraft.map((ac) => (
                      <tr key={ac.aircraft_id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3 font-mono text-xs text-slate-500 tabular-nums">#{ac.aircraft_id}</td>
                        <td className="px-5 py-3 font-medium text-slate-900">{ac.model}</td>
                        <td className="px-5 py-3 text-slate-700">{airlineMap.get(ac.airline_id)?.name ?? '—'}</td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-900">{ac.total_seats}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditAircraft(ac)}
                              className="p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                              aria-label={`Edit ${ac.model}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete('aircraft', ac.aircraft_id)}
                              className="p-2 rounded-md text-slate-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                              aria-label={`Delete ${ac.model}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* AUDIT TRAIL TABLE */}
              {activeTab === 'audit' && (
                <table className="w-full text-sm">
                  <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs text-slate-500">
                    <tr>
                      <th className="text-left font-semibold px-5 py-3">Audit ID</th>
                      <th className="text-left font-semibold px-5 py-3">Booking ID</th>
                      <th className="text-left font-semibold px-5 py-3">Old Status</th>
                      <th className="text-left font-semibold px-5 py-3">New Status</th>
                      <th className="text-right font-semibold px-5 py-3">Changed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedAudits.map((a) => {
                      const ts = formatDateTime(a.changed_at);
                      return (
                        <tr key={a.audit_id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3 font-mono text-xs text-slate-500 tabular-nums">#{a.audit_id}</td>
                          <td className="px-5 py-3 font-mono font-semibold text-slate-900 tabular-nums">#{a.booking_id}</td>
                          <td className="px-5 py-3 font-mono text-xs text-slate-600">{a.old_status}</td>
                          <td className="px-5 py-3 font-mono text-xs font-semibold">
                            <span
                              className={
                                a.new_status === 'CONFIRMED'
                                  ? 'text-emerald-700'
                                  : a.new_status === 'CANCELLED'
                                  ? 'text-red-700'
                                  : 'text-amber-700'
                              }
                            >
                              {a.new_status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                            {ts.date} · {ts.time}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* REFUND POLICIES TABLE */}
              {activeTab === 'policies' && (
                <table className="w-full text-sm">
                  <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs text-slate-500">
                    <tr>
                      <th className="text-left font-semibold px-5 py-3">Policy ID</th>
                      <th className="text-left font-semibold px-5 py-3">Window Description</th>
                      <th className="text-right font-semibold px-5 py-3">Min. Hours Before</th>
                      <th className="text-right font-semibold px-5 py-3">Refund Percent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {refundPolicies.map((rp) => (
                      <tr key={rp.policy_id}>
                        <td className="px-5 py-3 font-mono text-xs text-slate-500 tabular-nums">#{rp.policy_id}</td>
                        <td className="px-5 py-3 font-medium text-slate-900">{rp.label}</td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums text-slate-700">{rp.min_hours_before}h</td>
                        <td className="px-5 py-3 text-right font-mono font-semibold tabular-nums text-slate-900">{rp.refund_percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit CRUD Modal */}
      {modalOpen && supportsCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900">
                {editingId ? 'Edit' : 'Add'}{' '}
                {activeTab === 'flights'
                  ? 'Flight'
                  : activeTab === 'airlines'
                  ? 'Airline'
                  : activeTab === 'airports'
                  ? 'Airport'
                  : 'Aircraft'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              {activeTab === 'flights' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">Flight Number</label>
                      <input
                        type="text"
                        required
                        value={flightNo}
                        onChange={(e) => setFlightNo(e.target.value)}
                        placeholder="BG 391"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-mono uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">Economy Base Price (Tk)</label>
                      <input
                        type="number"
                        required
                        min={10}
                        value={flightPrice}
                        onChange={(e) => setFlightPrice(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">Airline</label>
                      <select
                        value={flightAirlineId}
                        onChange={(e) => setFlightAirlineId(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white"
                      >
                        {airlines.map((al) => (
                          <option key={al.airline_id} value={al.airline_id}>
                            {al.iata_code} — {al.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">Aircraft</label>
                      <select
                        value={flightAircraftId}
                        onChange={(e) => setFlightAircraftId(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white"
                      >
                        {aircraft.map((ac) => (
                          <option key={ac.aircraft_id} value={ac.aircraft_id}>
                            {ac.model}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">Origin Airport</label>
                      <select
                        value={flightOriginId}
                        onChange={(e) => setFlightOriginId(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white"
                      >
                        {airports.map((ap) => (
                          <option key={ap.airport_id} value={ap.airport_id}>
                            {ap.iata_code} — {ap.city}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">Destination Airport</label>
                      <select
                        value={flightDestId}
                        onChange={(e) => setFlightDestId(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white"
                      >
                        {airports.map((ap) => (
                          <option key={ap.airport_id} value={ap.airport_id}>
                            {ap.iata_code} — {ap.city}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">Departure Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={flightDep}
                        onChange={(e) => setFlightDep(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">Arrival Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={flightArr}
                        onChange={(e) => setFlightArr(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'airlines' && (
                <>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Airline Name</label>
                    <input
                      type="text"
                      required
                      value={airlineName}
                      onChange={(e) => setAirlineName(e.target.value)}
                      placeholder="Novoair"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">IATA Code (2 chars)</label>
                      <input
                        type="text"
                        required
                        maxLength={2}
                        value={airlineCode}
                        onChange={(e) => setAirlineCode(e.target.value)}
                        placeholder="VQ"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-mono uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">Country</label>
                      <input
                        type="text"
                        required
                        value={airlineCountry}
                        onChange={(e) => setAirlineCountry(e.target.value)}
                        placeholder="Bangladesh"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'airports' && (
                <>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Airport Name</label>
                    <input
                      type="text"
                      required
                      value={airportName}
                      onChange={(e) => setAirportName(e.target.value)}
                      placeholder="Osmani International Airport"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">IATA (3 chars)</label>
                      <input
                        type="text"
                        required
                        maxLength={3}
                        value={airportCode}
                        onChange={(e) => setAirportCode(e.target.value)}
                        placeholder="ZYL"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-mono uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">City</label>
                      <input
                        type="text"
                        required
                        value={airportCity}
                        onChange={(e) => setAirportCity(e.target.value)}
                        placeholder="Sylhet"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">Country</label>
                      <input
                        type="text"
                        required
                        value={airportCountry}
                        onChange={(e) => setAirportCountry(e.target.value)}
                        placeholder="Bangladesh"
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'aircraft' && (
                <>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-slate-600">Aircraft Model</label>
                    <input
                      type="text"
                      required
                      value={acModel}
                      onChange={(e) => setAcModel(e.target.value)}
                      placeholder="Airbus A321neo"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">Owning Airline</label>
                      <select
                        value={acAirlineId}
                        onChange={(e) => setAcAirlineId(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white"
                      >
                        {airlines.map((al) => (
                          <option key={al.airline_id} value={al.airline_id}>
                            {al.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-slate-600">Total Seats</label>
                      <input
                        type="number"
                        required
                        min={12}
                        value={acSeats}
                        onChange={(e) => setAcSeats(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold cursor-pointer"
                >
                  {editingId ? 'Save Changes' : 'Create Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
