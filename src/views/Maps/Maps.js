import React, { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  Polyline,
} from "@react-google-maps/api";
import axios from "axios";

const containerStyle = {
  width: "100%",
  height: "600px",
};

const depot = { lat: 1.4234, lng: 103.6312 };

const truckBlueIconUrl = "assets/img/truck-blue.png";
const truckOrangeIconUrl = "assets/img/truck-orange.png";

const Maps = () => {
  const [map, setMap] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [selectedTruckId, setSelectedTruckId] = useState("all");
  const [routes, setRoutes] = useState({}); // { truckId: [LatLng] }
  const [positions, setPositions] = useState({}); // current truck positions on route
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRefs = useRef({});
  const directionsService = useRef(null);

  // Load trucks, bins, and users
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [truckRes, binRes, userRes] = await Promise.all([
          axios.get("http://localhost:5000/api/trucks"),
          axios.get("http://localhost:5000/api/smartbins"),
          axios.get("http://localhost:5000/api/users"),
        ]);

        const users = userRes.data;

        // Join trucks to drivers and assign bins
        const trucksWithData = truckRes.data.map((truck) => {
          const driver = users.find((u) => u.u_id === truck.driver_id);
          const bins = binRes.data
            .filter((bin) => bin.t_id === truck.t_id)
            .map((bin) => ({
              ...bin,
              lat: Number(bin.sb_latitude),
              lng: Number(bin.sb_longitude),
            }));
          return {
            ...truck,
            driverName: driver ? driver.u_name : "No Driver",
            bins,
          };
        });

        setTrucks(trucksWithData);
      } catch (error) {
        console.error("Fetch error", error);
      }
    };

    fetchData();
  }, []);

  // Calculate routes whenever trucks or selection change
  useEffect(() => {
    if (!map) return;
    if (!directionsService.current) {
      directionsService.current = new window.google.maps.DirectionsService();
    }

    const trucksToRoute =
      selectedTruckId === "all"
        ? trucks
        : trucks.filter((t) => t.t_id === Number(selectedTruckId));

    trucksToRoute.forEach((truck) => {
      if (truck.bins.length === 0) {
        setRoutes((prev) => ({ ...prev, [truck.t_id]: [] }));
        return;
      }
      const waypoints = truck.bins.slice(1).map((bin) => ({
        location: { lat: bin.lat, lng: bin.lng },
        stopover: true,
      }));

      directionsService.current.route(
        {
          origin: depot,
          destination: truck.bins[truck.bins.length - 1],
          waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false,
        },
        (result, status) => {
          if (status === "OK" && result) {
            const path = result.routes[0].overview_path.map((p) => ({
              lat: p.lat(),
              lng: p.lng(),
            }));
            setRoutes((prev) => ({ ...prev, [truck.t_id]: path }));
          } else {
            console.error("Directions error:", status);
            setRoutes((prev) => ({ ...prev, [truck.t_id]: [] }));
          }
        }
      );
    });
  }, [trucks, selectedTruckId, map]);

  // Center map on selected truck's first bin or depot
  const center =
    selectedTruckId === "all"
      ? depot
      : trucks.find((t) => t.t_id === Number(selectedTruckId))?.bins[0] ||
        depot;

  // Animate truck movement
  const startAnimation = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    const truckIds =
      selectedTruckId === "all"
        ? trucks.map((t) => t.t_id)
        : [Number(selectedTruckId)];

    truckIds.forEach((truckId) => {
      let step = 0;
      clearInterval(intervalRefs.current[truckId]); // clear if exists
      intervalRefs.current[truckId] = setInterval(() => {
        setPositions((prev) => {
          const path = routes[truckId];
          if (!path || step >= path.length) {
            clearInterval(intervalRefs.current[truckId]);
            return prev;
          }
          const newPos = { ...prev, [truckId]: path[step] };
          step++;
          return newPos;
        });
      }, 200);
    });
  };

  const pauseAnimation = () => {
    setIsPlaying(false);
    Object.values(intervalRefs.current).forEach(clearInterval);
  };

  const resetAnimation = () => {
    setIsPlaying(false);
    Object.values(intervalRefs.current).forEach(clearInterval);
    // Reset positions to start of routes
    setPositions((prev) => {
      const newPos = { ...prev };
      Object.keys(routes).forEach((truckId) => {
        if (routes[truckId] && routes[truckId].length > 0) {
          newPos[truckId] = routes[truckId][0];
        } else {
          newPos[truckId] = depot;
        }
      });
      return newPos;
    });
  };

  return (
    <LoadScript googleMapsApiKey="AIzaSyD227H6VuZdZE7RNLjFnq2YWAjfMlNf_z0">
      <div style={{ marginBottom: 10, padding: 10, backgroundColor: "#fff" }}>
        <label htmlFor="truck-select" style={{ marginRight: 8 }}>
          Select Truck:
        </label>
        <select
          id="truck-select"
          value={selectedTruckId}
          onChange={(e) => setSelectedTruckId(e.target.value)}
        >
          <option value="all">All Trucks</option>
          {trucks.map((truck) => (
            <option key={truck.t_id} value={truck.t_id}>
              {truck.t_plate} - {truck.driverName}
            </option>
          ))}
        </select>

        <div style={{ marginTop: 10 }}>
          <button
            onClick={startAnimation}
            disabled={isPlaying}
            style={{ marginRight: 10 }}
          >
            ▶ Start
          </button>
          <button
            onClick={pauseAnimation}
            disabled={!isPlaying}
            style={{ marginRight: 10 }}
          >
            ⏸ Pause
          </button>
          <button onClick={resetAnimation}>⏹ Reset</button>
        </div>
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={13}
        onLoad={(map) => setMap(map)}
        options={{ streetViewControl: false }}
      >
        {(selectedTruckId === "all"
          ? trucks
          : trucks.filter((t) => t.t_id === Number(selectedTruckId))
        ).map((truck) => (
          <React.Fragment key={truck.t_id}>
            {/* Truck marker current position */}
            <Marker
              position={positions[truck.t_id] || depot}
              title={`Truck: ${truck.t_plate} Driver: ${truck.driverName}`}
              icon={{
                url: truck.t_id === 1 ? truckBlueIconUrl : truckOrangeIconUrl,
                scaledSize: new window.google.maps.Size(50, 30),
              }}
            />

            {/* Route polyline */}
            {routes[truck.t_id] && routes[truck.t_id].length > 0 && (
              <Polyline
                path={routes[truck.t_id]}
                options={{
                  strokeColor: truck.t_id === 1 ? "#3366FF" : "#FF9900",
                  strokeWeight: 5,
                  strokeOpacity: 0.7,
                }}
              />
            )}

            {/* Bin markers */}
            {truck.bins.map((bin) => (
              <Marker
                key={bin.sb_id}
                position={{ lat: bin.lat, lng: bin.lng }}
                title={`Bin: ${bin.sb_plate} (${bin.sb_status})`}
                icon={{
                  url:
                    bin.sb_status === "Active"
                      ? "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
                      : "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
                  scaledSize: new window.google.maps.Size(32, 32),
                }}
              />
            ))}
          </React.Fragment>
        ))}
      </GoogleMap>
    </LoadScript>
  );
};

export default Maps;
