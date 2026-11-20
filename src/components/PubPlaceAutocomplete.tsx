import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, Search, Sparkles, X } from 'lucide-react';

export interface SelectedPubPlace {
  pubName: string;
  pubAddress: string;
  location?: { lat: number; lng: number };
}

interface PubPlaceAutocompleteProps {
  city?: string;
  cityContext?: string;
  holeNumber?: number;
  onSelectPlace: (place: SelectedPubPlace) => void;
  placeholder?: string;
  compact?: boolean;
}

interface PlacePredictionItem {
  placeId?: string;
  text?: { text?: string };
  mainText?: { text?: string };
  secondaryText?: { text?: string };
  toPlace: () => {
    displayName?: string;
    formattedAddress?: string;
    location?: { lat: () => number; lng: () => number };
    fetchFields: (opts: { fields: string[] }) => Promise<unknown>;
  };
}

interface AutocompleteSuggestionItem {
  placePrediction?: PlacePredictionItem;
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

export const PubPlaceAutocomplete: React.FC<PubPlaceAutocompleteProps> = ({
  city = '',
  cityContext = '',
  holeNumber,
  onSelectPlace,
  placeholder,
  compact = false,
}) => {
  const effectiveCity = (city || cityContext).trim();
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef = useRef<unknown>(null);

  const [queryText, setQueryText] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!placesLib) return;

    const trimmed = queryText.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      try {
        const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib as unknown as {
          AutocompleteSessionToken: new () => unknown;
          AutocompleteSuggestion: {
            fetchAutocompleteSuggestions: (
              req: Record<string, unknown>
            ) => Promise<{ suggestions?: AutocompleteSuggestionItem[] }>;
          };
        };
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }

        const effectiveInput =
          effectiveCity && !trimmed.toLowerCase().includes(effectiveCity.toLowerCase())
            ? `${trimmed} ${effectiveCity}`
            : trimmed;

        const request: Record<string, unknown> = {
          input: effectiveInput,
          sessionToken: sessionTokenRef.current,
          language: 'sv',
          region: 'se',
        };

        setIsLoading(true);
        AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
          .then((res: { suggestions?: AutocompleteSuggestionItem[] }) => {
            const list = Array.isArray(res?.suggestions) ? res.suggestions : [];
            setSuggestions(list.slice(0, 5));
            setIsOpen(list.length > 0);
            setIsLoading(false);
          })
          .catch((err: unknown) => {
            setIsLoading(false);
            setSuggestions([]);
            checkAndDispatchQuotaError(err);
          });
      } catch (err) {
        setIsLoading(false);
        checkAndDispatchQuotaError(err);
      }
    }, 260);

    return () => window.clearTimeout(timer);
  }, [placesLib, queryText, effectiveCity]);

  const handleSelectSuggestion = useCallback(
    async (suggestion: AutocompleteSuggestionItem) => {
      if (!placesLib || !suggestion.placePrediction) return;

      const fallbackText = suggestion.placePrediction.text?.text || '';
      const mainText = suggestion.placePrediction.mainText?.text || fallbackText.split(',')[0] || '';
      const secondaryText =
        suggestion.placePrediction.secondaryText?.text ||
        fallbackText.split(',').slice(1).join(',').trim() ||
        fallbackText;

      try {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location'],
        });

        // Reset session token after Place Details fetch per GMP best practice
        sessionTokenRef.current = null;
        setSuggestions([]);
        setIsOpen(false);
        setQueryText('');

        const resolvedName = (place.displayName || mainText || '').trim().slice(0, 80);
        const resolvedAddress = (
          place.formattedAddress ||
          secondaryText ||
          fallbackText ||
          resolvedName
        )
          .trim()
          .slice(0, 120);

        const loc = place.location
          ? { lat: place.location.lat(), lng: place.location.lng() }
          : undefined;

        onSelectPlace({
          pubName: resolvedName || `Hål ${holeNumber || 1}`,
          pubAddress: resolvedAddress || effectiveCity || 'Sverige',
          location: loc,
        });
      } catch (err) {
        checkAndDispatchQuotaError(err);
        sessionTokenRef.current = null;
        setSuggestions([]);
        setIsOpen(false);
        setQueryText('');

        onSelectPlace({
          pubName: (mainText || `Hål ${holeNumber || 1}`).trim().slice(0, 80),
          pubAddress: (secondaryText || fallbackText || effectiveCity || 'Sverige')
            .trim()
            .slice(0, 120),
        });
      }
    },
    [placesLib, onSelectPlace, holeNumber, effectiveCity]
  );

  return (
    <div className="relative">
      <div
        className={` rounded-xl border border-[#166534]/25 bg-[#166534]/5 ${
          compact ? 'p-2.5' : 'p-3'
        }`}
      >
        <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-[#166534]">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            {holeNumber
              ? `SÖK PUB ELLER GATUADRESS FÖR HÅL ${holeNumber} (GOOGLE MAPS)`
              : 'SÖK PUB ELLER GATUADRESS (GOOGLE MAPS)'}
          </span>
          {city && <span className="text-[10px] font-medium text-[#112218]/60">Stad: {city}</span>}
        </div>

        <div className="relative mt-1.5 flex items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[#112218]/50" />
          <input
            type="text"
            value={queryText}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            onChange={(e) => {
              setQueryText(e.target.value);
              setIsOpen(true);
            }}
            placeholder={
              placeholder ||
              `Sök t.ex. "The Tudor Arms ${city || 'Stockholm'}" eller gatuadress...`
            }
            className="w-full rounded-lg border border-[#112218]/20 bg-white py-2 pl-9 pr-8 text-xs sm:text-sm text-[#112218] placeholder:text-[#112218]/45 focus:border-[#166534] focus:outline-none"
          />
          {queryText && (
            <button
              type="button"
              aria-label="Rensa sökning"
              onClick={() => {
                setQueryText('');
                setSuggestions([]);
                setIsOpen(false);
              }}
              className="absolute right-2.5 rounded p-0.5 text-[#112218]/50 hover:text-[#112218]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {isLoading && (
          <div className="mt-1.5 text-[11px] font-medium text-[#112218]/60">
            Söker adresser på Google Maps...
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[#112218]/20 bg-white p-1.5 shadow-xl"
        >
          {suggestions.map((suggestion, idx) => {
            const pred = suggestion.placePrediction;
            if (!pred) return null;
            const mainLabel = pred.mainText?.text || pred.text?.text || '';
            const subLabel = pred.secondaryText?.text || '';

            return (
              <li key={`${pred.placeId || idx}`}>
                <button
                  type="button"
                  onClick={() => void handleSelectSuggestion(suggestion)}
                  className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-[#166534]/10 cursor-pointer"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#166534]" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[#112218] truncate">{mainLabel}</div>
                    {subLabel && (
                      <div className="text-[11px] text-[#112218]/65 truncate">{subLabel}</div>
                    )}
                  </div>
                  <span className="shrink-0 rounded bg-[#166534]/10 px-2 py-0.5 text-[10px] font-bold text-[#166534]">
                    Välj pub
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
