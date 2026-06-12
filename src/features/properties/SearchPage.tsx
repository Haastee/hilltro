import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Building, Building2, Home, Layers, Map, Navigation, Search, SlidersHorizontal, Star, Users, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { propertyService } from "../../app/services";
import { authService } from "../../app/services";
import { primeCentralListings } from "../../data/properties";
import { locationSuggestions } from "../../services/postcodesIo";
import type { Property } from "../../types/domain";
import { SelectField } from "../../components/SelectField";
import { MultiSelectField, type MultiSelectOption } from "../../components/MultiSelectField";
import { PropertyCard } from "./PropertyCard";
import { filterByPolygon, filterByRadius, locationOrigin, type LatLngPoint } from "../../services/locationService";
import { readPendingSavedSearch, saveSearch, setPendingSavedSearch } from "../../services/engagementService";

const PropertyMap = lazy(() => import("../../components/map/PropertyMap"));

const bedroomOptions: MultiSelectOption[] = [
  { value: "Studio", label: "Studio" },
  { value: "1", label: "1 bed" },
  { value: "2", label: "2 beds" },
  { value: "3", label: "3 beds" },
  { value: "4", label: "4 beds" },
  { value: "5", label: "5+ beds" }
];

const bathroomOptions: MultiSelectOption[] = [
  { value: "1", label: "1 bathroom" },
  { value: "2", label: "2 bathrooms" },
  { value: "3", label: "3 bathrooms" },
  { value: "4", label: "4+ bathrooms" }
];

const typeOptions: MultiSelectOption[] = [
  { value: "Flat", label: "Flat", icon: <Building2 size={16} /> },
  { value: "Penthouse", label: "Penthouse", icon: <Building size={16} /> },
  { value: "House", label: "House", icon: <Home size={16} /> },
  { value: "Maisonette", label: "Maisonette", icon: <Layers size={16} /> },
  { value: "Detached House", label: "Detached House", icon: <Home size={16} /> },
  { value: "Semi-Detached House", label: "Semi-Detached House", icon: <Home size={16} /> },
  { value: "Terraced House", label: "Terraced House", icon: <Home size={16} /> },
  { value: "Bungalow", label: "Bungalow", icon: <Home size={16} /> },
  { value: "Shared Property", label: "Shared Property", icon: <Users size={16} /> }
];

const furnishingOptions: MultiSelectOption[] = [
  { value: "Furnished", label: "Furnished" },
  { value: "Part-Furnished", label: "Part-Furnished" },
  { value: "Unfurnished", label: "Unfurnished" }
];

const parseList = (value?: string) => (value ? value.split(",").map((item) => item.trim()).filter(Boolean) : []);
const availabilityOptions = ["Any", "Now", "This month", "Next month"].map((value) => ({ value, label: value === "Any" ? "Any availability" : value }));
const radiusOptions = ["Any Radius", "This area only", "Within 1 mile", "Within 3 miles", "Within 5 miles"].map((value) => ({ value, label: value }));
const priceOptions = buildPriceOptions();

export function SearchPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const pendingSavedSearch = params.get("saveSearch") === "1" ? readPendingSavedSearch() : null;
  const [filters, setFilters] = useState({
    location: params.get("location") || pendingSavedSearch?.location || "",
    maxPrice: params.get("maxPrice") || pendingSavedSearch?.maxPrice || "",
    minPrice: params.get("minPrice") || pendingSavedSearch?.minPrice || "",
    bedrooms: parseList(pendingSavedSearch?.bedrooms),
    bathrooms: parseList(pendingSavedSearch?.bathrooms),
    propertyType: parseList(pendingSavedSearch?.propertyType),
    furnishing: parseList(pendingSavedSearch?.furnishing),
    availability: pendingSavedSearch?.availability || "Any",
    radius: pendingSavedSearch?.radius || "Any Radius"
  });
  const [saveModalOpen, setSaveModalOpen] = useState(params.get("saveSearch") === "1" && Boolean(pendingSavedSearch));
  const [searchName, setSearchName] = useState(pendingSavedSearch?.location ? `${pendingSavedSearch.location} homes` : "");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [saveNotice, setSaveNotice] = useState("");
  const [remoteResults, setRemoteResults] = useState<Property[]>([]);
  const [focused, setFocused] = useState(false);
  // Arriving from the home "Draw your search area" button opens the map overlay
  // straight into drawing mode.
  const [drawMode, setDrawMode] = useState(params.get("draw") === "1");
  const [mapViewOpen, setMapViewOpen] = useState(params.get("draw") === "1");
  const [draftPolygon, setDraftPolygon] = useState<LatLngPoint[]>([]);
  const [appliedPolygon, setAppliedPolygon] = useState<LatLngPoint[]>([]);
  const [visibleMapPolygon, setVisibleMapPolygon] = useState<LatLngPoint[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; kind: string; region: string }>>([]);
  const [floatingActionsVisible, setFloatingActionsVisible] = useState(false);
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const filtersRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLElement>(null);
  const restoringMapRef = useRef(false);

  useEffect(() => {
    propertyService.search({
      location: filters.location,
      minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice && !filters.maxPrice.endsWith("+") ? Number(filters.maxPrice) : undefined,
      bedrooms: 0,
      propertyType: "Any",
      radiusMiles: radiusMiles(filters.radius)
    }).then(setRemoteResults).catch(() => setRemoteResults([]));
    setAppliedPolygon([]);
    setDraftPolygon([]);
  }, [filters]);

  useEffect(() => {
    let alive = true;
    const id = window.setTimeout(() => {
      locationSuggestions(filters.location).then((items) => {
        if (alive) setSuggestions(items);
      });
    }, 120);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [filters.location]);

  useEffect(() => {
    function updateFloatingActions() {
      if (restoringMapRef.current) return;
      const filterBottom = filtersRef.current?.getBoundingClientRect().bottom ?? 999;
      const mapBottom = mapRef.current?.getBoundingClientRect().bottom ?? 999;
      setFloatingActionsVisible(filterBottom < 0 || window.scrollY > 520);
      setMapCollapsed(mapViewOpen && mapBottom < 120);
    }
    updateFloatingActions();
    window.addEventListener("scroll", updateFloatingActions, { passive: true });
    window.addEventListener("resize", updateFloatingActions);
    return () => {
      window.removeEventListener("scroll", updateFloatingActions);
      window.removeEventListener("resize", updateFloatingActions);
    };
  }, [mapViewOpen]);

  const baseResults = useMemo(() => {
    const combined = mergeProperties(remoteResults, primeCentralListings);
    const radius = radiusMiles(filters.radius);
    const origin = locationOrigin(combined, filters.location);
    const locationFiltered = radius > 0 ? filterByRadius(combined, origin, radius) : combined.filter((property) => matchesLocation(property, filters.location));
    return locationFiltered
      .filter((property) => matchesSearchArea(property, filters.location, radius, origin))
      .filter((property) => property.rentPcm >= (Number(filters.minPrice) || 0))
      .filter((property) => !filters.maxPrice || filters.maxPrice.endsWith("+") || property.rentPcm <= Number(filters.maxPrice))
      .filter((property) => filters.bedrooms.length === 0 || filters.bedrooms.some((value) => value === "5" ? property.bedrooms >= 5 : value === "Studio" ? property.bedrooms <= 1 : property.bedrooms === Number(value)))
      .filter((property) => filters.bathrooms.length === 0 || filters.bathrooms.some((value) => value === "4" ? property.bathrooms >= 4 : property.bathrooms === Number(value)))
      .filter((property) => filters.propertyType.length === 0 || filters.propertyType.some((type) => property.type === type || (type === "House" && property.type.includes("House"))))
      .filter((property) => filters.furnishing.length === 0 || filters.furnishing.includes(property.furnishingStatus))
      .filter((property) => filters.availability === "Any" || availabilityMatches(property.availableFrom, filters.availability));
  }, [remoteResults, filters]);

  const results = useMemo(() => filterByPolygon(baseResults, appliedPolygon), [baseResults, appliedPolygon]);
  const radius = radiusMiles(filters.radius);
  const radiusOrigin = useMemo(() => locationOrigin(mergeProperties(remoteResults, primeCentralListings), filters.location), [remoteResults, filters.location]);
  const filtersAreActive = Boolean(
    filters.location.trim() ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.bedrooms.length > 0 ||
    filters.bathrooms.length > 0 ||
    filters.propertyType.length > 0 ||
    filters.furnishing.length > 0 ||
    filters.availability !== "Any" ||
    filters.radius !== "Any Radius" ||
    appliedPolygon.length >= 3
  );

  function chooseSuggestion(item: { name: string }) {
    setFilters((current) => ({ ...current, location: item.name }));
    setFocused(false);
    setSuggestions([]);
  }

  function selectProperty(propertyId: string) {
    setSelectedProperty(propertyId);
    document.getElementById(`property-result-${propertyId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function reopenFilters() {
    filtersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function reopenMap() {
    if (!mapViewOpen) {
      setMapViewOpen(true);
      window.setTimeout(() => mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      return;
    }
    restoringMapRef.current = true;
    setMapCollapsed(false);
    window.setTimeout(() => {
      mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        restoringMapRef.current = false;
      }, 700);
    }, 40);
  }

  const serialisedFilters = {
    location: filters.location,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    bedrooms: filters.bedrooms.join(","),
    bathrooms: filters.bathrooms.join(","),
    propertyType: filters.propertyType.join(","),
    furnishing: filters.furnishing.join(","),
    availability: filters.availability,
    radius: filters.radius
  };

  async function startSaveSearch() {
    if (!hasSaveableCriteria(serialisedFilters)) {
      setSaveNotice("Please select at least one filter or search area before saving.");
      return;
    }
    const user = await authService.currentUser();
    if (!user) {
      setPendingSavedSearch(serialisedFilters);
      const next = encodeURIComponent("/search?saveSearch=1");
      navigate(`/register?next=${next}`);
      return;
    }
    setSaveModalOpen(true);
  }

  async function confirmSaveSearch() {
    const user = await authService.currentUser();
    saveSearch({ name: searchName.trim() || suggestedSearchName(filters), filters: serialisedFilters, emailAlerts }, user?.id);
    setSaveModalOpen(false);
    setSaveNotice("Search saved. Email alert settings are ready for future notification workflows.");
  }

  return (
    <main className="search-page">
      <section className="search-hero">
        <div>
          <p className="eyebrow">Property search</p>
          <h1>{filters.location ? `Properties to rent in ${filters.location}.` : "Search properties to rent."}</h1>
          <p>Search by postcode, district, borough, area or neighbourhood. Exact addresses stay protected until the right stage of the viewing process.</p>
        </div>
      </section>

      <section className="premium-search" ref={filtersRef}>
        <div className="filter-location-row">
          <div className="search-input-wrap">
            <label>Where</label>
            <div className="search-input-shell">
              <Search size={22} />
              <input
                value={filters.location}
                onFocus={() => setFocused(true)}
                onBlur={() => window.setTimeout(() => setFocused(false), 180)}
                onChange={(event) => {
                  setFocused(true);
                  setFilters({ ...filters, location: event.target.value });
                }}
                placeholder="Kensington, Chelsea, W8, SW3"
              />
            </div>
            {focused && suggestions.length > 0 && (
              <div className="autocomplete-menu premium-autocomplete" role="listbox">
                {suggestions.map((item) => (
                  <button type="button" key={item.id} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSuggestion(item)}>
                    <strong>{item.name}</strong>
                    <span>{item.kind.replace(/([A-Z])/g, " $1")} · {item.region}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn primary search-submit">Search properties</button>
        </div>
        <div className="filter-controls-row">
          <span className="filter-group-label">Essentials</span>
          <SelectField label="Minimum price" value={filters.minPrice} options={priceOptions} searchable compactMenu initialScrollValue="2000" className="price-select" onChange={(value) => setFilters({ ...filters, minPrice: value })} />
          <SelectField label="Maximum price" value={filters.maxPrice} options={priceOptions} searchable compactMenu initialScrollValue="3000" className="price-select" onChange={(value) => setFilters({ ...filters, maxPrice: value })} />
          <MultiSelectField label="Bedrooms" values={filters.bedrooms} options={bedroomOptions} anyLabel="Any beds" onChange={(values) => setFilters({ ...filters, bedrooms: values })} />
          <MultiSelectField label="Bathrooms" values={filters.bathrooms} options={bathroomOptions} anyLabel="Any baths" onChange={(values) => setFilters({ ...filters, bathrooms: values })} />
          <span className="filter-group-divider" aria-hidden="true" />
          <span className="filter-group-label">Refine</span>
          <MultiSelectField label="Property type" values={filters.propertyType} options={typeOptions} anyLabel="All types" onChange={(values) => setFilters({ ...filters, propertyType: values })} />
          <MultiSelectField label="Furnishing" values={filters.furnishing} options={furnishingOptions} anyLabel="Any furnishing" onChange={(values) => setFilters({ ...filters, furnishing: values })} />
          <SelectField label="Availability" value={filters.availability} options={availabilityOptions} onChange={(value) => setFilters({ ...filters, availability: value })} />
          <SelectField label="Search radius" value={filters.radius} options={radiusOptions} onChange={(value) => setFilters({ ...filters, radius: value })} />
        </div>
      </section>

      <section className="search-view-toolbar">
        <div>
          <p className="eyebrow">List View</p>
          <span>{results.length} matching properties. Use map view only when you want to draw or search a location visually.</span>
          {saveNotice && <span className="save-search-notice">{saveNotice}</span>}
        </div>
        <button className="btn tertiary save-search-button" type="button" onClick={startSaveSearch}><Star size={17} /> Save Search</button>
        <button className="btn secondary map-view-button" type="button" onClick={reopenMap}>
          <Map size={18} /> Map View <b>{results.length}</b>
        </button>
      </section>

      {saveModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="card modal-card form-grid">
            <p className="eyebrow">Save search</p>
            <h2>Name this search.</h2>
            <label>Search name *<input value={searchName} onChange={(event) => setSearchName(event.target.value)} placeholder={suggestedSearchName(filters)} /></label>
            <label className="checkbox-row"><input type="checkbox" checked={emailAlerts} onChange={(event) => setEmailAlerts(event.target.checked)} /><span>Enable email alerts for matching properties.</span></label>
            <div className="hero-actions">
              <button className="btn primary" type="button" onClick={confirmSaveSearch}>Save Search</button>
              <button className="btn" type="button" onClick={() => setSaveModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {mapViewOpen && (
        <section className={`map-view-overlay ${mapCollapsed ? "collapsed-map-view" : ""}`} aria-label="Full property map view" ref={mapRef}>
          <div className="map-view-header">
            <div><p className="eyebrow">Map View</p><h2>{results.length} mapped properties</h2></div>
            <button className="btn secondary" onClick={() => setMapViewOpen(false)}><X size={18} /> List View</button>
          </div>
          {drawMode && (
            <div className="guidance-banner draw-guidance" role="status">
              <Navigation size={16} />
              <span>{draftPolygon.length < 3
                ? `Minimum 3 points required. Click the map to add points, then double-click to complete the area. (${draftPolygon.length}/3)`
                : "Double-click to complete the area, or keep adding points. Drag any point to fine-tune the boundary."}</span>
            </div>
          )}
          <div className="premium-map real-map full-map-view">
            <Suspense fallback={<div className="map-loading">Loading map...</div>}>
              <PropertyMap
                properties={results}
                selectedPropertyId={selectedProperty}
                onSelectProperty={selectProperty}
                drawing={drawMode}
                polygon={draftPolygon}
                onPolygonChange={setDraftPolygon}
                onCompleteDrawing={() => setDrawMode(false)}
                radiusOrigin={radiusOrigin}
                radiusMiles={radius}
                onBoundsChange={setVisibleMapPolygon}
              />
            </Suspense>
          </div>
          <div className="map-actions">
            <button className="btn secondary" onClick={() => { setDrawMode(true); setDraftPolygon([]); setAppliedPolygon([]); }}><Navigation size={17} /> Draw search area</button>
            <button className="btn secondary" disabled={visibleMapPolygon.length < 3} onClick={() => { setAppliedPolygon(visibleMapPolygon); setDrawMode(false); }}>Search visible map area</button>
            <button className="btn primary" disabled={draftPolygon.length < 3} onClick={() => { setAppliedPolygon(draftPolygon); setDrawMode(false); }}>Search drawn area</button>
            {(draftPolygon.length > 0 || appliedPolygon.length > 0) && <button className="btn tertiary" onClick={() => { setDrawMode(false); setDraftPolygon([]); setAppliedPolygon([]); }}><X size={17} /> Clear area</button>}
          </div>
          <p className="map-note">{appliedPolygon.length >= 3 ? `${results.length} matching properties inside the drawn search area.` : drawMode ? "Click the map to add points (minimum 3). Double-click to complete the area, then search drawn area." : `${results.length} mapped properties. OpenStreetMap tiles are loaded lazily when the map appears.`}</p>
        </section>
      )}

      {floatingActionsVisible && (
        <div className="floating-search-actions" aria-label="Search quick actions">
          <button className="floating-search-pill" type="button" onClick={reopenFilters}><SlidersHorizontal size={17} /> Filters</button>
          <button className="floating-search-pill" type="button" onClick={reopenMap}><Map size={17} /> Map View</button>
        </div>
      )}

      <section className="search-layout list-first-layout">
        <section className="results-column">
          <div className="results-heading">
            <div>
              <p className="eyebrow">{filtersAreActive ? "Filtered Properties" : "All Properties"}</p>
              <h2>{results.length} properties to rent</h2>
            </div>
            {appliedPolygon.length >= 3 && <span className="badge orange">Drawn area applied</span>}
          </div>
          <div className="property-results-list">
            {results.map((property) => <div id={`property-result-${property.id}`} className={selectedProperty === property.id ? "selected-result" : ""} key={property.id} onMouseEnter={() => setSelectedProperty(property.id)}><PropertyCard property={property} /></div>)}
          </div>
        </section>
      </section>
    </main>
  );
}

function mergeProperties(primary: Property[], local: Property[]) {
  const seen = new Set<string>();
  return [...local, ...primary].filter((property) => {
    if (seen.has(property.id)) return false;
    seen.add(property.id);
    return true;
  });
}

function matchesLocation(property: Property, location: string) {
  const query = location.trim().toLowerCase();
  if (!query) return true;
  return [property.fullAddress, property.streetName, property.area, property.city, property.postcodeDistrict, property.postcode]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function radiusMiles(value: string) {
  if (value.includes("5")) return 5;
  if (value.includes("3")) return 3;
  if (value.includes("1")) return 1;
  return 0;
}

function buildPriceOptions() {
  const values = [
    0,
    ...range(100, 1500, 100),
    ...range(2000, 10000, 500),
    ...range(15000, 100000, 5000)
  ];
  return [
    ...values.map((value) => value === 0 ? { value: "", label: "Any Price" } : { value: String(value), label: `${formatCurrency(value)} pcm` }),
    { value: "100000+", label: "£100,000+ pcm" }
  ];
}

function range(start: number, end: number, step: number) {
  const values = [];
  for (let value = start; value <= end; value += step) values.push(value);
  return values;
}

function formatCurrency(value: number) {
  return `£${value.toLocaleString("en-GB")}`;
}

function suggestedSearchName(filters: { location: string; propertyType: string[] }) {
  const type = filters.propertyType[0];
  if (filters.location && type) return `${type} near ${filters.location}`;
  if (filters.location) return `${filters.location} homes`;
  if (type) return `${type} search`;
  return "My Hilltro search";
}

function hasSaveableCriteria(filters: Record<string, string>) {
  return Object.entries(filters).some(([key, value]) => {
    if (!value) return false;
    if (["Any", "Any Radius"].includes(value)) return false;
    if (key === "radius" && value === "This area only") return false;
    return true;
  });
}

function availabilityMatches(value: string, filter: string) {
  if (filter === "Any") return true;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return filter === "Now";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (filter === "Now") return date <= today;
  const endOfThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  if (filter === "This month") return date <= endOfThisMonth;
  const startNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const endNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  return date >= startNextMonth && date <= endNextMonth;
}

function matchesSearchArea(property: Property, location: string, radius: number, origin: { latitude: number; longitude: number } | null) {
  if (radius > 0 && origin && property.latitude && property.longitude) return true;
  return matchesLocation(property, location);
}
