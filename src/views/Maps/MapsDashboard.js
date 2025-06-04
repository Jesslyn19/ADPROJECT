import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker, // Still importing for now, but will transition to AdvancedMarkerElement
  Polyline,
} from "@react-google-maps/api";
import axios from "axios";
import truckblue from "assets/img/truck-blue.png";
import truckgreen from "assets/img/truck-green.png";

// Constants
const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "600px",
};

const TRUCK_ICONS = {
  blue: truckblue,
  orange: truckgreen,
};

const DEPOT_LOCATION = { lat: 1.4234, lng: 103.6312 };
const DEFAULT_ZOOM = 12.5;

const BIN_ICONS = {
  active: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
  inactive: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
};

const Maps = () => {
  // State
  const [map, setMap] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [smartbins, setSmartbins] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [selectedTruckId, setSelectedTruckId] = useState("all");
  const [routes, setRoutes] = useState({});
  const [positions, setPositions] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false); // New state to track API loading

  // Refs
  const intervalRefs = useRef({});
  const directionsService = useRef(null);

  // Data fetching
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [truckRes, binRes, userRes] = await Promise.all([
        axios.get("http://localhost:5000/api/trucks"),
        axios.get("http://localhost:5000/api/smartbins"),
        axios.get("http://localhost:5000/api/drivers"),
      ]);

      // Process bins data
      const processedBins = binRes.data.map((bin) => ({
        ...bin,
        lat: parseFloat(bin.sb_latitude),
        lng: parseFloat(bin.sb_longitude),
      }));

      // Process trucks data
      const processedTrucks = truckRes.data.map((truck) => {
        const driver = userRes.data.find((u) => u.u_id === truck.driver_id);
        return {
          ...truck,
          driverName: driver?.u_name || "No Driver",
          bins: processedBins.filter((bin) => bin.t_id === truck.t_id),
        };
      });

      // Initialize state
      setSmartbins(processedBins);
      setTrucks(processedTrucks);

      // Initialize positions
      const initialPositions = {};
      processedTrucks.forEach((truck) => {
        initialPositions[truck.t_id] = DEPOT_LOCATION;
      });
      setPositions(initialPositions);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load data. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Route calculation
  const calculateRoutes = useCallback(() => {
    if (!map || !directionsService.current || !isApiLoaded) {
      // Ensure API is loaded before calculating routes
      return;
    }

    const trucksToRoute =
      selectedTruckId === "all"
        ? trucks
        : trucks.filter((t) => t.t_id === Number(selectedTruckId));

    trucksToRoute.forEach((truck) => {
      if (!truck.bins.length) {
        setRoutes((prev) => ({ ...prev, [truck.t_id]: [] }));
        setPositions((prev) => ({ ...prev, [truck.t_id]: DEPOT_LOCATION }));
        return;
      }

      const waypoints = truck.bins.slice(1).map((bin) => ({
        location: { lat: bin.lat, lng: bin.lng },
        stopover: true,
      }));

      directionsService.current.route(
        {
          origin: DEPOT_LOCATION,
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
            setPositions((prev) => ({ ...prev, [truck.t_id]: path[0] }));
          } else {
            console.error("Directions error:", status);
            setRoutes((prev) => ({ ...prev, [truck.t_id]: [] }));
            setPositions((prev) => ({ ...prev, [truck.t_id]: DEPOT_LOCATION }));
          }
        }
      );
    });
  }, [trucks, selectedTruckId, map, isApiLoaded]); // Add isApiLoaded to dependencies

  // Initialize DirectionsService once Google Maps API is loaded
  const onGoogleApiLoad = useCallback(() => {
    if (window.google) {
      directionsService.current = new window.google.maps.DirectionsService();
      setIsApiLoaded(true);
      calculateRoutes();
    }
  }, [calculateRoutes]);

  useEffect(() => {
    if (isApiLoaded) {
      calculateRoutes();
    }
  }, [isApiLoaded, calculateRoutes]);

  // Animation controls
  const startAnimation = useCallback(() => {
    if (isPlaying || !isApiLoaded) return; // Ensure API is loaded

    setIsPlaying(true);
    const truckIds =
      selectedTruckId === "all"
        ? trucks.map((t) => t.t_id)
        : [Number(selectedTruckId)];

    truckIds.forEach((truckId) => {
      let step = 0;
      clearInterval(intervalRefs.current[truckId]);

      intervalRefs.current[truckId] = setInterval(() => {
        setPositions((prev) => {
          const path = routes[truckId];
          if (!path || step >= path.length) {
            clearInterval(intervalRefs.current[truckId]);
            // Optional: reset truck to the end of the route or depot after completion
            if (path && path.length > 0) {
              return { ...prev, [truckId]: path[path.length - 1] };
            }
            return prev;
          }
          return { ...prev, [truckId]: path[step++] };
        });
      }, 300);
    });
  }, [isPlaying, routes, selectedTruckId, trucks, isApiLoaded]);

  const pauseAnimation = useCallback(() => {
    setIsPlaying(false);
    Object.values(intervalRefs.current).forEach(clearInterval);
  }, []);

  const resetAnimation = useCallback(() => {
    setIsPlaying(false);
    Object.values(intervalRefs.current).forEach(clearInterval);

    setPositions((prev) => {
      const newPositions = { ...prev };
      // Reset all trucks to the start of their calculated route or depot
      Object.keys(routes).forEach((truckId) => {
        newPositions[truckId] = routes[truckId]?.[0] || DEPOT_LOCATION;
      });
      return newPositions;
    });
  }, [routes]);

  // Calculate center point
  const center =
    selectedTruckId === "all"
      ? DEPOT_LOCATION
      : trucks.find((t) => t.t_id === Number(selectedTruckId))?.bins[0] ||
        DEPOT_LOCATION;

  // Filtered trucks based on selection
  const filteredTrucks =
    selectedTruckId === "all"
      ? trucks
      : trucks.filter((t) => t.t_id === Number(selectedTruckId));

  if (loading)
    return <div className="loading-message">Loading map data...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    // Use an environment variable for the API key for security and flexibility
    <LoadScript
      googleMapsApiKey={"AIzaSyD227H6VuZdZE7RNLjFnq2YWAjfMlNf_z0"}
      onLoad={onGoogleApiLoad} // Call onGoogleApiLoad when the script is loaded
      libraries={["geometry", "places", "marker"]}
    >
      <div className="map-controls">
        <div className="animation-controls">
          <button onClick={startAnimation} disabled={isPlaying || loading}>
            ▶ Start
          </button>
          <button onClick={pauseAnimation} disabled={!isPlaying || loading}>
            ⏸ Pause
          </button>
          <button onClick={resetAnimation} disabled={loading}>
            ⏹ Reset
          </button>
        </div>
      </div>

      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={DEFAULT_ZOOM}
        onLoad={setMap}
        options={{
          gestureHandling: "cooperative", // or 'cooperative'
          scrollwheel: false, // allow zooming via scroll
        }}
      >
        {filteredTrucks.map((truck) => (
          <React.Fragment key={truck.t_id}>
            {/* Truck Marker */}
            {isApiLoaded && (
              <Marker
                position={positions[truck.t_id] || DEPOT_LOCATION}
                title={`Truck: ${truck.t_plate}\nDriver: ${truck.driverName}`}
                icon={{
                  url: truck.t_id === 1 ? TRUCK_ICONS.blue : TRUCK_ICONS.orange,
                  // Ensure window.google.maps.Size is accessed only after API is loaded
                  scaledSize: new window.google.maps.Size(50, 30),
                }}
              />
            )}

            {/* If using AdvancedMarkerElement, it would look something like this:
            {isApiLoaded && (
              <AdvancedMarker
                position={positions[truck.t_id] || DEPOT_LOCATION}
                title={`Truck: ${truck.t_plate}\nDriver: ${truck.driverName}`}
              >
                <Pin
                  background={
                    truck.t_id === 1 ? "#3366FF" : "#FF9900"
                  }
                  borderColor={
                    truck.t_id === 1 ? "#1a3366" : "#b36b00"
                  }
                  glyphColor={"#fff"}
                >
                  <img
                    src={
                      truck.t_id === 1
                        ? TRUCK_ICONS.blue
                        : TRUCK_ICONS.orange
                    }
                    alt="truck icon"
                    style={{ width: "30px", height: "auto" }}
                  />
                </Pin>
              </AdvancedMarker>
            )}
            */}

            {/* Route Polyline */}
            {routes[truck.t_id]?.length > 0 && (
              <Polyline
                path={routes[truck.t_id]}
                options={{
                  strokeColor: truck.t_id === 1 ? "#3366FF" : "#FF9900",
                  strokeWeight: 5,
                  strokeOpacity: 0.7,
                }}
              />
            )}
          </React.Fragment>
        ))}

        {/* Bin Markers - rendered separately for better performance */}
        {smartbins.map(
          (bin) =>
            isApiLoaded && ( // Conditionally render bin markers too
              <Marker
                key={bin.sb_id}
                position={{ lat: bin.lat, lng: bin.lng }}
                title={`Bin: ${bin.sb_plate}\nStatus: ${bin.sb_status}`}
                icon={{
                  url:
                    bin.sb_status === "Active"
                      ? BIN_ICONS.active
                      : BIN_ICONS.inactive,
                  // Ensure window.google.maps.Size is accessed only after API is loaded
                  scaledSize: new window.google.maps.Size(32, 32),
                }}
              />
            )
        )}
      </GoogleMap>
    </LoadScript>
  );
};

export default Maps;
