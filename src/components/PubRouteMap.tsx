import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Compass,
  Edit3,
  ExternalLink,
  Flag,
  Footprints,
  MapPin,
  Navigation,
  Route as RouteIcon,
} from 'lucide-react';
import {
  buildHoleSearchQuery,
  buildPubGolfRouteLegs,
  formatRouteDistance,
  formatRouteDuration,
  isHoleAddressConfigured,
  type PubCourse,
  type PubHole,
} from '../utils/golfRules';

export interface ResolvedPubStop {
  holeNumber: number;
  pubName: string;
  pubAddress: string;
  drinkName: string;
  par: number;
  volumeCl: number;
  location: { lat: number; lng: number };
  formattedAddress: string;
}

interface ComputedLegSummary {
  fromHoleNumber: number;
  toHoleNumber: number;
  fromPubName: string;
  toPubName: string;
  distanceMeters: number;
  durationMillis: number;
  directionsUrl: string;
}

// Module-level caches using Record<string, ...> (never shadowing Map) to minimize API calls & protect quota
const resolvedStopCache: Record<string, ResolvedPubStop> = {};
const resolvedCityCenterCache: Record<string, { lat: number; lng: number }> = {};

export function primeResolvedPubStopCache(
  queryKey: string,
  location: { lat: number; lng: number },
  hole: PubHole
) {
  resolvedStopCache[queryKey] = {
    holeNumber: hole.holeNumber,
    pubName: hole.pubName,
    pubAddress: hole.pubAddress,
    drinkName: hole.drinkName,
    par: hole.par,
    volumeCl: hole.volumeCl,
    location,
    formattedAddress: hole.pubAddress,
  };
}

function checkAndDispatchQuotaError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('QuotaExceeded') ||
    msg.includes('OverQuota') ||
    msg.includes('429')
  ) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
}

const DEFAULT_SWEDEN_CENTER = { lat: 59.3293, lng: 18.0686 }; // Stockholm default fallback

// ---- Koordinater för barer ----
// Geokodning på adressen först (stor kvot), Places-textsök bara som reserv (liten dagskvot).
// Allt sparas i webbläsaren så att samma bar aldrig slås upp två gånger.
type GeoHit = { lat: number; lng: number; formattedAddress?: string };
const GEO_CACHE_KEY = 'pg-geo-v1';
const geoMemory: Record<string, GeoHit | null> = (() => {
  try {
    return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
})();
const saveGeoMemory = () => {
  try {
    const keys = Object.keys(geoMemory);
    // Håll cachen liten
    if (keys.length > 400) keys.slice(0, keys.length - 400).forEach((k) => delete geoMemory[k]);
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geoMemory));
  } catch {
    /* privat läge */
  }
};

interface GeocoderLike {
  geocode: (req: Record<string, unknown>) => Promise<{
    results?: { formatted_address?: string; geometry?: { location?: { lat: () => number; lng: () => number } } }[];
  }>;
}
interface PlaceLike {
  searchByText: (req: Record<string, unknown>) => Promise<{
    places?: { formattedAddress?: string; location?: { lat: () => number; lng: () => number } }[];
  }>;
}

async function lookupLocation(
  query: string,
  geocoder: GeocoderLike | null,
  Place: PlaceLike | null
): Promise<GeoHit | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  if (key in geoMemory) return geoMemory[key];
  let hit: GeoHit | null = null;
  if (geocoder) {
    try {
      const { results } = await geocoder.geocode({ address: query, region: 'se', language: 'sv' });
      const loc = results?.[0]?.geometry?.location;
      if (loc) hit = { lat: loc.lat(), lng: loc.lng(), formattedAddress: results?.[0]?.formatted_address };
    } catch (err) {
      checkAndDispatchQuotaError(err);
    }
  }
  if (!hit && Place) {
    try {
      const { places } = await Place.searchByText({
        textQuery: query,
        fields: ['formattedAddress', 'location'],
        maxResultCount: 1,
        language: 'sv',
        region: 'se',
      });
      const loc = places?.[0]?.location;
      if (loc) hit = { lat: loc.lat(), lng: loc.lng(), formattedAddress: places?.[0]?.formattedAddress };
    } catch (err) {
      // Places-kvoten är liten – det räcker att geokodningen fungerar
      console.warn('[karta] Places-sökning misslyckades', err);
    }
  }
  // Spara även "inget svar" för den här sessionen så vi inte frågar om och om igen
  geoMemory[key] = hit;
  if (hit) saveGeoMemory();
  return hit;
}

/** Bästa sökfrågan för en bar: gatuadressen om den finns, annars namn + stad. */
function holeLookupQuery(hole: PubHole, city: string): string {
  const address = (hole.pubAddress || '').trim();
  const hasAddress = address.length >= 2 && !/^ange (gatu)?adress$/i.test(address);
  if (hasAddress) return /\d/.test(address) || address.includes(',') ? address : `${address}, ${city}`;
  return buildHoleSearchQuery(hole, city);
}

interface PubRouteCanvasControllerProps {
  course: PubCourse;
  holes: PubHole[];
  selectedHoleNum: number;
  routeMode: 'leg' | 'full';
  selectedLegIndex: number;
  onResolvedStopsChange: (stops: ResolvedPubStop[], isResolving: boolean) => void;
  onRouteSummaryChange: (
    legs: ComputedLegSummary[],
    totalDistanceMeters: number,
    totalDurationMillis: number,
    isComputing: boolean,
    routeError: string | null
  ) => void;
}

/**
 * Child controller rendered inside <GoogleMap> to access `useMap()`, `useMapsLibrary('places')`,
 * and `useMapsLibrary('routes')` (`Route.computeRoutes`).
 */
const PubRouteCanvasController: React.FC<PubRouteCanvasControllerProps> = ({
  course,
  holes,
  RouteModeProp,
  ...props
}: PubRouteCanvasControllerProps & { RouteModeProp?: never }) => {
  const {
    routeMode,
    selectedLegIndex,
    onResolvedStopsChange,
    onRouteSummaryChange,
  } = props;

  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');
  const routesLib = useMapsLibrary('routes');
  const coreLib = useMapsLibrary('core');

interface GmpPolylineInstance {
  setMap: (map: unknown) => void;
  setOptions: (opts: Record<string, unknown>) => void;
}

  const polylinesRef = useRef<GmpPolylineInstance[]>([]);
  const [resolvedStops, setResolvedStops] = useState<ResolvedPubStop[]>([]);

  const orderedConfiguredHoles = useMemo(
    () =>
      [...holes]
        .sort((a, b) => a.holeNumber - b.holeNumber)
        .filter((h) => isHoleAddressConfigured(h)),
    [holes]
  );

  const configuredSignature = useMemo(
    () =>
      orderedConfiguredHoles
        .map((h) => `${h.holeNumber}:${h.pubName}:${h.pubAddress}:${h.drinkName}:${h.par}`)
        .join('|'),
    [orderedConfiguredHoles]
  );

  // 1. Koordinater för barerna (geokodning först, Places som reserv, sparat i webbläsaren)
  useEffect(() => {
    if (!geocodingLib && !placesLib) return;
    let cancelled = false;
    const geocoder = geocodingLib
      ? (new (geocodingLib as unknown as { Geocoder: new () => GeocoderLike }).Geocoder() as GeocoderLike)
      : null;
    const Place = placesLib ? ((placesLib as unknown as { Place: PlaceLike }).Place) : null;

    async function resolveAllStops() {
      const cityKey = (course.city || 'Stockholm').trim().toLowerCase();
      if (cityKey && !resolvedCityCenterCache[cityKey]) {
        const center = await lookupLocation(`${course.city || 'Stockholm'}, Sverige`, geocoder, Place);
        if (center) resolvedCityCenterCache[cityKey] = { lat: center.lat, lng: center.lng };
      }

      if (orderedConfiguredHoles.length === 0) {
        if (!cancelled) {
          setResolvedStops([]);
          onResolvedStopsChange([], false);
          if (map && resolvedCityCenterCache[cityKey]) {
            map.panTo(resolvedCityCenterCache[cityKey]);
            map.setZoom(13);
          }
        }
        return;
      }

      onResolvedStopsChange(resolvedStops, true);
      const nextStops: ResolvedPubStop[] = [];

      for (const hole of orderedConfiguredHoles) {
        const query = holeLookupQuery(hole, course.city || 'Stockholm');
        const cacheKey = `${course.courseId}:h${hole.holeNumber}:${query.toLowerCase()}`;
        const base = {
          holeNumber: hole.holeNumber,
          pubName: hole.pubName,
          pubAddress: hole.pubAddress,
          drinkName: hole.drinkName,
          par: hole.par,
          volumeCl: hole.volumeCl,
        };
        if (resolvedStopCache[cacheKey]) {
          nextStops.push({ ...resolvedStopCache[cacheKey], ...base });
          continue;
        }
        const hit = await lookupLocation(query, geocoder, Place);
        if (hit) {
          const stop: ResolvedPubStop = {
            ...base,
            location: { lat: hit.lat, lng: hit.lng },
            formattedAddress: hit.formattedAddress || hole.pubAddress,
          };
          resolvedStopCache[cacheKey] = stop;
          nextStops.push(stop);
        }
      }

      if (!cancelled) {
        setResolvedStops(nextStops);
        onResolvedStopsChange(nextStops, false);

        if (map && nextStops.length === 1) {
          map.panTo(nextStops[0].location);
          map.setZoom(15);
        }
      }
    }

    void resolveAllStops();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geocodingLib, placesLib, course.courseId, course.city, configuredSignature, map]);

  // 2. Compute & render walking route polylines between pubs via modern `Route.computeRoutes`
  useEffect(() => {
    // Clear existing polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (!map || !routesLib || resolvedStops.length < 2) {
      onRouteSummaryChange([], 0, 0, false, null);
      return;
    }

    let cancelled = false;

    const stopsForRoute =
      routeMode === 'leg'
        ? (() => {
            const safeIdx = Math.max(
              0,
              Math.min(resolvedStops.length - 2, selectedLegIndex)
            );
            return [resolvedStops[safeIdx], resolvedStops[safeIdx + 1]];
          })()
        : resolvedStops;

    if (stopsForRoute.length < 2) {
      onRouteSummaryChange([], 0, 0, false, null);
      return;
    }

    const originStop = stopsForRoute[0];
    const destinationStop = stopsForRoute[stopsForRoute.length - 1];
    const intermediateStops = stopsForRoute.slice(1, -1);

    onRouteSummaryChange([], 0, 0, true, null);

    // Official modern Maps JS SDK wrapper: Route.computeRoutes (replaces legacy DirectionsService)
    // Docs: https://developers.google.com/maps/documentation/javascript/routes?utm_campaign=gmp_mcp_codeassist_v1_aistudio
    const request: Record<string, unknown> = {
      origin: originStop.location,
      destination: destinationStop.location,
      travelMode: 'WALKING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
    };

    if (intermediateStops.length > 0) {
      request.intermediates = intermediateStops.map((s) => ({
        location: s.location,
      }));
    }

    const routeClass = (routesLib as any).Route;
    if (!routeClass || typeof routeClass.computeRoutes !== 'function') {
      onRouteSummaryChange([], 0, 0, false, 'Ruttbiblioteket kunde inte laddas.');
      return;
    }

    routeClass
      .computeRoutes(request)
      .then(({ routes }: { routes?: any[] }) => {
        if (cancelled) return;
        const primaryRoute = routes?.[0];
        if (!primaryRoute) {
          onRouteSummaryChange(
            [],
            0,
            0,
            false,
            'Ingen promenadväg kunde beräknas mellan de angivna adresserna.'
          );
          return;
        }

        // Render route polylines using primaryRoute.createPolylines() or fallback Polyline
        let createdPolylines: GmpPolylineInstance[] = [];
        if (typeof primaryRoute.createPolylines === 'function') {
          createdPolylines = primaryRoute.createPolylines();
          createdPolylines.forEach((polyline: GmpPolylineInstance) => {
            polyline.setOptions({
              strokeColor: routeMode === 'leg' ? '#166534' : '#112218',
              strokeWeight: 5,
              strokeOpacity: 0.9,
              map,
            });
          });
        } else if (primaryRoute.path) {
          const PolylineCtor = (window as unknown as {
            google?: { maps?: { Polyline?: new (opts: Record<string, unknown>) => GmpPolylineInstance } };
          }).google?.maps?.Polyline;
          if (PolylineCtor) {
            const fallbackLine = new PolylineCtor({
              path: primaryRoute.path,
              strokeColor: routeMode === 'leg' ? '#166534' : '#112218',
              strokeWeight: 5,
              strokeOpacity: 0.9,
              map,
            });
            createdPolylines = [fallbackLine];
          }
        }
        polylinesRef.current = createdPolylines;

        // Fit map bounds to route viewport
        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport, 48);
        } else if (coreLib?.LatLngBounds) {
          const bounds = new coreLib.LatLngBounds();
          stopsForRoute.forEach((s) => bounds.extend(s.location));
          map.fitBounds(bounds, 48);
        }

        // Extract per-leg distance & duration
        const rawLegs: any[] = Array.isArray(primaryRoute.legs) ? primaryRoute.legs : [];
        const computedLegs: ComputedLegSummary[] = [];
        let sumDist = 0;
        let sumDur = 0;

        for (let i = 0; i < stopsForRoute.length - 1; i++) {
          const fromS = stopsForRoute[i];
          const toS = stopsForRoute[i + 1];
          const legObj = rawLegs[i];
          const legDist = Number(
            legObj?.distanceMeters ??
              (stopsForRoute.length === 2 ? primaryRoute.distanceMeters : 0) ??
              0
          );
          const legDur = Number(
            legObj?.durationMillis ??
              (stopsForRoute.length === 2 ? primaryRoute.durationMillis : 0) ??
              0
          );
          sumDist += legDist;
          sumDur += legDur;

          const originParam = `${fromS.location.lat},${fromS.location.lng}`;
          const destParam = `${toS.location.lat},${toS.location.lng}`;
          computedLegs.push({
            fromHoleNumber: fromS.holeNumber,
            toHoleNumber: toS.holeNumber,
            fromPubName: fromS.pubName,
            toPubName: toS.pubName,
            distanceMeters: legDist,
            durationMillis: legDur,
            directionsUrl: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
              originParam
            )}&destination=${encodeURIComponent(destParam)}&travelmode=walking`,
          });
        }

        const totalDist = Number(primaryRoute.distanceMeters || sumDist || 0);
        const totalDur = Number(primaryRoute.durationMillis || sumDur || 0);

        onRouteSummaryChange(computedLegs, totalDist, totalDur, false, null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        checkAndDispatchQuotaError(err);
        onRouteSummaryChange(
          [],
          0,
          0,
          false,
          'Kunde inte beräkna promenadväg mellan pubarna just nu.'
        );
      });

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, routesLib, coreLib, resolvedStops, routeMode, selectedLegIndex]);

  return null;
};

interface PubRouteMapProps {
  course: PubCourse;
  holes: PubHole[];
  selectedHoleNum: number;
  onSelectHole: (holeNumber: number) => void;
  isCourseOwner?: boolean;
  onOpenEditHole?: (hole: PubHole) => void;
  onOpenBulkAddressModal?: () => void;
  compact?: boolean;
  /** Total promenadsträcka och -tid för hela rundan (meter, millisekunder). */
  onTotals?: (distanceMeters: number, durationMillis: number) => void;
}

export const PubRouteMap: React.FC<PubRouteMapProps> = ({
  course,
  holes,
  selectedHoleNum,
  onSelectHole,
  isCourseOwner = false,
  onOpenEditHole,
  onOpenBulkAddressModal,
  compact = false,
  onTotals,
}) => {
  const orderedHoles = useMemo(
    () => [...holes].sort((a, b) => a.holeNumber - b.holeNumber),
    [holes]
  );

  const configuredHoles = useMemo(
    () => orderedHoles.filter((h) => isHoleAddressConfigured(h)),
    [orderedHoles]
  );

  const routeLegsSpec = useMemo(
    () => buildPubGolfRouteLegs(orderedHoles, course.city),
    [orderedHoles, course.city]
  );

  const [routeMode, setRouteMode] = useState<'leg' | 'full'>('full');
  const [selectedLegIndex, setSelectedLegIndex] = useState<number>(0);
  const [activeInfoHole, setActiveInfoHole] = useState<number | null>(null);

  const [resolvedStops, setResolvedStops] = useState<ResolvedPubStop[]>([]);
  const [isResolvingStops, setIsResolvingStops] = useState<boolean>(false);
  const [computedLegs, setComputedLegs] = useState<ComputedLegSummary[]>([]);
  const [totalDistanceMeters, setTotalDistanceMeters] = useState<number>(0);
  const [totalDurationMillis, setTotalDurationMillis] = useState<number>(0);
  const [isComputingRoute, setIsComputingRoute] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Sync selected leg index when user clicks a different hole
  useEffect(() => {
    const legIdx = routeLegsSpec.findIndex((l) => l.fromHoleNumber === selectedHoleNum);
    if (legIdx >= 0) {
      setSelectedLegIndex(legIdx);
    } else if (routeLegsSpec.length > 0) {
      const prevIdx = routeLegsSpec.findIndex((l) => l.toHoleNumber === selectedHoleNum);
      if (prevIdx >= 0) setSelectedLegIndex(prevIdx);
    }
  }, [selectedHoleNum, routeLegsSpec]);

  const activePopupStop = useMemo(
    () => resolvedStops.find((s) => s.holeNumber === activeInfoHole) || null,
    [resolvedStops, activeInfoHole]
  );

  const activeLegSpec = routeLegsSpec[selectedLegIndex] || routeLegsSpec[0] || null;
  const activeComputedLeg =
    computedLegs.find(
      (l) =>
        activeLegSpec &&
        l.fromHoleNumber === activeLegSpec.fromHoleNumber &&
        l.toHoleNumber === activeLegSpec.toHoleNumber
    ) ||
    computedLegs[0] ||
    null;

  return (
    <section
      data-testid="pub-route-map-section"
      className="overflow-hidden rounded-2xl border border-[#112218]/15 bg-white shadow-xs"
    >
      {/* Top Header Bar */}
      <div className="flex flex-col justify-between gap-3 border-b border-[#112218]/10 bg-[#112218] px-4 py-4 text-[#F6F4EE] sm:px-6 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#D4AF37]">
            <Navigation className="h-3.5 w-3.5" />
            <span>GOOGLE MAPS · RUTTKARTA MELLAN PUBARNA</span>
            <span aria-hidden="true">·</span>
            <span>
              {configuredHoles.length}/{orderedHoles.length} HÅL MED ADRESS I {course.city.toUpperCase()}
            </span>
          </div>
          <h3 className="mt-1 font-display text-lg font-bold text-white sm:text-xl">
            Promenadväg & karta mellan hålen
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {routeLegsSpec.length > 0 && (
            <div className="inline-flex rounded-xl border border-white/15 bg-white/10 p-1">
              <button
                type="button"
                onClick={() => setRouteMode('full')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  routeMode === 'full'
                    ? 'bg-[#D4AF37] text-[#112218]'
                    : 'text-[#F6F4EE]/85 hover:text-white'
                }`}
              >
                Hela rundan ({configuredHoles.length} pubar)
              </button>
              <button
                type="button"
                onClick={() => setRouteMode('leg')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  routeMode === 'leg'
                    ? 'bg-[#D4AF37] text-[#112218]'
                    : 'text-[#F6F4EE]/85 hover:text-white'
                }`}
              >
                Steg för steg (Hål → Hål)
              </button>
            </div>
          )}

          {isCourseOwner && onOpenBulkAddressModal && (
            <button
              type="button"
              data-testid="open-bulk-address-modal-btn"
              onClick={onOpenBulkAddressModal}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#D4AF37] px-3.5 py-1.5 text-xs font-bold text-[#112218] transition-colors hover:bg-[#E5C158] cursor-pointer whitespace-nowrap"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Ange adresser
            </button>
          )}
        </div>
      </div>

      {/* Notice when fewer than 2 pub addresses are configured */}
      {configuredHoles.length < 2 && (
        <div className="flex flex-col justify-between gap-3 border-b border-[#112218]/10 bg-[#F6F4EE] px-4 py-3.5 text-xs text-[#112218] sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#166534]" />
            <div>
              <strong className="font-semibold text-[#112218]">
                {configuredHoles.length === 0
                  ? 'Inga pubadresser har lagts in för rundan ännu.'
                  : 'Endast 1 pubadress är inlagd hittills.'}
              </strong>{' '}
              Lägg in pubnamn och gatuadress på minst 2 hål så ritar Google Maps automatiskt ut
              promenadvägen och avståndet mellan varje pub!
            </div>
          </div>

          {isCourseOwner && onOpenBulkAddressModal && (
            <button
              type="button"
              onClick={onOpenBulkAddressModal}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#112218] px-3.5 py-2 text-xs font-semibold text-[#F6F4EE] hover:bg-[#163826] cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5 text-[#D4AF37]" />
              Skriv in pubarnas adresser nu
            </button>
          )}
        </div>
      )}

      {/* Leg Selector Strip + Distance/Time Summary Bar */}
      {routeLegsSpec.length > 0 && (
        <div className="border-b border-[#112218]/10 bg-[#F6F4EE]/70 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {routeLegsSpec.map((leg, idx) => {
                const isSelectedLeg = routeMode === 'leg' && selectedLegIndex === idx;
                return (
                  <button
                    key={`${leg.fromHoleNumber}-${leg.toHoleNumber}`}
                    type="button"
                    onClick={() => {
                      setRouteMode('leg');
                      setSelectedLegIndex(idx);
                      onSelectHole(leg.fromHoleNumber);
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-mono-tabular text-xs font-bold transition cursor-pointer ${
                      isSelectedLeg
                        ? 'border-[#166534] bg-[#166534] text-white shadow-xs'
                        : 'border-[#112218]/15 bg-white text-[#112218] hover:bg-[#112218]/5'
                    }`}
                  >
                    <span>H{leg.fromHoleNumber}</span>
                    <span aria-hidden="true">→</span>
                    <span>H{leg.toHoleNumber}</span>
                  </button>
                );
              })}
            </div>

            {/* Distance & Walking Time Pill */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {(isResolvingStops || isComputingRoute) && (
                <span className="font-medium text-[#112218]/65">
                  Beräknar promenadväg på kartan...
                </span>
              )}

              {!isComputingRoute && totalDistanceMeters > 0 && (
                <div className="inline-flex items-center gap-2 rounded-lg border border-[#166534]/25 bg-white px-3 py-1 font-mono-tabular font-semibold text-[#112218]">
                  <Footprints className="h-3.5 w-3.5 text-[#166534]" />
                  <span>
                    {routeMode === 'leg' && activeLegSpec
                      ? `Hål ${activeLegSpec.fromHoleNumber} → Hål ${activeLegSpec.toHoleNumber}: `
                      : 'Total promenad: '}
                    <strong className="text-[#166534]">
                      {formatRouteDistance(
                        routeMode === 'leg' && activeComputedLeg
                          ? activeComputedLeg.distanceMeters
                          : totalDistanceMeters
                      )}
                    </strong>{' '}
                    ·{' '}
                    <strong>
                      {formatRouteDuration(
                        routeMode === 'leg' && activeComputedLeg
                          ? activeComputedLeg.durationMillis
                          : totalDurationMillis
                      )}
                    </strong>
                  </span>
                </div>
              )}

              {activeLegSpec && (
                <a
                  href={
                    activeComputedLeg?.directionsUrl || activeLegSpec.googleMapsDirectionsUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#112218]/20 bg-white px-3 py-1 font-semibold text-[#112218] hover:bg-[#112218] hover:text-white transition"
                >
                  <span>Öppna i Google Maps</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {routeError && (
            <p className="mt-2 text-xs font-medium text-[#9A3412]">{routeError}</p>
          )}
        </div>
      )}

      {/* Interactive Google Map Container (Explicit CSS Height per CF2, mapId="DEMO_MAP_ID" per CF9, internalUsageAttributionIds per Section 4) */}
      <div
        className={`relative w-full ${
          compact ? 'h-[300px] sm:h-[360px]' : 'h-[360px] sm:h-[440px]'
        } bg-[#E5E3DF]`}
      >
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={DEFAULT_SWEDEN_CENTER}
          defaultZoom={13}
          gestureHandling="cooperative"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          className="h-full w-full"
        >
          <PubRouteCanvasController
            course={course}
            holes={orderedHoles}
            selectedHoleNum={selectedHoleNum}
            routeMode={routeMode}
            selectedLegIndex={selectedLegIndex}
            onResolvedStopsChange={(stops, resolving) => {
              setResolvedStops(stops);
              setIsResolvingStops(resolving);
            }}
            onRouteSummaryChange={(legs, dist, dur, computing, err) => {
              setComputedLegs(legs);
              setTotalDistanceMeters(dist);
              setTotalDurationMillis(dur);
              if (routeMode === 'full' && !computing && !err && dist > 0) onTotals?.(dist, dur);
              setIsComputingRoute(computing);
              setRouteError(err);
            }}
          />

          {/* Numbered Golf Hole Markers (AdvancedMarkerElement via @vis.gl/react-google-maps) */}
          {resolvedStops.map((stop) => {
            const isSelected = stop.holeNumber === selectedHoleNum;
            return (
              <AdvancedMarker
                key={stop.holeNumber}
                position={stop.location}
                title={`Hål ${stop.holeNumber}: ${stop.pubName}`}
                zIndex={isSelected ? 30 : 10 + stop.holeNumber}
                onClick={() => {
                  onSelectHole(stop.holeNumber);
                  setActiveInfoHole(stop.holeNumber);
                }}
              >
                <div
                  className={`flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 shadow-md transition-transform ${
                    isSelected
                      ? 'scale-110 border-[#112218] bg-[#D4AF37] text-[#112218]'
                      : 'border-[#D4AF37] bg-[#112218] text-[#F6F4EE] hover:scale-105'
                  }`}
                >
                  <Flag className="h-3 w-3 shrink-0" />
                  <span className="font-mono-tabular text-xs font-extrabold">
                    H{stop.holeNumber}
                  </span>
                  <span className="hidden sm:inline max-w-[110px] truncate text-[11px] font-bold">
                    {stop.pubName}
                  </span>
                </div>
              </AdvancedMarker>
            );
          })}

          {activePopupStop && (
            <InfoWindow
              position={activePopupStop.location}
              onCloseClick={() => setActiveInfoHole(null)}
              maxWidth={260}
            >
              <div className="p-1 text-[#112218]">
                <div className="font-mono-tabular text-[11px] font-bold text-[#166534]">
                  HÅL {activePopupStop.holeNumber} · PAR {activePopupStop.par} (
                  {activePopupStop.volumeCl} CL)
                </div>
                <div className="mt-0.5 font-display text-sm font-bold text-[#112218]">
                  {activePopupStop.pubName}
                </div>
                <div className="mt-0.5 text-xs text-[#112218]/75">
                  {activePopupStop.formattedAddress}
                </div>
                <div className="mt-1.5 rounded bg-[#F6F4EE] px-2 py-1 text-xs font-semibold text-[#112218]">
                  Dryck: {activePopupStop.drinkName}
                </div>
                {isCourseOwner && onOpenEditHole && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = orderedHoles.find(
                        (h) => h.holeNumber === activePopupStop.holeNumber
                      );
                      if (target) {
                        setActiveInfoHole(null);
                        onOpenEditHole(target);
                      }
                    }}
                    className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded bg-[#112218] px-2.5 py-1 text-[11px] font-semibold text-white"
                  >
                    <Edit3 className="h-3 w-3 text-[#D4AF37]" />
                    Ändra pub / adress
                  </button>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {/* Bottom Step-by-Step Walking Route Breakdown between Hål 1..9 */}
      {!compact && routeLegsSpec.length > 0 && (
        <div className="border-t border-[#112218]/10 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#112218]/75">
              <RouteIcon className="h-4 w-4 text-[#166534]" />
              Promenadsträckor mellan varje pub på rundan
            </h4>
            {totalDistanceMeters > 0 && (
              <span className="font-mono-tabular text-xs font-semibold text-[#166534]">
                Totalt: {formatRouteDistance(totalDistanceMeters)} (
                {formatRouteDuration(totalDurationMillis)})
              </span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {routeLegsSpec.map((leg, idx) => {
              const comp = computedLegs.find(
                (c) =>
                  c.fromHoleNumber === leg.fromHoleNumber &&
                  c.toHoleNumber === leg.toHoleNumber
              );
              const isSelected = routeMode === 'leg' && selectedLegIndex === idx;

              return (
                <div
                  key={`${leg.fromHoleNumber}-${leg.toHoleNumber}`}
                  onClick={() => {
                    setRouteMode('leg');
                    setSelectedLegIndex(idx);
                    onSelectHole(leg.fromHoleNumber);
                  }}
                  className={`flex flex-col justify-between rounded-xl border p-3 text-xs transition cursor-pointer ${
                    isSelected
                      ? 'border-[#166534] bg-[#166534]/5 ring-1 ring-[#166534]'
                      : 'border-[#112218]/15 bg-[#F6F4EE]/40 hover:bg-[#F6F4EE]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 font-mono-tabular font-bold text-[#166534]">
                      <span>
                        HÅL {leg.fromHoleNumber} → HÅL {leg.toHoleNumber}
                      </span>
                      {comp && comp.distanceMeters > 0 && (
                        <span className="rounded bg-[#112218] px-1.5 py-0.5 text-[10px] text-[#D4AF37]">
                          {formatRouteDistance(comp.distanceMeters)} ·{' '}
                          {formatRouteDuration(comp.durationMillis)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-semibold text-[#112218] truncate">
                      {leg.fromPubName} → {leg.toPubName}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#112218]/65 truncate">
                      Till: {leg.toAddress}
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-[#112218]/10 pt-2">
                    <span className="text-[11px] font-semibold text-[#166534]">
                      Visa på kartan
                    </span>
                    <a
                      href={comp?.directionsUrl || leg.googleMapsDirectionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#112218] underline hover:text-[#166534]"
                    >
                      Google Maps
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
