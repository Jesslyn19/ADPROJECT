import React, { useEffect, useState, useRef, useCallback } from "react";
import { LoadScript, GoogleMap, TrafficLayer } from "@react-google-maps/api";
import { Button } from "@material-ui/core";
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
  faTrafficLight,
} from "@fortawesome/free-solid-svg-icons";

import styles from "assets/jss/material-dashboard-react/views/dashboardStyle.js";
import { red } from "@material-ui/core/colors";
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

const DEFAULT_ZOOM = 18;
const DEPOT_LOCATION = { lat: 1.4234, lng: 103.6312 }; // Your depot location

const TRUCK_ICONS = {
  blue: truckblue,
  orange: truckgreen,
};

const googleMapsLibraries = ["geometry", "places", "marker"];

const DriverMaps = () => {
  const classes = useStyles();
  const currentDriverId = parseInt(localStorage.getItem("userId"));
  const googleMapRef = useRef(null);
  const directionsService = useRef(null);
  const directionsRenderer = useRef(null);
  const markers = useRef([]);

  const [isMapInstanceReady, setIsMapInstanceReady] = useState(false);
  const [driverTruck, setDriverTruck] = useState(null);
  const [assignedBins, setAssignedBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGoogleApiLoaded, setIsGoogleApiLoaded] = useState(false);
  const [directionsResult, setDirectionsResult] = useState(() => {
    try {
      const savedDirections = sessionStorage.getItem("directionsResult");
      return savedDirections ? JSON.parse(savedDirections) : null;
    } catch (e) {
      console.error("Failed to parse directionsResult from sessionStorage", e);
      return null;
    }
  });

  const [currentLegIndex, setCurrentLegIndex] = useState(() => {
    const savedLegIndex = sessionStorage.getItem("currentLegIndex");
    return savedLegIndex ? parseInt(savedLegIndex, 10) : 0;
  });

  const [isNavigationStarted, setIsNavigationStarted] = useState(() => {
    const savedNavigationStarted = sessionStorage.getItem(
      "isNavigationStarted"
    );
    return savedNavigationStarted === "true";
  });

  const [routeFinished, setRouteFinished] = useState(() => {
    const savedRouteFinished = sessionStorage.getItem("routeFinished");
    return savedRouteFinished === "true"; // Convert string to boolean
  });

  const [infoMessage, setInfoMessage] = useState(
    () => sessionStorage.getItem("infoMessage") || null
  );

  const [initialStateLoaded, setInitialStateLoaded] = useState(false);

  const [showTraffic, setShowTraffic] = useState(true);

  // Add custom markers for depot, bins, and current truck position
  const addCustomMarkers = useCallback(
    (response) => {
      console.log("addCustomMarkers called. Response present:", !!response);
      if (!googleMapRef.current || !response) {
        console.warn("Skipping marker addition: map or response not ready.");
        return;
      }

      markers.current.forEach((marker) => marker.setMap(null));
      markers.current = [];

      const route = response.routes[0];
      if (!route || !route.legs) {
        console.warn(
          "No route or legs found in directions response for markers."
        );
        return;
      }

      // Only add depot marker if we are dealing with the full navigation, not just two bins
      // or if there are more than 2 bins, implying a larger route context
      if (isNavigationStarted || assignedBins.length > 2) {
        const depotMarker = new window.google.maps.Marker({
          position: DEPOT_LOCATION,
          map: googleMapRef.current,
          // icon: { scaledSize: new window.google.maps.Size(32, 32) }, // Add appropriate icon if needed
          title: "Depot (Start Location)",
        });
        markers.current.push(depotMarker);
      }

      assignedBins.forEach((bin, index) => {
        const marker = new window.google.maps.Marker({
          position: { lat: bin.sb_latitude, lng: bin.sb_longitude },
          map: googleMapRef.current,
          // icon: { scaledSize: new window.google.maps.Size(32, 32) }, // Add appropriate icon if needed
          title: `Bin ID: ${bin.sb_id}\nStatus: ${bin.sb_status}\n`,
          label: {
            text: String(index + 1),
            color: "white",
            fontWeight: "bold",
          },
        });
        markers.current.push(marker);
      });

      if (driverTruck) {
        const truckPosition =
          driverTruck.t_latitude && driverTruck.t_longitude
            ? { lat: driverTruck.t_latitude, lng: driverTruck.t_longitude }
            : route.legs[currentLegIndex]?.start_location || DEPOT_LOCATION; // Fallback to current leg start or depot

        const truckMarker = new window.google.maps.Marker({
          position: truckPosition,
          map: googleMapRef.current,
          icon: {
            url: driverTruck.t_id === 1 ? TRUCK_ICONS.blue : TRUCK_ICONS.orange,
            scaledSize: new window.google.maps.Size(50, 30),
          },
          title: `Your Truck: ${driverTruck.t_plate}`,
          zIndex: window.google.maps.Marker.MAX_ZINDEX + 2,
        });
        markers.current.push(truckMarker);
      }
    },
    [assignedBins, currentLegIndex, driverTruck, isNavigationStarted] // Removed directionsResult as it was redundant for marker logic
  );

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [trucksRes, smartbinsRes] = await Promise.all([
          axios.get("http://localhost:5000/api/trucks"),
          axios.get("http://localhost:5000/api/smartbins"),
        ]);

        console.log(
          "DEBUG: trucksRes.data contents (from /api/trucks):",
          trucksRes.data
        );
        console.log("DEBUG: smartbinsRes.data contents:", smartbinsRes.data);
        console.log("DEBUG: currentDriverId value:", currentDriverId);

        const foundTruck = trucksRes.data.find(
          (truck) => parseInt(truck.driver_id) === currentDriverId
        );

        console.log("Found Truck (after filter):", foundTruck);

        if (foundTruck) {
          setDriverTruck(foundTruck);
          const binsForTruck = smartbinsRes.data.filter(
            (bin) => bin.t_id === foundTruck.t_id
          );

          setAssignedBins(binsForTruck);
          console.log("Assigned Bins for truck:", binsForTruck);
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
        console.error("Error fetching data:", err);
        setError("Error fetching driver/truck/bin data. Please check server.");
        setLoading(false);
      }
    };

    if (currentDriverId) {
      fetchData();
    } else {
      setLoading(false);
      setError("No valid driver ID provided to the map component.");
    }
  }, [currentDriverId]);

  // --- Persist state to sessionStorage ---
  useEffect(() => {
    sessionStorage.setItem("isNavigationStarted", isNavigationStarted);
    sessionStorage.setItem("currentLegIndex", currentLegIndex);
    sessionStorage.setItem("routeFinished", routeFinished);
    if (infoMessage) {
      sessionStorage.setItem("infoMessage", infoMessage);
    } else {
      sessionStorage.removeItem("infoMessage");
    }
    if (directionsResult) {
      try {
        // We can't store the full directionsResult object directly due to circular references/complex LatLng objects.
        // Instead, store a flag indicating it exists. When restoring, we'll re-calculate if needed.
        sessionStorage.setItem("hasDirectionsResult", "true");
      } catch (e) {
        console.warn(
          "Could not save directionsResult flag to sessionStorage:",
          e
        );
        sessionStorage.removeItem("hasDirectionsResult");
      }
    } else {
      sessionStorage.removeItem("hasDirectionsResult");
    }
  }, [
    isNavigationStarted,
    currentLegIndex,
    routeFinished,
    infoMessage,
    directionsResult,
  ]);

  // --- Google Maps API Loading & Map Initialization ---
  const onGoogleApiLoadedFromLoadScript = useCallback(() => {
    console.log("Google Maps API script loaded via LoadScript.");
    setIsGoogleApiLoaded(true);
  }, []);

  const onMapLoad = useCallback((map) => {
    googleMapRef.current = map;
    console.log(
      "GoogleMap component loaded. Map instance:",
      googleMapRef.current
    );

    directionsService.current = new window.google.maps.DirectionsService();
    directionsRenderer.current = new window.google.maps.DirectionsRenderer({
      map: googleMapRef.current,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#4285F4",
        strokeOpacity: 0.8,
        strokeWeight: 6,
      },
    });
    console.log("Directions Service and Renderer initialized.");
    setIsMapInstanceReady(true);
  }, []);

  const onMapUnmount = useCallback(() => {
    if (directionsRenderer.current) {
      directionsRenderer.current.setMap(null);
    }
    markers.current.forEach((marker) => marker.setMap(null));
    markers.current = [];
    googleMapRef.current = null;
    directionsService.current = null;
    directionsRenderer.current = null;
    setIsGoogleApiLoaded(false);
    setIsMapInstanceReady(false);
    setIsNavigationStarted(false);
    setRouteFinished(false);
    setInfoMessage(null);
    setError(null);
    console.log("Map unmounted and resources cleared.");
  }, []);

  const calculateAndDisplayRoute = useCallback(
    (
      forceRecalculate = false,
      isReroutingParam = false,
      showTwoBinsOnly = false
    ) => {
      console.log("calculateAndDisplayRoute called. Current state:", {
        isGoogleApiLoaded,
        driverTruck,
        assignedBinsLength: assignedBins.length,
        isMapInstanceReady,
        directionsServiceReady: !!directionsService.current,
        directionsRendererReady: !!directionsRenderer.current,
        isNavigationStarted,
        directionsResultPresent: !!directionsResult,
        routeFinished,
        forceRecalculate,
        isReroutingParam,
        showTwoBinsOnly,
      });

      if (
        !isGoogleApiLoaded ||
        !isMapInstanceReady ||
        !directionsService.current ||
        !directionsRenderer.current
      ) {
        console.warn(
          "Skipping route calculation: Google API or Map not ready."
        );
        return;
      }

      if (routeFinished) {
        console.log("Route finished, not recalculating.");
        return;
      }

      if (
        isNavigationStarted &&
        directionsResult &&
        !forceRecalculate &&
        !isReroutingParam &&
        !showTwoBinsOnly
      ) {
        console.log(
          "Navigation active and directionsResult exists. Re-rendering existing route."
        );
        directionsRenderer.current.setDirections(directionsResult);
        addCustomMarkers(directionsResult);
        if (googleMapRef.current && directionsResult.routes[0]) {
          const targetLocation =
            (directionsResult?.routes[0]?.legs[currentLegIndex]?.start_location
              ? { lat: driverTruck.t_latitude, lng: driverTruck.t_longitude }
              : directionsResult.routes[0].legs[currentLegIndex]
                  ?.start_location) || DEPOT_LOCATION;
          googleMapRef.current.panTo(targetLocation);
        }
        return;
      }

      // Handle case for "showing two bins" or "no bins assigned"
      if (!isNavigationStarted || assignedBins.length === 0) {
        if (directionsRenderer.current) {
          directionsRenderer.current.setDirections({ routes: [] });
        }
        markers.current.forEach((marker) => marker.setMap(null));
        markers.current = [];
        setDirectionsResult(null);
        setCurrentLegIndex(0);

        if (
          !isNavigationStarted &&
          assignedBins.length >= 2 &&
          showTwoBinsOnly
        ) {
          console.log("Showing initial two bins only.");
          const bin1 = assignedBins[0];
          const bin2 = assignedBins[1];

          const origin = { lat: bin1.sb_latitude, lng: bin1.sb_longitude };
          const destination = { lat: bin2.sb_latitude, lng: bin2.sb_longitude };
          const waypoints = [];

          directionsService.current.route(
            {
              origin: origin,
              destination: destination,
              waypoints: waypoints,
              optimizeWaypoints: false,
              travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (response, status) => {
              console.log("Two Bins Route Service Response Status:", status);
              if (status === "OK" && response) {
                console.log("Two Bins Route successful. Response:", response);
                directionsRenderer.current.setDirections(response);
                setDirectionsResult(response);
                setError(null);
                addCustomMarkers(response);
                if (googleMapRef.current) {
                  googleMapRef.current.fitBounds(response.routes[0].bounds);
                }
              } else {
                setError(`Directions request failed for two bins: ${status}`);
                console.error(
                  "Directions request failed for two bins:",
                  status,
                  response
                );
                setDirectionsResult(null);
                directionsRenderer.current.setDirections({ routes: [] });
              }
            }
          );
          return;
        }

        console.warn(
          "Skipping full route calculation: navigation not started or no bins assigned."
        );
        return;
      }

      markers.current.forEach((marker) => marker.setMap(null));
      markers.current = [];

      let originForCalculation;
      let waypointsForCalculation = [];
      let destinationForCalculation;

      if (isReroutingParam) {
        originForCalculation =
          driverTruck?.t_latitude && driverTruck?.t_longitude
            ? { lat: driverTruck.t_latitude, lng: driverTruck.t_longitude }
            : directionsResult?.routes[0]?.legs[currentLegIndex]
                ?.start_location || DEPOT_LOCATION;

        const remainingBins = assignedBins.slice(currentLegIndex);

        if (remainingBins.length === 0) {
          destinationForCalculation = DEPOT_LOCATION;
          setInfoMessage("All bins visited. Rerouting to depot.");
          setRouteFinished(true);
          setIsNavigationStarted(false);
          if (directionsRenderer.current) {
            directionsRenderer.current.setDirections({ routes: [] });
          }
          addCustomMarkers(null);
          return;
        } else if (remainingBins.length === 1) {
          destinationForCalculation = {
            lat: remainingBins[0].sb_latitude,
            lng: remainingBins[0].sb_longitude,
          };
        } else {
          waypointsForCalculation = remainingBins.slice(0, -1).map((bin) => ({
            location: { lat: bin.sb_latitude, lng: bin.sb_longitude },
            stopover: true,
          }));
          destinationForCalculation = {
            lat: remainingBins[remainingBins.length - 1].sb_latitude,
            lng: remainingBins[remainingBins.length - 1].sb_longitude,
          };
        }
      } else {
        originForCalculation =
          driverTruck?.t_latitude && driverTruck?.t_longitude
            ? { lat: driverTruck.t_latitude, lng: driverTruck.t_longitude }
            : DEPOT_LOCATION;

        if (assignedBins.length === 0) {
          setError("Cannot calculate route: No bins assigned.");
          return;
        }

        waypointsForCalculation = assignedBins
          .slice(0, assignedBins.length - 1)
          .map((bin) => ({
            location: { lat: bin.sb_latitude, lng: bin.sb_longitude },
            stopover: true,
          }));

        destinationForCalculation = {
          lat: assignedBins[assignedBins.length - 1].sb_latitude,
          lng: assignedBins[assignedBins.length - 1].sb_longitude,
        };
      }

      console.log("Route Request Parameters:", {
        origin: originForCalculation,
        waypoints: waypointsForCalculation,
        destination: destinationForCalculation,
      });

      directionsService.current.route(
        {
          origin: originForCalculation,
          destination: destinationForCalculation,
          waypoints: waypointsForCalculation,
          optimizeWaypoints: false,
          travelMode: window.google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: "bestguess",
          },
        },
        (response, status) => {
          console.log("Directions Service Response Status:", status);
          if (status === "OK" && response) {
            console.log("Directions successful. Route response:", response);
            directionsRenderer.current.setDirections(response);
            setDirectionsResult(response);
            setError(null);

            if (isReroutingParam) {
              setCurrentLegIndex(0);
              setInfoMessage("Route recalculated to current position.");
            } else {
              if (!isNavigationStarted) setCurrentLegIndex(0);
            }

            addCustomMarkers(response);
            if (googleMapRef.current) {
              googleMapRef.current.fitBounds(response.routes[0].bounds);
            }
          } else {
            setError(
              `Directions request failed: ${status}. Check console for details.`
            );
            console.error("Directions request failed:", status, response);
            setDirectionsResult(null);
            directionsRenderer.current.setDirections({ routes: [] });
            setInfoMessage(`Route calculation failed: ${status}.`);
          }
        }
      );
    },
    [
      isGoogleApiLoaded,
      isMapInstanceReady,
      driverTruck,
      assignedBins,
      isNavigationStarted,
      directionsResult,
      routeFinished,
      currentLegIndex,
      addCustomMarkers,
    ]
  );

  // Effect to load initial state from sessionStorage and then trigger route display
  useEffect(() => {
    if (
      isGoogleApiLoaded &&
      isMapInstanceReady &&
      driverTruck &&
      assignedBins.length > 0 &&
      !initialStateLoaded
    ) {
      console.log("Attempting to restore state from sessionStorage...");
      setInitialStateLoaded(true); // Mark initial state as loaded

      const hasDirectionsResult =
        sessionStorage.getItem("hasDirectionsResult") === "true";

      // If navigation was started and we previously had a directionsResult, re-display it
      if (isNavigationStarted && hasDirectionsResult) {
        console.log(
          "Restoring existing navigation route (re-calculating due to object complexity)."
        );
        // We re-calculate because storing the full directionsResult object with LatLngs is problematic.
        calculateAndDisplayRoute(true); // Force recalculation to display the route
        // Pan to the current leg's start location (this will happen within calculateAndDisplayRoute now)
      } else if (isNavigationStarted && !hasDirectionsResult) {
        // Navigation was started but directionsResult wasn't saved or was invalid, recalculate
        console.warn(
          "Navigation started but no valid directionsResult flag found in session storage. Recalculating route."
        );
        calculateAndDisplayRoute(true); // Force recalculation
      } else if (
        !isNavigationStarted &&
        !routeFinished &&
        !infoMessage &&
        !error &&
        assignedBins.length > 0
      ) {
        if (assignedBins.length >= 2) {
          console.log("Displaying first two bins as a preview.");
          calculateAndDisplayRoute(false, false, true); // Trigger two-bin display
          setInfoMessage(
            "Showing the first two assigned bins. Click 'Start Navigation' for full route."
          );
        } else {
          setInfoMessage("Click 'Start Navigation' to begin your route.");
        }
      }
    }
  }, [
    isGoogleApiLoaded,
    isMapInstanceReady,
    driverTruck,
    assignedBins,
    isNavigationStarted,
    routeFinished,
    infoMessage,
    error,
    initialStateLoaded,
    calculateAndDisplayRoute,
  ]);

  // Original effect for route calculation, modified to respect initialStateLoaded
  useEffect(() => {
    console.log("Effect: Check for route calculation trigger. State:", {
      isGoogleApiLoaded,
      isMapInstanceReady,
      driverTruckPresent: !!driverTruck,
      assignedBinsCount: assignedBins.length,
      isNavigationStarted,
      routeFinished,
      initialStateLoaded,
      directionsResultPresent: !!directionsResult,
    });

    if (
      isGoogleApiLoaded &&
      isMapInstanceReady &&
      driverTruck &&
      assignedBins.length > 0 &&
      isNavigationStarted && // Only calculate full route if navigation is started
      !routeFinished &&
      (!initialStateLoaded || !directionsResult) // Only trigger new calculation if initial state not loaded OR directionsResult is missing (needs recalculation)
    ) {
      console.log(
        "All conditions met for NEW full route calculation. Calling calculateAndDisplayRoute."
      );
      calculateAndDisplayRoute(true); // Force a new calculation for the full route
    } else if (
      isGoogleApiLoaded &&
      isMapInstanceReady &&
      driverTruck &&
      assignedBins.length === 0 &&
      isNavigationStarted &&
      !routeFinished
    ) {
      if (directionsRenderer.current) {
        directionsRenderer.current.setDirections({ routes: [] });
      }
      markers.current.forEach((marker) => marker.setMap(null));
      markers.current = [];
      setDirectionsResult(null);
      setInfoMessage("No bins assigned for this truck's route.");
      console.warn("No bins assigned for this truck, clearing map/route.");
    }
  }, [
    isGoogleApiLoaded,
    isMapInstanceReady,
    driverTruck,
    assignedBins,
    calculateAndDisplayRoute,
    isNavigationStarted,
    routeFinished,
    initialStateLoaded,
    directionsResult,
  ]);

  useEffect(() => {
    console.log(
      "Effect: Update markers due to currentLegIndex change. State:",
      {
        currentLegIndex,
        directionsResultPresent: !!directionsResult,
        isMapInstanceReady,
        isNavigationStarted,
        routeFinished, // Added routeFinished to dependencies
      }
    );
    if (
      googleMapRef.current &&
      directionsResult &&
      isMapInstanceReady &&
      isNavigationStarted &&
      !routeFinished
    ) {
      addCustomMarkers(directionsResult);
    }
  }, [
    currentLegIndex,
    directionsResult,
    addCustomMarkers,
    isMapInstanceReady,
    isNavigationStarted,
    routeFinished,
  ]);

  // --- Navigation Controls ---
  const handleStartNavigation = () => {
    console.log("Start Navigation clicked.");
    setIsNavigationStarted(true);
    setRouteFinished(false); // Ensure route is not marked as finished
    setInfoMessage(null);
    setError(null);
    setCurrentLegIndex(0);
    // When navigation starts, trigger a full route recalculation
    calculateAndDisplayRoute(true, false, false); // Force full route, not just two bins

    if (googleMapRef.current && driverTruck) {
      const truckLocation =
        driverTruck.t_latitude && driverTruck.t_longitude
          ? { lat: driverTruck.t_latitude, lng: driverTruck.t_longitude }
          : DEPOT_LOCATION; // Fallback to depot
      googleMapRef.current.panTo(truckLocation);
      googleMapRef.current.setZoom(DEFAULT_ZOOM);
    }
  };

  const handleNextLeg = useCallback(() => {
    console.log("Next Destination clicked. currentLegIndex:", currentLegIndex);
    if (
      directionsResult &&
      directionsResult.routes[0] &&
      currentLegIndex < directionsResult.routes[0].legs.length - 1
    ) {
      setCurrentLegIndex((prev) => prev + 1);
      setInfoMessage(null); // Clear info messages on navigation
      setError(null);
      if (
        googleMapRef.current &&
        directionsResult.routes[0].legs[currentLegIndex + 1]
      ) {
        googleMapRef.current.panTo(
          directionsResult.routes[0].legs[currentLegIndex + 1].start_location
        );
        googleMapRef.current.setZoom(DEFAULT_ZOOM);
      }
    } else {
      console.log("End of route (Next button hit at last leg).");
    }
  }, [currentLegIndex, directionsResult]);

  const handlePreviousLeg = useCallback(() => {
    console.log(
      "Previous Destination clicked. currentLegIndex:",
      currentLegIndex
    );
    if (currentLegIndex > 0) {
      setCurrentLegIndex((prev) => prev - 1);
      setInfoMessage(null); // Clear info messages on navigation
      setError(null);
      // Ensure the route finished state is reset if going back from the end
      if (routeFinished) {
        setRouteFinished(false);
      }
      if (
        googleMapRef.current &&
        directionsResult?.routes[0]?.legs[currentLegIndex - 1]
      ) {
        googleMapRef.current.panTo(
          directionsResult.routes[0].legs[currentLegIndex - 1].start_location
        );
        googleMapRef.current.setZoom(DEFAULT_ZOOM);
      }
    } else {
      console.log("Already at the start of the route.");
    }
  }, [currentLegIndex, directionsResult, routeFinished]);
  const handleFinishRoute = useCallback(() => {
    console.log("Finish Route clicked.");
    // Clear the map and reset states
    if (directionsRenderer.current) {
      directionsRenderer.current.setMap(null); // Remove directions from map
    }
    markers.current.forEach((marker) => marker.setMap(null));
    markers.current = [];
    setDirectionsResult(null);
    setCurrentLegIndex(0);
    setIsNavigationStarted(false);
    setRouteFinished(true);
    setInfoMessage("Route successfully completed!");
    setError(null);
    if (googleMapRef.current) {
      googleMapRef.current.panTo(DEPOT_LOCATION);
      googleMapRef.current.setZoom(DEFAULT_ZOOM);
    }
  }, []);

  const currentLeg = directionsResult?.routes[0]?.legs[currentLegIndex];

  // Corrected logic for nextDestinationName
  let nextDestinationName = "N/A";
  let nextDestinationAddressDisplay = "N/A";
  if (assignedBins.length > 0) {
    if (currentLegIndex < assignedBins.length) {
      nextDestinationName = `${assignedBins[currentLegIndex]?.sb_plate}`;
      if (assignedBins[currentLegIndex]?.sb_floor) {
        // This checks for truthiness (not null, undefined, 0, false, or empty string)
        nextDestinationAddressDisplay = `${assignedBins[currentLegIndex]?.sb_floor}, ${assignedBins[currentLegIndex]?.sb_street}`;
      } else {
        nextDestinationAddressDisplay = `${assignedBins[currentLegIndex]?.sb_street}`;
      }
    } else if (currentLegIndex === assignedBins.length) {
      nextDestinationName = "Final Destination (Depot)";
      nextDestinationAddressDisplay = `Lat: ${DEPOT_LOCATION.lat}, Lng: ${DEPOT_LOCATION.lng}`;
    } else {
      nextDestinationName = "Route Completed";
      nextDestinationAddressDisplay = "";
    }
  }
  const isPreviousDisabled =
    currentLegIndex === 0 || !directionsResult || routeFinished;
  const isNextDisabled =
    !directionsResult ||
    !directionsResult.routes[0] ||
    currentLegIndex >= directionsResult.routes[0].legs.length - 1 ||
    routeFinished; // Disable next if route is finished

  const isAtLastLeg =
    directionsResult &&
    directionsResult.routes[0] &&
    currentLegIndex === directionsResult.routes[0].legs.length - 1;

  if (loading) {
    return (
      <div>
        <p>Loading driver and map data...</p>
      </div>
    );
  }

  if (error && !routeFinished) {
    return (
      <div>
        <p style={{ color: "red" }}>Error:</p>
        <p>{error}</p>
        <p style={{ fontSize: "12px", marginTop: "8px", color: "gray" }}>
          Please ensure the driver is assigned a truck and the truck has bins
          assigned for a route.
        </p>
      </div>
    );
  }

  console.log("currentDriverId:", currentDriverId);

  return (
    <LoadScript
      googleMapsApiKey={"AIzaSyDr4f-WIYP4FsWF7RW-ElMHMvrB_nGNRNo"}
      onLoad={onGoogleApiLoadedFromLoadScript}
      libraries={googleMapsLibraries}
      loading="async"
    >
      <div>
        {/* Header Section */}
        <div className="header">
          <h3
            style={{
              fontWeight: "bold",
              color: "black",
              fontSize: "20px",
              marginLeft: "4px",
              marginTop: "2px",
            }}
          >
            Driver Route Map:
            <span
              style={{ fontWeight: "bold", color: "black", marginLeft: "8px" }}
            >
              {driverTruck ? driverTruck.t_plate : "N/A"}
            </span>
            {driverTruck?.driver_name && (
              <span style={{ fontStyle: "italic", color: "gray" }}>
                {" "}
                ({driverTruck.driver_name})
              </span>
            )}
          </h3>
        </div>

        <GridContainer spacing={3}>
          <GridItem xs={12} sm={4} md={3}>
            <Card>
              <CardHeader color="light">
                <CardIcon color="success">
                  <Icon>route</Icon>
                </CardIcon>
                <p
                  className={classes.cardCategory}
                  style={{
                    fontSize: "16px",
                    color: "black",
                    marginBottom: "4px",
                    marginTop: "0px",
                  }}
                >
                  Route Distance
                </p>
                <h4 className={classes.cardTitle}>
                  {directionsResult
                    ? directionsResult.routes[0].legs[0].distance.text
                    : "Click 'Start Navigation' to view"}
                </h4>
              </CardHeader>
            </Card>
          </GridItem>

          <GridItem xs={12} sm={6} md={3}>
            <Card>
              <CardHeader color="light">
                <CardIcon color="warning">
                  <Icon>access_time</Icon>
                </CardIcon>
                <p
                  className={classes.cardCategory}
                  style={{
                    fontSize: "16px",
                    color: "black",
                    marginBottom: "4px",
                    marginTop: "0px",
                  }}
                >
                  Estimated Time
                </p>
                <h4 className={classes.cardTitle}>
                  {directionsResult
                    ? directionsResult.routes[0].legs[0].duration.text
                    : "Click 'Start Navigation' to view"}
                </h4>
              </CardHeader>
            </Card>
          </GridItem>

          <GridItem xs={12} sm={6} md={4}>
            <Card>
              <CardHeader color="light">
                <CardIcon color="info">
                  <Icon>location_on</Icon>
                </CardIcon>
                <p
                  className={classes.cardCategory}
                  style={{
                    fontSize: "16px",
                    color: "black",
                    marginBottom: "4px",
                    marginTop: "0px",
                  }}
                >
                  Next Destination
                </p>
                <h5 className={classes.cardTitle}>
                  ({nextDestinationName}) - {nextDestinationAddressDisplay}
                </h5>
              </CardHeader>
            </Card>
          </GridItem>

          <GridItem xs={12} sm={6} md={2}>
            <Card>
              <CardHeader color="light">
                <CardIcon color="info">
                  <Icon>delete</Icon>
                </CardIcon>
                <p
                  className={classes.cardCategory}
                  style={{
                    fontSize: "16px",
                    color: "black",
                    marginBottom: "4px",
                    marginTop: "0px",
                  }}
                >
                  Bins to Collect
                </p>
                <h4 className={classes.cardTitle}>{assignedBins.length}</h4>
              </CardHeader>
            </Card>
          </GridItem>
        </GridContainer>

        {/* Navigation Controls and Trip Instructions */}
        <GridContainer spacing={2}>
          <GridItem xs={6} sm={4} md={4}>
            <Card Card style={{ height: "650px" }}>
              <CardHeader color="primary">
                <h4
                  className={classes.cardTitleWhite}
                  style={{
                    marginTop: "4px",
                    marginLeft: "18px",
                    marginRight: "18px",
                    fontWeight: "bold",
                    fontSize: "20px",
                  }}
                >
                  Navigation & Instructions
                </h4>
              </CardHeader>
              <div
                style={{
                  marginTop: "4px",
                  marginLeft: "18px",
                  marginRight: "18px",
                }}
              >
                {/* Navigation Controls Section */}
                {routeFinished ? (
                  <div>
                    <p>Route Completed!</p>
                    <p>
                      {infoMessage || "You have reached the final destination."}
                    </p>
                    <Button onClick={handleStartNavigation}>
                      Start New Route
                    </Button>
                  </div>
                ) : !isNavigationStarted ? (
                  <div style={{ textAlign: "center", color: red[500] }}>
                    {error && <div>{error}</div>}
                    {infoMessage && (
                      <div
                        style={{
                          color: "blue",
                          fontSize: "12px",
                          marginBottom: "12px",
                        }}
                      >
                        {infoMessage}
                      </div>
                    )}
                    <p>
                      Click &quot;Start Navigation&quot; to begin your route.
                    </p>
                    <Button
                      onClick={handleStartNavigation}
                      disabled={
                        loading ||
                        !isGoogleApiLoaded ||
                        !isMapInstanceReady ||
                        !driverTruck ||
                        assignedBins.length === 0 ||
                        !!error // Disable if there's an error
                      }
                    >
                      Start Navigation
                    </Button>
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Button
                      onClick={handlePreviousLeg}
                      disabled={isPreviousDisabled}
                    >
                      <FontAwesomeIcon
                        icon={faArrowLeft}
                        style={{ marginRight: "2px", marginTop: "8px" }}
                      />
                    </Button>

                    {isAtLastLeg ? (
                      <Button
                        onClick={handleFinishRoute}
                        disabled={!directionsResult}
                      >
                        <FontAwesomeIcon
                          icon={faCheck}
                          style={{ marginRight: "2px", marginTop: "8px" }}
                        />
                      </Button>
                    ) : (
                      <Button onClick={handleNextLeg} disabled={isNextDisabled}>
                        <FontAwesomeIcon
                          icon={faArrowRight}
                          style={{ marginRight: "2px", marginTop: "8px" }}
                        />
                      </Button>
                    )}

                    {/* Reroute Button */}
                    <Button
                      onClick={() => calculateAndDisplayRoute(true, true)}
                      disabled={
                        !isNavigationStarted ||
                        !directionsResult ||
                        routeFinished
                      }
                      title="Reroute from current location"
                    >
                      <FontAwesomeIcon
                        icon={faRedo}
                        style={{ marginRight: "2px", marginTop: "8px" }}
                      />
                    </Button>
                  </div>
                )}
                {/* Traffic Layer Toggle - can also be here or in map panel */}
                {isMapInstanceReady && (
                  <div>
                    <Button
                      onClick={() => setShowTraffic(!showTraffic)}
                      style={{ marginRight: "8px", marginTop: "8px" }}
                    >
                      <FontAwesomeIcon
                        icon={faTrafficLight}
                        style={{ marginRight: "8px" }}
                      />
                      {showTraffic ? "Hide Traffic" : "Show Traffic"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Trip Instructions Section*/}
              {isNavigationStarted &&
                directionsResult &&
                currentLeg &&
                !routeFinished && (
                  <div style={{ marginTop: "2px" }}>
                    <CardHeader
                      color="light"
                      onClick={() => setDirectionsResult(!directionsResult)} // Corrected state management
                    >
                      <div>
                        <span
                          style={{
                            fontSize: "20px",
                            color: "gray",
                            fontWeight: "bold",
                            marginLeft: "10px", // Optional: add margin to separate the pipe from the text
                          }}
                        >
                          Trip Instructions
                          {"   |   "}
                          {nextDestinationName
                            ? `Next: ${nextDestinationName}`
                            : ""}
                        </span>
                      </div>
                    </CardHeader>

                    {directionsResult && ( // Conditionally render instructions based on directionsResult
                      <div>
                        <div>
                          {currentLeg.steps?.length > 0 ? (
                            <ol>
                              {currentLeg.steps.map((step, stepIndex) => (
                                <li
                                  key={stepIndex}
                                  dangerouslySetInnerHTML={{
                                    __html: step.instructions
                                      .replace(/<b>/g, "<strong>")
                                      .replace(/<\/b>/g, "</strong>"),
                                  }}
                                />
                              ))}
                            </ol>
                          ) : (
                            <p>
                              No detailed instructions available for this step.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </Card>
          </GridItem>

          {/* Map Panel */}
          <GridItem xs={6} sm={3} md={8}>
            <div style={MAP_PANEL_STYLE}>
              {/* Retaining MAP_PANEL_STYLE for the map div itself */}
              {isGoogleApiLoaded && (
                <GoogleMap
                  mapContainerStyle={MAP_CONTAINER_STYLE}
                  center={
                    driverTruck?.t_latitude && driverTruck?.t_longitude
                      ? {
                          lat: driverTruck.t_latitude,
                          lng: driverTruck.t_longitude,
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
                  {isMapInstanceReady && showTraffic && (
                    <TrafficLayer autoRefresh={true} />
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
