import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  LoadScript,
  Marker,
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
  height: "72vh",
  marginBottom: "0",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  backgroundColor: "black",
};

const MAP_PANEL_STYLE = {
  flexGrow: 1,
  height: "100%",
};

const DEFAULT_ZOOM = 14;
const DEPOT_LOCATION = { lat: 1.4234, lng: 103.6312 }; // depot location

const TRUCK_ICONS = {
  blue: truckblue,
  orange: truckgreen,
};

const BIN_ICONS = {
  Exist: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
  Deleted: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
};

const googleMapsLibraries = ["geometry", "places", "marker"];

const DriverMaps = () => {
  const classes = useStyles();
  const currentDriverId = parseInt(localStorage.getItem("userId")); // Assuming userId is stored in localStorage
  const googleMapRef = useRef(null);
  const directionsService = useRef(null);

  const [isMapInstanceReady, setIsMapInstanceReady] = useState(false);
  const [driverTruck, setDriverTruck] = useState(null);
  const [assignedBins, setAssignedBins] = useState([]); // Bins for the selected day
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGoogleApiLoaded, setIsGoogleApiLoaded] = useState(false);
  const [directionsResult, setDirectionsResult] = useState(null); // Keep this for actual route display
  const [truckPosition, setTruckPosition] = useState(null);

  // Navigation states
  const [isNavigationStarted, setIsNavigationStarted] = useState(false);
  const [currentLegIndex, setCurrentLegIndex] = useState(0);
  const [routeFinished, setRouteFinished] = useState(false);
  const [infoMessage, setInfoMessage] = useState(null);
  const [showTraffic] = useState(true);
  const [currentLegSteps, setCurrentLegSteps] = useState([]);
  const [totalDistance, setTotalDistance] = useState(null);
  const [totalDuration, setTotalDuration] = useState(null);

  const [selectedDay, setSelectedDay] = useState(
    new Date().toLocaleString("en-US", { weekday: "long" })
  );
  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  // Check if current day is weekend
  const isWeekend = selectedDay === "Saturday" || selectedDay === "Sunday";
  const isCurrentDayWeekend =
    new Date().toLocaleString("en-US", { weekday: "long" }) === "Saturday" ||
    new Date().toLocaleString("en-US", { weekday: "long" }) === "Sunday";
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

          if (foundTruck.t_latitude && foundTruck.t_longitude) {
            setTruckPosition({
              lat: parseFloat(foundTruck.t_latitude),
              lng: parseFloat(foundTruck.t_longitude),
            });
          }

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
      setIsNavigationStarted(false); // Reset navigation when new route is fetched
      setCurrentLegIndex(0);
      setRouteFinished(false);

      // Prevent fetching routes for weekend days
      if (day === "Saturday" || day === "Sunday") {
        setInfoMessage(`It's the weekend. No routes to display for ${day}.`);
        setAssignedBins([]);
        setDirectionsResult(null);
        setLoading(false);
        return; // Exit early
      }

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
          setAssignedBins(truckRouteData.bins);
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

          // Last bin is a waypoint, final destination is the Depot
          const destination = DEPOT_LOCATION;
          const waypoints = binsForRoute.map((bin) => ({
            location: bin,
            stopover: true,
          }));

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

                // Calculate total distance and duration
                let distance = 0;
                let duration = 0;
                result.routes[0].legs.forEach((leg) => {
                  distance += leg.distance.value;
                  duration += leg.duration.value;
                });
                setTotalDistance((distance / 1000).toFixed(2)); // convert to km
                setTotalDuration(Math.round(duration / 60)); // convert to minutes

                // Pre-load the first leg's steps to show before navigation starts
                if (result.routes[0]?.legs?.[0]?.steps) {
                  setCurrentLegSteps(result.routes[0].legs[0].steps);
                }

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
          setTotalDistance(null);
          setTotalDuration(null);
          // If no route, still display the truck if it exists
          if (driverTruck) {
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
    [currentDriverId, isGoogleApiLoaded, isMapInstanceReady, driverTruck]
  ); // Added driverTruck to dependencies

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
      const startPosition = firstLeg.start_location.toJSON();
      setTruckPosition(startPosition);
      setCurrentLegSteps(firstLeg.steps);
      if (googleMapRef.current) {
        googleMapRef.current.panTo(startPosition);
      }
    } else {
      setInfoMessage("No route to start navigation.");
    }
  }, [directionsResult]);

  const handleNextLeg = useCallback(() => {
    if (
      directionsResult &&
      directionsResult.routes.length > 0 &&
      currentLegIndex < directionsResult.routes[0].legs.length - 1
    ) {
      const nextIndex = currentLegIndex + 1;
      setCurrentLegIndex(nextIndex);
      const nextLeg = directionsResult.routes[0].legs[nextIndex];
      const nextPosition = nextLeg.start_location.toJSON();
      setTruckPosition(nextPosition);
      setCurrentLegSteps(nextLeg.steps);

      // Update truck position to the start of the next leg
      if (googleMapRef.current) {
        googleMapRef.current.panTo(nextPosition);
      }
      setInfoMessage(
        `Moving to next stop: ${nextIndex + 1}/${
          directionsResult.routes[0].legs.length
        }`
      );
    } else if (
      directionsResult &&
      directionsResult.routes.length > 0 &&
      currentLegIndex === directionsResult.routes[0].legs.length - 1
    ) {
      setInfoMessage(
        "You are on the last destination. Click 'Finish Route' to complete."
      );
    } else {
      setInfoMessage("No active navigation.");
    }
  }, [directionsResult, currentLegIndex]);

  const handlePreviousLeg = useCallback(() => {
    if (currentLegIndex > 0) {
      const prevIndex = currentLegIndex - 1;
      setCurrentLegIndex(prevIndex);
      const prevLeg = directionsResult.routes[0].legs[prevIndex];
      const prevPosition = prevLeg.start_location.toJSON();
      setTruckPosition(prevPosition);
      setCurrentLegSteps(prevLeg.steps);

      // Update truck position to the start of the previous leg
      if (googleMapRef.current) {
        googleMapRef.current.panTo(prevPosition);
      }
      setInfoMessage(
        `Moving to previous stop: ${prevIndex + 1}/${
          directionsResult.routes[0].legs.length
        }`
      );
    } else {
      setInfoMessage("You are at the first leg.");
    }
  }, [directionsResult, currentLegIndex]);

  const handleFinishRoute = useCallback(() => {
    setIsNavigationStarted(false);
    setRouteFinished(true);
    setInfoMessage("Route completed! Great job!");

    if (driverTruck && directionsResult) {
      const legs = directionsResult.routes[0].legs;
      const finalPosition = legs[legs.length - 1].end_location.toJSON();
      setTruckPosition(finalPosition);
      if (googleMapRef.current) {
        googleMapRef.current.panTo(finalPosition);
      }
    }
  }, [driverTruck, directionsResult]);

  const handleReroute = useCallback(() => {
    if (
      !isNavigationStarted ||
      !truckPosition ||
      !directionsResult ||
      currentLegIndex >= directionsResult.routes[0].legs.length
    ) {
      setInfoMessage("Cannot reroute without an active destination.");
      return;
    }

    setLoading(true);
    setInfoMessage("Finding a better path to the next stop...");

    const currentLeg = directionsResult.routes[0].legs[currentLegIndex];
    const destination = currentLeg.end_location;

    directionsService.current.route(
      {
        origin: truckPosition,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: window.google.maps.TrafficModel.BEST_GUESS,
        },
      },
      (result, status) => {
        setLoading(false);
        if (status === "OK" && result) {
          const newLeg = result.routes[0].legs[0];

          // Update the specific leg in the directions result
          const updatedLegs = [...directionsResult.routes[0].legs];
          updatedLegs[currentLegIndex] = newLeg;

          const updatedResult = { ...directionsResult };
          updatedResult.routes[0].legs = updatedLegs;
          setDirectionsResult(updatedResult);

          // Update turn-by-turn steps for the new leg
          setCurrentLegSteps(newLeg.steps || []);

          // Recalculate total distance and duration
          let newTotalDistance = 0;
          let newTotalDuration = 0;
          updatedLegs.forEach((leg) => {
            newTotalDistance += leg.distance.value;
            newTotalDuration += leg.duration.value;
          });
          setTotalDistance((newTotalDistance / 1000).toFixed(2));
          setTotalDuration(Math.round(newTotalDuration / 60));

          setInfoMessage(
            "Found a faster route to your next stop based on current conditions."
          );
        } else {
          setError(`Rerouting failed: ${status}. Please try again.`);
        }
      }
    );
  }, [isNavigationStarted, truckPosition, directionsResult, currentLegIndex]);

  // Effect to reset navigation when the selected day changes
  useEffect(() => {
    setIsNavigationStarted(false);
    setCurrentLegIndex(0);
    setRouteFinished(false);
    setCurrentLegSteps([]);
  }, [selectedDay]);

  return (
    <LoadScript
      googleMapsApiKey={"AIzaSyDr4f-WIYP4FsWF7RW-ElMHMvrB_nGNRNo"}
      libraries={googleMapsLibraries}
      onLoad={onGoogleApiLoadedFromLoadScript}
    >
      <div className={classes.root}>
        <GridContainer>
          <GridItem xs={12}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 16px",
                background: "#fff",
                borderRadius: "8px",
                marginBottom: "16px",
                border: "1px solid #e0e0e0",
              }}
            >
              {driverTruck && (
                <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                  Plate: {driverTruck.t_plate} | Driver:{" "}
                  {driverTruck.driver_name}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <FormControl style={{ minWidth: 150 }}>
                  <InputLabel id="day-select-label">Select Day</InputLabel>
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
              </div>
            </div>
          </GridItem>
        </GridContainer>

        <GridContainer>
          {/* Controls Panel */}
          <GridItem xs={12} sm={6} md={4}>
            <Card style={{ height: "100%", marginBottom: "0" }}>
              <CardHeader color="primary" stats icon>
                <CardIcon color="primary">
                  <Icon>map</Icon>
                </CardIcon>
                <p className={classes.cardCategory}>Driver Map View</p>
                <h3 className={classes.cardTitle}>Route Information</h3>
              </CardHeader>
              <div
                style={{
                  height: "55vh",
                  overflowY: "auto",
                  padding: "16px",
                }}
              >
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

                {/* ETA and Distance Display */}
                {directionsResult && (
                  <div
                    style={{
                      margin: "16px 0",
                      padding: "12px",
                      background: "#f8f9fa",
                      border: "1px solid #dee2e6",
                      borderRadius: "8px",
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: "bold" }}>
                      Total Trip: {totalDistance} km, Approx. {totalDuration}{" "}
                      mins
                    </p>
                    {isNavigationStarted && (
                      <p style={{ marginTop: "8px", marginBottom: 0 }}>
                        To Next Stop:{" "}
                        {
                          directionsResult.routes[0].legs[currentLegIndex]
                            .distance.text
                        }{" "}
                        (
                        {
                          directionsResult.routes[0].legs[currentLegIndex]
                            .duration.text
                        }
                        )
                      </p>
                    )}
                  </div>
                )}

                {/* Current/Next Bin Display */}
                {isNavigationStarted && assignedBins.length > 0 && (
                  <div
                    style={{
                      margin: "16px 0",
                      padding: "12px",
                      background: "#e8f4fd",
                      border: "1px solid #d1eaff",
                      borderRadius: "8px",
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: "bold" }}>
                      Current Stop:{" "}
                      {currentLegIndex < assignedBins.length
                        ? `Bin at ${assignedBins[currentLegIndex]?.sb_plate}`
                        : "Return to Depot"}
                    </p>
                    {directionsResult &&
                      currentLegIndex <
                        directionsResult.routes[0].legs.length - 1 && (
                        <p style={{ marginTop: "8px", marginBottom: 0 }}>
                          Next Stop:{" "}
                          {currentLegIndex + 1 < assignedBins.length
                            ? `Bin at ${
                                assignedBins[currentLegIndex + 1]?.sb_plate
                              }`
                            : "Return to Depot"}
                        </p>
                      )}
                  </div>
                )}

                {!loading && !error && (
                  <div>
                    {driverTruck ? (
                      <div>
                        {/* Weekend Message */}
                        {isWeekend && (
                          <div
                            style={{
                              backgroundColor: "#fff3cd",
                              border: "1px solid #ffeaa7",
                              borderRadius: "8px",
                              padding: "12px",
                              marginBottom: "15px",
                            }}
                          >
                            <p
                              style={{
                                color: "#856404",
                                margin: "0",
                                fontWeight: "bold",
                                fontSize: "14px",
                              }}
                            >
                              🏖️ No work today - It&apos;s the weekend!
                            </p>
                            <p
                              style={{
                                color: "#856404",
                                margin: "5px 0 0 0",
                                fontSize: "12px",
                              }}
                            >
                              You can view Monday&apos;s work schedule below.
                            </p>
                          </div>
                        )}

                        {/* Day Selection Dropdown */}
                        <FormControl
                          fullWidth
                          style={{ marginBottom: "10px", display: "none" }}
                        >
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

                        {/* Quick Monday View Button for Weekends */}
                        {isCurrentDayWeekend && (
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() => setSelectedDay("Monday")}
                            style={{
                              marginBottom: "15px",
                              backgroundColor: "#28a745",
                              color: "white",
                              display: "none",
                            }}
                          >
                            📅 View Monday&apos;s Schedule
                          </Button>
                        )}

                        {/* Navigation Buttons */}
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "10px",
                            marginBottom: "20px",
                          }}
                        >
                          {isWeekend ? (
                            <div
                              style={{
                                backgroundColor: "#f8f9fa",
                                border: "1px solid #dee2e6",
                                borderRadius: "8px",
                                padding: "12px",
                                width: "100%",
                              }}
                            >
                              <p
                                style={{
                                  color: "#6c757d",
                                  margin: "0",
                                  fontStyle: "italic",
                                  textAlign: "center",
                                }}
                              >
                                🚫 Navigation disabled - No work on weekends
                              </p>
                            </div>
                          ) : (
                            <>
                              {!isNavigationStarted &&
                                !routeFinished &&
                                directionsResult && (
                                  <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleStartNavigation}
                                    disabled={
                                      !directionsResult ||
                                      directionsResult.routes[0].legs.length ===
                                        0
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
                                  </Button>
                                  <Button
                                    variant="contained"
                                    color="info"
                                    onClick={handleNextLeg}
                                    disabled={
                                      currentLegIndex ===
                                      (directionsResult?.routes[0]?.legs
                                        ?.length || 0) -
                                        1
                                    }
                                  >
                                    <FontAwesomeIcon
                                      icon={faArrowRight}
                                      style={{ marginRight: "8px" }}
                                    />
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
                                  </Button>
                                  <Button
                                    variant="contained"
                                    color="success"
                                    onClick={handleFinishRoute}
                                    disabled={
                                      currentLegIndex !==
                                      (directionsResult?.routes[0]?.legs
                                        ?.length || 0) -
                                        1
                                    }
                                  >
                                    <FontAwesomeIcon
                                      icon={faCheck}
                                      style={{ marginRight: "8px" }}
                                    />
                                  </Button>
                                </>
                              )}

                              {routeFinished && (
                                <p
                                  style={{ color: "green", fontWeight: "bold" }}
                                >
                                  Route Completed!
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        {/* Assigned Bins List (only when not navigating) */}
                        {!isNavigationStarted && (
                          <>
                            <h4>Assigned Bins for {selectedDay}:</h4>
                            {isWeekend ? (
                              <div
                                style={{
                                  backgroundColor: "#f8f9fa",
                                  border: "1px solid #dee2e6",
                                  borderRadius: "8px",
                                  padding: "12px",
                                  marginBottom: "15px",
                                }}
                              >
                                <p
                                  style={{
                                    color: "#6c757d",
                                    margin: "0",
                                    fontStyle: "italic",
                                  }}
                                >
                                  {selectedDay === "Saturday" ||
                                  selectedDay === "Sunday"
                                    ? "No bins assigned for weekends. Enjoy your day off! 🏖️"
                                    : "No bins assigned for this day."}
                                </p>
                              </div>
                            ) : assignedBins.length > 0 ? (
                              <ul>
                                {assignedBins
                                  .filter((bin) =>
                                    bin.sb_day.includes(selectedDay)
                                  )
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
                                      Bin {index + 1}: {bin.sb_plate}
                                    </li>
                                  ))}
                              </ul>
                            ) : (
                              <p>No bins assigned for {selectedDay}.</p>
                            )}
                          </>
                        )}

                        {/* Turn-by-turn directions */}
                        {directionsResult && currentLegSteps.length > 0 && (
                          <div>
                            <h4 style={{ marginTop: "20px" }}>
                              Directions for{" "}
                              {isNavigationStarted
                                ? `Destination ${currentLegIndex + 1}`
                                : "the First Destination"}
                              :
                            </h4>
                            <ul
                              style={{
                                listStyleType: "none",
                                paddingLeft: 0,
                                maxHeight: "200px",
                                overflowY: "auto",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                              }}
                            >
                              {currentLegSteps.map((step, index) => (
                                <li
                                  key={index}
                                  style={{
                                    padding: "8px",
                                    borderBottom: "1px solid #eee",
                                  }}
                                  dangerouslySetInnerHTML={{
                                    __html: step.instructions,
                                  }}
                                />
                              ))}
                            </ul>
                          </div>
                        )}
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
          <GridItem xs={12} sm={6} md={8} style={{ marginBottom: "0" }}>
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
                  mapId="edc944c8707a168748a4e7fc"
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

                  {/* Directions Renderer */}
                  {directionsResult && isMapInstanceReady && (
                    <DirectionsRenderer
                      directions={directionsResult}
                      options={{ suppressMarkers: true }}
                    />
                  )}

                  {/* Depot Marker */}
                  <Marker
                    position={DEPOT_LOCATION}
                    title="Depot (Start Location)"
                    icon={{
                      url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                      scaledSize: new window.google.maps.Size(32, 32),
                    }}
                  />

                  {/* Truck Marker */}
                  {truckPosition && driverTruck && (
                    <Marker
                      position={truckPosition}
                      title={`Your Truck: ${driverTruck.t_plate}`}
                      icon={{
                        url:
                          driverTruck.t_id === 1
                            ? TRUCK_ICONS.blue
                            : TRUCK_ICONS.orange,
                        scaledSize: new window.google.maps.Size(50, 30),
                      }}
                      zIndex={999}
                    />
                  )}

                  {/* Bin Markers */}
                  {assignedBins
                    .filter((bin) => bin.sb_day.includes(selectedDay))
                    .map((bin, index) => (
                      <Marker
                        key={bin.sb_id}
                        position={{
                          lat: parseFloat(bin.sb_latitude),
                          lng: parseFloat(bin.sb_longitude),
                        }}
                        title={`Bin ID: ${bin.sb_id}\nPlate: ${bin.sb_plate}\nDay: ${bin.sb_day}`}
                        label={{
                          text: String(index + 1),
                          color: "black",
                          fontWeight: "bold",
                        }}
                        icon={{
                          url:
                            bin.sb_status === "Exist"
                              ? BIN_ICONS.Exist
                              : BIN_ICONS.Deleted,
                          scaledSize: new window.google.maps.Size(32, 32),
                        }}
                      />
                    ))}
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
