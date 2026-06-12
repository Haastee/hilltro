import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation, Search } from "lucide-react";
import { locationSuggestions } from "../../services/postcodesIo";

type LocationSuggestion = { id: string; name: string; kind: string; region: string };

// The primary entry point to the whole product: a location search that accepts
// postcodes, towns, cities and area names, plus a "draw your search area" path.
// Both routes land on /search (the results page) where finer filters live.
export function HomeSearchBar() {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!location.trim()) {
      setSuggestions([]);
      return;
    }
    let alive = true;
    const id = window.setTimeout(() => {
      locationSuggestions(location).then((items) => alive && setSuggestions(items)).catch(() => alive && setSuggestions([]));
    }, 180);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [location]);

  function goSearch(value?: string) {
    const query = (value ?? location).trim();
    navigate(query ? `/search?location=${encodeURIComponent(query)}` : "/search");
  }

  return (
    <section className="home-search-band" aria-label="Search properties to rent">
      <div className="home-search-card">
        <p className="home-search-eyebrow">Start your search</p>
        <div className="home-search-row">
          <div className="search-input-wrap" ref={wrapRef}>
            <div className="search-input-shell">
              <Search size={22} />
              <input
                value={location}
                aria-label="Search by postcode, town, city or area"
                onFocus={() => setFocused(true)}
                onBlur={() => window.setTimeout(() => setFocused(false), 180)}
                onChange={(event) => {
                  setFocused(true);
                  setLocation(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") goSearch();
                }}
                placeholder="Postcode, town, city or area — e.g. Kensington, W8, Manchester"
              />
            </div>
            {focused && suggestions.length > 0 && (
              <div className="autocomplete-menu premium-autocomplete" role="listbox">
                {suggestions.map((item) => (
                  <button type="button" key={item.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { setLocation(item.name); goSearch(item.name); }}>
                    <strong>{item.name}</strong>
                    <span>{item.kind.replace(/([A-Z])/g, " $1").trim()} · {item.region}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn primary search-submit" type="button" onClick={() => goSearch()}><Search size={18} /> Search</button>
        </div>
        <button className="btn secondary home-draw-btn" type="button" onClick={() => navigate("/search?draw=1")}>
          <Navigation size={17} /> Draw your search area
        </button>
      </div>
    </section>
  );
}
