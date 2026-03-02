"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Loader2, AlertTriangle } from "lucide-react";

export interface PlaceResult {
  placeId: string;
  businessName: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  types?: string[];
}

interface PlacesAutocompleteProps {
  onPlaceSelect: (place: PlaceResult) => void;
  placeholder?: string;
}

export default function PlacesAutocomplete({
  onPlaceSelect,
  placeholder = "Search for a business...",
}: PlacesAutocompleteProps) {
  const placesLib = useMapsLibrary("places");
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [libReady, setLibReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const autocompleteService =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const sessionToken =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const dummyDiv = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize services when the places library loads
  useEffect(() => {
    if (!placesLib) {
      console.log("[PlacesAutocomplete] Waiting for Places library to load...");
      return;
    }

    try {
      console.log("[PlacesAutocomplete] Places library loaded, initializing services");
      autocompleteService.current = new placesLib.AutocompleteService();
      sessionToken.current = new placesLib.AutocompleteSessionToken();

      if (!dummyDiv.current) {
        dummyDiv.current = document.createElement("div");
      }
      placesService.current = new placesLib.PlacesService(dummyDiv.current);
      setLibReady(true);
      setErrorMsg(null);
      console.log("[PlacesAutocomplete] Services initialized successfully");
    } catch (err) {
      console.error("[PlacesAutocomplete] Failed to initialize:", err);
      setErrorMsg("Failed to load Google Places. Check your API key and that Places API is enabled.");
    }
  }, [placesLib]);

  // Show timeout error if library doesn't load after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!libReady) {
        setErrorMsg(
          "Google Places API not loading. Make sure: (1) Places API is enabled in Google Cloud Console, (2) your API key has no referrer restrictions blocking this domain."
        );
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [libReady]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch autocomplete suggestions with debounce
  const fetchSuggestions = useCallback(
    (input: string) => {
      if (!autocompleteService.current || input.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setErrorMsg(null);

      autocompleteService.current.getPlacePredictions(
        {
          input,
          sessionToken: sessionToken.current!,
          types: ["establishment"],
        },
        (predictions, status) => {
          setIsLoading(false);
          console.log("[PlacesAutocomplete] Prediction status:", status, "count:", predictions?.length || 0);
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            setSuggestions(predictions);
            setIsOpen(true);
          } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            setSuggestions([]);
            setIsOpen(false);
          } else {
            setSuggestions([]);
            setIsOpen(false);
            console.error("[PlacesAutocomplete] API error status:", status);
            setErrorMsg(`Google Places API error: ${status}. Check API key permissions.`);
          }
        }
      );
    },
    []
  );

  const handleInputChange = (value: string) => {
    setInputValue(value);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  // When a suggestion is selected, fetch full Place Details
  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService.current || !placesLib) return;

    setIsFetchingDetails(true);
    setIsOpen(false);
    setInputValue(prediction.structured_formatting.main_text);

    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: [
          "place_id",
          "name",
          "formatted_address",
          "geometry",
          "formatted_phone_number",
          "international_phone_number",
          "website",
          "rating",
          "user_ratings_total",
          "types",
          "url",
        ],
        sessionToken: sessionToken.current!,
      },
      (place, status) => {
        setIsFetchingDetails(false);

        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          place &&
          place.geometry?.location
        ) {
          const result: PlaceResult = {
            placeId: place.place_id || prediction.place_id,
            businessName: place.name || prediction.structured_formatting.main_text,
            address: place.formatted_address || "",
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
            phone:
              place.formatted_phone_number ||
              place.international_phone_number ||
              undefined,
            website: place.website || undefined,
            rating: place.rating || undefined,
            reviewCount: place.user_ratings_total || undefined,
            types: place.types || undefined,
          };

          onPlaceSelect(result);

          // Refresh session token after a place is selected (billing best practice)
          sessionToken.current = new placesLib.AutocompleteSessionToken();
        } else {
          console.error("[PlacesAutocomplete] Place details error:", status);
          setErrorMsg(`Could not fetch place details: ${status}`);
        }
      }
    );
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={libReady ? placeholder : "Loading Google Places..."}
          className="pl-9 pr-9"
          disabled={!libReady && !errorMsg}
        />
        {(isLoading || isFetchingDetails) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!libReady && !errorMsg && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="mt-1.5 flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950 px-3 py-2 text-xs text-yellow-800 dark:text-yellow-300">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelect(prediction)}
              className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex items-start gap-2.5 border-b last:border-b-0"
            >
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {prediction.structured_formatting.main_text}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {prediction.structured_formatting.secondary_text}
                </p>
              </div>
            </button>
          ))}
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground text-right">
            Powered by Google
          </div>
        </div>
      )}
    </div>
  );
}
