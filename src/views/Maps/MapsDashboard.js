import React, { useEffect, useState, useRef } from "react";
import { GoogleMap, LoadScript, Marker, Polygon } from "@react-google-maps/api";
import axios from "axios";

import truckblue from "assets/img/truck-blue.png";
import truckgreen from "assets/img/truck-green.png";
import truckorange from "assets/img/truck-orange.png";
import truckpink from "assets/img/truck-pink.png";
import truckpurple from "assets/img/truck-purple.png";
import truckred from "assets/img/truck-red.png";

const containerStyle = {
  width: "100%",
  height: "600px",
};

const center = {
  lat: 1.553,
  lng: 103.643,
};

const START_POINT = { lat: 1.4958, lng: 103.7057 };

const AREA_COLORS = [
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFA500",
  "#800080",
  "#00FFFF",
  "#FFC0CB",
  "#808000",
];

const colorIcons = {
  blue: truckblue,
  green: truckgreen,
  orange: truckorange,
  pink: truckpink,
  purple: truckpurple,
  red: truckred,
};

const getColorName = (hex) => {
  switch (hex) {
    case "#FF0000":
      return "red";
    case "#00FF00":
      return "green";
    case "#0000FF":
      return "blue";
    case "#FFA500":
      return "orange";
    case "#800080":
      return "purple";
    case "#00FFFF":
      return "ltblue";
    case "#FFC0CB":
      return "pink";
    case "#808000":
      return "ltgreen";
    default:
      return "red";
  }
};

const groupBins = (bins, groupSize = 5) => {
  const groups = [];
  for (let i = 0; i < bins.length; i += groupSize) {
    groups.push(bins.slice(i, i + groupSize));
  }
  return groups;
};

const computeConvexHull = (points) => {
  const sorted = [...points].sort((a, b) => a.lng - b.lng || a.lat - b.lat);
  const cross = (o, a, b) =>
    (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);
  const lower = [];
  for (let p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
};

const MapComponent = () => {
  const [smartbins, setSmartbins] = useState([]);
  const [groups, setGroups] = useState([]);
  const [truckRoutes, setTruckRoutes] = useState([]);
  const [truckPositions, setTruckPositions] = useState([]);
  const [steps, setSteps] = useState([]);
  const intervalRefs = useRef([]);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/smartbins")
      .then((response) => {
        const bins = response.data;
        setSmartbins(bins);
        const grouped = groupBins(bins);
        setGroups(grouped);
      })
      .catch((error) => console.error("Error fetching bins:", error));
  }, []);

  const handlePlay = () => {
    const newSteps = [];
    groups.forEach((group, index) => {
      const directionsService = new window.google.maps.DirectionsService();
      const waypoints = group.map((bin) => ({
        location: { lat: bin.sb_latitude, lng: bin.sb_longitude },
        stopover: true,
      }));

      directionsService.route(
        {
          origin: START_POINT,
          destination: START_POINT,
          waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK") {
            const path = result.routes[0].overview_path.map((p) => ({
              lat: p.lat(),
              lng: p.lng(),
            }));
            setTruckRoutes((prev) => {
              const newRoutes = [...prev];
              newRoutes[index] = path;
              return newRoutes;
            });
            setTruckPositions((prev) => {
              const newPositions = [...prev];
              newPositions[index] = path[0];
              return newPositions;
            });

            newSteps[index] = 0;
            intervalRefs.current[index] = setInterval(() => {
              newSteps[index]++;
              if (newSteps[index] < path.length) {
                setTruckPositions((prev) => {
                  const newPositions = [...prev];
                  newPositions[index] = path[newSteps[index]];
                  return newPositions;
                });
              } else {
                clearInterval(intervalRefs.current[index]);
              }
            }, 300);
          }
        }
      );
    });
    setSteps(newSteps);
  };

  const handlePause = () => {
    intervalRefs.current.forEach((interval) => clearInterval(interval));
  };

  const handleResume = () => {
    const updatedSteps = [...steps];
    truckRoutes.forEach((path, index) => {
      if (!path || updatedSteps[index] >= path.length) return;
      intervalRefs.current[index] = setInterval(() => {
        if (updatedSteps[index] < path.length) {
          setTruckPositions((prev) => {
            const newPositions = [...prev];
            newPositions[index] = path[updatedSteps[index]];
            return newPositions;
          });
          updatedSteps[index]++;
        } else {
          clearInterval(intervalRefs.current[index]);
        }
      }, 300);
    });
    setSteps(updatedSteps);
  };

  const handleReset = () => {
    intervalRefs.current.forEach((interval) => clearInterval(interval));
    setTruckRoutes([]);
    setTruckPositions([]);
    setSteps([]);
  };

  return (
    <div>
      <LoadScript googleMapsApiKey="AIzaSyCHoSifBUCDcoEiDXM0UHYM1iXQ09gUukg">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={14}
          options={{
            gestureHandling: "cooperative", // or 'cooperative'
            scrollwheel: false, // allow zooming via scroll
          }}
        >
          <div style={{ position: "absolute", top: 20, right: 60, zIndex: 10 }}>
            <button onClick={handlePlay} style={{ marginRight: "10px" }}>
              ▶ Play
            </button>
            <button onClick={handlePause} style={{ marginRight: "10px" }}>
              ⏸ Pause
            </button>
            <button onClick={handleResume} style={{ marginRight: "10px" }}>
              ⏵ Resume
            </button>
            <button onClick={handleReset}>⏹ Reset</button>
          </div>
          {smartbins.map((bin, index) => (
            <Marker
              key={index}
              position={{ lat: bin.sb_latitude, lng: bin.sb_longitude }}
              icon={{
                url:
                  bin.sb_status === "Collected"
                    ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                    : bin.sb_status === "Collecting"
                    ? "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
                    : "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
              }}
            />
          ))}

          {groups.map((group, index) => {
            const color = AREA_COLORS[index % AREA_COLORS.length];
            const colorName = getColorName(color);
            const points = group.map((bin) => ({
              lat: bin.sb_latitude,
              lng: bin.sb_longitude,
            }));
            const hull = computeConvexHull(points);

            return (
              <React.Fragment key={index}>
                <Polygon
                  paths={hull}
                  options={{
                    fillColor: color,
                    fillOpacity: 0.2,
                    strokeColor: color,
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    clickable: false,
                    editable: false,
                    draggable: false,
                  }}
                />
                {truckPositions[index] && (
                  <Marker
                    position={truckPositions[index]}
                    icon={{
                      url: colorIcons[colorName],
                      scaledSize: new window.google.maps.Size(60, 40),
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </GoogleMap>
      </LoadScript>
    </div>
  );
};

export default MapComponent;
