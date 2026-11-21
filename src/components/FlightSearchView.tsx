import { useMemo, useState } from 'react';
import { ArrowLeftRight, Plane, Search } from 'lucide-react';
import { Aircraft, Airline, Airport, Flight, Seat, SeatClass } from '../types/skybook';
import { formatCurrency, formatDateTime, formatDuration, getSeatPrice } from '../data/seedData';

const BANNER_IMAGE_URL = '/src/assets/images/skybook_aviation_banner_1795172929762.jpg';

interface FlightSearchViewProps {
  flights: Flight[];
  airlines: Airline[];
  airports: Airport[];
  aircraft: Aircraft[];
  seats: Seat[];
  onSelectFlight: (flight: Flight, preferredClass: SeatClass | 'All') => void;
}

export function FlightSearchView({
  flights,
  airlines,
  airports,
  aircraft,
  seats,
  onSelectFlight,
}: FlightSearchViewProps) {
  const [originId, setOriginId] = useState<string>('');
  const [destId, setDestId] = useState<string>('');
  const [departureDate, setDepartureDate] = useState<string>('');
  const [travelClass, setTravelClass] = useState<SeatClass | 'All'>('All');
  const [bannerError, setBannerError] = useState(false);

  const airlineMap = useMemo(() => new Map(airlines.map((a) => [a.airline_id, a])), [airlines]);
  const airportMap = useMemo(() => new Map(airports.map((a) => [a.airport_id, a])), [airports]);
  const aircraftMap = useMemo(() => new Map(aircraft.map((a) => [a.aircraft_id, a])), [aircraft]);

  const seatsByFlight = useMemo(() => {
    const map = new Map<number, Seat[]>();
    for (const s of seats) {
      const list = map.get(s.flight_id);
      if (list) list.push(s);
      else map.set(s.flight_id, [s]);
    }
    return map;
  }, [seats]);

  const filteredFlights = useMemo(() => {
    return flights
      .map((flight) => {
        const flightSeats = seatsByFlight.get(flight.flight_id) ?? [];
        const relevantSeats =
          travelClass === 'All' ? flightSeats : flightSeats.filter((s) => s.class === travelClass);
        const openCount = relevantSeats.filter((s) => s.status === 'AVAILABLE').length;
        const totalCount = relevantSeats.length;
        const displayPrice =
          travelClass === 'All' ? flight.base_price : getSeatPrice(flight.base_price, travelClass);

        return {
          flight,
          airline: airlineMap.get(flight.airline_id),
          origin: airportMap.get(flight.origin_id),
          dest: airportMap.get(flight.dest_id),
          plane: aircraftMap.get(flight.aircraft_id),
          openCount,
          totalCount,
          displayPrice,
        };
      })
      .filter((item) => {
        if (originId && String(item.flight.origin_id) !== originId) return false;
        if (destId && String(item.flight.dest_id) !== destId) return false;
        if (departureDate && !item.flight.departure_time.startsWith(departureDate)) return false;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(a.flight.departure_time).getTime() - new Date(b.flight.departure_time).getTime()
      );
  }, [flights, seatsByFlight, travelClass, airlineMap, airportMap, aircraftMap, originId, destId, departureDate]);

  const handleSwap = () => {
    const prev = originId;
    setOriginId(destId);
    setDestId(prev);
  };

  const resetFilters = () => {
    setOriginId('');
    setDestId('');
    setDepartureDate('');
    setTravelClass('All');
  };

  return (
    <div>
      {/* Hero Banner Photo */}
      <section className="relative bg-slate-900 overflow-hidden min-h-[340px] sm:min-h-[420px] flex items-end">
        {!bannerError ? (
          <img
            src={BANNER_IMAGE_URL}
            alt="Commercial passenger aircraft ascending above clouds at sunrise"
            referrerPolicy="no-referrer"
            onError={() => setBannerError(true)}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0B2347] to-slate-800"
            aria-hidden="true"
          />
        )}

        {/* Measured contrast scrim */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-slate-950/15"
          aria-hidden="true"
        />

        <div className="relative w-full max-w-[1280px] mx-auto px-4 sm:px-6 pt-20 pb-20 sm:pb-24">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white [text-wrap:balance]">
              Simple flight booking with live seat availability.
            </h1>
            <p className="mt-3 text-base sm:text-lg text-slate-200 max-w-[56ch]">
              Search routes, select your cabin seat, and confirm your ticket in minutes.
            </p>
          </div>
        </div>
      </section>

      {/* From / To / Date / Class Search Section positioned cleanly below the banner */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 -mt-12 sm:-mt-14">
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-3 space-y-1.5">
              <label htmlFor="search-origin" className="block text-xs font-medium text-slate-600">
                From
              </label>
              <select
                id="search-origin"
                value={originId}
                onChange={(e) => setOriginId(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
              >
                <option value="">All Origins</option>
                {airports.map((ap) => (
                  <option key={ap.airport_id} value={ap.airport_id}>
                    {ap.iata_code} — {ap.city}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden md:flex md:col-span-1 justify-center pb-0.5">
              <button
                type="button"
                onClick={handleSwap}
                className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Swap origin and destination"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label htmlFor="search-dest" className="block text-xs font-medium text-slate-600">
                To
              </label>
              <select
                id="search-dest"
                value={destId}
                onChange={(e) => setDestId(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
              >
                <option value="">All Destinations</option>
                {airports.map((ap) => (
                  <option key={ap.airport_id} value={ap.airport_id}>
                    {ap.iata_code} — {ap.city}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label htmlFor="search-date" className="block text-xs font-medium text-slate-600">
                Date
              </label>
              <input
                id="search-date"
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 font-mono tabular-nums focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label htmlFor="search-class" className="block text-xs font-medium text-slate-600">
                Class
              </label>
              <select
                id="search-class"
                value={travelClass}
                onChange={(e) => setTravelClass(e.target.value as SeatClass | 'All')}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
              >
                <option value="All">All Classes</option>
                <option value="Economy">Economy</option>
                <option value="Business">Business</option>
                <option value="First">First</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <button
                type="button"
                onClick={resetFilters}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Available Flights List */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-baseline justify-between gap-4 mb-5">
          <h2 className="font-display text-xl font-bold text-slate-900">Available Flights</h2>
          <span className="text-sm text-slate-500 font-mono tabular-nums">
            {filteredFlights.length} {filteredFlights.length === 1 ? 'flight' : 'flights'}
          </span>
        </div>

        {filteredFlights.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <Search className="w-7 h-7 text-slate-400 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-900">No flights match your search</p>
            <p className="mt-1 text-sm text-slate-500">Clear your filters to see all available departures.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold cursor-pointer"
            >
              Show All Flights
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFlights.map(({ flight, airline, origin, dest, plane, openCount, displayPrice }) => {
              const dep = formatDateTime(flight.departure_time);
              const arr = formatDateTime(flight.arrival_time);
              const duration = formatDuration(flight.departure_time, flight.arrival_time);

              return (
                <article
                  key={flight.flight_id}
                  className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    <div className="lg:col-span-3">
                      <div className="font-mono text-sm font-semibold text-slate-900">
                        {flight.flight_no} · <span className="font-sans font-medium">{airline?.name}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {plane?.model} · {dep.shortDate}
                      </div>
                    </div>

                    <div className="lg:col-span-5 flex items-center gap-4">
                      <div>
                        <div className="font-mono text-lg font-semibold text-slate-900 tabular-nums">{dep.time}</div>
                        <div className="text-xs text-slate-600">{origin?.iata_code} · {origin?.city}</div>
                      </div>

                      <div className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-mono text-slate-500 tabular-nums">{duration}</span>
                        <div className="w-full flex items-center gap-1.5">
                          <span className="h-px flex-1 bg-slate-300" />
                          <Plane className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                          <span className="h-px flex-1 bg-slate-300" />
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono text-lg font-semibold text-slate-900 tabular-nums">{arr.time}</div>
                        <div className="text-xs text-slate-600">{dest?.iata_code} · {dest?.city}</div>
                      </div>
                    </div>

                    <div className="lg:col-span-4 flex items-center justify-between lg:justify-end gap-5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <div className="lg:text-right">
                        <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                          {formatCurrency(displayPrice)}
                        </div>
                        <div className="text-xs text-slate-500 tabular-nums">
                          {openCount} seats open
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={openCount === 0}
                        onClick={() => onSelectFlight(flight, travelClass)}
                        className="px-4 py-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:bg-slate-200 disabled:text-slate-500 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {openCount === 0 ? 'Sold Out' : 'Select Seat'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
