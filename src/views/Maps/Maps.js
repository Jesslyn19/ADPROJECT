/* import React from "react";

const Maps = () => {
  const mapRef = React.useRef(null);
  React.useEffect(() => {
    let google = window.google;
    let map = mapRef.current;
    let lat = "40.748817";
    let lng = "-73.985428";
    const myLatlng = new google.maps.LatLng(lat, lng);
    const mapOptions = {
      zoom: 12,
      center: myLatlng,
      scrollwheel: false,
      zoomControl: true,
      styles: [
        {
          featureType: "water",
          stylers: [{ saturation: 43 }, { lightness: -11 }, { hue: "#0088ff" }],
        },
        {
          featureType: "road",
          elementType: "geometry.fill",
          stylers: [
            { hue: "#ff0000" },
            { saturation: -100 },
            { lightness: 99 },
          ],
        },
        {
          featureType: "road",
          elementType: "geometry.stroke",
          stylers: [{ color: "#808080" }, { lightness: 54 }],
        },
        {
          featureType: "landscape.man_made",
          elementType: "geometry.fill",
          stylers: [{ color: "#ece2d9" }],
        },
        {
          featureType: "poi.park",
          elementType: "geometry.fill",
          stylers: [{ color: "#ccdca1" }],
        },
        {
          featureType: "road",
          elementType: "labels.text.fill",
          stylers: [{ color: "#767676" }],
        },
        {
          featureType: "road",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#ffffff" }],
        },
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        {
          featureType: "landscape.natural",
          elementType: "geometry.fill",
          stylers: [{ visibility: "on" }, { color: "#b8cb93" }],
        },
        { featureType: "poi.park", stylers: [{ visibility: "on" }] },
        {
          featureType: "poi.sports_complex",
          stylers: [{ visibility: "on" }],
        },
        { featureType: "poi.medical", stylers: [{ visibility: "on" }] },
        {
          featureType: "poi.business",
          stylers: [{ visibility: "simplified" }],
        },
      ],
    };

    map = new google.maps.Map(map, mapOptions);

    const marker = new google.maps.Marker({
      position: myLatlng,
      map: map,
      animation: google.maps.Animation.DROP,
      title: "Material Dashboard React!",
    });

    const contentString =
      '<div class="info-window-content"><h2>Material Dashboard React</h2>' +
      "<p>A premium Admin for React, Material-UI, and React Hooks.</p></div>";

    const infowindow = new google.maps.InfoWindow({
      content: contentString,
    });

    google.maps.event.addListener(marker, "click", function () {
      infowindow.open(map, marker);
    });
  });
  return (
    <>
      <div style={{ height: `100vh` }} ref={mapRef}></div>
    </>
  );
};

export default Maps;
 */

// import React, { useEffect, useState, useRef } from "react";
// import {
//   GoogleMap,
//   LoadScript,
//   Marker,
//   Polygon,
//   Polyline,
// } from "@react-google-maps/api";
// import axios from "axios";

// const Maps = ({ selectedTruck = "all" }) => {
//   const depot = { lat: 1.4234, lng: 103.6312 };
//   const [map, setMap] = useState(null);
//   const [trucks, setTrucks] = useState([]);
//   const intervalRefs = useRef([]);
//   const [isPaused, setIsPaused] = useState(false);

//   const onLoad = (mapInstance) => setMap(mapInstance);
//   //Constant Bin Location
//   const area1Bins = [
//     { id: "1a", lat: 1.530053, lng: 103.668845 },
//     { id: "1b", lat: 1.53124, lng: 103.66858 },
//     { id: "1c", lat: 1.531731, lng: 103.669898 },
//     { id: "1d", lat: 1.526586, lng: 103.670184 },
//     { id: "1e", lat: 1.526013, lng: 103.667911 },
//     { id: "1f", lat: 1.523876, lng: 103.668053 },
//     { id: "1g", lat: 1.522825, lng: 103.664142 },
//     { id: "1h", lat: 1.520497, lng: 103.666702 },
//     { id: "1i", lat: 1.519578, lng: 103.661106 },
//     { id: "1j", lat: 1.516882, lng: 103.658621 },
//     { id: "1k", lat: 1.512625, lng: 103.65647 },
//     { id: "1l", lat: 1.509358, lng: 103.648803 },
//     { id: "1m", lat: 1.507888, lng: 103.652834 },
//   ];

//   const area2Bins = [
//     { id: "2a", lat: 1.4841, lng: 103.7624 },
//     { id: "2b", lat: 1.4815, lng: 103.7582 },
//     { id: "2c", lat: 1.4793, lng: 103.7551 },
//     { id: "2d", lat: 1.477, lng: 103.751 },
//     { id: "2e", lat: 1.478948, lng: 103.747142 },
//     { id: "2f", lat: 1.4738, lng: 103.7459 },
//     { id: "2g", lat: 1.4707, lng: 103.7425 },
//     { id: "2h", lat: 1.4684, lng: 103.7402 },
//     { id: "2i", lat: 1.4659, lng: 103.737 },
//     { id: "2j", lat: 1.4631, lng: 103.7345 },
//   ];

//   const truckData = [
//     {
//       id: "truck1",
//       bins: area1Bins,
//       step: 0,
//       color: "#6a93b4",
//       driver: "Azman Ibrahim",
//       plate: "JBD1234",
//     },
//     {
//       id: "truck2",
//       bins: area2Bins,
//       step: 0,
//       color: "#FFC985",
//       driver: "Nur Aisyah",
//       plate: "JBA5678",
//     },
//     //{ id: "truck3", bins: area3Bins, color: "#0000FF" },
//     //{ id: "truck4", bins: area4Bins, color: "#0000FF" },
//   ];

//   const selectedTruckData =
//     selectedTruck !== "all"
//       ? truckData.find((t) => t.id === selectedTruck)
//       : null;

//   useEffect(() => {
//     const fetchTrucks = async () => {
//       const trucks = ["truck1", "truck2"];
//       const data = await Promise.all(
//         trucks.map((t) =>
//           axios.get(`http://localhost:5000/api/bins/${t}`).then((res) => ({
//             id: t,
//             bins: res.data,
//             color: t === "truck1" ? "#6a93b4" : "#FFC985",
//             driver: t === "truck1" ? "Azman Ibrahim" : "Nur Aisyah",
//             plate: t === "truck1" ? "JBD1234" : "JBA5678",
//             step: 0,
//           }))
//         )
//       );
//       setTrucks(data);
//     };

//     fetchTrucks();
//   }, []);

//   useEffect(() => {
//     if (selectedTruck !== "all" && map) {
//       const truck = trucks.find((t) => t.id === selectedTruck);
//       if (truck && truck.bins && truck.bins.length >= 5) {
//         const targetBin = truck.bins[6];
//         map.setCenter({ lat: targetBin.lat, lng: targetBin.lng });
//         map.setZoom(15); // Adjust zoom level as needed
//       } else if (truck?.path) {
//         // fallback: zoom to bounds of full path
//         const bounds = new window.google.maps.LatLngBounds();
//         truck.path.forEach((p) => bounds.extend(p));
//         map.fitBounds(bounds);
//       }
//     }
//   }, [selectedTruck, map, trucks]);

//   //Simulate Movement
//   useEffect(() => {
//     // Clear any existing intervals
//     intervalRefs.current.forEach(clearInterval);
//     intervalRefs.current = [];

//     if (isPaused || trucks.length === 0) return;

//     const newIntervals = trucks.map((truck, truckIndex) => {
//       let step = 0;
//       let pause = false;

//       return setInterval(() => {
//         if (pause || isPaused) return;

//         const path = truck.path;
//         if (step >= path.length) return;

//         const point = path[step];

//         // Check if near a bin to pause
//         const nearBin = truck.bins.find((bin) => {
//           const dist = Math.sqrt(
//             Math.pow(bin.lat - point.lat(), 2) +
//               Math.pow(bin.lng - point.lng(), 2)
//           );
//           return dist < 0.0005;
//         });

//         if (nearBin) {
//           pause = true;
//           setTimeout(() => {
//             pause = false;
//           }, 2000);
//         }

//         setTrucks((prev) =>
//           prev.map((t) =>
//             t.id === truck.id
//               ? {
//                   ...t,
//                   position: point,
//                   step: step + 1,
//                 }
//               : t
//           )
//         );

//         step++;
//       }, 100);
//     });

//     intervalRefs.current = newIntervals;

//     return () => {
//       newIntervals.forEach(clearInterval);
//     };
//   }, [isPaused, trucks.length]);

//   //Draw Area
//   /* const areaPolygons = [
//     {
//       id: 1,
//       name: "Area 1",
//       color: "#e0218a",
//       paths: [
//         { lat: 1.511537, lng: 103.645896 },
//         { lat: 1.506084, lng: 103.651752 },
//         { lat: 1.50963, lng: 103.654454 },
//         { lat: 1.511143, lng: 103.65997 },
//         { lat: 1.520425, lng: 103.668323 },
//         { lat: 1.535004, lng: 103.679427 },
//         { lat: 1.533722, lng: 103.662874 },
//         { lat: 1.520872, lng: 103.649675 },
//       ],
//     },
//     {
//       id: 2,
//       name: "Area 2",
//       color: "#FF9900",
//       paths: [
//         { lat: 1.460506, lng: 103.737039 },
//         { lat: 1.467456, lng: 103.729486 },
//         { lat: 1.490708, lng: 103.760471 },
//         { lat: 1.482219, lng: 103.766524 },
//       ],
//     },

//   ]; */

//   return (
//     <LoadScript googleMapsApiKey="AIzaSyCHoSifBUCDcoEiDXM0UHYM1iXQ09gUukg">
//       <div
//         style={{
//           position: "absolute",
//           bottom: "20px",
//           left: "50%",
//           transform: "translateX(-50%)",
//           zIndex: 999,
//         }}
//       >
//         <button
//           onClick={() => setIsPaused((prev) => !prev)}
//           style={{
//             backgroundColor: "#F0F0F0",
//             color: "black",
//             border: "2px solid green",
//             borderRadius: "4px",
//             padding: "8px 20px",
//             fontSize: "14px",
//             fontFamily: "Times New Roman, Times, serif",
//           }}
//         >
//           {isPaused ? "Resume Trucks" : "Pause Trucks"}
//         </button>

//         {/* {clickedLatLng && (
//           <div>
//             Lat: {clickedLatLng.lat.toFixed(6)} | Lng:{" "}
//             {clickedLatLng.lng.toFixed(6)}
//           </div>
//         )} */}
//       </div>

//       <GoogleMap
//         mapContainerStyle={{ height: "600px", width: "100%" }}
//         center={depot}
//         zoom={13}
//         onLoad={onLoad}
//       >
//         {trucks.map((truck) => (
//           <React.Fragment key={truck.id}>
//             <Marker
//               position={truck.position}
//               icon={{
//                 url:
//                   truck.id === "truck1"
//                     ? "truck-blue.png"
//                     : "truck-orange.png",
//                 scaledSize: new window.google.maps.Size(60, 40),
//               }}
//             />
//             <Polyline
//               path={truck.path}
//               options={{
//                 strokeColor: truck.color,
//                 strokeWeight: 6,
//                 strokeOpacity: 0.8,
//               }}
//             />
//           </React.Fragment>
//         ))}
//       </GoogleMap>
//     </LoadScript>
//   );
// };
// export default Maps;
