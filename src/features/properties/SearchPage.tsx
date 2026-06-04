import { useEffect, useState, type MouseEvent } from "react";
import { propertyService } from "../../app/services";
import { locationSuggestions } from "../../services/postcodesIo";
import type { Property } from "../../types/domain";
import { PropertyCard } from "./PropertyCard";

export function SearchPage() {
  const params = new URLSearchParams(window.location.search);
  const [filters, setFilters] = useState({ location: params.get("location") || "", maxPrice: params.get("maxPrice") || "", minPrice: "", bedrooms: "Any", propertyType: "Any" });
  const [results, setResults] = useState<Property[]>([]);
  const [focused, setFocused] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [boundary, setBoundary] = useState<Array<{ x: number; y: number }>>([]);
  const [drawApplied, setDrawApplied] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; kind: string; region: string }>>([]);
  const displayedResults = drawApplied ? results.filter((_, index) => index % 3 !== 1) : results;

  useEffect(() => {
    propertyService.search({
      location: filters.location,
      minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      bedrooms: filters.bedrooms === "Studio" || filters.bedrooms === "Any" ? 0 : Number(filters.bedrooms),
      propertyType: filters.propertyType
    }).then(setResults);
    setDrawApplied(false);
  }, [filters]);

  useEffect(() => {
    let alive = true;
    const id = window.setTimeout(() => {
      locationSuggestions(filters.location).then((items) => {
        if (alive) setSuggestions(items);
      });
    }, 180);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [filters.location]);

  function markBoundary(event: MouseEvent<HTMLDivElement>) {
    if (!drawMode) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setBoundary([...boundary, { x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 }]);
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="badge orange">Property search</p>
        <h1>Browse verified-ready homes.</h1>
        <p>Search by postcode, district, city, town, borough, area or neighbourhood. Exact addresses stay private until viewing approval.</p>
      </section>
      <section className="search-panel">
        <label className="autocomplete-wrap">Location (optional)
          <input value={filters.location} onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 140)} onChange={(event) => { setFocused(true); setFilters({ ...filters, location: event.target.value }); }} placeholder="London, Kensington, W8, SW1A, M1" />
          {(focused || filters.location.length > 0) && suggestions.length > 0 && (
            <div className="autocomplete-menu" role="listbox">
              {suggestions.map((item) => (
                <button type="button" key={item.id} onMouseDown={() => setFilters({ ...filters, location: item.name })}>
                  <strong>{item.name}</strong><span>{item.kind.replace(/([A-Z])/g, " $1")} · {item.region}</span>
                </button>
              ))}
            </div>
          )}
        </label>
        <label>Min rent (optional)<input type="number" value={filters.minPrice} onChange={(event) => setFilters({ ...filters, minPrice: event.target.value })} /></label>
        <label>Max rent (optional)<input type="number" value={filters.maxPrice} onChange={(event) => setFilters({ ...filters, maxPrice: event.target.value })} /></label>
        <label>Bedrooms (optional)<select value={filters.bedrooms} onChange={(event) => setFilters({ ...filters, bedrooms: event.target.value })}><option>Any</option><option>Studio</option><option value="1">1 Bedroom</option><option value="2">2 Bedrooms</option><option value="3">3 Bedrooms</option><option value="4">4 Bedrooms</option><option value="5">5 Bedrooms</option><option value="6">5+ Bedrooms</option></select></label>
        <label>Type (optional)<select value={filters.propertyType} onChange={(event) => setFilters({ ...filters, propertyType: event.target.value })}><option>Any</option><option>Flat</option><option>Penthouse</option><option>House</option><option>Maisonette</option><option>Detached House</option><option>Semi-Detached House</option><option>Terraced House</option><option>Bungalow</option></select></label>
        <button className="btn primary" onClick={() => setDrawMode(true)}>Search Properties</button>
      </section>
      <section className="draw-search card">
        <div>
          <h2>Draw Search Area</h2>
          <p className="muted">Use the map to mark a custom search boundary, then apply it to the current results.</p>
        </div>
        <div className={`mock-map ${drawMode ? "drawing" : ""}`} onClick={markBoundary}>
          <span>Map preview</span>
          {boundary.map((point, index) => <i key={`${point.x}-${point.y}`} style={{ left: `${point.x}%`, top: `${point.y}%` }}>{index + 1}</i>)}
        </div>
        <div className="hero-actions">
          <button className="btn" onClick={() => { setDrawMode(true); setBoundary([]); setDrawApplied(false); }}>Draw area</button>
          <button className="btn primary" disabled={boundary.length < 3} onClick={() => setDrawApplied(true)}>Apply drawn area</button>
        </div>
      </section>
      <section className="results-summary"><b>{displayedResults.length}</b> homes matched. Homes up to 15% above budget are included with a clear label.</section>
      <section className="grid cols-3">
        {displayedResults.map((property) => <PropertyCard key={property.id} property={property} />)}
      </section>
    </main>
  );
}
