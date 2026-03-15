import React, { useEffect, useRef, useState } from 'react';
import { LocateFixed, Search } from 'lucide-react';

// Extended window to allow typescript to recognize Leaflet (window.L)
declare global {
  interface Window {
    L: any;
  }
}

// Mock function to calculate UV based on latitude and time of day
function calculateMockUV(lat: number, lng: number) {
  // Base UV max at equator is ~14, drops off towards poles.
  const distanceToEquator = Math.abs(lat);
  const latFactor = Math.max(0, 1 - (distanceToEquator / 90));
  
  // Base max UV
  let maxUv = 14 * latFactor;
  
  // Random cloud/weather factor (0.7 to 1.1)
  const weatherFactor = 0.7 + (Math.random() * 0.4);
  
  let currentUv = maxUv * weatherFactor;
  
  // Round to 1 decimal
  return Math.max(0, Math.round(currentUv * 10) / 10);
}

interface UVMapProps {
  onLocationSelect: (uv: number, name: string) => void;
  currentUv: number;
  initialLocation?: string;
}

export function UVMap({ onLocationSelect, currentUv, initialLocation }: UVMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    // Load Leaflet dynamically
    if (window.L) {
      setMapLoaded(true);
      return;
    }

    const loadLeaflet = async () => {
      // First ensure CSS is loaded
      if (!document.querySelector(`link[href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Then load script
      const existingScript = document.querySelector(`script[src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"]`);
      if (existingScript) {
        existingScript.addEventListener('load', () => setMapLoaded(true));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.crossOrigin = '';
      
      script.onload = () => {
        setMapLoaded(true);
      };

      document.head.appendChild(script);
    };

    loadLeaflet();
  }, []);

  const onLocationSelectRef = useRef(onLocationSelect);

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  const processLocation = async (lat: number, lng: number) => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;

    if (!markerRef.current) {
      // Create a custom icon
      const icon = window.L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="color: #FF6900; background: white; border-radius: 50%; padding: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });
      markerRef.current = window.L.marker([lat, lng], { icon }).addTo(map);
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }

    const uv = calculateMockUV(lat, lng);
    
    // Initial popup text
    markerRef.current.bindPopup(`
      <div style="text-align: center;">
        <div style="font-weight: 600; color: #101828;">Loading location...</div>
        <div style="color: #FF6900; font-weight: 700; font-size: 16px; margin-top: 4px;">UV: ${uv}</div>
      </div>
    `).openPopup();

    // Mock geocoding
    let locationName = "Selected Location";
    try {
      const res = await fetch(`https://geocode.maps.co/reverse?lat=${lat}&lon=${lng}&api_key=69b38fa70ddbe794389963rzpf74a16`);
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const suburb = addr.suburb || addr.neighbourhood || addr.residential;
        const city = addr.city || addr.town || addr.village || addr.county;
        const region = addr.state || addr.region;
        const country = addr.country;
        
        const parts = [suburb, city, region, country].filter(Boolean);
        locationName = parts.join(", ") || "Selected Location";
        
        // Update popup with real name
        markerRef.current.bindPopup(`
          <div style="text-align: center;">
            <div style="font-weight: 600; color: #101828; font-size: 14px;">${locationName}</div>
            <div style="color: #FF6900; font-weight: 700; font-size: 18px; margin-top: 4px;">UV Index: ${uv}</div>
          </div>
        `).openPopup();
      }
    } catch (err) {
      console.error("Reverse geocoding failed", err);
    }
    
    onLocationSelectRef.current(uv, locationName);
  };

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.L || mapInstanceRef.current) return;

    // Clean up any existing leaflet id on the container
    if ((mapRef.current as any)._leaflet_id) {
      (mapRef.current as any)._leaflet_id = null;
    }

    // Initialize map with Australia bounds
    const australiaBounds = [
      [-45.0, 110.0], // South-West
      [-10.0, 155.0]  // North-East
    ];

    const map = window.L.map(mapRef.current, {
      zoomControl: false, // Turned off default top-left control
      minZoom: 4,
      maxBounds: australiaBounds,
      maxBoundsViscosity: 1.0,
      // Re-enabling interaction now that it's tightly bounded to Australia
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true
    }).setView([-37.8136, 144.9631], 11); // Default: Melbourne
    
    mapInstanceRef.current = map;

    // Add zoom control to bottom right to avoid overlapping with search bar
    window.L.control.zoom({ position: 'bottomright' }).addTo(map);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
      noWrap: true
    }).addTo(map);

    // If a user-set initial location is provided, geocode it; otherwise default to Melbourne
    if (initialLocation && initialLocation.trim()) {
      // Try to forward-geocode the user's saved location
      const geocodeAndCenter = async () => {
        try {
          const res = await fetch(
            `https://geocode.maps.co/search?q=${encodeURIComponent(initialLocation)}&api_key=69b38fa70ddbe794389963rzpf74a16`
          );
          const data = await res.json();
          if (data && data.length > 0) {
            const validResult = data.find((r: any) => isWithinAustralia(parseFloat(r.lat), parseFloat(r.lon)));
            if (validResult) {
              const lat = parseFloat(validResult.lat);
              const lon = parseFloat(validResult.lon);
              map.setView([lat, lon], 11);
              await processLocation(lat, lon);
              return;
            }
          }
        } catch (err) {
          console.error("Failed to geocode initial location, falling back to Melbourne", err);
        }
        // Fallback: Melbourne
        processLocation(-37.8136, 144.9631);
      };
      geocodeAndCenter();
    } else {
      // Default location: Melbourne
      processLocation(-37.8136, 144.9631);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [mapLoaded]);

  const isWithinAustralia = (lat: number, lon: number) => {
    return lat >= -45.0 && lat <= -10.0 && lon >= 110.0 && lon <= 155.0;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    try {
      // Check if the query is a pair of coordinates (e.g., "-25.2744, 133.7751")
      const coordRegex = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;
      const match = query.match(coordRegex);

      if (match) {
        const lat = parseFloat(match[1]);
        const lon = parseFloat(match[2]);

        // Validate coordinate bounds for Australia
        if (isWithinAustralia(lat, lon)) {
          const map = mapInstanceRef.current;
          if (map) {
            map.setView([lat, lon], 12);
            await processLocation(lat, lon); // processLocation handles the reverse geocoding
          }
        } else {
          alert("Location out of Australia. Please search for a location in Australia.");
        }
        setIsSearching(false);
        return;
      }

      // If not coordinates, use forward geocoding
      const res = await fetch(`https://geocode.maps.co/search?q=${encodeURIComponent(query)}&api_key=69b38fa70ddbe794389963rzpf74a16`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        // Find the first result that falls within Australia's bounding box
        const validResult = data.find((r: any) => isWithinAustralia(parseFloat(r.lat), parseFloat(r.lon)));

        if (validResult) {
          const lat = parseFloat(validResult.lat);
          const lon = parseFloat(validResult.lon);
          
          const map = mapInstanceRef.current;
          if (map) {
            map.setView([lat, lon], 12);
            await processLocation(lat, lon);
          }
        } else {
          alert("Location out of Australia. Please search for a location in Australia.");
        }
      } else {
        alert("Location not found. Please try a different search term.");
      }
    } catch (err) {
      console.error("Search geocoding failed", err);
      alert("Error searching for location.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        
        if (isWithinAustralia(lat, lng)) {
          const map = mapInstanceRef.current;
          if (map) {
            map.setView([lat, lng], 12);
            await processLocation(lat, lng);
          }
        } else {
          alert("Your current location is outside of Australia. Please search for a location within Australia.");
        }
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to retrieve your location. Please check your browser permissions.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="w-full h-full rounded-xl overflow-hidden bg-gray-100 relative z-0 min-h-[400px]">
      <div ref={mapRef} className="w-full h-full absolute inset-0" />
      
      {/* Search and Locate Controls */}
      {mapLoaded && (
        <div className="absolute top-4 left-4 right-4 z-[400] flex gap-2">
          <form 
            onSubmit={handleSearch} 
            className="flex-1 max-w-[300px] bg-white rounded-lg shadow-md border border-black/10 flex items-center overflow-hidden"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search a location..."
              className="flex-1 px-4 py-2.5 outline-none text-[14px] bg-transparent text-[#0a0a0a]"
            />
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-3 py-2.5 text-[#4a5565] hover:text-[#FF6900] hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Search size={18} className={isSearching ? "animate-pulse text-[#FF6900]" : ""} />
            </button>
          </form>

          <div className="ml-auto">
            <button
              onClick={handleCurrentLocation}
              disabled={isLocating}
              className="bg-white p-2.5 rounded-lg shadow-md border border-black/10 text-[#4a5565] hover:text-[#0a0a0a] hover:bg-gray-50 transition-colors disabled:opacity-70 flex items-center gap-2 cursor-pointer h-full"
              title="Get My Location"
            >
              <LocateFixed size={20} className={isLocating ? "animate-pulse text-[#FF6900]" : "text-[#4a5565]"} />
              <span className="text-sm font-medium hidden sm:inline">
                {isLocating ? "Locating..." : "My Location"}
              </span>
            </button>
          </div>
        </div>
      )}

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-500 z-10">
          Loading interactive map...
        </div>
      )}
      
      {/* Overlay instruction */}
      <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm border border-black/10 text-sm text-center py-2 px-4 rounded-lg shadow-sm z-[400] pointer-events-none">
        Search or use My Location to get local UV details
      </div>
    </div>
  );
}