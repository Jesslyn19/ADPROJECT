import React, { useEffect, useState, useRef, useCallback } from "react";
import { LoadScript } from "@react-google-maps/api";
import axios from "axios";
import truckblue from "assets/img/truck-blue.png"; // Ensure these paths are correct relative to where DriverMap.js is
import truckgreen from "assets/img/truck-green.png";

// Constants
const MAP_CONTAINER_STYLE = {
  width: "85%",
  height: "calc(100vh - 250px)",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  backgroundColor: "black",
};

const DEFAULT_ZOOM = 13;
const DEPOT_LOCATION = { lat: 1.4234, lng: 103.6312 }; // Your depot location (e.g., your HQ)

// Custom icons for visual clarity
const TRUCK_ICONS = {
  blue: truckblue,
  orange: truckgreen,
};

const BIN_ICONS = {
  collected: "http://maps.google.com/mapfiles/ms/icons/green-dot.png", // Green dot for collected
  missed: "http://maps.google.com/mapfiles/ms/icons/red-dot.png", // Red dot for missed/uncollected
  active: "http://maps.google.com/mapfiles/ms/icons/orange-dot.png", // Orange dot for current active bin
  default: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png", // Default for pending/other
};

const DriverMaps = () => {
  const currentDriverId = parseInt(localStorage.getItem("userId"));
  const mapDivRef = useRef(null); // Ref for the map container HTML element
  const googleMap = useRef(null); // Ref for the Google Map instance
  const directionsService = useRef(null); // Ref for DirectionsService
  const directionsRenderer = useRef(null); // Ref for DirectionsRenderer
  const markers = useRef([]); // Ref to keep track of custom markers

  // State variables
  const [driverTruck, setDriverTruck] = useState(null);
  const [assignedBins, setAssignedBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGoogleApiLoaded, setIsGoogleApiLoaded] = useState(false);
  const [directionsResult, setDirectionsResult] = useState(null); // Stores the full directions response
  const [currentLegIndex, setCurrentLegIndex] = useState(0); // Tracks the current navigation leg

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // CHANGE THIS LINE: Fetch trucks from an appropriate endpoint
        const [trucksRes, smartbinsRes] = await Promise.all([
          axios.get("http://localhost:5000/api/trucks"), // <--- Change this to your trucks endpoint
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
          const binsForTruck = smartbinsRes.data
            .filter((bin) => bin.t_id === foundTruck.t_id)
            .sort((a, b) => a.sb_sequence - b.sb_sequence);

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

    // Ensure currentDriverId is valid before fetching
    if (currentDriverId) {
      fetchData();
    } else {
      setLoading(false);
      setError("No valid driver ID provided to the map component.");
    }
  }, [currentDriverId]); // Depend on currentDriverId

  // --- Map Initialization and Directions Service Setup ---
  const onGoogleApiLoad = useCallback(() => {
    console.log("onGoogleApiLoad triggered.");
    if (window.google && mapDivRef.current) {
      console.log("window.google and mapDivRef.current are available.");
      googleMap.current = new window.google.maps.Map(mapDivRef.current, {
        center: DEPOT_LOCATION,
        zoom: DEFAULT_ZOOM,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      console.log("Google Map instance created:", googleMap.current); // Check if this logs a map object

      directionsService.current = new window.google.maps.DirectionsService();
      directionsRenderer.current = new window.google.maps.DirectionsRenderer({
        map: googleMap.current,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: "#4285F4",
          strokeOpacity: 0.8,
          strokeWeight: 6,
        },
      });
      setIsGoogleApiLoaded(true);
      console.log("Google Map and services initialized successfully.");
    } else {
      console.error(
        "Failed to initialize map: window.google or mapDivRef.current not ready."
      );
    }
  }, []);

  // --- Route Calculation and Display ---
  const calculateAndDisplayRoute = useCallback(() => {
    console.log("calculateAndDisplayRoute called. State:", {
      isGoogleApiLoaded,
      driverTruck,
      assignedBinsLength: assignedBins.length,
    });
    if (
      !isGoogleApiLoaded ||
      !directionsService.current ||
      !directionsRenderer.current ||
      !driverTruck ||
      assignedBins.length === 0
    ) {
      console.warn(
        "Skipping route calculation: prerequisites not met. Details:",
        {
          isGoogleApiLoaded,
          directionsServiceReady: !!directionsService.current,
          directionsRendererReady: !!directionsRenderer.current,
          driverTruckPresent: !!driverTruck,
          assignedBinsCount: assignedBins.length,
        }
      );
      // ... (rest of the early exit logic)
      return;
    }
    // ... rest of your route calculation logic
    directionsService.current.route(
      // ... route options
      (response, status) => {
        console.log("Directions Service Response Status:", status);
        if (status === "OK" && response) {
          console.log("Directions successful. Route response:", response);
          // ...
        } else {
          console.error(`Directions request failed: ${status}`, response);
          // ...
        }
      }
    );
  }, [isGoogleApiLoaded, driverTruck, assignedBins]);
  // Add custom markers for depot, bins, and current truck position
  const addCustomMarkers = useCallback(
    (response) => {
      if (!googleMap.current || !response) return;

      // Clear existing markers
      markers.current.forEach((marker) => marker.setMap(null));
      markers.current = [];

      const route = response.routes[0];
      const legs = route.legs;

      // Add Depot Marker (Origin if truck starts there)
      const depotMarker = new window.google.maps.Marker({
        position: DEPOT_LOCATION,
        map: googleMap.current,
        icon: {
          url: BIN_ICONS.default, // Using a default blue dot for depot
          scaledSize: new window.google.maps.Size(32, 32),
        },
        title: "Depot (Start Location)",
      });
      markers.current.push(depotMarker);

      // Add Bin Markers
      assignedBins.forEach((bin, index) => {
        // Determine icon based on bin status and current leg
        let binIconUrl = BIN_ICONS.default; // Default icon
        if (bin.sb_status === "Collected") {
          binIconUrl = BIN_ICONS.collected;
        } else if (bin.sb_status === "Missed") {
          binIconUrl = BIN_ICONS.missed;
        }

        // Highlight the current active destination bin
        if (currentLegIndex < legs.length) {
          const nextBinLocation = legs[currentLegIndex].end_location;
          if (
            bin.sb_latitude === nextBinLocation.lat() &&
            bin.sb_longitude === nextBinLocation.lng()
          ) {
            binIconUrl = BIN_ICONS.active; // Use active icon for next destination
          }
        }

        const marker = new window.google.maps.Marker({
          position: { lat: bin.sb_latitude, lng: bin.sb_longitude }, // Use sb_latitude/sb_longitude
          map: googleMap.current,
          icon: {
            url: binIconUrl,
            scaledSize: new window.google.maps.Size(32, 32),
          },
          title: `Bin ID: ${bin.sb_id}\nStatus: ${bin.sb_status}\nSequence: ${bin.sb_sequence}`,
          label: {
            text: String(index + 1), // Label with sequence number
            color: "white",
            fontWeight: "bold",
          },
          zIndex:
            binIconUrl === BIN_ICONS.active
              ? window.google.maps.Marker.MAX_ZINDEX + 1
              : window.google.maps.Marker.MAX_ZINDEX, // Bring active to front
        });
        markers.current.push(marker);
      });

      // Add a dynamic truck marker
      if (driverTruck) {
        // Truck's current actual position from backend or assume start of current leg
        const truckPosition =
          driverTruck.t_latitude && driverTruck.t_longitude
            ? { lat: driverTruck.t_latitude, lng: driverTruck.t_longitude }
            : legs[currentLegIndex]?.start_location || DEPOT_LOCATION;

        const truckMarker = new window.google.maps.Marker({
          position: truckPosition,
          map: googleMap.current,
          icon: {
            url: driverTruck.t_id === 1 ? TRUCK_ICONS.blue : TRUCK_ICONS.orange, // Choose icon based on truck ID
            scaledSize: new window.google.maps.Size(50, 30),
          },
          title: `Your Truck: ${driverTruck.t_plate}`,
          zIndex: window.google.maps.Marker.MAX_ZINDEX + 2, // Ensure truck is always on top
        });
        markers.current.push(truckMarker);
      }
    },
    [assignedBins, currentLegIndex, driverTruck, isGoogleApiLoaded] // isGoogleApiLoaded is needed here if icons depend on it
  );

  // Effect to recalculate and display route when data is loaded
  useEffect(() => {
    if (isGoogleApiLoaded && driverTruck && assignedBins.length > 0) {
      calculateAndDisplayRoute();
    } else if (isGoogleApiLoaded && driverTruck && assignedBins.length === 0) {
      // If truck assigned but no bins, clear route and markers
      if (directionsRenderer.current) {
        directionsRenderer.current.setDirections({ routes: [] });
      }
      markers.current.forEach((marker) => marker.setMap(null));
      markers.current = [];
      setDirectionsResult(null);
      setError("No bins assigned for this truck's route.");
    }
  }, [isGoogleApiLoaded, driverTruck, assignedBins, calculateAndDisplayRoute]);

  // Effect to update markers when currentLegIndex changes (for animation/highlighting)
  useEffect(() => {
    if (googleMap.current && directionsResult && isGoogleApiLoaded) {
      addCustomMarkers(directionsResult);
    }
  }, [currentLegIndex, directionsResult, addCustomMarkers, isGoogleApiLoaded]); // Added isGoogleApiLoaded to dependencies

  // --- Navigation Controls ---
  const handleStartNavigation = () => {
    // If route not yet calculated, calculate it
    if (!directionsResult && driverTruck && assignedBins.length > 0) {
      calculateAndDisplayRoute();
    }
    // Ensure currentLegIndex is at the start
    setCurrentLegIndex(0);
    if (googleMap.current && directionsResult?.routes[0]?.legs[0]) {
      googleMap.current.panTo(
        directionsResult.routes[0].legs[0].start_location
      );
      googleMap.current.setZoom(DEFAULT_ZOOM); // Reset zoom for new leg
    }
  };

  const handleNextDestination = () => {
    if (
      directionsResult &&
      directionsResult.routes[0] &&
      currentLegIndex < directionsResult.routes[0].legs.length - 1
    ) {
      setCurrentLegIndex((prev) => prev + 1);
      // Pan to the start of the next leg for better navigation context
      if (googleMap.current) {
        googleMap.current.panTo(
          directionsResult.routes[0].legs[currentLegIndex + 1].start_location
        );
        googleMap.current.setZoom(DEFAULT_ZOOM); // Reset zoom for new leg
      }
    } else {
      console.log("End of route.");
      setError("Route completed!"); // Indicate completion
    }
  };

  const handlePreviousDestination = () => {
    if (currentLegIndex > 0) {
      setCurrentLegIndex((prev) => prev - 1);
      // Pan to the start of the previous leg
      if (googleMap.current) {
        googleMap.current.panTo(
          directionsResult.routes[0].legs[currentLegIndex - 1].start_location
        );
        googleMap.current.setZoom(DEFAULT_ZOOM); // Reset zoom
      }
    } else {
      console.log("Already at the start of the route.");
    }
  };

  const currentLeg = directionsResult?.routes[0]?.legs[currentLegIndex];
  const nextDestinationAddress = currentLeg?.end_address;
  const nextDestinationBin = currentLeg
    ? assignedBins.find(
        (bin) =>
          bin.sb_latitude === currentLeg.end_location.lat() && // Use sb_latitude/sb_longitude
          bin.sb_longitude === currentLeg.end_location.lng()
      )
    : null;

  // Determine the name of the next destination
  let nextDestinationName = "N/A";
  if (nextDestinationBin) {
    nextDestinationName = `Bin ${nextDestinationBin.sb_id} (Seq: ${nextDestinationBin.sb_sequence})`;
  } else if (
    currentLegIndex === directionsResult?.routes[0]?.legs.length - 1 &&
    assignedBins.length > 0
  ) {
    // This handles the very last leg, which might be back to depot
    nextDestinationName = `Final Bin (${
      assignedBins[assignedBins.length - 1]?.sb_id
    })`;
  } else if (
    currentLegIndex === (directionsResult?.routes[0]?.legs.length || 0)
  ) {
    // If beyond the last leg, indicates route completion or return to depot
    nextDestinationName = "Route Completed";
  }

  console.log(
    "DriverMaps component rendered for currentDriverId:",
    currentDriverId
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-gray-700">Loading driver and map data...</p>
      </div>
    );
  }

  if (error && (!directionsResult || assignedBins.length === 0)) {
    // Only show error if no directions were found AND there are no bins OR data fetching failed.
    // This prevents showing an error immediately if bins are fetched but route is still calculating.
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
    // LoadScript manages the Google Maps API script loading
    <LoadScript
      googleMapsApiKey={"AIzaSyDr4f-WIYP4FsWF7RW-ElMHMvrB_nGNRNo"}
      onLoad={onGoogleApiLoad}
      libraries={["geometry", "places", "marker"]}
    >
      <div className="flex flex-col h-full p-4 bg-white rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">
          Driver Route Map: {driverTruck ? driverTruck.t_plate : "N/A"}
          {driverTruck &&
            driverTruck.driver_name &&
            ` (${driverTruck.driver_name})`}
        </h3>

        <div className="flex-1 mb-4 relative">
          <div ref={mapDivRef} style={MAP_CONTAINER_STYLE}></div>
          {!isGoogleApiLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg z-10">
              <div className="text-lg font-semibold text-gray-700">
                Loading Map...
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-100 p-4 rounded-lg shadow-inner mb-4">
          <h2 className="text-xl font-semibold mb-2 text-gray-800">
            Current Navigation Status
          </h2>
          {directionsResult && currentLeg ? (
            <>
              <p className="text-lg font-medium text-gray-700 mb-2">
                Next Destination:{" "}
                <span className="font-bold text-indigo-600">
                  {nextDestinationName}
                </span>
                <br />
                <span className="text-sm text-gray-500">
                  {nextDestinationAddress}
                </span>
              </p>
              <p className="text-md text-gray-600 mb-2">
                Distance to next: {currentLeg.distance.text} | Time to next:{" "}
                {currentLeg.duration.text}
              </p>
              <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800">
                Instructions for this leg:
              </h3>
              <ul className="list-disc list-inside text-gray-700 max-h-40 overflow-y-auto custom-scroll">
                {currentLeg.steps && currentLeg.steps.length > 0 ? (
                  currentLeg.steps.map((step, index) => (
                    <li
                      key={index}
                      // Clean up instructions for display: replace bold tags
                      dangerouslySetInnerHTML={{
                        __html: step.instructions
                          .replace(/<b>/g, "<strong>")
                          .replace(/<\/b>/g, "</strong>"),
                      }}
                      className="mb-1"
                    ></li>
                  ))
                ) : (
                  <li>No detailed instructions available for this step.</li>
                )}
              </ul>
              <div className="flex justify-between mt-4">
                <button
                  onClick={handlePreviousDestination}
                  disabled={currentLegIndex === 0}
                  className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                >
                  Previous Destination
                </button>
                <button
                  onClick={handleNextDestination}
                  disabled={
                    currentLegIndex >=
                    directionsResult.routes[0].legs.length - 1
                  }
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                >
                  Next Destination
                </button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Click &quot;Start Navigation&quot; to begin your route.
              </p>
              <button
                onClick={handleStartNavigation}
                disabled={
                  loading ||
                  !isGoogleApiLoaded ||
                  !driverTruck ||
                  assignedBins.length === 0 ||
                  error // Disable if there's an error preventing route calc
                }
                className="px-8 py-4 bg-green-500 text-white font-bold text-xl rounded-lg shadow-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
              >
                Start Navigation
              </button>
            </div>
          )}
        </div>

        {/* Custom Scrollbar CSS (can be moved to a global CSS file) */}
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
        `}</style>
      </div>
    </LoadScript>
  );
};

export default DriverMaps;
