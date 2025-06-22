// Maps.js
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  Polygon,
  useJsApiLoader,
} from "@react-google-maps/api";
import axios from "axios";
import { DBSCAN } from "density-clustering";
import truckblue from "assets/img/truck-blue.png";
import truckgreen from "assets/img/truck-green.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTruck,
  faPlay,
  faPause,
  faStop,
} from "@fortawesome/free-solid-svg-icons";
import {
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardHeader,
  Icon,
} from "@material-ui/core";
import GridContainer from "components/Grid/GridContainer.js";
import CardIcon from "components/Card/CardIcon.js";
import GridItem from "components/Grid/GridItem.js";
const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "600px",
};
import { makeStyles } from "@material-ui/core/styles";
import styles from "assets/jss/material-dashboard-react/views/dashboardStyle.js";
const TRUCK_ICONS = {
  blue: truckblue,
  orange: truckgreen,
};

const CLUSTER_COLORS = ["#FF0000", "#00AAFF", "#00CC66", "#9900FF", "#FF9900"];

const DEPOT_LOCATION = { lat: 1.4234, lng: 103.6312 };
const DEFAULT_ZOOM = 13;

const BIN_ICONS = {
  Exist: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
  Deleted: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
};

const clusterBins = (bins) => {
  const dbscan = new DBSCAN();
  const data = bins.map((bin) => [bin.lat, bin.lng]);

  const clustersIdx = dbscan.run(data, 0.003, 2); // eps, minPts
  let clusters = clustersIdx.map((cluster) => {
    const clusteredBins = cluster.map((i) => bins[i]);
    const center = {
      lat:
        clusteredBins.reduce((sum, b) => sum + b.lat, 0) / clusteredBins.length,
      lng:
        clusteredBins.reduce((sum, b) => sum + b.lng, 0) / clusteredBins.length,
    };
    return { center, bins: clusteredBins };
  });

  const noise = dbscan.noise;

  // ✅ Assign noise bins to nearest cluster
  if (clusters.length > 0 && noise.length > 0) {
    noise.forEach((noiseIdx) => {
      const noiseBin = bins[noiseIdx];
      let nearest = { cluster: null, dist: Infinity };

      clusters.forEach((cluster) => {
        const d = Math.hypot(
          cluster.center.lat - noiseBin.lat,
          cluster.center.lng - noiseBin.lng
        );
        if (d < nearest.dist) {
          nearest = { cluster, dist: d };
        }
      });

      if (nearest.cluster) {
        nearest.cluster.bins.push(noiseBin);
        // Recalculate center
        nearest.cluster.center.lat =
          (nearest.cluster.center.lat * (nearest.cluster.bins.length - 1) +
            noiseBin.lat) /
          nearest.cluster.bins.length;
        nearest.cluster.center.lng =
          (nearest.cluster.center.lng * (nearest.cluster.bins.length - 1) +
            noiseBin.lng) /
          nearest.cluster.bins.length;
      }
    });
  }

  // ✅ If no clusters exist, fallback to one general cluster
  if (clusters.length === 0 && bins.length > 0) {
    const center = {
      lat: bins.reduce((sum, b) => sum + b.lat, 0) / bins.length,
      lng: bins.reduce((sum, b) => sum + b.lng, 0) / bins.length,
    };
    clusters = [{ center, bins }];
  }

  return clusters;
};

const assignTrucksToClusters = async (clusters, truckList) => {
  const assignedTrucks = [];
  const truckAssignments = {};

  clusters.forEach((cluster, i) => {
    const truck = truckList[i % truckList.length];
    cluster.bins.forEach((bin) => {
      if (!bin.t_id) {
        if (!truckAssignments[truck.t_id]) truckAssignments[truck.t_id] = [];
        truckAssignments[truck.t_id].push(bin);
        bin.t_id = truck.t_id;
      }
    });
  });

  for (const [t_id, bins] of Object.entries(truckAssignments)) {
    await axios.put(
      "http://localhost:5000/api/assign-truck",
      bins.map((bin) => ({
        sb_id: bin.sb_id,
        t_id: parseInt(t_id),
      }))
    );

    const truck = truckList.find((t) => t.t_id === parseInt(t_id));
    assignedTrucks.push({ truck, bins });
  }

  return assignedTrucks;
};
const useStyles = makeStyles(styles);
const Maps = () => {
  const classes = useStyles();
  const [map, setMap] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [smartbins, setSmartbins] = useState([]);
  const [selectedTruckId, setSelectedTruckId] = useState("all");
  const [routes, setRoutes] = useState({});
  const [positions, setPositions] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clusters, setClusters] = useState([]);
  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().toLocaleString("en-US", { weekday: "long" });
    if (today === "Saturday" || today === "Sunday") {
      return "Monday";
    }
    return today;
  });

  const intervalRefs = useRef({});
  const directionsService = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyDr4f-WIYP4FsWF7RW-ElMHMvrB_nGNRNo",
    libraries: ["geometry", "places", "marker"],
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [truckRes, binRes, userRes] = await Promise.all([
        axios.get("http://localhost:5000/api/trucks"),
        axios.get("http://localhost:5000/api/allsmartbins"),
        axios.get("http://localhost:5000/api/drivers"),
      ]);
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
      setSmartbins(filteredBins);
      const trucksWithBins = truckRes.data.map((truck) => {
        const driver = userRes.data.find((u) => u.u_id === truck.driver_id);
        return {
          ...truck,
          driverName: driver?.u_name || "No Driver",
          bins: filteredBins.filter((bin) => bin.t_id === truck.t_id),
        };
      });
      setTrucks(trucksWithBins);
      setClusters(clusterBins(filteredBins));
      const initialPositions = {};
      trucksWithBins.forEach((truck) => {
        initialPositions[truck.t_id] = DEPOT_LOCATION;
      });
      setPositions(initialPositions);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load data. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [selectedDay]);

  const handleAssignTrucks = async () => {
    const [truckRes] = await Promise.all([
      axios.get("http://localhost:5000/api/trucks"),
    ]);
    await assignTrucksToClusters(clusters, truckRes.data);
    await fetchData();
  };

  useEffect(() => {
    if (isLoaded) {
      directionsService.current = new window.google.maps.DirectionsService();
      fetchData();
    }
  }, [isLoaded, fetchData, selectedDay]);

  useEffect(() => {
    if (isLoaded && map) {
      const calculateRoutes = () => {
        if (!directionsService.current) return; // Prevent race condition

        const newRoutes = {}; // fresh routes container
        const trucksToRoute =
          selectedTruckId === "all"
            ? trucks
            : trucks.filter((t) => t.t_id === Number(selectedTruckId));

        trucksToRoute.forEach((truck) => {
          if (!truck.bins.length) {
            newRoutes[truck.t_id] = []; // clear old route
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
              optimizeWaypoints: true,
            },
            (result, status) => {
              if (status === "OK" && result) {
                const path = result.routes[0].overview_path.map((p) => ({
                  lat: p.lat(),
                  lng: p.lng(),
                }));
                setRoutes((prev) => ({
                  ...prev,
                  [truck.t_id]: path,
                }));
                setPositions((prev) => ({
                  ...prev,
                  [truck.t_id]: path[0],
                }));
              } else {
                console.error(`Route error for truck ${truck.t_id}:`, status);
                setRoutes((prev) => ({
                  ...prev,
                  [truck.t_id]: [],
                }));
              }
            }
          );
        });
      };
      calculateRoutes();
    }
  }, [isLoaded, map, selectedTruckId, trucks]);

  const startAnimation = useCallback(() => {
    if (isPlaying) return;
    setIsPlaying(true);
    const truckIds =
      selectedTruckId === "all"
        ? trucks.map((t) => t.t_id)
        : [Number(selectedTruckId)];

    truckIds.forEach((truckId) => {
      let step = 0;
      clearInterval(intervalRefs.current[truckId]);
      intervalRefs.current[truckId] = setInterval(() => {
        setPositions((prev) => {
          const path = routes[truckId];
          if (!path || step >= path.length) {
            clearInterval(intervalRefs.current[truckId]);
            return {
              ...prev,
              [truckId]: path?.[path.length - 1] || DEPOT_LOCATION,
            };
          }
          return { ...prev, [truckId]: path[step++] };
        });
      }, 50);
    });
  }, [isPlaying, routes, selectedTruckId, trucks]);

  const pauseAnimation = () => {
    setIsPlaying(false);
    Object.values(intervalRefs.current).forEach(clearInterval);
  };

  const resetAnimation = () => {
    setIsPlaying(false);
    Object.values(intervalRefs.current).forEach(clearInterval);
    setPositions((prev) => {
      const newPositions = { ...prev };
      Object.keys(routes).forEach((truckId) => {
        newPositions[truckId] = routes[truckId]?.[0] || DEPOT_LOCATION;
      });
      return newPositions;
    });
  };

  if (!isLoaded) return <div>🗼️ Google Maps API is still loading...</div>;
  if (loading) return <div>Loading map data...</div>;
  if (error) return <div>{error}</div>;

  const center =
    selectedTruckId === "all"
      ? DEPOT_LOCATION
      : trucks.find((t) => t.t_id === Number(selectedTruckId))?.bins[0] ||
        DEPOT_LOCATION;

  const filteredTrucks =
    selectedTruckId === "all"
      ? trucks.filter((t) => t.bins && t.bins.length > 0)
      : trucks.filter((t) => t.t_id === Number(selectedTruckId));

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "16px",
          padding: "16px",
          background: "#fff",
          borderRadius: "8px",
          border: "1px solid #e0e0e0",
        }}
      >
        <Button
          variant="contained"
          color="primary"
          onClick={handleAssignTrucks}
        >
          <FontAwesomeIcon icon={faTruck} style={{ marginRight: "8px" }} />
          Assign Trucks
        </Button>
        <FormControl style={{ minWidth: 150 }}>
          <InputLabel id="day-select-label">Select Day</InputLabel>
          <Select
            labelId="day-select-label"
            id="day-select"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            disabled={loading}
          >
            {daysOfWeek.map((day) => (
              <MenuItem key={day} value={day}>
                {day}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl style={{ minWidth: 200 }}>
          <InputLabel id="truck-select-label">Select Truck</InputLabel>
          <Select
            labelId="truck-select-label"
            id="truck-select"
            value={selectedTruckId}
            onChange={(e) => setSelectedTruckId(e.target.value)}
            disabled={loading}
          >
            <MenuItem value="all">All Trucks</MenuItem>
            {trucks.map((truck) => (
              <MenuItem key={truck.t_id} value={truck.t_id}>
                {truck.t_plate} - {truck.driverName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <div style={{ marginLeft: "auto" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={startAnimation}
            disabled={isPlaying || loading}
            style={{ marginRight: "10px" }}
          >
            <FontAwesomeIcon icon={faPlay} style={{ marginRight: "8px" }} />
            Start
          </Button>
          <Button
            variant="contained"
            color="default"
            onClick={pauseAnimation}
            disabled={!isPlaying || loading}
            style={{ marginRight: "10px" }}
          >
            <FontAwesomeIcon icon={faPause} style={{ marginRight: "8px" }} />
            Pause
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={resetAnimation}
            disabled={loading}
          >
            <FontAwesomeIcon icon={faStop} style={{ marginRight: "8px" }} />
            Reset
          </Button>
        </div>
      </div>
      <GridContainer>
        <GridItem xs={12}>
          <Card>
            <CardHeader color="warning" stats icon>
              <CardIcon color="warning">
                <Icon>map</Icon>
              </CardIcon>
              <p className={classes.cardCategory}>Live Map</p>
              <h3 className={classes.cardTitle}>Truck and Bin Locations</h3>
            </CardHeader>
            <GoogleMap
              mapContainerStyle={MAP_CONTAINER_STYLE}
              center={center}
              zoom={DEFAULT_ZOOM}
              onLoad={setMap}
              options={{ streetViewControl: false }}
            >
              {clusters.map((cluster, index) => {
                const polygonPath = cluster.bins.map((bin) => ({
                  lat: bin.lat,
                  lng: bin.lng,
                }));

                return (
                  <Polygon
                    key={`polygon-${index}`}
                    path={polygonPath}
                    options={{
                      fillColor: CLUSTER_COLORS[index % CLUSTER_COLORS.length],
                      fillOpacity: 0.2,
                      strokeColor:
                        CLUSTER_COLORS[index % CLUSTER_COLORS.length],
                      strokeOpacity: 0.8,
                      strokeWeight: 2,
                      clickable: false,
                      zIndex: 1,
                    }}
                  />
                );
              })}

              {filteredTrucks.map((truck) => (
                <React.Fragment key={truck.t_id}>
                  <Marker
                    position={positions[truck.t_id] || DEPOT_LOCATION}
                    title={`Truck: ${truck.t_plate}\nDriver: ${truck.driverName}`}
                    icon={{
                      url:
                        truck.t_id === 1
                          ? TRUCK_ICONS.blue
                          : TRUCK_ICONS.orange,
                      scaledSize: new window.google.maps.Size(50, 30),
                    }}
                  />
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

              {smartbins.map((bin) => (
                <Marker
                  key={bin.sb_id}
                  position={{ lat: bin.lat, lng: bin.lng }}
                  title={`Bin: ${bin.sb_plate}\nStatus: ${bin.sb_status}`}
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
          </Card>
        </GridItem>
      </GridContainer>
    </div>
  );
};

export default Maps;
