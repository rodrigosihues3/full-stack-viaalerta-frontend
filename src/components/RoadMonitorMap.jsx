import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { INCIDENT_STATUS } from "../services/mockData";

const STATUS_MARKER_COLORS = {
  REGISTRADO: { bg: "#475569", border: "#1e293b", ring: "rgba(71,85,105,0.28)" },
  EVALUACION: { bg: "#d97706", border: "#92400e", ring: "rgba(217,119,6,0.28)" },
  REPARACION: { bg: "#2563eb", border: "#1e40af", ring: "rgba(37,99,235,0.28)" },
  RESUELTO: { bg: "#059669", border: "#065f46", ring: "rgba(5,150,105,0.28)" },
  DESESTIMADO: { bg: "#e11d48", border: "#9f1239", ring: "rgba(225,29,72,0.25)" },
};

const createUserIcon = () =>
  L.divIcon({
    className: "viaalerta-user-marker",
    html: `
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 9999px;
          background: rgba(37, 99, 235, 0.32);
          border: 1.5px solid rgba(37, 99, 235, 0.6);
        "></span>
        <span style="
          position: relative;
          width: 12px;
          height: 12px;
          border-radius: 9999px;
          background: #1d4ed8;
          border: 2.5px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        "></span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });

const createIncidentIcon = (status, isSelected = false) => {
  const palette =
    STATUS_MARKER_COLORS[(status || "REGISTRADO").toUpperCase()] ||
    STATUS_MARKER_COLORS.REGISTRADO;
  const size = isSelected ? 34 : 28;

  return L.divIcon({
    className: "viaalerta-incident-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 9999px;
        background: ${palette.bg};
        border: ${isSelected ? "3px solid #081D30" : "2.5px solid #ffffff"};
        box-shadow: 0 0 0 ${isSelected ? "6px" : "4px"} ${palette.ring}, 0 3px 8px rgba(15,23,42,0.38);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-weight: 800;
        font-size: ${isSelected ? "13px" : "11px"};
        font-family: system-ui, -apple-system, sans-serif;
      ">
        !
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

export const RoadMonitorMap = ({
  userLocation,
  radiusKm = 10,
  incidents = [],
  selectedIncidentId = null,
  onSelectIncident,
  onChangeReferenceLocation,
  heightClass = "h-72 md:h-96",
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const userLayerRef = useRef(null);

  // Inicializar mapa Leaflet con OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = userLocation?.lat ?? -12.046374;
    const initialLng = userLocation?.lng ?? -77.042793;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    userLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);

    map.on("click", (e) => {
      if (onChangeReferenceLocation && e?.latlng) {
        onChangeReferenceLocation({
          lat: Number(e.latlng.lat.toFixed(6)),
          lng: Number(e.latlng.lng.toFixed(6)),
          source: "manual",
        });
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actualizar marcador de ubicación del ciudadano y círculo de radio
  useEffect(() => {
    const map = mapInstanceRef.current;
    const userLayer = userLayerRef.current;
    if (!map || !userLayer || !userLocation) return;

    userLayer.clearLayers();

    const { lat, lng } = userLocation;
    if (typeof lat !== "number" || typeof lng !== "number") return;

    const userMarker = L.marker([lat, lng], {
      icon: createUserIcon(),
      zIndexOffset: 1000,
    });

    userMarker.bindPopup(
      `<div style="font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.4;">
        <strong style="color: #081D30; display: block;">Tu ubicación de referencia</strong>
        <span style="color: #64748b; font-family: monospace; font-size: 11px;">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
        <span style="display: block; color: #2563eb; font-size: 11px; margin-top: 2px;">Radio de búsqueda: ${radiusKm} km</span>
      </div>`
    );

    const radiusCircle = L.circle([lat, lng], {
      radius: radiusKm * 1000,
      color: "#2563eb",
      weight: 1.5,
      opacity: 0.55,
      fillColor: "#3b82f6",
      fillOpacity: 0.08,
      interactive: false,
    });

    userLayer.addLayer(radiusCircle);
    userLayer.addLayer(userMarker);

    map.setView([lat, lng], radiusKm <= 2 ? 15 : radiusKm <= 5 ? 13 : 12, {
      animate: true,
    });
  }, [userLocation, radiusKm]);

  // Renderizar marcadores de reportes reales cercanos
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    incidents.forEach((incident) => {
      const lat = Number(incident.lat ?? incident.latitud);
      const lng = Number(incident.lng ?? incident.longitud);
      if (isNaN(lat) || isNaN(lng)) return;

      const isSelected = selectedIncidentId === incident.id;
      const statusMeta =
        INCIDENT_STATUS[incident.status] || INCIDENT_STATUS.REGISTRADO;
      const distText =
        typeof incident.distanceKm === "number"
          ? incident.distanceKm < 1
            ? `a ${Math.round(incident.distanceKm * 1000)} m`
            : `a ${incident.distanceKm.toFixed(2)} km`
          : "";

      const marker = L.marker([lat, lng], {
        icon: createIncidentIcon(incident.status, isSelected),
        zIndexOffset: isSelected ? 900 : 100,
      });

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; min-width: 190px; max-width: 240px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px;">
            <span style="font-family: monospace; font-size: 10px; font-weight: 700; color: #475569;">${incident.ticketNumber || ""}</span>
            <span style="font-size: 10px; font-weight: 700; color: #0f172a; background: #f1f5f9; padding: 1px 6px; border-radius: 4px;">${statusMeta.label}</span>
          </div>
          <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; color: #081D30;">
            ${incident.categoryName || "Incidente Vial"}
          </p>
          <p style="margin: 0 0 4px; font-size: 11px; color: #475569;">
            ${incident.address || incident.district || "Lima Metropolitana"}
          </p>
          ${
            distText
              ? `<p style="margin: 0; font-size: 11px; font-weight: 700; color: #2563eb;">📍 ${distText} de tu ubicación</p>`
              : ""
          }
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on("click", () => {
        onSelectIncident?.(incident);
      });

      markersLayer.addLayer(marker);

      if (isSelected) {
        marker.openPopup();
      }
    });
  }, [incidents, selectedIncidentId, onSelectIncident]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-300 bg-slate-100 shadow-xs">
      <div ref={mapContainerRef} className={`w-full ${heightClass} z-0`} />

      {/* Leyenda compacta de estados sobre el mapa */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white/95 px-3 py-2 text-[10px] text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1 font-semibold">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-700 ring-2 ring-blue-200" />
            Tu ubicación
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
            Registrado
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-600" />
            En Evaluación
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            En Reparación
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            Resuelto
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          Toque un marcador o punto del mapa para inspeccionar
        </span>
      </div>
    </div>
  );
};
