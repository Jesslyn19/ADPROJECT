import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";

// Constants (adjust as needed)
const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "calc(100vh - 250px)",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
};

const DEFAULT_ZOOM = 13;
const DEPOT_LOCATION = { lat: 1.4234, lng: 103.6312 };

const BIN_ICONS = {
  active: {
    path: window.google?.maps.SymbolPath.CIRCLE, // Red circle for active
    scale: 8,
    fillColor: "#FF0000",
    fillOpacity: 1,
    strokeWeight: 1,
  },
  inactive: {
    path: window.google?.maps.SymbolPath.CIRCLE, // Grey circle for inactive
    scale: 8,
    fillColor: "#888888",
    fillOpacity: 1,
    strokeWeight: 1,
  },
  collected: {
    path: window.google?.maps.SymbolPath.CIRCLE, // Green circle for collected
    scale: 8,
    fillColor: "#00FF00",
    fillOpacity: 1,
    strokeWeight: 1,
  },
};

const DriverMap = ({ currentDriverId = 1 }) => {
  const mapDivRef = useRef(null);
  const googleMap = useRef(null);
  const directionsService = useRef(null);
  const directionsRenderer = useRef(null);
  const markers = useRef([]);

  const [driverTruck, setDriverTruck] = useState(null);
  const [assignedBins, setAssignedBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGoogleApiLoaded, setIsGoogleApiLoaded] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [directions, setDirections] = useState(null);

  const GOOGLE_MAPS_API_KEY = "AIzaSyD227H6VuZdZE7RNLjFnq2YWAjfMlNf_z0"; // Your API Key
  const googleMapsUrl = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,directions`;

  useEffect(() => {
    // Check if the script is already loaded to prevent duplicates
    if (window.google && window.google.maps) {
      setIsGoogleApiLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = googleMapsUrl;
    script.async = true;
    script.defer = true; // Use defer for non-blocking load
    script.id = "google-maps-script-driver"; // Give it an ID to prevent duplicates
    document.head.appendChild(script); // Append to head for better practice

    script.onload = () => {
      console.log("Google Maps API script loaded successfully.");
      setIsGoogleApiLoaded(true);
    };

    script.onerror = () => {
      console.error("Failed to load Google Maps API script.");
      setError(
        "Failed to load Google Maps API. Check your network or API key."
      );
    };

    return () => {
      const existingScript = document.getElementById(
        "google-maps-script-driver"
      );
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [googleMapsUrl]);

  // --- Map Initialization ---
  useEffect(() => {
    if (isGoogleApiLoaded && mapDivRef.current && !googleMap.current) {
      googleMap.current = new window.google.maps.Map(mapDivRef.current, {
        center: DEPOT_LOCATION, // Initial center, will be adjusted by route
        zoom: DEFAULT_ZOOM,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      directionsService.current = new window.google.maps.DirectionsService();
      directionsRenderer.current = new window.google.maps.DirectionsRenderer({
        map: googleMap.current, // Attach renderer to the map
        suppressMarkers: true, // We'll add custom markers
        polylineOptions: {
          strokeColor: "#4285F4", // Google Blue
          strokeOpacity: 0.8,
          strokeWeight: 6,
        },
      });
      console.log("Google Map and services initialized.");
    }
  }, [isGoogleApiLoaded]); // Only re-run when isGoogleApiLoaded changes

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [truckRes, binRes] = await Promise.all([
        axios.get("http://localhost:5000/api/trucks"),
        axios.get("http://localhost:5000/api/smartbins"),
      ]);

      const processedBins = binRes.data.map((bin) => ({
        ...bin,
        lat: parseFloat(bin.sb_latitude),
        lng: parseFloat(bin.sb_longitude),
      }));

      const foundTruck = truckRes.data.find(
        (truck) => truck.driver_id === currentDriverId
      );

      if (foundTruck) {
        setDriverTruck(foundTruck);
        const truckBins = processedBins.filter(
          (bin) => bin.t_id === foundTruck.t_id
        );
        setAssignedBins(truckBins);
      } else {
        setDriverTruck(null);
        setAssignedBins([]);
        setError("No truck assigned to this driver or driver not found.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load driver data. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  }, [currentDriverId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Route Calculation and Display ---
  const calculateAndDisplayRoute = useCallback(() => {
    if (
      !isGoogleApiLoaded ||
      !directionsService.current ||
      !directionsRenderer.current ||
      !driverTruck ||
      assignedBins.length === 0
    ) {
      return;
    }

    markers.current.forEach((marker) => marker.setMap(null));
    markers.current = [];

    const waypoints = assignedBins
      .slice(0, assignedBins.length - 1)
      .map((bin) => ({
        location: { lat: bin.lat, lng: bin.lng },
        stopover: true,
      }));

    const origin = DEPOT_LOCATION;
    const destination = assignedBins[assignedBins.length - 1];

    directionsService.current.route(
      {
        origin: origin,
        destination: { lat: destination.lat, lng: destination.lng },
        waypoints: waypoints,
        optimizeWaypoints: true,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (response, status) => {
        if (status === "OK" && response) {
          directionsRenderer.current.setDirections(response);
          setDirections(response);
          setCurrentStep(0);
          addCustomMarkers(response);
          if (googleMap.current) {
            googleMap.current.fitBounds(response.routes[0].bounds);
          }
        } else {
          setError(`Directions request failed: ${status}`);
          console.error("Directions request failed:", status, response);
          setDirections(null);
        }
      }
    );
  }, [isGoogleApiLoaded, driverTruck, assignedBins]);

  const addCustomMarkers = useCallback(
    (response) => {
      if (!googleMap.current || !response) return;

      markers.current.forEach((marker) => marker.setMap(null));
      markers.current = [];

      const route = response.routes[0];
      const legs = route.legs;

      const driverMarker = new window.google.maps.Marker({
        position: DEPOT_LOCATION,
        map: googleMap.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#007BFF",
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "#FFFFFF",
        },
        title: "Current Location (Driver)",
      });
      markers.current.push(driverMarker);

      legs.forEach((leg, index) => {
        const binData = assignedBins.find(
          (bin) =>
            bin.lat === leg.end_location.lat() &&
            bin.lng === leg.end_location.lng()
        );

        const markerIcon = binData
          ? BIN_ICONS[binData.sb_status.toLowerCase()] || BIN_ICONS.active
          : BIN_ICONS.active;
        const markerTitle = binData
          ? `Bin: ${binData.sb_id}\nStatus: ${binData.sb_status}`
          : "Destination";

        const marker = new window.google.maps.Marker({
          position: leg.end_location,
          map: googleMap.current,
          icon: markerIcon,
          title: markerTitle,
          label: {
            text: String.fromCharCode(65 + index),
            color: "white",
            fontWeight: "bold",
          },
        });
        markers.current.push(marker);
      });

      if (
        directions &&
        directions.routes[0] &&
        directions.routes[0].legs[currentStep]
      ) {
        const nextLegEndLocation =
          directions.routes[0].legs[currentStep].end_location;
        const nextDestMarker = markers.current.find(
          (marker) =>
            marker.getPosition().lat() === nextLegEndLocation.lat() &&
            marker.getPosition().lng() === nextLegEndLocation.lng()
        );
        if (nextDestMarker) {
          nextDestMarker.setIcon({
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: "#FFA500",
            fillOpacity: 1,
            strokeWeight: 3,
            strokeColor: "#FFFFFF",
          });
        }
      }
    },
    [assignedBins, directions, currentStep]
  );

  useEffect(() => {
    if (isGoogleApiLoaded && driverTruck && assignedBins.length > 0) {
      calculateAndDisplayRoute();
    } else if (driverTruck && assignedBins.length === 0) {
      setDirections(null);
      markers.current.forEach((marker) => marker.setMap(null));
      markers.current = [];
    }
  }, [isGoogleApiLoaded, driverTruck, assignedBins, calculateAndDisplayRoute]);

  useEffect(() => {
    if (googleMap.current && directions) {
      addCustomMarkers(directions);
    }
  }, [currentStep, directions, addCustomMarkers]);

  const handleNextStep = () => {
    if (
      directions &&
      directions.routes[0] &&
      currentStep < directions.routes[0].legs.length - 1
    ) {
      setCurrentStep((prev) => prev + 1);
      if (googleMap.current) {
        googleMap.current.panTo(
          directions.routes[0].legs[currentStep + 1].start_location
        );
      }
    } else {
      console.log("End of route.");
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      if (googleMap.current) {
        googleMap.current.panTo(
          directions.routes[0].legs[currentStep - 1].start_location
        );
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-600">
        Loading driver and bin data...
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">Error: {error}</div>;
  }

  if (!driverTruck) {
    return (
      <div className="p-6 text-center text-gray-600">
        No truck assigned to this driver.
      </div>
    );
  }

  const currentLeg = directions?.routes[0]?.legs[currentStep];
  const nextDestinationAddress = currentLeg?.end_address;
  const nextDestinationBin = currentLeg
    ? assignedBins.find(
        (bin) =>
          bin.lat === currentLeg.end_location.lat() &&
          bin.lng === currentLeg.end_location.lng()
      )
    : null;

  const nextDestinationName = nextDestinationBin?.sb_id || "Final Destination";

  return (
    <div className="flex flex-col h-full p-4 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-4 text-gray-800">
        Navigation for Truck: {driverTruck.t_plate} ({driverTruck.t_model})
      </h1>

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
        {directions && currentLeg ? (
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
                    dangerouslySetInnerHTML={{ __html: step.instructions }}
                    className="mb-1"
                  ></li>
                ))
              ) : (
                <li>No detailed instructions available for this step.</li>
              )}
            </ul>
            <div className="flex justify-between mt-4">
              <button
                onClick={handlePreviousStep}
                disabled={currentStep === 0}
                className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
              >
                Previous Step
              </button>
              <button
                onClick={handleNextStep}
                disabled={currentStep >= directions.routes[0].legs.length - 1}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
              >
                Next Destination
              </button>
            </div>
          </>
        ) : (
          <p className="text-gray-600">
            Calculating route or no route available for this truck.
          </p>
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
  );
};

import PropTypes from "prop-types";
DriverMap.propTypes = {
  currentDriverId: PropTypes.number,
};

export default DriverMap;
