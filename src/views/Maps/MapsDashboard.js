import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  GoogleMap,
  Marker, // Still importing for now, but will transition to AdvancedMarkerElement
  useJsApiLoader,
  Polyline,
} from "@react-google-maps/api";
import axios from "axios";
import truckblue from "assets/img/truck-blue.png";
import truckgreen from "assets/img/truck-green.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPause, faPlay, faStop } from "@fortawesome/free-solid-svg-icons";

// Material UI components
import { Button, Icon } from "@material-ui/core";
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardIcon from "components/Card/CardIcon.js";
import GridContainer from "components/Grid/GridContainer.js";
import GridItem from "components/Grid/GridItem.js";
import { makeStyles } from "@material-ui/core/styles";
import styles from "assets/jss/material-dashboard-react/views/dashboardStyle.js";

// Constants
const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "75vh", // Adjusted for card layout
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

const useStyles = makeStyles(styles);

const Maps = () => {
  const classes = useStyles();
  // State
  const [map, setMap] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [smartbins, setSmartbins] = useState([]);
  const [routes, setRoutes] = useState({});
  const [positions, setPositions] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs
  const intervalRefs = useRef({});
  const directionsService = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyDr4f-WIYP4FsWF7RW-ElMHMvrB_nGNRNo",
    libraries: ["geometry", "places", "marker"],
  });

  // Data fetching
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [truckRes, binRes, userRes] = await Promise.all([
        axios.get("http://localhost:5000/api/trucks"),
        axios.get("http://localhost:5000/api/allsmartbins"),
        axios.get("http://localhost:5000/api/drivers"),
      ]);

      // Get today's day name to filter bins
      const today = new Date().toLocaleString("en-US", { weekday: "long" });
      // const today = "Monday"; // Faking Monday for testing

      // Process and filter bins for the current day
      const processedBins = binRes.data
        .filter((bin) =>
          bin.sb_day
            .split(",")
            .map((d) => d.trim())
            .includes(today)
        )
        .map((bin) => ({
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
    if (isLoaded) {
      directionsService.current = new window.google.maps.DirectionsService();
      fetchData();
    }
  }, [isLoaded, fetchData]);

  // Route calculation
  const calculateRoutes = useCallback(() => {
    if (!map || !directionsService.current || !isLoaded) {
      return;
    }

    trucks.forEach((truck) => {
      if (!truck.bins.length) {
        setRoutes((prev) => ({ ...prev, [truck.t_id]: [] }));
        setPositions((prev) => ({ ...prev, [truck.t_id]: DEPOT_LOCATION }));
        return;
      }

      const waypoints = truck.bins.map((bin) => ({
        location: { lat: bin.lat, lng: bin.lng },
        stopover: true,
      }));

      directionsService.current.route(
        {
          origin: DEPOT_LOCATION,
          destination: DEPOT_LOCATION,
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
  }, [trucks, map, isLoaded]);

  // Initialize DirectionsService once Google Maps API is loaded
  useEffect(() => {
    if (isLoaded) {
      calculateRoutes();
    }
  }, [isLoaded, calculateRoutes]);

  // Animation controls
  const startAnimation = useCallback(() => {
    if (isPlaying || !isLoaded) return; // Ensure API is loaded

    setIsPlaying(true);
    const truckIds = trucks.map((t) => t.t_id);

    truckIds.forEach((truckId) => {
      let step = 0;
      clearInterval(intervalRefs.current[truckId]);

      intervalRefs.current[truckId] = setInterval(() => {
        setPositions((prev) => {
          const path = routes[truckId];
          if (!path || step >= path.length) {
            clearInterval(intervalRefs.current[truckId]);
            if (path && path.length > 0) {
              return { ...prev, [truckId]: path[path.length - 1] };
            }
            return prev;
          }
          return { ...prev, [truckId]: path[step++] };
        });
      }, 50);
    });
  }, [isPlaying, routes, trucks, isLoaded]);

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
  const center = DEPOT_LOCATION;

  // Manually override isWeekend for testing purposes
  const isWeekend = false;
  // const isWeekend =
  //   new Date().getDay() === 0 || new Date().getDay() === 6;

  if (!isLoaded)
    return <div className="loading-message">Loading Google Maps...</div>;
  if (loading)
    return <div className="loading-message">Loading map data...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      <GridContainer>
        <GridItem xs={12}>
          <Card>
            <CardHeader color="success" stats icon>
              <CardIcon color="success">
                <Icon>map</Icon>
              </CardIcon>
              <p className={classes.cardCategory}>
                Live Simulation - Today&apos;s Routes
              </p>
              <h3 className={classes.cardTitle}>Truck Fleet Movement</h3>
            </CardHeader>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                padding: "16px",
                gap: "10px",
              }}
            >
              <Button
                onClick={startAnimation}
                disabled={isPlaying || loading || isWeekend}
                variant="contained"
                color="primary"
              >
                <FontAwesomeIcon icon={faPlay} style={{ marginRight: "8px" }} />
                Start
              </Button>
              <Button
                onClick={pauseAnimation}
                disabled={!isPlaying || loading || isWeekend}
                variant="contained"
                color="default"
              >
                <FontAwesomeIcon
                  icon={faPause}
                  style={{ marginRight: "8px" }}
                />
                Pause
              </Button>
              <Button
                onClick={resetAnimation}
                disabled={loading || isWeekend}
                variant="contained"
                color="secondary"
              >
                <FontAwesomeIcon icon={faStop} style={{ marginRight: "8px" }} />
                Reset
              </Button>
            </div>

            <div style={{ position: "relative" }}>
              {isWeekend && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(255, 255, 255, 0.8)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 10,
                    borderRadius: "0 0 6px 6px",
                  }}
                >
                  <h3 style={{ color: "#555", textAlign: "center" }}>
                    Today is a Weekend
                    <br />
                    <small>No bins or routes scheduled for today.</small>
                  </h3>
                </div>
              )}
              <GoogleMap
                mapContainerStyle={MAP_CONTAINER_STYLE}
                center={center}
                zoom={DEFAULT_ZOOM}
                onLoad={setMap}
                options={{
                  gestureHandling: "cooperative",
                  scrollwheel: false, // allow zooming via scroll
                }}
              >
                {trucks.map((truck) => (
                  <React.Fragment key={truck.t_id}>
                    {/* Truck Marker */}
                    {isLoaded && (
                      <Marker
                        position={positions[truck.t_id] || DEPOT_LOCATION}
                        title={`Truck: ${truck.t_plate}\nDriver: ${truck.driverName}`}
                        icon={{
                          url:
                            truck.t_id === 1
                              ? TRUCK_ICONS.blue
                              : TRUCK_ICONS.orange,
                          // Ensure window.google.maps.Size is accessed only after API is loaded
                          scaledSize: new window.google.maps.Size(50, 30),
                        }}
                      />
                    )}

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
                    isLoaded && ( // Conditionally render bin markers too
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
            </div>
          </Card>
        </GridItem>
      </GridContainer>
    </div>
  );
};

export default Maps;
