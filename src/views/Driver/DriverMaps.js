import React, { useEffect, useState, useRef, useCallback } from "react";
import { LoadScript, GoogleMap } from "@react-google-maps/api";
import { Button } from "@material-ui/core";
import axios from "axios";
import truckblue from "assets/img/truck-blue.png";
import truckgreen from "assets/img/truck-green.png";

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
  boxShadow: "6px 0 15px rgba(0, 0, 0, 0.05)",
  overflowY: "auto",
  zIndex: 20,
  borderRadius: "0 16px 16px 0",
  fontFamily: "'Inter', sans-serif",
};

const MAP_PANEL_STYLE = {
  // Renamed for clarity
  flexGrow: 1,
  height: "100%",
};

const DEFAULT_ZOOM = 16;
const DEPOT_LOCATION = { lat: 1.4234, lng: 103.6312 }; // Your depot location

const TRUCK_ICONS = {
  blue: truckblue,
  orange: truckgreen,
};

const BIN_ICONS = {
  collected: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
  missed: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
  active: "http://maps.google.com/mapfiles/ms/icons/orange-dot.png",
  default: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
};

// Define libraries array once outside the component to prevent re-creation
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
          setCurrentLegIndex(0);
          addCustomMarkers(response);
          if (googleMapRef.current) {
            googleMapRef.current.fitBounds(response.routes[0].bounds);
          }
        } else {
          setError(`Directions request failed: ${status}`);
          console.error("Directions request failed:", status, response);
          setDirectionsResult(null);
          directionsRenderer.current.setDirections({ routes: [] });
        }
      }
    );
  }, [isGoogleApiLoaded, isMapInstanceReady, driverTruck, assignedBins]);

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
          url: BIN_ICONS.default,
          scaledSize: new window.google.maps.Size(32, 32),
        },
        title: "Depot (Start Location)",
      });
      markers.current.push(depotMarker);

      assignedBins.forEach((bin, index) => {
        let binIconUrl = BIN_ICONS.default;
        if (bin.sb_status === "Collected") {
          binIconUrl = BIN_ICONS.collected;
        } else if (bin.sb_status === "Missed") {
          binIconUrl = BIN_ICONS.missed;
        }

        // Highlight the current active destination bin based on currentLegIndex
        if (
          currentLegIndex < assignedBins.length &&
          index === currentLegIndex
        ) {
          binIconUrl = BIN_ICONS.active;
        }

        const marker = new window.google.maps.Marker({
          position: { lat: bin.sb_latitude, lng: bin.sb_longitude },
          map: googleMapRef.current,
          icon: {
            url: binIconUrl,
            scaledSize: new window.google.maps.Size(32, 32),
          },
          title: `Bin ID: ${bin.sb_id}\nStatus: ${bin.sb_status}\n`,
          label: {
            text: String(index + 1),
            color: "white",
            fontWeight: "bold",
          },
          zIndex:
            binIconUrl === BIN_ICONS.active
              ? window.google.maps.Marker.MAX_ZINDEX + 1
              : window.google.maps.Marker.MAX_ZINDEX,
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

  // Effect to recalculate and display route when data is loaded
  useEffect(() => {
    console.log("Effect: Check for route calculation trigger. State:", {
      isGoogleApiLoaded,
      isMapInstanceReady,
      driverTruckPresent: !!driverTruck,
      assignedBinsCount: assignedBins.length,
    });
    if (
      isGoogleApiLoaded &&
      isMapInstanceReady &&
      driverTruck &&
      assignedBins.length > 0
    ) {
      console.log(
        "All conditions met for route calculation. Calling calculateAndDisplayRoute."
      );
      calculateAndDisplayRoute();
    } else if (isGoogleApiLoaded && driverTruck && assignedBins.length === 0) {
      if (directionsRenderer.current) {
        directionsRenderer.current.setDirections({ routes: [] });
      }
      markers.current.forEach((marker) => marker.setMap(null));
      markers.current = [];
      setDirectionsResult(null);
      setError("No bins assigned for this truck's route.");
      console.warn("No bins assigned for this truck, clearing map/route.");
    }
  }, [
    isGoogleApiLoaded,
    isMapInstanceReady,
    driverTruck,
    assignedBins,
    calculateAndDisplayRoute,
  ]);

  useEffect(() => {
    console.log(
      "Effect: Update markers due to currentLegIndex change. State:",
      {
        currentLegIndex,
        directionsResultPresent: !!directionsResult,
        isMapInstanceReady,
      }
    );
    if (googleMapRef.current && directionsResult && isMapInstanceReady) {
      addCustomMarkers(directionsResult);
    }
  }, [currentLegIndex, directionsResult, addCustomMarkers, isMapInstanceReady]);

  // --- Navigation Controls ---
  // --- Navigation Controls ---
  const handleStartNavigation = () => {
    console.log("Start Navigation clicked.");
    if (!directionsResult && driverTruck && assignedBins.length > 0) {
      calculateAndDisplayRoute();
    }
    setCurrentLegIndex(0);
    // Pan to the truck's location or the first destination
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
    // Corrected name
    console.log("Next Destination clicked. currentLegIndex:", currentLegIndex);
    if (
      directionsResult &&
      directionsResult.routes[0] &&
      currentLegIndex < directionsResult.routes[0].legs.length - 1
    ) {
      setCurrentLegIndex((prev) => prev + 1);
      // Pan to the next destination
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
      console.log("End of route.");
      setError("Route completed!");
    }
  }, [currentLegIndex, directionsResult]);

  const handlePreviousLeg = useCallback(() => {
    // Corrected name
    console.log(
      "Previous Destination clicked. currentLegIndex:",
      currentLegIndex
    );
    if (currentLegIndex > 0) {
      setCurrentLegIndex((prev) => prev - 1);
      // Pan to the previous destination
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
  }, [currentLegIndex, directionsResult]);

  const currentLeg = directionsResult?.routes[0]?.legs[currentLegIndex];
  const nextDestinationAddress = currentLeg?.end_address || "N/A"; // Provide a default in case of null
  /*   const nextDestinationBin = currentLeg
    ? assignedBins.find(
        (bin) =>
          bin.sb_latitude === currentLeg.end_location.lat() &&
          bin.sb_longitude === currentLeg.end_location.lng()
      )
    : null;
 */
  // Corrected logic for nextDestinationName
  let nextDestinationName = "N/A";
  if (assignedBins.length > 0) {
    if (currentLegIndex < assignedBins.length) {
      // Target is the current bin at this index
      nextDestinationName = `Bin ${assignedBins[currentLegIndex]?.sb_id}`;
    } else {
      nextDestinationName = "Route Completed"; // If index is beyond last bin
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-gray-700">Loading driver and map data...</p>
      </div>
    );
  }

  if (error && (!directionsResult || assignedBins.length === 0)) {
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
      {/* This is the main container for your split layout (left panel + right map) */}
      <div style={CONTAINER_MAIN_STYLE} className="flex h-screen bg-white">
        <div
          style={LEFT_PANEL_STYLE}
          className="custom-scroll flex flex-col space-y-4"
        >
          <h4 className="text-2xl font-semibold text-gray-800">
            Driver Route Map:{" "}
            <span className="text-blue-600">
              {driverTruck ? driverTruck.t_plate : "N/A"}
            </span>
            {driverTruck?.driver_name && (
              <span className="text-gray-600">
                {" "}
                ({driverTruck.driver_name})
              </span>
            )}
          </h4>

          {!loading && !error && (
            <div className="flex flex-col bg-white p-4 rounded-xl shadow-md ring-1 ring-gray-200 h-full">
              <h4 className="text-xl font-bold mb-3 text-gray-800 border-b pb-1">
                Current Navigation Status
              </h4>

              {directionsResult && currentLeg ? (
                <>
                  <div className="mb-4">
                    <p className="text-lg font-medium text-gray-700">
                      Next Destination:{" "}
                      <span className="font-bold text-indigo-600">
                        {nextDestinationName}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500">
                      {nextDestinationAddress}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Distance: {currentLeg.distance?.text || "N/A"} | Time:{" "}
                      {currentLeg.duration?.text || "N/A"}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-800">
                      Trip Instructions
                    </h3>
                    <ol className="trip-instructions list-decimal list-inside text-gray-700 pr-2 space-y-1">
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

                  {/* Fixed Buttons */}
                  <div className="fixed-nav-buttons">
                    <Button
                      onClick={handlePreviousLeg}
                      disabled={currentLegIndex === 0}
                      className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg disabled:opacity-50"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={handleNextLeg}
                      disabled={
                        currentLegIndex >=
                        directionsResult.routes[0].legs.length - 1
                      }
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
                    >
                      Next
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center mt-6">
                  <p className="text-gray-500 mb-4">
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
                      error
                    }
                    className="px-8 py-3 bg-green-500 text-white font-semibold text-lg rounded-lg shadow-md hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start Navigation
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Right Panel for the Google Map */}
        <div style={MAP_PANEL_STYLE}>
          {/* Show loading text *inside* the map panel if API is not loaded yet */}
          {!isGoogleApiLoaded && (
            <div className="flex justify-center items-center h-full bg-gray-100">
              <p>Loading Google Maps API...</p>
            </div>
          )}
          {/* Only render GoogleMap component when API is loaded */}
          {isGoogleApiLoaded && (
            <GoogleMap
              mapContainerStyle={MAP_CONTAINER_STYLE}
              center={
                driverTruck?.t_latitude && driverTruck?.t_longitude // Use optional chaining for safety
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
            >
              {/* Markers and DirectionsRenderer are handled by your functions */}
            </GoogleMap>
          )}
        </div>{" "}
        {/* End of Right Panel */}
      </div>{" "}
      {/* End of Main container for the split layout */}
      {/* Your custom scrollbar styles (can be moved to a global CSS file) */}
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

        /* Fix for trip instructions scroll section */
        .trip-instructions {
          max-height: 260px;
          overflow-y: auto;
          padding-right: 8px;
        }

        /* Sticky footer inside the left panel */
        .fixed-nav-buttons {
          position: sticky;
          bottom: 0;
          background: #ffffff;
          padding-top: 12px;
          padding-bottom: 12px;
          margin-top: 12px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          z-index: 10;
        }
              
              `}</style>
    </LoadScript>
  );
};

export default DriverMaps;
