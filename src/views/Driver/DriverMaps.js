import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  LoadScript,
  GoogleMap,
  TrafficLayer,
  DirectionsRenderer,
} from "@react-google-maps/api";
import {
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@material-ui/core";
import GridItem from "components/Grid/GridItem.js";
import GridContainer from "components/Grid/GridContainer.js";
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardIcon from "components/Card/CardIcon.js";
import Icon from "@material-ui/core/Icon";
import { makeStyles } from "@material-ui/core/styles";
import axios from "axios";
import truckblue from "assets/img/truck-blue.png";
import truckgreen from "assets/img/truck-green.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faCheck,
  faRedo,
} from "@fortawesome/free-solid-svg-icons";

import styles from "assets/jss/material-dashboard-react/views/dashboardStyle.js";
const useStyles = makeStyles(styles);

// Constants
const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  backgroundColor: "black",
};

const MAP_PANEL_STYLE = {
  flexGrow: 1,
  height: "100%",
};

const DEFAULT_ZOOM = 14; // Adjusted zoom for better overview of routes
const DEPOT_LOCATION = { lat: 1.4234, lng: 103.6312 }; // Your depot location

const TRUCK_ICONS = {
  blue: truckblue,
  orange: truckgreen,
};

const googleMapsLibraries = ["geometry", "places", "marker"];

const DriverMaps = () => {
  const classes = useStyles();
  const currentDriverId = parseInt(localStorage.getItem("userId")); // Assuming userId is stored in localStorage
  const googleMapRef = useRef(null);
  const directionsService = useRef(null);
  const markers = useRef([]);

  const [isMapInstanceReady, setIsMapInstanceReady] = useState(false);
  const [driverTruck, setDriverTruck] = useState(null);
  const [assignedBins, setAssignedBins] = useState([]); // Bins for the selected day
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGoogleApiLoaded, setIsGoogleApiLoaded] = useState(false);
  const [directionsResult, setDirectionsResult] = useState(null); // Keep this for actual route display

  // Navigation states
  const [isNavigationStarted, setIsNavigationStarted] = useState(false);
  const [currentLegIndex, setCurrentLegIndex] = useState(0);
  const [routeFinished, setRouteFinished] = useState(false);
  const [infoMessage, setInfoMessage] = useState(null);
  const [showTraffic, setShowTraffic] = useState(true);

  const [selectedDay, setSelectedDay] = useState(
    new Date().toLocaleString("en-US", { weekday: "long" })
  );
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  /* // Helper to get today's day name
  const getTodayDayName = () => {
    const d = new Date();
    const weekday = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return weekday[d.getDay()];
  }; */

  /* // Set initial selected day to today
  useEffect(() => {
    setSelectedDay(getTodayDayName());
  }, []); */

  const addCustomMarkers = useCallback(
    (response, binsToMark, truckToMark, currentMarkerPosition = null) => {
      console.log("addCustomMarkers called. Response present:", !!response);
      if (!googleMapRef.current) {
        console.warn("Skipping marker addition: map not ready.");
        return;
      }

      // Clear existing markers
      markers.current.forEach((marker) => marker.setMap(null));
      markers.current = [];

      const route = response?.routes?.[0];
      const hasRoute = !!route;

      // Add depot marker if a route is displayed or if it's the main truck data
      if (hasRoute || (truckToMark && binsToMark.length > 0)) {
        const depotMarker = new window.google.maps.Marker({
          position: DEPOT_LOCATION,
          map: googleMapRef.current,
          title: "Depot (Start Location)",
          zIndex: window.google.maps.Marker.MAX_ZINDEX + 1,
        });
        markers.current.push(depotMarker);
      }

      // Add bin markers
      console.log("Bins to mark:", binsToMark);
      binsToMark.forEach((bin, index) => {
        const marker = new window.google.maps.Marker({
          position: {
            lat: parseFloat(bin.sb_latitude),
            lng: parseFloat(bin.sb_longitude),
          },
          map: googleMapRef.current,
          title: `Bin ID: ${bin.sb_id}\nPlate: ${bin.sb_plate}\nDay: ${bin.sb_day}`,
          label: {
            text: String(index + 1),
            color: "black",
            fontWeight: "bold",
          },
          zIndex: window.google.maps.Marker.MAX_ZINDEX,
        });
        markers.current.push(marker);
      });

      // Add truck marker
      const truckPos =
        currentMarkerPosition ||
        (truckToMark && truckToMark.t_latitude && truckToMark.t_longitude
          ? {
              lat: parseFloat(truckToMark.t_latitude),
              lng: parseFloat(truckToMark.t_longitude),
            }
          : null);

      if (truckPos) {
        const truckMarker = new window.google.maps.Marker({
          position: truckPos,
          map: googleMapRef.current,
          icon: {
            url: truckToMark.t_id === 1 ? TRUCK_ICONS.blue : TRUCK_ICONS.orange,
            scaledSize: new window.google.maps.Size(50, 30),
          },
          title: `Your Truck: ${truckToMark.plate}`,
          zIndex: window.google.maps.Marker.MAX_ZINDEX + 2,
        });
        markers.current.push(truckMarker);
      }
    },
    []
  );

  // --- Data Fetching for Initial Truck and its Bins ---
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all trucks (which now include their bins and driver info)
        const [trucksRes, binRes] = await Promise.all([
          axios.get("http://localhost:5000/api/trucks"),
          axios.get("http://localhost:5000/api/allsmartbins"),
        ]);
        console.log(
          "DEBUG: trucksRes.data contents (from /api/trucks):",
          trucksRes.data
        );
        const filteredBins = binRes.data
          .filter((bin) =>
            bin.sb_day
              .split(",")
              .map((d) => d.trim().toLowerCase())
              .includes(selectedDay.toLowerCase())
          )
          .map((bin) => ({
            ...bin,
            lat: parseFloat(bin.sb_latitude),
            lng: parseFloat(bin.sb_longitude),
          }));

        const foundTruck = trucksRes.data.find(
          (truck) => parseInt(truck.driver_id) === currentDriverId
        );

        console.log("Found Truck (after filter):", foundTruck);

        if (foundTruck) {
          setDriverTruck(foundTruck);

          // If foundTruck has no bins, try assigning from filteredBins
          const binsForTruck = foundTruck.bins?.length
            ? foundTruck.bins
            : filteredBins.filter((bin) => bin.sb_truck_id === foundTruck.t_id); // Adjust based on your bin structure

          setAssignedBins(binsForTruck);

          if (binsForTruck.length === 0) {
            setInfoMessage("No bins assigned for this truck.");
          }
        } else {
          setError(
            `No truck assigned to driver ID: ${currentDriverId}. Or driver not found.`
          );
          setDriverTruck(null);
          setAssignedBins([]);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching initial data:", err);
        setError("Error fetching driver/truck/bin data. Please check server.");
        setLoading(false);
      }
    };

    if (currentDriverId) {
      fetchInitialData();
    } else {
      setLoading(false);
      setError("No valid driver ID provided to the map component.");
    }
  }, [currentDriverId]);

  // --- Fetch and Display Route for Selected Day ---
  const fetchAndDisplayRoute = useCallback(
    async (day) => {
      setLoading(true);
      setError(null);
      setDirectionsResult(null); // Clear previous route
      markers.current.forEach((marker) => marker.setMap(null)); // Clear previous markers
      markers.current = [];
      setIsNavigationStarted(false); // Reset navigation when new route is fetched
      setCurrentLegIndex(0);
      setRouteFinished(false);

      if (
        !isGoogleApiLoaded ||
        !isMapInstanceReady ||
        !directionsService.current
      ) {
        console.warn("Skipping route fetch: Google API or Map not ready yet.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `http://localhost:5000/api/trucks/route?date=${day}`
        );
        console.log(`Truck Routes for ${day}:`, response.data);

        const truckRouteData = response.data.find(
          (truckData) => parseInt(truckData.driver_id) === currentDriverId
        );

        if (truckRouteData && truckRouteData.bins.length > 0) {
          const binsForRoute = truckRouteData.bins.map((bin) => ({
            lat: parseFloat(bin.sb_latitude),
            lng: parseFloat(bin.sb_longitude),
            sb_id: bin.sb_id,
            sb_plate: bin.sb_plate,
            sb_day: bin.sb_day,
          }));

          // Determine the origin. If the truck has specific coordinates, use them. Otherwise, use DEPOT.
          const origin =
            truckRouteData.t_latitude && truckRouteData.t_longitude
              ? {
                  lat: parseFloat(truckRouteData.t_latitude),
                  lng: parseFloat(truckRouteData.t_longitude),
                }
              : DEPOT_LOCATION;

          const destination = binsForRoute[binsForRoute.length - 1]; // Last bin as destination
          const waypoints = binsForRoute
            .slice(0, -1)
            .map((bin) => ({ location: bin, stopover: true }));

          directionsService.current.route(
            {
              origin: origin,
              destination: destination,
              waypoints: waypoints,
              optimizeWaypoints: true,
              travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
              if (status === "OK" && result) {
                setDirectionsResult(result); // Only this!
                addCustomMarkers(result, binsForRoute, truckRouteData, origin);
                if (googleMapRef.current) {
                  googleMapRef.current.fitBounds(result.routes[0].bounds);
                }
                setInfoMessage(`Displaying route for ${day}.`);
              } else {
                setError(`Directions request failed for ${day}: ${status}`);
                setDirectionsResult(null); // Clear route
                setInfoMessage(`No route found for ${day}.`);
              }
              setLoading(false);
            }
          );
        } else {
          setInfoMessage(`No bins assigned for ${day} for your truck.`);
          setAssignedBins([]);
          setDirectionsResult(null);
          // If no route, still display the truck if it exists
          if (driverTruck) {
            addCustomMarkers(null, [], driverTruck); // Only truck marker
            if (googleMapRef.current) {
              googleMapRef.current.panTo({
                lat: parseFloat(driverTruck.t_latitude),
                lng: parseFloat(driverTruck.t_longitude),
              });
            }
          }
          setLoading(false);
        }
      } catch (err) {
        console.error(`Error fetching truck routes for ${day}:`, err);
        setError(`Error fetching route data for ${day}. Please check server.`);
        setLoading(false);
        setDirectionsResult(null);
      }
    },
    [
      currentDriverId,
      isGoogleApiLoaded,
      isMapInstanceReady,
      driverTruck,
      addCustomMarkers,
    ]
  ); // Added driverTruck, addCustomMarkers to dependencies

  // Effect to call route fetching when selectedDay or API load status changes
  useEffect(() => {
    if (isGoogleApiLoaded && isMapInstanceReady && driverTruck && selectedDay) {
      fetchAndDisplayRoute(selectedDay);
    }
  }, [
    selectedDay,
    isGoogleApiLoaded,
    isMapInstanceReady,
    driverTruck,
    fetchAndDisplayRoute,
  ]);

  // --- Google Maps API Loading & Map Initialization ---
  const onGoogleApiLoadedFromLoadScript = useCallback(() => {
    console.log("Google Maps API script loaded via LoadScript.");
    setIsGoogleApiLoaded(true);
  }, []);

  const onMapLoad = useCallback((map) => {
    googleMapRef.current = map;
    directionsService.current = new window.google.maps.DirectionsService();
    setIsMapInstanceReady(true);
  }, []);

  const onMapUnmount = useCallback(() => {
    markers.current.forEach((marker) => marker.setMap(null));
    markers.current = [];
    googleMapRef.current = null;
    directionsService.current = null;
    setIsGoogleApiLoaded(false);
    setIsMapInstanceReady(false);
    setIsNavigationStarted(false);
    setRouteFinished(false);
    setInfoMessage(null);
    setError(null);
    setDirectionsResult(null); // Clear directions result on unmount
    console.log("Map unmounted and resources cleared.");
  }, []);

  // --- Navigation Controls Logic ---
  const handleStartNavigation = useCallback(() => {
    if (directionsResult && directionsResult.routes.length > 0) {
      setIsNavigationStarted(true);
      setCurrentLegIndex(0);
      setRouteFinished(false);
      setInfoMessage("Navigation started!");

      // Update truck position to the start of the first leg/route origin
      const firstLeg = directionsResult.routes[0].legs[0];
      addCustomMarkers(
        directionsResult,
        assignedBins.filter((bin) => bin.sb_day.includes(selectedDay)),
        driverTruck,
        firstLeg.start_location
      );
      googleMapRef.current.panTo(firstLeg.start_location);
    } else {
      setInfoMessage("No route to start navigation.");
    }
  }, [
    directionsResult,
    assignedBins,
    driverTruck,
    selectedDay,
    addCustomMarkers,
  ]);

  const handleNextLeg = useCallback(() => {
    if (
      directionsResult &&
      directionsResult.routes.length > 0 &&
      currentLegIndex < directionsResult.routes[0].legs.length - 1
    ) {
      const nextIndex = currentLegIndex + 1;
      setCurrentLegIndex(nextIndex);
      const nextLeg = directionsResult.routes[0].legs[nextIndex];

      // Update truck position to the start of the next leg
      addCustomMarkers(
        directionsResult,
        assignedBins.filter((bin) => bin.sb_day.includes(selectedDay)),
        driverTruck,
        nextLeg.start_location
      );
      googleMapRef.current.panTo(nextLeg.start_location);
      setInfoMessage(
        `Moving to next leg: ${nextIndex + 1}/${
          directionsResult.routes[0].legs.length
        }`
      );
    } else if (
      directionsResult &&
      directionsResult.routes.length > 0 &&
      currentLegIndex === directionsResult.routes[0].legs.length - 1
    ) {
      setInfoMessage(
        "You are on the last leg. Click 'Finish Route' to complete."
      );
    } else {
      setInfoMessage("No active navigation.");
    }
  }, [
    directionsResult,
    currentLegIndex,
    assignedBins,
    driverTruck,
    selectedDay,
    addCustomMarkers,
  ]);

  const handlePreviousLeg = useCallback(() => {
    if (currentLegIndex > 0) {
      const prevIndex = currentLegIndex - 1;
      setCurrentLegIndex(prevIndex);
      const prevLeg = directionsResult.routes[0].legs[prevIndex];

      // Update truck position to the start of the previous leg
      addCustomMarkers(
        directionsResult,
        assignedBins.filter((bin) => bin.sb_day.includes(selectedDay)),
        driverTruck,
        prevLeg.start_location
      );
      googleMapRef.current.panTo(prevLeg.start_location);
      setInfoMessage(
        `Moving to previous leg: ${prevIndex + 1}/${
          directionsResult.routes[0].legs.length
        }`
      );
    } else {
      setInfoMessage("You are at the first leg.");
    }
  }, [
    directionsResult,
    currentLegIndex,
    assignedBins,
    driverTruck,
    selectedDay,
    addCustomMarkers,
  ]);

  const handleFinishRoute = useCallback(() => {
    setIsNavigationStarted(false);
    setRouteFinished(true);
    setInfoMessage("Route completed! Great job!");
    // Re-add only the truck marker at its final theoretical position or depot
    if (driverTruck) {
      addCustomMarkers(null, [], driverTruck, {
        lat: parseFloat(driverTruck.t_latitude),
        lng: parseFloat(driverTruck.t_longitude),
      });
      googleMapRef.current.panTo({
        lat: parseFloat(driverTruck.t_latitude),
        lng: parseFloat(driverTruck.t_longitude),
      });
    }
  }, [driverTruck, addCustomMarkers]);

  const handleReroute = useCallback(() => {
    if (
      isNavigationStarted &&
      directionsResult &&
      directionsResult.routes.length > 0
    ) {
      setInfoMessage("Rerouting from current position (simulated).");
      if (
        googleMapRef.current &&
        currentLegIndex < directionsResult.routes[0].legs.length
      ) {
        googleMapRef.current.panTo(
          directionsResult.routes[0].legs[currentLegIndex].start_location
        );
      }
      addCustomMarkers(
        directionsResult,
        assignedBins.filter((bin) => bin.sb_day.includes(selectedDay)),
        driverTruck,
        directionsResult.routes[0].legs[currentLegIndex].start_location
      );
    } else {
      setInfoMessage("No active navigation to reroute.");
    }
  }, [
    isNavigationStarted,
    directionsResult,
    currentLegIndex,
    assignedBins,
    driverTruck,
    selectedDay,
    addCustomMarkers,
  ]);

  // Function to show only the map (remove markers and traffic layer)
  const renderOnlyMap = () => {
    markers.current.forEach((marker) => marker.setMap(null)); // Remove markers
    markers.current = [];
    setShowTraffic(false); // Hide traffic layer
    setInfoMessage("Only map is displayed.");
  };

  // Function to reset and show all elements
  const resetMapDisplay = useCallback(() => {
    setShowTraffic(true); // Show traffic layer
    setInfoMessage(null);
    setIsNavigationStarted(false); // Reset navigation state
    setCurrentLegIndex(0);
    setRouteFinished(false);
    // This will trigger fetchData and fetchAndDisplayRoute to re-render
    if (selectedDay) {
      fetchAndDisplayRoute(selectedDay);
    } else if (driverTruck) {
      // Fallback if no day selected but truck data exists
      addCustomMarkers(null, driverTruck.bins, driverTruck);
      if (googleMapRef.current) {
        googleMapRef.current.panTo({
          lat: parseFloat(driverTruck.t_latitude),
          lng: parseFloat(driverTruck.t_longitude),
        });
      }
    }
  }, [selectedDay, driverTruck, fetchAndDisplayRoute, addCustomMarkers]);

  // Effect to reset navigation if directionsResult or selectedDay changes
  useEffect(() => {
    if (directionsResult || selectedDay) {
      setIsNavigationStarted(false);
      setCurrentLegIndex(0);
      setRouteFinished(false);
    }
  }, [directionsResult, selectedDay]);

  return (
    <LoadScript
      googleMapsApiKey={"AIzaSyDr4f-WIYP4FsWF7RW-ElMHMvrB_nGNRNo"}
      libraries={googleMapsLibraries}
      onLoad={onGoogleApiLoadedFromLoadScript}
    >
      <div className={classes.root}>
        <GridContainer>
          {/* Controls Panel */}
          <GridItem xs={12} sm={6} md={4}>
            <Card>
              <CardHeader color="primary" stats icon>
                <CardIcon color="primary">
                  <Icon>map</Icon>
                </CardIcon>
                <p className={classes.cardCategory}>Driver Map View</p>
                <h3 className={classes.cardTitle}>Route Information</h3>
              </CardHeader>
              <div style={{ padding: "16px" }}>
                {loading && <p>Loading data...</p>}
                {error && <p style={{ color: "red" }}>Error: {error}</p>}
                {infoMessage && (
                  <p
                    style={{
                      color: infoMessage.includes("Error") ? "red" : "blue",
                    }}
                  >
                    {infoMessage}
                  </p>
                )}

                {!loading && !error && (
                  <div>
                    {driverTruck ? (
                      <div>
                        <h4>Truck Details:</h4>
                        <p style={{ fontWeight: "bold", fontSize: "16px" }}>
                          Plate: {driverTruck.t_plate} | Driver:{" "}
                          {driverTruck.driver_name}
                        </p>
                        {/* Day Selection Dropdown - THIS IS ALREADY THERE! */}
                        <FormControl fullWidth style={{ marginBottom: "10px" }}>
                          <InputLabel id="day-select-label">
                            Select Day
                          </InputLabel>
                          <Select
                            labelId="day-select-label"
                            id="day-select"
                            value={
                              selectedDay.includes(",")
                                ? selectedDay.split(",")[0]
                                : selectedDay
                            }
                            onChange={(e) => setSelectedDay(e.target.value)}
                          >
                            {daysOfWeek.map((day) => (
                              <MenuItem key={day} value={day}>
                                {day}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        {/* Navigation Buttons */}
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "10px",
                            marginBottom: "20px",
                          }}
                        >
                          {!isNavigationStarted &&
                            !routeFinished &&
                            directionsResult && (
                              <Button
                                variant="contained"
                                color="primary"
                                onClick={handleStartNavigation}
                                disabled={
                                  !directionsResult ||
                                  directionsResult.routes[0].legs.length === 0
                                }
                              >
                                <FontAwesomeIcon
                                  icon={faArrowRight}
                                  style={{ marginRight: "8px" }}
                                />
                                Start Navigation
                              </Button>
                            )}

                          {isNavigationStarted && !routeFinished && (
                            <>
                              <Button
                                variant="contained"
                                color="default"
                                onClick={handlePreviousLeg}
                                disabled={currentLegIndex === 0}
                              >
                                <FontAwesomeIcon
                                  icon={faArrowLeft}
                                  style={{ marginRight: "8px" }}
                                />
                                Previous Leg
                              </Button>
                              <Button
                                variant="contained"
                                color="info"
                                onClick={handleNextLeg}
                                disabled={
                                  currentLegIndex ===
                                  (directionsResult?.routes[0]?.legs?.length ||
                                    0) -
                                    1
                                }
                              >
                                <FontAwesomeIcon
                                  icon={faArrowRight}
                                  style={{ marginRight: "8px" }}
                                />
                                Next Leg
                              </Button>
                              <Button
                                variant="contained"
                                color="secondary"
                                onClick={handleReroute}
                              >
                                <FontAwesomeIcon
                                  icon={faRedo}
                                  style={{ marginRight: "8px" }}
                                />
                                Reroute
                              </Button>
                              <Button
                                variant="contained"
                                color="success"
                                onClick={handleFinishRoute}
                                disabled={
                                  currentLegIndex !==
                                  (directionsResult?.routes[0]?.legs?.length ||
                                    0) -
                                    1
                                }
                              >
                                <FontAwesomeIcon
                                  icon={faCheck}
                                  style={{ marginRight: "8px" }}
                                />
                                Finish Route
                              </Button>
                            </>
                          )}

                          {routeFinished && (
                            <p style={{ color: "green", fontWeight: "bold" }}>
                              Route Completed!
                            </p>
                          )}
                        </div>

                        <h4>Assigned Bins for {selectedDay}:</h4>
                        {assignedBins.length > 0 ? (
                          <ul>
                            {assignedBins
                              .filter((bin) => bin.sb_day.includes(selectedDay))
                              .map((bin, index) => (
                                <li
                                  key={bin.sb_id}
                                  style={{
                                    fontWeight:
                                      isNavigationStarted &&
                                      currentLegIndex === index
                                        ? "bold"
                                        : "normal",
                                    color:
                                      isNavigationStarted &&
                                      currentLegIndex === index
                                        ? "green"
                                        : "inherit",
                                  }}
                                >
                                  Bin {index + 1}: {bin.sb_plate} (Lat:{" "}
                                  {bin.sb_latitude}, Lng: {bin.sb_longitude})
                                </li>
                              ))}
                          </ul>
                        ) : (
                          <p>No bins assigned for {selectedDay}.</p>
                        )}
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={renderOnlyMap}
                          style={{ marginRight: "10px" }}
                        >
                          Show Only Map
                        </Button>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={resetMapDisplay}
                        >
                          Reset Map View
                        </Button>
                      </div>
                    ) : (
                      <p>
                        Please log in as a driver or ensure a truck is assigned
                        to your ID.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </GridItem>

          {/* Map Panel */}
          <GridItem xs={12} sm={6} md={8}>
            <div style={MAP_PANEL_STYLE}>
              {isGoogleApiLoaded && (
                <GoogleMap
                  mapContainerStyle={MAP_CONTAINER_STYLE}
                  center={
                    driverTruck?.t_latitude &&
                    driverTruck?.t_longitude &&
                    !isNavigationStarted
                      ? {
                          lat: parseFloat(driverTruck.t_latitude),
                          lng: parseFloat(driverTruck.t_longitude),
                        }
                      : DEPOT_LOCATION
                  }
                  zoom={DEFAULT_ZOOM}
                  onLoad={onMapLoad}
                  onUnmount={onMapUnmount}
                  options={{
                    zoomControl: true,
                    mapTypeControl: true,
                    scaleControl: true,
                    streetViewControl: true,
                    rotateControl: true,
                    fullscreenControl: true,
                  }}
                >
                  {/* Traffic Layer */}
                  {isMapInstanceReady && showTraffic && (
                    <TrafficLayer autoRefresh={true} />
                  )}
                  {directionsResult && isMapInstanceReady && (
                    <DirectionsRenderer
                      directions={directionsResult}
                      options={{ suppressMarkers: true }}
                    />
                  )}
                </GoogleMap>
              )}
            </div>
          </GridItem>
        </GridContainer>
      </div>
    </LoadScript>
  );
};
export default DriverMaps;
