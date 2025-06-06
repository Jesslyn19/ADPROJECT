import React, { useEffect, useState, useRef, useCallback } from "react";
import { LoadScript, GoogleMap } from "@react-google-maps/api"; // Import GoogleMap
import axios from "axios";
import truckblue from "assets/img/truck-blue.png";
import truckgreen from "assets/img/truck-green.png";

// Constants
const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "calc(100vh - 250px)",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
};

const DEFAULT_ZOOM = 13;
const DEPOT_LOCATION = { lat: 1.4234, lng: 103.6312 };

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

const DriverMaps = () => {
  const currentDriverId = parseInt(localStorage.getItem("userId"));
  // const mapDivRef = useRef(null); // No longer directly needed for map init with GoogleMap component
  const googleMapRef = useRef(null); // Ref for the GoogleMap component's map instance
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

    if (currentDriverId) {
      fetchData();
    } else {
      setLoading(false);
      setError("No valid driver ID provided to the map component.");
    }
  }, [currentDriverId]);

  // --- Google Maps API Loading & Map Initialization ---
  // onLoad callback for LoadScript to confirm API is loaded (optional, but good for state)
  const onGoogleApiLoadedFromLoadScript = useCallback(() => {
    console.log("Google Maps API script loaded via LoadScript.");
    setIsGoogleApiLoaded(true);
  }, []);

  // onLoad callback for GoogleMap component to get the map instance
  const onMapLoad = useCallback((map) => {
    googleMapRef.current = map; // Store the map instance
    console.log(
      "GoogleMap component loaded. Map instance:",
      googleMapRef.current
    );

    // Initialize DirectionsService and DirectionsRenderer here
    directionsService.current = new window.google.maps.DirectionsService();
    directionsRenderer.current = new window.google.maps.DirectionsRenderer({
      map: googleMapRef.current, // Pass the map instance
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
    setIsGoogleApiLoaded(false); // Reset API loaded state on unmount
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

    // Ensure truck coordinates are available, otherwise use depot as origin
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
        // Use googleMapRef.current
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
        map: googleMapRef.current, // Use googleMapRef.current
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

        // Highlight the current active destination bin based on sequence
        // Note: This logic assumes bin.sb_sequence matches leg index + 1 for intermediate bins
        // or matches the last bin for the final destination.
        // You might need to adjust this if your sequence numbers don't perfectly map to legs.
        if (
          currentLegIndex < assignedBins.length &&
          index === currentLegIndex
        ) {
          binIconUrl = BIN_ICONS.active;
        }

        const marker = new window.google.maps.Marker({
          position: { lat: bin.sb_latitude, lng: bin.sb_longitude },
          map: googleMapRef.current, // Use googleMapRef.current
          icon: {
            url: binIconUrl,
            scaledSize: new window.google.maps.Size(32, 32),
          },
          title: `Bin ID: ${bin.sb_id}\nStatus: ${bin.sb_status}\nSequence: ${bin.sb_sequence}`,
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
            : (currentLeg && currentLeg.start_location) || DEPOT_LOCATION; // Fallback to current leg start or depot

        const truckMarker = new window.google.maps.Marker({
          position: truckPosition,
          map: googleMapRef.current, // Use googleMapRef.current
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
    [assignedBins, currentLegIndex, driverTruck] // isGoogleApiLoaded no longer needed here as a direct dependency
  );

  // Effect to recalculate and display route when data is loaded
  // Effect to recalculate and display route when data is loaded
  useEffect(() => {
    console.log("Effect: Check for route calculation trigger. State:", {
      isGoogleApiLoaded,
      isMapInstanceReady,
      driverTruckPresent: !!driverTruck,
      assignedBinsCount: assignedBins.length,
    });
    // Ensure both Google Maps API is loaded AND the GoogleMap component has rendered and provided a map instance
    // AND we have truck/bins data.
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
      // If API loaded, truck present but no bins, clear map if necessary
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
        mapReady: !!googleMapRef.current,
      }
    );
    if (googleMapRef.current && directionsResult && isMapInstanceReady) {
      // Check googleMapRef.current here
      addCustomMarkers(directionsResult);
    }
  }, [currentLegIndex, directionsResult, addCustomMarkers, isMapInstanceReady]);

  // --- Navigation Controls ---
  const handleStartNavigation = () => {
    console.log("Start Navigation clicked.");
    if (!directionsResult && driverTruck && assignedBins.length > 0) {
      calculateAndDisplayRoute();
    }
    setCurrentLegIndex(0);
    if (googleMapRef.current && directionsResult?.routes[0]?.legs[0]) {
      googleMapRef.current.panTo(
        directionsResult.routes[0].legs[0].start_location
      );
      googleMapRef.current.setZoom(DEFAULT_ZOOM);
    }
  };

  const handleNextDestination = () => {
    console.log("Next Destination clicked. currentLegIndex:", currentLegIndex);
    if (
      directionsResult &&
      directionsResult.routes[0] &&
      currentLegIndex < directionsResult.routes[0].legs.length - 1
    ) {
      setCurrentLegIndex((prev) => prev + 1);
      if (googleMapRef.current) {
        googleMapRef.current.panTo(
          directionsResult.routes[0].legs[currentLegIndex + 1].start_location
        );
        googleMapRef.current.setZoom(DEFAULT_ZOOM);
      }
    } else {
      console.log("End of route.");
      setError("Route completed!");
    }
  };

  const handlePreviousDestination = () => {
    console.log(
      "Previous Destination clicked. currentLegIndex:",
      currentLegIndex
    );
    if (currentLegIndex > 0) {
      setCurrentLegIndex((prev) => prev - 1);
      if (googleMapRef.current) {
        googleMapRef.current.panTo(
          directionsResult.routes[0].legs[currentLegIndex - 1].start_location
        );
        googleMapRef.current.setZoom(DEFAULT_ZOOM);
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
          bin.sb_latitude === currentLeg.end_location.lat() &&
          bin.sb_longitude === currentLeg.end_location.lng()
      )
    : null;

  let nextDestinationName = "N/A";
  if (nextDestinationBin) {
    nextDestinationName = `Bin ${nextDestinationBin.sb_id} (Seq: ${nextDestinationBin.sb_sequence})`;
  } else if (
    currentLegIndex === directionsResult?.routes[0]?.legs.length - 1 &&
    assignedBins.length > 0
  ) {
    nextDestinationName = `Final Bin (${
      assignedBins[assignedBins.length - 1]?.sb_id
    })`;
  } else if (
    currentLegIndex === (directionsResult?.routes[0]?.legs.length || 0)
  ) {
    nextDestinationName = "Route Completed";
  }

  console.log(
    "DriverMaps component rendered for currentDriverId:",
    currentDriverId,
    "Loading:",
    loading,
    "Error:",
    error,
    "API Loaded:",
    isGoogleApiLoaded
  );

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
  const libraries = ["geometry", "places", "marker"];
  return (
    <LoadScript
      googleMapsApiKey={"AIzaSyDr4f-WIYP4FsWF7RW-ElMHMvrB_nGNRNo"}
      onLoad={onGoogleApiLoadedFromLoadScript}
      libraries={libraries}
      loading="async"
    >
      <div className="flex flex-col h-full p-4 bg-white rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">
          Driver Route Map: {driverTruck ? driverTruck.t_plate : "N/A"}
          {driverTruck &&
            driverTruck.driver_name &&
            ` (${driverTruck.driver_name})`}
        </h3>

        <div className="flex-1 mb-4 relative">
          {/* Use GoogleMap component here */}
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={DEPOT_LOCATION} // Initial center
            zoom={DEFAULT_ZOOM} // Initial zoom
            onLoad={onMapLoad} // Callback when the map instance is ready
            onUnmount={onMapUnmount} // Optional: cleanup on unmount
            options={{
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
            }}
          >
            {/* Any other map components like Markers, Polylines would go here if not handled by DirectionsRenderer */}
          </GoogleMap>

          {!isGoogleApiLoaded && ( // Show loading overlay until LoadScript confirms API loaded
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
                  !isMapInstanceReady || // <--- USE THE NEW STATE VARIABLE HERE
                  !driverTruck ||
                  assignedBins.length === 0 ||
                  error
                }
                className="px-8 py-4 bg-green-500 text-white font-bold text-xl rounded-lg shadow-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
              >
                Start Navigation
              </button>
            </div>
          )}
        </div>

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
