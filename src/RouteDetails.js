//MOMENTAN FOLOSESC TollCalculator.js DE RouteDetails.js POATE AM NEVOIE MAI TARZIU

// import React, { useEffect, useState } from "react";

// const RouteDetails = ({ startCoordinates, endCoordinates, vehicleType, onTollUpdate }) => {
//   const [tollDetails, setTollDetails] = useState(null);
//   const [duration, setDuration] = useState(null);  // State pentru durata

//   useEffect(() => {
//     if (startCoordinates && endCoordinates) {
//       fetchTollData(startCoordinates, endCoordinates, vehicleType);
//     }
//   }, [startCoordinates, endCoordinates, vehicleType]);

//   const fetchTollData = async (start, end, vehicle) => {
//     const url = `https://router.hereapi.com/v8/routes?transportMode=truck&origin=${start.lat},${start.lng}&destination=${end.lat},${end.lng}&return=tolls,summary&apikey=NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s`;
  
//     try {
//       const response = await fetch(url);
//       const data = await response.json();

//       console.log("TollAPI:", data);

//       if (!data.routes || data.routes.length === 0) {
//         console.error("No routes found");
//         return;
//       }
  
//       let totalCost = 0;
//       let tollList = [];
//       let totalDuration = 0;  // Variabilă pentru a aduna durata totală
  
//       data.routes[0].sections.forEach((section) => {
//         if (section.tolls && section.tolls.length > 0) {
//           section.tolls.forEach((toll) => {
//             toll.fares.forEach((fare) => {
//               totalCost += fare.price.value;
//               tollList.push({
//                 country: toll.countryCode,
//                 name: fare.name,
//                 cost: fare.price.value,
//               });
//             });
//           });
//         }
//         if (section.summary) {
//           totalDuration += section.summary.duration; // Adăugăm durata secțiunii
//         }
//       });
  
//       const hours = Math.floor(totalDuration / 3600);
//       const minutes = Math.floor((totalDuration % 3600) / 60);
//       const formattedDuration = `${hours}h ${minutes}m`;

//       setDuration(formattedDuration);  // Actualizează durata în state
//       setTollDetails({ totalCost, tollList });
//       onTollUpdate({ totalCost, tollList, duration: formattedDuration }); // Trimite și durata în callback
//     } catch (error) {
//       console.error("Error fetching toll data:", error);
//     }
//   };

//   return null;
// };

// export default RouteDetails;
