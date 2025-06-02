import React, { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  Polyline,
} from "@react-google-maps/api";
import PropTypes from "prop-types";
import axios from "axios";

const Maps = () => {
  const depot = { lat: 1.4234, lng: 103.6312 };
  const [map, setMap] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRefs = useRef([]);
  const [selectedTruck, setSelectedTruck] = useState("all");
  /* const [dispatchTime, setDispatchTime] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
 */
  const truckInfo =
    selectedTruck !== "all" ? trucks.find((t) => t.id === selectedTruck) : null;

  const onLoad = (mapInstance) => setMap(mapInstance);
  /* //Constant Bin Location
  const area1Bins = [
    { id: "1a", lat: 1.530053, lng: 103.668845 },
    { id: "1b", lat: 1.53124, lng: 103.66858 },
    { id: "1c", lat: 1.531731, lng: 103.669898 },
    { id: "1d", lat: 1.526586, lng: 103.670184 },
    { id: "1e", lat: 1.526013, lng: 103.667911 },
    { id: "1f", lat: 1.523876, lng: 103.668053 },
    { id: "1g", lat: 1.522825, lng: 103.664142 },
    { id: "1h", lat: 1.520497, lng: 103.666702 },
    { id: "1i", lat: 1.519578, lng: 103.661106 },
    { id: "1j", lat: 1.516882, lng: 103.658621 },
    { id: "1k", lat: 1.512625, lng: 103.65647 },
    { id: "1l", lat: 1.509358, lng: 103.648803 },
    { id: "1m", lat: 1.507888, lng: 103.652834 },
  ];

  const area2Bins = [
    { id: "2a", lat: 1.4841, lng: 103.7624 },
    { id: "2b", lat: 1.4815, lng: 103.7582 },
    { id: "2c", lat: 1.4793, lng: 103.7551 },
    { id: "2d", lat: 1.477, lng: 103.751 },
    { id: "2e", lat: 1.478948, lng: 103.747142 },
    { id: "2f", lat: 1.4738, lng: 103.7459 },
    { id: "2g", lat: 1.4707, lng: 103.7425 },
    { id: "2h", lat: 1.4684, lng: 103.7402 },
    { id: "2i", lat: 1.4659, lng: 103.737 },
    { id: "2j", lat: 1.4631, lng: 103.7345 },
  ];
  const truckData = [
    {
      id: "truck1",
      bins: area1Bins,
      step: 0,
      color: "#6a93b4",
      driver: "Azman Ibrahim",
      plate: "JBD1234",
    },
    {
      id: "truck2",
      bins: area2Bins,
      step: 0,
      color: "#FFC985",
      driver: "Nur Aisyah",
      plate: "JBA5678",
    },
  ]; */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [truckRes, binRes] = await Promise.all([
          axios.get("http://localhost:5000/api/trucks"),
          axios.get("http://localhost:5000/api/smartbins"),
        ]);

        const trucksWithBins = truckRes.data.map((truck) => {
          const bins = binRes.data.filter((bin) => bin.t_id === truck.t_id);
          return {
            id: `truck${truck.t_id}`,
            bins,
            path: bins,
            position: bins[0],
            step: 0,
            color: truck.t_id === 1 ? "#6a93b4" : "#FFC985",
            driver: truck.t_id === 1 ? "Azman Ibrahim" : "Nur Aisyah", // You can also fetch from backend
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
    if (selectedTruck !== "all" && map) {
      const truck = trucks.find((t) => t.id === selectedTruck);
      if (truck?.bins?.length >= 5) {
        map.setCenter({ lat: truck.bins[6].lat, lng: truck.bins[6].lng });
        map.setZoom(15);
      }
    }
  }, [selectedTruck, map, trucks]);
  return (
    <LoadScript googleMapsApiKey="AIzaSyCHoSifBUCDcoEiDXM0UHYM1iXQ09gUukg">
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
              {/* Example: Start time & dispatch time can be added here too if needed */}
              <span
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <img src="driver.png" alt="Driver" width="20" title="Driver" />
                {truckInfo.driver}
              </span>
              <span
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                <img
                  src="truck.png"
                  alt="Plate"
                  width="20"
                  title="Plate Number"
                />
                {truckInfo.plate}
              </span>
            </>
          )}
        </div>
      </div>

      {/* MAP */}
      <GoogleMap
        mapContainerStyle={{ height: "600px", width: "100%" }}
        center={depot}
        zoom={13}
        onLoad={onLoad}
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
      </GoogleMap>
    </LoadScript>
  );
};

Maps.propTypes = {
  selectedTruck: PropTypes.string,
};
export default Maps;
