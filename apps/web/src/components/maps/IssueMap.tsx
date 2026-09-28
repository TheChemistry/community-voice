"use client";

import React, { useRef, useState, useMemo } from "react";
import Map, { Source, Layer, Popup, MapRef } from "react-map-gl";
import type { LayerProps } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface ReportMapItem {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  category: string;
  priorityScore: number;
}

interface IssueMapProps {
  reports: ReportMapItem[];
  mapboxToken: string;
}

export default function IssueMap({ reports, mapboxToken }: IssueMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [popupInfo, setPopupInfo] = useState<ReportMapItem | null>(null);

  const geojson = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: reports.map((report) => ({
        type: "Feature",
        properties: {
          ...report,
        },
        geometry: {
          type: "Point",
          coordinates: [report.longitude, report.latitude],
        },
      })),
    };
  }, [reports]);

  const clusterLayer: LayerProps = {
    id: "clusters",
    type: "circle",
    source: "reports",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "step",
        ["get", "point_count"],
        "#51bbd6",
        10,
        "#f1f075",
        30,
        "#f28cb1",
      ],
      "circle-radius": ["step", ["get", "point_count"], 20, 100, 30, 750, 40],
    },
  };

  const clusterCountLayer: LayerProps = {
    id: "cluster-count",
    type: "symbol",
    source: "reports",
    filter: ["has", "point_count"],
    layout: {
      "text-field": "{point_count_abbreviated}",
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      "text-size": 12,
    },
  };

  const unclusteredPointLayer: LayerProps = {
    id: "unclustered-point",
    type: "circle",
    source: "reports",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": [
        "step",
        ["get", "priorityScore"],
        "#3b82f6", // Blue for low
        40,
        "#eab308", // Yellow for medium
        70,
        "#ef4444", // Red for high
      ],
      "circle-radius": 8,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#fff",
    },
  };

  const onClick = (event: any) => {
    const feature = event.features?.[0];
    if (feature && !feature.properties.cluster) {
      setPopupInfo(feature.properties);
    }
  };

  return (
    <div className="w-full h-full min-h-[500px] rounded-xl overflow-hidden shadow-inner border border-slate-200">
      <Map
        ref={mapRef}
        initialViewState={{
          latitude: 45.4215,
          longitude: -75.6972,
          zoom: 10,
        }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        mapboxAccessToken={mapboxToken}
        interactiveLayerIds={["unclustered-point"]}
        onClick={onClick}
      >
        <Source
          id="reports"
          type="geojson"
          data={geojson as any}
          cluster={true}
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...unclusteredPointLayer} />
        </Source>

        {popupInfo && (
          <Popup
            anchor="top"
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <div className="p-2 max-w-[200px]">
              <h3 className="font-bold text-slate-900 leading-tight mb-1">{popupInfo.title}</h3>
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">{popupInfo.category}</p>
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Priority Index</span>
                <span className={`text-sm font-black ${
                  popupInfo.priorityScore > 70 ? 'text-red-600' :
                  popupInfo.priorityScore > 40 ? 'text-yellow-600' : 'text-blue-600'
                }`}>
                  {Math.round(popupInfo.priorityScore)}
                </span>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
