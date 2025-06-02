import React, { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  Polyline,
} from "@react-google-maps/api";
import PropTypes from "prop-types";
import axios from "axios";
import driver from "assets/img/driver.png";
import truck from "assets/img/delivery-truck.png";

const Maps = () => {
  const depot = { lat: 1.4234, lng: 103.6312 };
  const [map, setMap] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRefs = useRef([]);
  const [selectedTruck, setSelectedTruck] = useState("all");
  const [center, setCenter] = useState(depot);

  const truckInfo =
    selectedTruck !== "all" ? trucks.find((t) => t.id === selectedTruck) : null;

  const onLoad = (mapInstance) => setMap(mapInstance);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [truckRes, binRes] = await Promise.all([
          axios.get("http://localhost:5000/api/trucks"),
          axios.get("http://localhost:5000/api/smartbins"),
        ]);

        const trucksWithBins = truckRes.data.map((truck) => {
          const bins = binRes.data
            .filter((bin) => bin.t_id === truck.t_id)
            .map((bin) => ({
              ...bin,
              lat: bin.sb_latitude,
              lng: bin.sb_longitude,
            }));

          return {
            id: `truck${truck.t_id}`,
            bins,
            path: [depot, ...bins],
            position: bins.length > 0 ? bins[0] : null,
            step: 0,
            color: truck.t_id === 1 ? "#6a93b4" : "#FFC985",
            driver: truck.t_dname,
            plate: truck.t_plate,
          };
        });

        setTrucks(trucksWithBins);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (map) {
      setTimeout(() => {
        window.google.maps.event.trigger(map, "resize");
      }, 500); // delay ensures tab is visible
    }
  }, [map]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && map) {
        window.google.maps.event.trigger(map, "resize");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [map]);

  //Simulate Movement
  useEffect(() => {
    intervalRefs.current.forEach(clearInterval);
    intervalRefs.current = [];

    if (isPaused || trucks.length === 0) return;

    const newIntervals = trucks.map((truck) => {
      let step = 0;
      let pause = false;

      return setInterval(() => {
        if (pause || isPaused || !truck.path) return;

        const path = truck.path;
        if (step >= path.length) return;

        const point = path[step];

        const nearBin = truck.bins.find((bin) => {
          const dist = Math.sqrt(
            Math.pow(bin.lat - point.lat, 2) + Math.pow(bin.lng - point.lng, 2)
          );
          return dist < 0.0005;
        });

        if (nearBin) {
          pause = true;
          setTimeout(() => {
            pause = false;
          }, 2000);
        }

        setTrucks((prev) =>
          prev.map((t) =>
            t.id === truck.id ? { ...t, position: point, step: step + 1 } : t
          )
        );

        step++;
      }, 100);
    });

    intervalRefs.current = newIntervals;

    return () => {
      newIntervals.forEach(clearInterval);
    };
  }, [isPaused, trucks]);

  useEffect(() => {
    if (selectedTruck !== "all") {
      const truck = trucks.find((t) => t.id === selectedTruck);
      if (truck?.bins?.length >= 5) {
        setCenter({ lat: truck.bins[6].lat, lng: truck.bins[6].lng });
      }
    } else {
      setCenter(depot);
    }
  }, [selectedTruck, trucks]);

  return (
    <LoadScript googleMapsApiKey="AIzaSyD227H6VuZdZE7RNLjFnq2YWAjfMlNf_z0">
      {/* HEADER: Filter + Pause Button + Truck Info */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 20px",
          backgroundColor: "#fff",
          borderBottom: "1px solid #ddd",
          zIndex: 10,
        }}
      >
        {/* Left: Dropdown + Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label>Filter by Truck:</label>
          <select
            value={selectedTruck}
            onChange={(e) => setSelectedTruck(e.target.value)}
            style={{
              padding: "6px 10px",
              fontSize: "14px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              background: "transparent",
            }}
          >
            <option value="all">All Trucks</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.plate || t.id}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsPaused((prev) => !prev)}
            style={{
              backgroundColor: "#F0F0F0",
              color: "black",
              border: "2px solid green",
              borderRadius: "4px",
              padding: "8px 20px",
              fontSize: "14px",
              fontFamily: "Times New Roman, Times, serif",
              cursor: "pointer",
            }}
          >
            {isPaused ? "Resume Trucks" : "Pause Trucks"}
          </button>
        </div>

        {/* Right: Truck Info */}
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          {truckInfo && (
            <>
              <span
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <img src={driver} alt="Driver" width="20" title="Driver" />
                {truckInfo.driver}
              </span>
              <span
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <img src={truck} alt="Plate" width="20" title="Plate Number" />
                {truckInfo.plate}
              </span>
            </>
          )}
        </div>
      </div>

      {/* MAP */}
      <GoogleMap
        mapContainerStyle={{ height: "600px", width: "100%" }}
        center={center}
        zoom={13}
        onLoad={onLoad}
        options={{ draggable: true }}
      >
        {trucks
          .filter((t) => selectedTruck === "all" || t.id === selectedTruck)
          .map((truck) => (
            <React.Fragment key={truck.id}>
              {truck.position && (
                <Marker
                  position={truck.position}
                  icon={{
                    url:
                      truck.id === "truck1"
                        ? "truck-blue.png"
                        : "truck-orange.png",
                    scaledSize: new window.google.maps.Size(60, 40),
                  }}
                />
              )}
              {truck.path && (
                <Polyline
                  path={truck.path}
                  options={{
                    strokeColor: truck.color,
                    strokeWeight: 6,
                    strokeOpacity: 0.8,
                  }}
                />
              )}
            </React.Fragment>
          ))}

        {trucks
          .filter((t) => selectedTruck === "all" || t.id === selectedTruck)
          .flatMap((truck) =>
            truck.bins.map((bin, index) => (
              <Marker
                key={`${truck.id}-bin-${index}`}
                position={{ lat: bin.lat, lng: bin.lng }}
                icon={{
                  url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                }}
              />
            ))
          )}
      </GoogleMap>
    </LoadScript>
  );
};

Maps.propTypes = {
  selectedTruck: PropTypes.string,
};
export default Maps;
