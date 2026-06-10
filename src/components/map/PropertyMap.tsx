import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, Polygon, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterModule from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/lib/assets/MarkerCluster.css";
import "react-leaflet-cluster/lib/assets/MarkerCluster.Default.css";
import type { Property } from "../../types/domain";
import type { LatLngPoint } from "../../services/locationService";
import { firstCoordinate } from "../../services/locationService";

const MarkerClusterGroup = (MarkerClusterModule as any).default || MarkerClusterModule;
const BRAND_COLOUR = "#B84E1A";

type Props = {
  properties: Property[];
  selectedPropertyId?: string;
  onSelectProperty: (propertyId: string) => void;
  drawing: boolean;
  polygon: LatLngPoint[];
  onPolygonChange: (polygon: LatLngPoint[]) => void;
  onCompleteDrawing?: () => void;
  radiusOrigin?: LatLngPoint | null;
  radiusMiles?: number;
  onBoundsChange?: (bounds: LatLngPoint[]) => void;
};

export default function PropertyMap({ properties, selectedPropertyId, onSelectProperty, drawing, polygon, onPolygonChange, onCompleteDrawing, radiusOrigin, radiusMiles = 0, onBoundsChange }: Props) {
  const center = firstCoordinate(properties) || { latitude: 51.5076, longitude: -0.1904 };
  return (
    <MapContainer className="osm-property-map" center={[center.latitude, center.longitude]} zoom={13} scrollWheelZoom doubleClickZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToResults properties={properties} onBoundsChange={onBoundsChange} />
      <DrawSearchLayer drawing={drawing} polygon={polygon} onPolygonChange={onPolygonChange} onCompleteDrawing={onCompleteDrawing} />
      {polygon.length >= 3 && <Polygon positions={polygon.map((point) => [point.latitude, point.longitude])} pathOptions={{ color: BRAND_COLOUR, fillColor: BRAND_COLOUR, fillOpacity: 0.16, weight: 2.5 }} />}
      {radiusOrigin && radiusMiles > 0 && <Circle center={[radiusOrigin.latitude, radiusOrigin.longitude]} radius={radiusMiles * 1609.344} pathOptions={{ color: BRAND_COLOUR, fillOpacity: 0.06, weight: 1.5 }} />}
      <MarkerClusterGroup chunkedLoading showCoverageOnHover={false}>
        {properties.filter((property) => property.latitude && property.longitude).map((property) => (
          <LMarker key={property.id} property={property} selected={selectedPropertyId === property.id} onSelect={() => onSelectProperty(property.id)} />
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}

function LMarker({ property, selected, onSelect }: { property: Property; selected: boolean; onSelect: () => void }) {
  const icon = useMemo(() => L.divIcon({
    className: `hilltro-price-marker ${selected ? "selected" : ""}`,
    html: `
      <span>£${property.rentPcm >= 10000 ? `${Math.round(property.rentPcm / 1000)}k` : property.rentPcm.toLocaleString("en-GB")}</span>
      <a class="map-marker-preview" href="/properties/${property.id}">
        <img src="${property.imageUrl}" alt="" />
        <em>${escapeHtml(property.type)} · ${property.bedrooms} bed · ${escapeHtml(property.postcodeDistrict)}</em>
        <strong>£${property.rentPcm.toLocaleString("en-GB")} pcm</strong>
        <small>${escapeHtml(property.streetName)}, ${escapeHtml(property.area)}</small>
      </a>
    `,
    iconSize: [74, 34],
    iconAnchor: [37, 17]
  }), [property.area, property.bedrooms, property.id, property.imageUrl, property.postcodeDistrict, property.rentPcm, property.streetName, property.type, selected]);
  return (
    <Marker
      position={[property.latitude!, property.longitude!]}
      icon={icon}
      eventHandlers={{
        click: onSelect
      }}
    />
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[character] || character));
}

function FitToResults({ properties, onBoundsChange }: { properties: Property[]; onBoundsChange?: (bounds: LatLngPoint[]) => void }) {
  const map = useMap();
  useEffect(() => {
    const coords = properties.filter((property) => property.latitude && property.longitude).map((property) => [property.latitude!, property.longitude!] as [number, number]);
    if (coords.length === 0) return;
    map.fitBounds(L.latLngBounds(coords), { padding: [28, 28], maxZoom: 14 });
  }, [map, properties]);
  useEffect(() => {
    const report = () => {
      const bounds = map.getBounds();
      const north = bounds.getNorth();
      const south = bounds.getSouth();
      const east = bounds.getEast();
      const west = bounds.getWest();
      onBoundsChange?.([
        { latitude: north, longitude: west },
        { latitude: north, longitude: east },
        { latitude: south, longitude: east },
        { latitude: south, longitude: west }
      ]);
    };
    report();
    map.on("moveend zoomend", report);
    return () => {
      map.off("moveend zoomend", report);
    };
  }, [map, onBoundsChange]);
  return null;
}

function DrawSearchLayer({ drawing, polygon, onPolygonChange, onCompleteDrawing }: { drawing: boolean; polygon: LatLngPoint[]; onPolygonChange: (polygon: LatLngPoint[]) => void; onCompleteDrawing?: () => void }) {
  const [cursorPoint, setCursorPoint] = useState<LatLngPoint | null>(null);
  const polygonRef = useRef(polygon);
  const clickTimer = useRef<number | null>(null);
  useEffect(() => {
    polygonRef.current = polygon;
  }, [polygon]);
  useEffect(() => () => {
    if (clickTimer.current) window.clearTimeout(clickTimer.current);
  }, []);
  const vertexIcon = useMemo(() => L.divIcon({
    className: "draw-vertex-marker",
    html: "<span></span>",
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  }), []);
  const midpointIcon = useMemo(() => L.divIcon({
    className: "draw-midpoint-marker",
    html: "<span></span>",
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  }), []);

  useMapEvents({
    click(event) {
      if (!drawing) return;
      // Defer adding the point so the closing double-click does not drop stray vertices.
      if (clickTimer.current) return;
      const latlng = event.latlng;
      clickTimer.current = window.setTimeout(() => {
        onPolygonChange([...polygonRef.current, { latitude: latlng.lat, longitude: latlng.lng }]);
        clickTimer.current = null;
      }, 240);
    },
    dblclick(event) {
      if (!drawing) return;
      L.DomEvent.stop(event);
      if (clickTimer.current) {
        window.clearTimeout(clickTimer.current);
        clickTimer.current = null;
      }
      setCursorPoint(null);
      if (polygonRef.current.length >= 3) onCompleteDrawing?.();
    },
    mousemove(event) {
      if (!drawing || polygon.length === 0) return;
      setCursorPoint({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
    mouseout() {
      setCursorPoint(null);
    }
  });

  const path = polygon.map((point) => [point.latitude, point.longitude] as [number, number]);
  const guidePath = polygon.length > 0 && cursorPoint ? [
    [polygon[polygon.length - 1].latitude, polygon[polygon.length - 1].longitude] as [number, number],
    [cursorPoint.latitude, cursorPoint.longitude] as [number, number]
  ] : [];
  const midpoints = polygon.length >= 2 ? polygon.flatMap((point, index) => {
    const next = polygon[index + 1] || (polygon.length >= 3 ? polygon[0] : null);
    if (!next) return [];
    return [{ index: index + 1, latitude: (point.latitude + next.latitude) / 2, longitude: (point.longitude + next.longitude) / 2 }];
  }) : [];

  function replacePoint(index: number, point: LatLngPoint) {
    onPolygonChange(polygon.map((current, pointIndex) => pointIndex === index ? point : current));
  }

  function removePoint(index: number) {
    onPolygonChange(polygon.filter((_, pointIndex) => pointIndex !== index));
  }

  function insertPoint(index: number, point: LatLngPoint) {
    const next = [...polygon];
    next.splice(index, 0, point);
    onPolygonChange(next);
  }

  return (
    <>
      {path.length >= 2 && <Polyline positions={path} pathOptions={{ color: BRAND_COLOUR, weight: 2.5, opacity: 0.92 }} />}
      {guidePath.length === 2 && <Polyline positions={guidePath} pathOptions={{ color: BRAND_COLOUR, weight: 2, opacity: 0.72, dashArray: "6 8" }} />}
      {polygon.map((point, index) => (
        <Marker
          key={`${point.latitude}-${point.longitude}-${index}`}
          position={[point.latitude, point.longitude]}
          icon={vertexIcon}
          draggable
          eventHandlers={{
            dragend(event) {
              const next = (event.target as L.Marker).getLatLng();
              replacePoint(index, { latitude: next.lat, longitude: next.lng });
            },
            dblclick(event) {
              L.DomEvent.stop(event);
              removePoint(index);
            }
          }}
        />
      ))}
      {midpoints.map((point) => (
        <Marker
          key={`mid-${point.index}-${point.latitude}-${point.longitude}`}
          position={[point.latitude, point.longitude]}
          icon={midpointIcon}
          eventHandlers={{
            click(event) {
              L.DomEvent.stop(event);
              insertPoint(point.index, { latitude: point.latitude, longitude: point.longitude });
            }
          }}
        />
      ))}
    </>
  );
}
