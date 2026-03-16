import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LocateFixed, Search, Zap, RefreshCw } from 'lucide-react';
import {
  readUVCache,
  writeUVCache,
  cacheAgeMinutes,
  type UVCacheEntry,
} from '../utils/uvCache';

declare global {
  interface Window { L: any; }
}

const OW_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const GEOCODE_API_KEY = import.meta.env.VITE_GEOCODE_API_KEY;

async function fetchRealUV(lat: number, lng: number): Promise<number> {
  if (!OW_API_KEY) {
    console.warn('VITE_OPENWEATHER_API_KEY not set — UV will show as 0');
    return 0;
  }
  const res = await fetch(
    `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}&exclude=minutely,hourly,daily,alerts&appid=${OW_API_KEY}&units=metric`
  );
  if (!res.ok) throw new Error(`OW API error: ${res.status}`);
  const data = await res.json();
  return Math.round((data.current?.uvi ?? 0) * 10) / 10;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    );
    const data = await res.json();
    if (data?.address) {
      const addr = data.address;
      const parts = [
        addr.suburb || addr.neighbourhood || addr.residential,
        addr.city || addr.town || addr.village || addr.county,
        addr.state || addr.region,
        addr.country,
      ].filter(Boolean);
      return parts.join(', ') || 'Selected Location';
    }
  } catch {
    if (GEOCODE_API_KEY) {
      try {
        const res = await fetch(
          `https://geocode.maps.co/reverse?lat=${lat}&lon=${lng}&api_key=${GEOCODE_API_KEY}`
        );
        const data = await res.json();
        if (data?.address) {
          const addr = data.address;
          return [
            addr.suburb || addr.neighbourhood,
            addr.city || addr.town || addr.village,
            addr.state,
            addr.country,
          ].filter(Boolean).join(', ') || 'Selected Location';
        }
      } catch (err) {
        console.error('Reverse geocoding fallback failed', err);
      }
    }
  }
  return 'Selected Location';
}

async function forwardGeocode(query: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=au`
    );
    const data = await res.json();
    if (data?.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    if (GEOCODE_API_KEY) {
      try {
        const res = await fetch(
          `https://geocode.maps.co/search?q=${encodeURIComponent(query)}&api_key=${GEOCODE_API_KEY}`
        );
        const data = await res.json();
        const v = data?.find((r: any) => isWithinAustralia(parseFloat(r.lat), parseFloat(r.lon)));
        if (v) return { lat: parseFloat(v.lat), lon: parseFloat(v.lon) };
      } catch (err) {
        console.error('Forward geocoding fallback failed', err);
      }
    }
  }
  return null;
}

function isWithinAustralia(lat: number, lon: number) {
  return lat >= -45.0 && lat <= -10.0 && lon >= 110.0 && lon <= 155.0;
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
  const [cacheInfo, setCacheInfo] = useState<{ fromCache: boolean; ageMinutes: number } | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onLocationSelectRef = useRef(onLocationSelect);

  useEffect(() => { onLocationSelectRef.current = onLocationSelect; }, [onLocationSelect]);

  // Load Leaflet dynamically
  useEffect(() => {
    if (window.L) { setMapLoaded(true); return; }
    const loadLeaflet = () => {
      if (!document.querySelector(`link[href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (document.querySelector(`script[src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"]`)) return;
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.crossOrigin = '';
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    };
    loadLeaflet();
  }, []);

  /**
   * Core location processor:
   * 1. Check localStorage UV cache for this lat/lng
   * 2. If hit and < 1 hr old — use cached data, skip API call
   * 3. If miss or expired — fetch from OpenWeatherMap, write to cache
   */
  const processLocation = useCallback(async (lat: number, lng: number, forceRefresh = false) => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;

    // Place / move marker
    if (!markerRef.current) {
      const icon = window.L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="color:#FF6900;background:white;border-radius:50%;padding:4px;box-shadow:0 2px 4px rgba(0,0,0,0.2);width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg></div>`,
        iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32],
      });
      markerRef.current = window.L.marker([lat, lng], { icon }).addTo(map);
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }

    markerRef.current
      .bindPopup(`<div style="text-align:center;"><div style="font-weight:600;color:#101828;">Fetching UV data...</div></div>`)
      .openPopup();

    // Check cache
    const cached = !forceRefresh ? readUVCache(lat, lng) : null;

    let uv: number;
    let locationName: string;
    let fromCache = false;
    let ageMin = 0;

    if (cached) {
      // ✅ Cache hit — no API call needed
      uv = cached.uv;
      locationName = cached.locationName;
      fromCache = true;
      ageMin = cacheAgeMinutes(cached);
    } else {
      // 🌐 Cache miss — fetch from APIs in parallel
      markerRef.current
        .bindPopup(`<div style="text-align:center;"><div style="font-weight:600;color:#101828;">Loading live UV...</div></div>`)
        .openPopup();

      const [fetchedUV, fetchedName] = await Promise.all([
        fetchRealUV(lat, lng),
        reverseGeocode(lat, lng),
      ]);
      uv = fetchedUV;
      locationName = fetchedName;

      // Write fresh entry to cache
      const entry: UVCacheEntry = {
        uv,
        hourlyForecast: [],
        locationName,
        lat,
        lon: lng,
        fetchedAt: Date.now(),
      };
      writeUVCache(entry);
    }

    setCacheInfo({ fromCache, ageMinutes: ageMin });

    // Update popup
    markerRef.current
      .bindPopup(
        `<div style="text-align:center;min-width:150px;">
          <div style="font-weight:600;color:#101828;font-size:14px;">${locationName}</div>
          <div style="color:#FF6900;font-weight:700;font-size:18px;margin-top:4px;">UV Index: ${uv}</div>
          <div style="color:#6a7282;font-size:11px;margin-top:4px;">${fromCache ? `\u26a1 Cached ${ageMin}min ago` : '\ud83c\udf10 Live data'}</div>
        </div>`
      )
      .openPopup();

    onLocationSelectRef.current(uv, locationName);
  }, []);

  // Initialise map once Leaflet is loaded
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.L || mapInstanceRef.current) return;
    if ((mapRef.current as any)._leaflet_id) (mapRef.current as any)._leaflet_id = null;

    const australiaBounds = [[-45.0, 110.0], [-10.0, 155.0]];
    const map = window.L.map(mapRef.current, {
      zoomControl: false, minZoom: 4,
      maxBounds: australiaBounds, maxBoundsViscosity: 1.0,
      dragging: true, touchZoom: true, scrollWheelZoom: true,
      doubleClickZoom: true, boxZoom: true, keyboard: true,
    }).setView([-37.8136, 144.9631], 11);

    mapInstanceRef.current = map;
    window.L.control.zoom({ position: 'bottomright' }).addTo(map);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors', noWrap: true,
    }).addTo(map);

    // Click map to get UV at any point
    map.on('click', async (e: any) => {
      if (isWithinAustralia(e.latlng.lat, e.latlng.lng)) {
        await processLocation(e.latlng.lat, e.latlng.lng);
      } else {
        alert('Please select a location within Australia.');
      }
    });

    // Auto-center on user's real GPS location on load
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          if (isWithinAustralia(lat, lng)) {
            map.setView([lat, lng], 12);
            await processLocation(lat, lng);
          } else if (initialLocation?.trim()) {
            const result = await forwardGeocode(initialLocation);
            if (result && isWithinAustralia(result.lat, result.lon)) {
              map.setView([result.lat, result.lon], 11);
              await processLocation(result.lat, result.lon);
            } else {
              processLocation(-37.8136, 144.9631);
            }
          } else {
            processLocation(-37.8136, 144.9631);
          }
        },
        async () => {
          // Geolocation denied — fall back to saved location or Melbourne
          if (initialLocation?.trim()) {
            const result = await forwardGeocode(initialLocation);
            if (result && isWithinAustralia(result.lat, result.lon)) {
              map.setView([result.lat, result.lon], 11);
              await processLocation(result.lat, result.lon);
              return;
            }
          }
          processLocation(-37.8136, 144.9631);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      processLocation(-37.8136, 144.9631);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [mapLoaded, processLocation]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    setIsSearching(true);
    try {
      const coordRegex = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;
      const match = query.match(coordRegex);
      if (match) {
        const lat = parseFloat(match[1]), lon = parseFloat(match[2]);
        if (isWithinAustralia(lat, lon)) {
          mapInstanceRef.current?.setView([lat, lon], 12);
          await processLocation(lat, lon);
        } else alert('Location out of Australia.');
        return;
      }
      const result = await forwardGeocode(query);
      if (result && isWithinAustralia(result.lat, result.lon)) {
        mapInstanceRef.current?.setView([result.lat, result.lon], 12);
        await processLocation(result.lat, result.lon);
      } else {
        alert('Location not found or outside Australia.');
      }
    } catch (err) {
      console.error('Search failed', err);
      alert('Error searching for location.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (isWithinAustralia(lat, lng)) {
          mapInstanceRef.current?.setView([lat, lng], 12);
          await processLocation(lat, lng);
        } else {
          alert('Your current location is outside of Australia.');
        }
        setIsLocating(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        alert('Unable to retrieve your location.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleForceRefresh = async () => {
    if (!markerRef.current) return;
    const latlng = markerRef.current.getLatLng();
    await processLocation(latlng.lat, latlng.lng, true);
  };

  return (
    <div className="w-full h-full rounded-xl overflow-hidden bg-gray-100 relative z-0 min-h-[400px]">
      <div ref={mapRef} className="w-full h-full absolute inset-0" />

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
              <Search size={18} className={isSearching ? 'animate-pulse text-[#FF6900]' : ''} />
            </button>
          </form>

          <div className="ml-auto flex gap-2">
            {/* Force refresh button — bypasses cache for current pin */}
            {markerRef.current && (
              <button
                onClick={handleForceRefresh}
                className="bg-white p-2.5 rounded-lg shadow-md border border-black/10 text-[#4a5565] hover:text-[#FF6900] hover:bg-gray-50 transition-colors flex items-center gap-2 cursor-pointer h-full"
                title="Force refresh UV (bypass cache)"
              >
                <RefreshCw size={18} />
              </button>
            )}
            <button
              onClick={handleCurrentLocation}
              disabled={isLocating}
              className="bg-white p-2.5 rounded-lg shadow-md border border-black/10 text-[#4a5565] hover:text-[#0a0a0a] hover:bg-gray-50 transition-colors disabled:opacity-70 flex items-center gap-2 cursor-pointer h-full"
              title="Get My Location"
            >
              <LocateFixed size={20} className={isLocating ? 'animate-pulse text-[#FF6900]' : 'text-[#4a5565]'} />
              <span className="text-sm font-medium hidden sm:inline">
                {isLocating ? 'Locating...' : 'My Location'}
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

      {/* Bottom bar — shows cache status */}
      <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm border border-black/10 text-sm text-center py-2 px-4 rounded-lg shadow-sm z-[400] pointer-events-none flex items-center justify-center gap-2">
        {cacheInfo ? (
          cacheInfo.fromCache ? (
            <>
              <Zap size={14} className="text-[#F0B100]" />
              <span className="text-[#6a7282]">
                UV cached &mdash; updated {cacheInfo.ageMinutes === 0 ? 'just now' : `${cacheInfo.ageMinutes}min ago`}
                {cacheInfo.ageMinutes < 60 ? ` (refreshes in ${60 - cacheInfo.ageMinutes}min)` : ''}
              </span>
            </>
          ) : (
            <>
              <span className="text-[#00C950] font-medium text-[12px]">\u25cf</span>
              <span className="text-[#6a7282]">Live UV data</span>
            </>
          )
        ) : (
          <span className="text-[#6a7282]">Click map or search to get UV details</span>
        )}
      </div>
    </div>
  );
}
