"use client";

import { useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, MapPin, Loader2, CheckCircle2, Star, Globe, Phone } from "lucide-react";
import PlacesAutocomplete, { PlaceResult } from "@/components/places-autocomplete";

interface ProjectSetupProps {
  onCreateProject: (data: {
    businessName: string;
    address: string;
    latitude: number;
    longitude: number;
    placeId?: string;
    phone?: string;
    website?: string;
  }) => Promise<void>;
}

export default function ProjectSetup({ onCreateProject }: ProjectSetupProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // If we have an API key, wrap in APIProvider for autocomplete
  if (apiKey) {
    return (
      <APIProvider apiKey={apiKey}>
        <ProjectSetupForm onCreateProject={onCreateProject} hasAutocomplete />
      </APIProvider>
    );
  }

  // No API key — manual entry mode
  return <ProjectSetupForm onCreateProject={onCreateProject} hasAutocomplete={false} />;
}

function ProjectSetupForm({
  onCreateProject,
  hasAutocomplete,
}: ProjectSetupProps & { hasAutocomplete: boolean }) {
  const [businessName, setBusinessName] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [rating, setRating] = useState<number | undefined>();
  const [reviewCount, setReviewCount] = useState<number | undefined>();
  const [isCreating, setIsCreating] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const handlePlaceSelect = (place: PlaceResult) => {
    setBusinessName(place.businessName);
    setPlaceId(place.placeId);
    setAddress(place.address);
    setLatitude(place.latitude.toString());
    setLongitude(place.longitude.toString());
    setPhone(place.phone || "");
    setWebsite(place.website || "");
    setRating(place.rating);
    setReviewCount(place.reviewCount);
    setAutoFilled(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !latitude || !longitude) return;

    setIsCreating(true);
    try {
      await onCreateProject({
        businessName: businessName.trim(),
        address: address.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        placeId: placeId || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const clearForm = () => {
    setBusinessName("");
    setPlaceId("");
    setAddress("");
    setLatitude("");
    setLongitude("");
    setPhone("");
    setWebsite("");
    setRating(undefined);
    setReviewCount(undefined);
    setAutoFilled(false);
  };

  // Quick-fill with example for demo
  const fillDemo = () => {
    setBusinessName("Shaw Plumbing Heating & Air Conditioning");
    setAddress("1234 Main St, Portland, OR 97201");
    setLatitude("45.5152");
    setLongitude("-122.6784");
    setPhone("(503) 555-0123");
    setWebsite("https://shawplumbing.example.com");
    setPlaceId("demo_place_id");
    setAutoFilled(true);
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Add Business
        </CardTitle>
        <CardDescription>
          {hasAutocomplete
            ? "Search for your business below — all details will be filled in automatically from Google."
            : "Enter your business details to start tracking local rankings. Add a Google Maps API key to enable autocomplete."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Autocomplete Search (only when API key is set) */}
          {hasAutocomplete && (
            <div className="space-y-2">
              <Label>Search Business</Label>
              <PlacesAutocomplete
                onPlaceSelect={handlePlaceSelect}
                placeholder="Start typing a business name..."
              />
            </div>
          )}

          {/* Auto-filled confirmation card */}
          {autoFilled && (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 p-3 space-y-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Business found — details auto-filled</span>
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{businessName}</p>
                {address && (
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 shrink-0" /> {address}
                  </p>
                )}
                {phone && (
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3 w-3 shrink-0" /> {phone}
                  </p>
                )}
                {website && (
                  <p className="text-muted-foreground flex items-center gap-1.5 truncate">
                    <Globe className="h-3 w-3 shrink-0" /> {website}
                  </p>
                )}
                <div className="flex items-center gap-3 pt-1">
                  {rating && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {rating.toFixed(1)}
                    </Badge>
                  )}
                  {reviewCount !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {reviewCount.toLocaleString()} reviews
                    </span>
                  )}
                  {placeId && (
                    <span className="text-xs text-muted-foreground">
                      Place ID: {placeId.slice(0, 12)}...
                    </span>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={clearForm}
              >
                Clear & search again
              </Button>
            </div>
          )}

          {/* Manual fields — shown when no autocomplete or as editable details */}
          {!autoFilled && (
            <>
              {!hasAutocomplete && (
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    placeholder="e.g., Joe's Plumbing"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="e.g., 123 Main St, Portland, OR 97201"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude *</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    placeholder="e.g., 45.5152"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude *</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    placeholder="e.g., -122.6784"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://..."
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={isCreating || !businessName.trim() || !latitude || !longitude}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
            {!hasAutocomplete && (
              <Button type="button" variant="outline" onClick={fillDemo}>
                Demo
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
