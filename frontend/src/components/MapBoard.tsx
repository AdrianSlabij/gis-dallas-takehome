import { useEffect, useState } from "react";
import Map, {
  Source,
  Layer,
  NavigationControl,
  Popup,
} from "react-map-gl/mapbox";
import axios from "axios";
import "mapbox-gl/dist/mapbox-gl.css";
import Sidebar from "./Sidebar";

/**
 * Interface representing the raw data structure from the API
 * used for type-safe mapping to GeoJSON features.
 */
interface Parcel {
  id: string;
  address: string;
  county: string;
  sqft: number | null;
  price: number;
  geometry: string; // received as a stringified GeoJSON from Postgres
}

const MapBoard = () => {
  const [parcels, setParcels] = useState<any>(null); // Holds the GeoJSON FeatureCollection for Mapbox rendering
  const [popupInfo, setPopupInfo] = useState<any>(null); // tracks the active map tooltip state
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  //filter state synchronized with the Sidebar component
  const [filters, setFilters] = useState({
    min_price: null,
    max_price: null,
    min_sqft: null,
    max_sqft: null,
    county: null,
  });

  // Re-fetches parcel data whenever filters change
  useEffect(() => {
    // create a cancel token (Controller) to fix Race Conditions
    const controller = new AbortController(); // cancel ongoing, outdated HTTP requests when the filters change before the previous request finishes

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const apiUrl =
          import.meta.env.BACKEND_API_URL || "http://localhost:8000";

        const response = await axios.get(`${apiUrl}/parcels`, {
          params: {
            // set user role based on login status
            user_role: isLoggedIn ? "registered" : "guest",
            ...filters,
          },
          signal: controller.signal, // attach the signal to axios request
        });

        // convert DB records to GeoJSON features
        const features = response.data.data.map((item: Parcel) => ({
          type: "Feature",
          geometry: JSON.parse(item.geometry),
          properties: {
            id: item.id,
            address: item.address,
            price: item.price,
            sqft: item.sqft,
            county: item.county,
          },
        }));

        setParcels({ type: "FeatureCollection", features: features });
      } catch (error: any) {
        //ignore errors caused by cancellation
        if (axios.isCancel(error)) {
          console.log("Request canceled:", error.message);
        } else {
          console.error("Error fetching parcels:", error);
        }
      } finally {
        //only stop loading if the request wasn't cancelled
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };
    fetchData();

    //cancels the previous request when filters change
    return () => {
      controller.abort();
    };
  }, [filters, isLoggedIn]);

  // client side CSV export to download filtered datasets
  const handleExportCSV = () => {
    if (!parcels || !parcels.features.length) {
      alert("No data to export!");
      return;
    }
    const headers = ["ID", "Address", "County", "Price", "SqFt"];
    const rows = parcels.features.map((feature: any) => [
      feature.properties.id,
      `"${feature.properties.address}"`,
      feature.properties.county,
      feature.properties.price,
      feature.properties.sqft,
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row: any) => row.join(",")),
    ].join("\n");

    //browser-based download trigger
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "dallas_parcels.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fillLayer = {
    id: "parcel-fill",
    type: "fill" as const,
    paint: {
      "fill-color": "#ff2020",
      "fill-opacity": 0.6,
    },
  };

  const lineLayer = {
    id: "parcel-line",
    type: "line" as const,
    paint: {
      "line-color": "#000000",
      "line-width": 1,
    },
  };

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      {/* global CSS override for Mapbox components */}
      <style>{`
        .mapboxgl-popup-close-button {
          color: #333 !important;
        }
      `}</style>

      <Sidebar
        onFilterChange={setFilters}
        onExport={handleExportCSV}
        onLoginToggle={setIsLoggedIn}
        isLoggedIn={isLoggedIn}
        resultCount={parcels?.features?.length || 0}
        isSearching={isLoading}
      />

      <Map
        initialViewState={{
          longitude: -96.797,
          latitude: 32.7767,
          zoom: 15,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        interactiveLayerIds={["parcel-fill"]} // allows click events for parcel geometry
        onClick={(event) => {
          if (event.features && event.features.length > 0) {
            setPopupInfo({
              longitude: event.lngLat.lng,
              latitude: event.lngLat.lat,
              feature: event.features[0],
            });
          }
        }}
        cursor={popupInfo ? "auto" : "pointer"}
      >
        <NavigationControl position="top-right" />

        {parcels && (
          <Source id="my-data" type="geojson" data={parcels}>
            <Layer {...fillLayer} />
            <Layer {...lineLayer} />
          </Source>
        )}

        {/* Tooltip Overlay */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
            maxWidth="300px"
          >
            <div style={{ padding: "8px", color: "black", minWidth: "150px" }}>
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "14px",
                  marginBottom: "8px",
                }}
              >
                {popupInfo.feature.properties.address || "Unknown Address"}
              </div>

              <div style={{ borderTop: "1px solid #eee", margin: "5px 0" }} />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <span style={{ color: "#666" }}>Price:</span>
                <span style={{ fontWeight: "600" }}>
                  {popupInfo.feature.properties.price ? (
                    `$${popupInfo.feature.properties.price.toLocaleString()}`
                  ) : (
                    <span style={{ color: "#999", fontStyle: "italic" }}>
                      N/A
                    </span>
                  )}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#666" }}>SqFt:</span>
                <span>
                  {popupInfo.feature.properties.sqft ? (
                    `${popupInfo.feature.properties.sqft.toLocaleString()} ft²`
                  ) : (
                    <span style={{ color: "#999", fontStyle: "italic" }}>
                      N/A
                    </span>
                  )}
                </span>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
};

export default MapBoard;
