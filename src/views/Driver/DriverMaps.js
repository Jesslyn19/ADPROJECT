import React, { useEffect, useState, useRef, useCallback } from "react";
import { LoadScript, GoogleMap } from "@react-google-maps/api";
import PropTypes from "prop-types";
import axios from "axios";
import truckblue from "assets/img/truck-blue.png";
import truckgreen from "assets/img/truck-green.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faCheck, // Import faCheck for the finish button
} from "@fortawesome/free-solid-svg-icons";

const Button = ({ onClick, disabled, className, children }) => (
  <button onClick={onClick} disabled={disabled} className={className}>
    {children}
  </button>
);

Button.propTypes = {
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};
// Constants
const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  backgroundColor: "black",
};

const CONTAINER_MAIN_STYLE = {
  display: "flex",
  height: "calc(100vh - 64px)",
  overflow: "hidden",
};

const LEFT_PANEL_STYLE = {
  width: "380px",
  flexShrink: 0,
  backgroundColor: "#f9fafb",
  padding: "24px",
  borderRight: "1px solid #e5e7eb",
  display: "flex",
  flexDirection: "column",
};

const MAP_PANEL_STYLE = {
  flexGrow: 1,
  height: "100%",
};

const DEFAULT_ZOOM = 16;
const DEPOT_LOCATION = { lat: 1.4234, lng: 103.6312 }; // Your depot location

const TRUCK_ICONS = {
  blue: truckblue,
  orange: truckgreen,
};

const googleMapsLibraries = ["geometry", "places", "marker"];

const DriverMaps = () => {
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
  const [directionsResult, setDirectionsResult] = useState(null);
  const [currentLegIndex, setCurrentLegIndex] = useState(0);
  const [isNavigationStarted, setIsNavigationStarted] = useState(false);
  const [routeFinished, setRouteFinished] = useState(false);
  const [infoMessage, setInfoMessage] = useState(null);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setInfoMessage(null);
      setRouteFinished(false);
      setIsNavigationStarted(false);
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

  // --- Route Calculation and Display ---
  const calculateAndDisplayRoute = useCallback(() => {
    console.log("calculateAndDisplayRoute called. Current state:", {
      isGoogleApiLoaded,
      driverTruck,
      assignedBinsLength: assignedBins.length,
      isMapInstanceReady,
      directionsServiceReady: !!directionsService.current,
      directionsRendererReady: !!directionsRenderer.current,
    });

    if (
      !isGoogleApiLoaded ||
      !isMapInstanceReady ||
      !directionsService.current ||
      !directionsRenderer.current ||
      !driverTruck ||
      assignedBins.length === 0
    ) {
      if (directionsRenderer.current) {
        directionsRenderer.current.setDirections({ routes: [] });
      }
      markers.current.forEach((marker) => marker.setMap(null));
      markers.current = [];
      setDirectionsResult(null);
      setCurrentLegIndex(0);
      setRouteFinished(false); // Ensure this is false if route calculation fails
      setInfoMessage(null); // Clear info message on route calculation
      console.warn(
        "Skipping route calculation: prerequisites not met. Details:",
        {
          isGoogleApiLoaded,
          isMapInstanceReady,
          directionsServiceReady: !!directionsService.current,
          directionsRendererReady: !!directionsRenderer.current,
          driverTruckPresent: !!driverTruck,
          assignedBinsCount: assignedBins.length,
        }
      );
      return;
    }

    markers.current.forEach((marker) => marker.setMap(null));
    markers.current = [];

    const origin =
      driverTruck.t_latitude && driverTruck.t_longitude
        ? { lat: driverTruck.t_latitude, lng: driverTruck.t_longitude }
        : DEPOT_LOCATION;

    const waypoints = assignedBins
      .slice(0, assignedBins.length - 1)
      .map((bin) => ({
        location: { lat: bin.sb_latitude, lng: bin.sb_longitude },
        stopover: true,
      }));

    const destinationBin = assignedBins[assignedBins.length - 1];
    if (!destinationBin) {
      console.error("No destination bin found for route calculation.");
      setError("Cannot calculate route: No destination bin.");
      return;
    }
    const destination = {
      lat: destinationBin.sb_latitude,
      lng: destinationBin.sb_longitude,
    };

    console.log("Route Request:", { origin, waypoints, destination });

    directionsService.current.route(
      {
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        optimizeWaypoints: false,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (response, status) => {
        console.log("Directions Service Response Status:", status);
        if (status === "OK" && response) {
          console.log("Directions successful. Route response:", response);
          directionsRenderer.current.setDirections(response);
          setDirectionsResult(response);
          setCurrentLegIndex(0); // Always start from the first leg
          setRouteFinished(false); // Ensure this is false when a new route starts
          setError(null); // Clear any errors on successful route
          setInfoMessage(null); // Clear any info messages
          addCustomMarkers(response);
          if (googleMapRef.current) {
            googleMapRef.current.fitBounds(response.routes[0].bounds);
          }
        } else {
          setError(`Directions request failed: ${status}`);
          console.error("Directions request failed:", status, response);
          setDirectionsResult(null);
          directionsRenderer.current.setDirections({ routes: [] });
          setRouteFinished(false); // Ensure this is false on failure
          setInfoMessage(null); // Clear info message on failure
        }
      }
    );
  }, [isGoogleApiLoaded, isMapInstanceReady, driverTruck, assignedBins]);

  // Add custom markers for depot, bins, and current truck position
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

      const depotMarker = new window.google.maps.Marker({
        position: DEPOT_LOCATION,
        map: googleMapRef.current,
        icon: {
          scaledSize: new window.google.maps.Size(32, 32),
        },
        title: "Depot (Start Location)",
      });
      markers.current.push(depotMarker);

      assignedBins.forEach((bin, index) => {
        const marker = new window.google.maps.Marker({
          position: { lat: bin.sb_latitude, lng: bin.sb_longitude },
          map: googleMapRef.current,
          icon: { scaledSize: new window.google.maps.Size(32, 32) },
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
    [assignedBins, currentLegIndex, driverTruck]
  );

  useEffect(() => {
    console.log("Effect: Check for route calculation trigger. State:", {
      isGoogleApiLoaded,
      isMapInstanceReady,
      driverTruckPresent: !!driverTruck,
      assignedBinsCount: assignedBins.length,
      isNavigationStarted,
      routeFinished, // Added routeFinished to dependencies
    });
    if (
      isGoogleApiLoaded &&
      isMapInstanceReady &&
      driverTruck &&
      assignedBins.length > 0 &&
      isNavigationStarted &&
      !routeFinished
    ) {
      console.log(
        "All conditions met for route calculation. Calling calculateAndDisplayRoute."
      );
      calculateAndDisplayRoute();
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
  const nextDestinationAddress = currentLeg?.end_address || "N/A";

  // Corrected logic for nextDestinationName
  let nextDestinationName = "N/A";
  if (assignedBins.length > 0) {
    if (currentLegIndex < assignedBins.length) {
      nextDestinationName = `Bin ${assignedBins[currentLegIndex]?.sb_id}`;
    } else if (currentLegIndex === assignedBins.length) {
      nextDestinationName = "Final Destination (Depot)";
    } else {
      nextDestinationName = "Route Completed";
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
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-gray-700">Loading driver and map data...</p>
      </div>
    );
  }

  if (error && !routeFinished) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-red-600">
        <p className="text-lg font-semibold">Error:</p>
        <p>{error}</p>
        <p className="text-sm mt-2 text-gray-500">
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
      libraries={googleMapsLibraries} // Use the constant defined outside
      loading="async"
    >
      <div style={CONTAINER_MAIN_STYLE} className="flex h-screen bg-white">
        {/* START OF LEFT PANEL */}
        <div style={LEFT_PANEL_STYLE}>
          {/* This div will now take all available vertical space and be scrollable */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scroll">
            {/* Header Section for Left Panel */}
            <div className="pt-0 pb-2 px-0">
              <h4 className="text-2xl font-bold text-gray-800 text-center">
                Driver Route Map:{" "}
                <span className="text-blue-600">
                  {driverTruck ? driverTruck.t_plate : "N/A"}
                </span>
                {driverTruck?.driver_name && (
                  <span className="text-gray-600 text-lg">
                    {" "}
                    ({driverTruck.driver_name})
                  </span>
                )}
              </h4>
            </div>

            {/* Current Navigation Status / Start Navigation Section */}
            <div className="flex flex-col bg-gray-50 p-4 rounded-xl shadow-md ring-1 ring-gray-200 mt-4">
              <h4 className="text-xl font-bold mb-3 text-gray-800 border-b pb-1">
                Current Navigation Status
              </h4>

              {routeFinished ? (
                <div className="text-center py-6">
                  <p className="text-green-600 text-2xl font-bold mb-2">
                    Route Completed!
                  </p>
                  <p className="text-gray-600 text-md">
                    {infoMessage || "You have reached the final destination."}
                  </p>
                  <Button
                    onClick={() => {
                      setIsNavigationStarted(false);
                      setRouteFinished(false);
                      setDirectionsResult(null);
                      setCurrentLegIndex(0);
                      setError(null);
                      setInfoMessage(null);
                    }}
                    className="mt-6 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-200 text-lg"
                  >
                    Start New Route
                  </Button>
                </div>
              ) : isNavigationStarted && directionsResult && currentLeg ? (
                <>
                  {error && (
                    <div className="text-red-500 text-sm mb-3">{error}</div>
                  )}
                  {infoMessage && (
                    <div className="text-blue-500 text-sm mb-3">
                      {infoMessage}
                    </div>
                  )}
                  <div className="mb-4 text-center">
                    <p className="text-2xl font-bold text-indigo-700 mb-1">
                      {nextDestinationName}
                    </p>
                    <p className="text-md text-gray-600 mb-2">
                      {nextDestinationAddress}
                    </p>
                    <p className="text-sm text-gray-500">
                      Distance:{" "}
                      <span className="font-semibold">
                        {currentLeg.distance?.text || "N/A"}
                      </span>{" "}
                      | Time:{" "}
                      <span className="font-semibold">
                        {currentLeg.duration?.text || "N/A"}
                      </span>
                    </p>
                  </div>

                  <div className="flex-grow trip-instructions">
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">
                      Trip Instructions
                    </h3>
                    <ol className="list-decimal list-inside text-gray-700 space-y-2 text-sm">
                      {currentLeg.steps?.length > 0 ? (
                        currentLeg.steps.map((step, stepIndex) => (
                          <li
                            key={stepIndex}
                            dangerouslySetInnerHTML={{
                              __html: step.instructions
                                .replace(/<b>/g, "<strong>")
                                .replace(/<\/b>/g, "</strong>"),
                            }}
                          />
                        ))
                      ) : (
                        <li>
                          No detailed instructions available for this step.
                        </li>
                      )}
                    </ol>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  {error && (
                    <div className="text-red-500 text-sm mb-3">{error}</div>
                  )}
                  {infoMessage && (
                    <div className="text-blue-500 text-sm mb-3">
                      {infoMessage}
                    </div>
                  )}
                  <p className="text-gray-600 mb-6 text-md">
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
                      isNavigationStarted ||
                      !!error
                    }
                    className="px-8 py-3 bg-green-600 text-white font-semibold text-lg rounded-full shadow-lg hover:bg-green-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start Navigation
                  </Button>
                </div>
              )}
            </div>
          </div>
          {/* END OF SCROLLABLE CONTENT SECTION */}

          {/* NAVIGATION BUTTONS (AT BOTTOM OF LEFT PANEL) */}
          {isNavigationStarted && !routeFinished && (
            <div className="mt-6 flex justify-center space-x-6">
              <Button
                onClick={handlePreviousLeg}
                disabled={isPreviousDisabled}
                className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center shadow-md hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FontAwesomeIcon
                  icon={faArrowLeft}
                  className="text-3xl text-gray-700"
                />
              </Button>

              {isAtLastLeg ? (
                <Button
                  onClick={handleFinishRoute}
                  disabled={!directionsResult}
                  className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-md hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FontAwesomeIcon
                    icon={faCheck}
                    className="text-3xl text-white"
                  />
                </Button>
              ) : (
                <Button
                  onClick={handleNextLeg}
                  disabled={isNextDisabled}
                  className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center shadow-md hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FontAwesomeIcon
                    icon={faArrowRight}
                    className="text-3xl text-white"
                  />
                </Button>
              )}
            </div>
          )}
        </div>
        {/* END OF LEFT PANEL */}
        {/* START OF RIGHT PANEL (GOOGLE MAP) */}
        <div style={MAP_PANEL_STYLE}>
          {!isGoogleApiLoaded && (
            <div className="flex justify-center items-center h-full bg-gray-100">
              <p>Loading Google Maps API...</p>
            </div>
          )}
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
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                zoomControl: true,
              }}
            ></GoogleMap>
          )}
        </div>
        {/* END OF RIGHT PANEL */}
      </div>
      {/* END OF MAIN CONTAINER */}

      <style>{`
      .custom-scroll::-webkit-scrollbar {
        width: 8px;
      }
      .custom-scroll::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
      }
      .custom-scroll::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 10px;
      }
      .custom-scroll::-webkit-scrollbar-thumb:hover {
        background: #555;
      }

      body {
        overflow: hidden;
      }

      .trip-instructions {
        max-height: 260px;
        overflow-y: auto;
        padding-right: 8px;
      }
      `}</style>
    </LoadScript>
  );
};

export default DriverMaps;
