// import React, { useEffect, useRef, useState } from "react";
// import "leaflet/dist/leaflet.css";
// import AutoCompleteInput from "./AutoCompleteInput";
// import TollCalculator from "./TollCalculator";
// import "./App.css";

// const App = () => {
//   const [activeTab, setActiveTab] = useState("input"); // "input" | "results"
//   const [addresses, setAddresses] = useState([]);
//   const [distance, setDistance] = useState(null);
//   const [routes, setRoutes] = useState([]); // Array cu rutele alternative
//   const [selectedRouteIndex, setSelectedRouteIndex] = useState(null);
//   const [vehicleType, setVehicleType] = useState({
//     axles: 5,
//     weight: 40000,
//     EuroPerKm: 0.1, // exemplu
//   });
//   const [routeTaxCosts, setRouteTaxCosts] = useState([]);
//   const [tollCosts, setTollCosts] = useState([]);
//   const [duration, setDuration] = useState(null);
//   const [rawDistance, setRawDistance] = useState(null);
//   const [rawDuration, setRawDuration] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);

//   const mapRef = useRef(null);

//   // Helper pentru calcule
//   const computeRouteMetrics = (route) => {
//     let totalDistance = 0, totalDuration = 0;
//     route.sections.forEach((section) => {
//       if (section.summary) {
//         totalDistance += section.summary.length;
//         totalDuration += section.summary.duration;
//       }
//     });
//     const km = totalDistance / 1000;
//     const costPerKm = km * vehicleType.EuroPerKm;
//     return { totalDistance, totalDuration, km, costPerKm };
//   };

//   // Adaugă adrese
//   const addAddress = (coordsWithLabel) => {
//     setAddresses((prev) => [...prev, coordsWithLabel]);
//   };
//   const moveUp = (index) => {
//     if (index === 0) return;
//     const newArr = [...addresses];
//     [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
//     setAddresses(newArr);
//   };
//   const moveDown = (index) => {
//     if (index === addresses.length - 1) return;
//     const newArr = [...addresses];
//     [newArr[index], newArr[index + 1]] = [newArr[index + 1], newArr[index]];
//     setAddresses(newArr);
//   };
//   const removeAddress = (index) => {
//     const newArr = [...addresses];
//     newArr.splice(index, 1);
//     setAddresses(newArr);
//   };

//   // Obținere rute
//   const getRoute = async () => {
//     if (addresses.length < 2) {
//       alert("Please enter at least two addresses!");
//       return;
//     }
    
//     setIsLoading(true);
    
//     const startCoordinates = addresses[0];
//     const endCoordinates = addresses[addresses.length - 1];
//     const intermediatePoints = addresses.slice(1, addresses.length - 1);
//     try {
//       let url = `https://router.hereapi.com/v8/routes?origin=${startCoordinates.lat},${startCoordinates.lng}`;
//       intermediatePoints.forEach((point) => {
//         url += `&via=${point.lat},${point.lng}`;
//       });
//       url += `&destination=${endCoordinates.lat},${endCoordinates.lng}`;
//       url += `&return=polyline,summary,actions,instructions,tolls`;
//       url += `&alternatives=3`; // max 3 rute alternative
//       url += `&transportMode=truck`;
//       url += `&vehicle[height]=400`;
//       url += `&vehicle[width]=255`;
//       url += `&vehicle[length]=1600`;
//       url += `&truck[axleCount]=${vehicleType.axles}`;
//       url += `&vehicle[grossWeight]=${vehicleType.weight}`;
//       url += `&truck[limitedWeight]=7500`;
//       url += `&tolls[emissionType]=euro6`;
//       url += `&apikey=NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s`;

//       const response = await fetch(url);
//       const data = await response.json();
//       console.log("Raspuns API: ", data);

//       if (!data.routes || data.routes.length === 0) {
//         console.error("No routes found:", data);
//         alert("No routes found for the selected addresses. Try other locations.");
//         setIsLoading(false);
//         return;
//       }

//       setRoutes(data.routes);
      
//       // Initialize costs for each route
//       const initialCosts = Array.from({ length: data.routes.length }, () => 0);
//       setRouteTaxCosts(initialCosts);

//       // Initialize tollCosts for storing tollList
//       const initialTollLists = Array.from({ length: data.routes.length }, () => ({
//         totalCost: 0,
//         tollList: []
//       }));
//       setTollCosts(initialTollLists);

//       setSelectedRouteIndex(0);
//       displayRoute(data.routes[0]);

//       if (data.routes[0].sections && data.routes[0].sections.length > 0) {
//         let totalDistance = 0;
//         let totalDuration = 0;
//         data.routes[0].sections.forEach((section) => {
//           if (section.summary) {
//             totalDistance += section.summary.length;
//             totalDuration += section.summary.duration;
//           }
//         });
//         setDistance((totalDistance / 1000).toFixed(2));
//         setRawDistance(totalDistance);
//         setRawDuration(totalDuration);
//         const hours = Math.floor(totalDuration / 3600);
//         const minutes = Math.floor((totalDuration % 3600) / 60);
//         setDuration(`${hours}h ${minutes}m`);
//       }
//       setActiveTab("results");
//       setIsLoading(false);
//     } catch (error) {
//       console.error("Error fetching route:", error);
//       alert("An error occurred while calculating the route. Please try again.");
//       setIsLoading(false);
//     }
//   };

//   // Afișare rută pe hartă
//   const displayRoute = (route) => {
//     if (!mapRef.current) return;
//     mapRef.current.getObjects().forEach((obj) => mapRef.current.removeObject(obj));
//     route.sections.forEach((section) => {
//       const lineString = window.H.geo.LineString.fromFlexiblePolyline(section.polyline);
//       const routeLine = new window.H.map.Polyline(lineString, {
//         style: { strokeColor: "blue", lineWidth: 4 },
//       });
//       mapRef.current.addObject(routeLine);
//       const boundingBox = routeLine.getBoundingBox();
//       if (boundingBox) {
//         mapRef.current.getViewModel().setLookAtData({ bounds: boundingBox });
//       }
//     });
//   };

//   // Selectare rută
//   const handleRouteSelect = (index) => {
//     setSelectedRouteIndex(index);
//     displayRoute(routes[index]);
//     if (routes[index].sections && routes[index].sections.length > 0) {
//       let totalDistance = 0;
//       let totalDuration = 0;
//       routes[index].sections.forEach((section) => {
//         if (section.summary) {
//           totalDistance += section.summary.length;
//           totalDuration += section.summary.duration;
//         }
//       });
//       setDistance((totalDistance / 1000).toFixed(2));
//       setRawDistance(totalDistance);
//       setRawDuration(totalDuration);
//       const hours = Math.floor(totalDuration / 3600);
//       const minutes = Math.floor((totalDuration % 3600) / 60);
//       setDuration(`${hours}h ${minutes}m`);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     await getRoute();
//   };

//   // Funcție pentru inserarea viastation (un punct intermediar) în lista de adrese
//   const addViaStationToAddresses = (viaStation) => {
//     // Nu permite adăugarea dacă nu există cel puțin o adresă de start și una de sosire
//     if (addresses.length < 2) {
//       alert("You must have at least one starting point and one destination point in advance.");
//       return;
//     }
//     // Inserăm viaStation între primul (start) și ultimul (destinație).
//     // Pentru cea mai simplă variantă, o inserăm pe a doua poziție.
//     setAddresses((prev) => {
//       return [prev[0], viaStation, ...prev.slice(1)];
//     });
//   };

//   // 3) Callback - când TollCalculator calculează costul pt o rută, îl salvăm și într-un array numeric simplu routeTaxCosts, și în tollCosts (pt listă).
//   const updateTollCostForRoute = (index, tollData) => {

//     // actualizăm array-ul numeric
//     setRouteTaxCosts((prev) => {
//       const newArr = [...prev];
//       newArr[index] = tollData.totalCost || 0;
//       return newArr;
//     });

//     // actualizăm array-ul complet
//     setTollCosts((prev) => {
//       const newArr = [...prev];
//       newArr[index] = tollData; // { totalCost, tollList, duration }
//       return newArr;
//     });
//   };

//   // Event listener pentru click dreapta pe hartă
//   useEffect(() => {
//     if (!mapRef.current) return;
//     // Ascultă evenimentul de click dreapta (contextmenu) pe hartă
//     const map = mapRef.current;
//     const onRightClick = (evt) => {
//       // Previne meniul implicit al browserului
//       evt.originalEvent.preventDefault();
    
//       // Folosește currentPointer dacă există, altfel încercă changedPointers[0]
//       const pointer = evt.currentPointer || (evt.changedPointers && evt.changedPointers[0]);
//       if (!pointer) {
//         console.error("No pointer information available in contextmenu event");
//         return;
//       }
    
//       // Transformă coordonatele ecran în coordonate geografice
//       const coord = mapRef.current.screenToGeo(pointer.viewportX, pointer.viewportY);
//       console.log("Right-click at:", coord);
    
//       // Creează obiectul viaStation (poți adăuga și alte proprietăți, precum "isVia")
//       const viaStation = {
//         lat: coord.lat,
//         lng: coord.lng,
//         label: "Via Station", // Pentru o versiune îmbunătățită, apelează un serviciu de reverse geocoding
//         isVia: true,
//       };
    
//       addViaStationToAddresses(viaStation);
//     };
    
//     map.addEventListener("contextmenu", onRightClick);
//     return () => {
//       map.removeEventListener("contextmenu", onRightClick);
//     };
//   }, [addresses]);
  
//   useEffect(() => {
//     if (mapRef.current) return; 
    
//     // Initialize map
//     const platform = new window.H.service.Platform({
//       apikey: "NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s",
//     });
//     const defaultLayers = platform.createDefaultLayers();
//     const map = new window.H.Map(
//       document.getElementById("mapContainer"),
//       defaultLayers.vector.normal.map,
//       { zoom: 6, center: { lat: 44.4268, lng: 26.1025 } }
//     );
//     new window.H.ui.UI.createDefault(map, defaultLayers);
//     new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(map));
//     mapRef.current = map;
    
//     window.addEventListener("resize", () => map.getViewPort().resize());
//     return () => {
//       window.removeEventListener("resize", () => map.getViewPort().resize());
//     };
//   }, [tollCosts, selectedRouteIndex]);

//   // cost per km pt ruta selectată
//   const costPerKmForSelected = () => {
//     if (selectedRouteIndex === null || routes.length === 0) return 0;
//     const { costPerKm } = computeRouteMetrics(routes[selectedRouteIndex]);
//     return costPerKm;
//   };

//   return (
//     <div className="App flex flex-col h-screen">
//       {/* HEADER */}
//       <header className="bg-white shadow-sm p-4 flex items-center justify-between">
//         <div className="flex items-center gap-2">
//           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 2l.01 6L7 8c0 1.333 4 2 4 2s4-.667 4-2l-2-.01V2H9zM3 13h7v7H5.5a2.5 2.5 0 01-2.5-2.5V13zM21 13h-7v7h4.5a2.5 2.5 0 002.5-2.5V13z" />
//           </svg>
//           <h1 className="text-xl font-bold text-gray-800">Rossik Route Calculation</h1>
//         </div>
//       </header>

//       {/* MAIN CONTENT */}
//       <div className="flex flex-row flex-1 overflow-hidden">
//         {/* LEFT SIDE */}
//         <div className="w-1/2 p-4 overflow-auto space-y-4">
//           {/* ROW 1: Address + Vehicle */}
//           <div className="flex space-x-4">
//             <div className="w-1/2 bg-white p-4 rounded shadow-sm">
//               <h2 className="text-lg font-semibold mb-2">Address</h2>
//               <form onSubmit={handleSubmit} className="flex flex-col gap-3">
//                 <div>
//                   <label className="block mb-1 font-medium text-sm text-gray-700">Enter the address:</label>
//                   <AutoCompleteInput
//                     apiKey="NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s"
//                     onSelect={addAddress}
//                   />
//                 </div>
//                 {addresses.length === 0 && <p className="text-sm text-gray-500">No address entered.</p>}
//                 <ul className="border rounded p-2 max-h-40 overflow-y-auto space-y-1">
//                   {addresses.map((point, index) => (
//                     <li key={index} className="flex justify-between items-center">
//                       <div className="text-sm text-gray-800">
//                         {point.isVia ? <em>{point.label}</em> : (point.label || `Lat: ${point.lat}, Lng: ${point.lng}`)}
//                       </div>
//                       <div className="flex gap-2">
//                         <button type="button" onClick={() => moveUp(index)} className="text-xs text-blue-600 hover:underline">Up</button>
//                         <button type="button" onClick={() => moveDown(index)} className="text-xs text-blue-600 hover:underline">Down</button>
//                         <button type="button" onClick={() => removeAddress(index)} className="text-xs text-red-600 hover:underline">X</button>
//                       </div>
//                     </li>
//                   ))}
//                 </ul>
//                 <button
//                   type="submit"
//                   disabled={isLoading}
//                   className={`mt-3 ${isLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"} text-white py-2 px-4 rounded font-semibold text-sm transition-colors`}
//                 >
//                   {isLoading ? "Calculare..." : "Calculate route"}
//                 </button>
//               </form>
//             </div>
//             <div className="w-1/2 bg-white p-4 rounded shadow-sm">
//               <h2 className="text-lg font-semibold mb-2">Vehicle Parameters</h2>
//               <div className="grid grid-cols-1 gap-2">
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Number of axles</label>
//                   <input
//                     type="number"
//                     name="axles"
//                     value={vehicleType.axles}
//                     onChange={(e) => {
//                       const value = parseFloat(e.target.value);
//                       setVehicleType((prev) => ({ ...prev, axles: isNaN(value) ? prev.axles : value }));
//                     }}
//                     min="2"
//                     max="10"
//                     className="border rounded w-full p-1 text-sm"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Tonnage (kg)</label>
//                   <input
//                     type="number"
//                     name="weight"
//                     value={vehicleType.weight}
//                     onChange={(e) => {
//                       const value = parseFloat(e.target.value);
//                       setVehicleType((prev) => ({ ...prev, weight: isNaN(value) ? prev.weight : value }));
//                     }}
//                     min="1000"
//                     max="60000"
//                     className="border rounded w-full p-1 text-sm"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium mb-1">Euro/km</label>
//                   <input
//                     type="number"
//                     inputMode="decimal"
//                     step="0.01"
//                     name="EuroPerKm"
//                     value={vehicleType.EuroPerKm}
//                     onChange={(e) => {
//                       const raw = e.target.value.trim().replace(",", ".");
//                       const parsed = parseFloat(raw);
//                       setVehicleType((prev) => ({ ...prev, EuroPerKm: isNaN(parsed) ? prev.EuroPerKm : parsed }));
//                     }}
//                     min="0"
//                     max="10"
//                     className="border rounded w-full p-1 text-sm"
//                   />
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* ROW 2: Alternative Routes */}
//           {routes.length > 0 && (
//             <div className="w-full bg-white p-4 rounded shadow-sm">
//               <h2 className="text-md font-semibold mb-2">Alternative Routes</h2>
//               <table className="min-w-full text-sm border border-gray-200">
//                 <thead>
//                   <tr className="bg-gray-50">
//                     <th className="px-3 py-2 border">Route</th>
//                     <th className="px-3 py-2 border">Distance (km)</th>
//                     <th className="px-3 py-2 border">Time</th>
//                     <th className="px-3 py-2 border">Price per Km (EUR)</th>
//                     <th className="px-3 py-2 border">Tolls (EUR)</th>
//                     <th className="px-3 py-2 border">Total Cost (EUR)</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {routes.map((rt, index) => {
//                     let altDistance = 0;
//                     let altDuration = 0;
//                     rt.sections.forEach((section) => {
//                       if (section.summary) {
//                         altDistance += section.summary.length;
//                         altDuration += section.summary.duration;
//                       }
//                     });
//                     const km = altDistance / 1000;
//                     const { costPerKm } = computeRouteMetrics(rt);
//                     const hours = Math.floor(altDuration / 3600);
//                     const minutes = Math.floor((altDuration % 3600) / 60);
//                     const displayTime = `${hours}h ${minutes}m`;
//                     const routeTax = routeTaxCosts[index] || 0;
//                     const totalCost = costPerKm + routeTax;
//                     return (
//                       <tr key={index} className={`cursor-pointer ${selectedRouteIndex === index ? "bg-blue-50" : ""} hover:bg-gray-50`} onClick={() => handleRouteSelect(index)}>
//                         <td className="px-3 py-2 border text-center">Route {index + 1}</td>
//                         <td className="px-3 py-2 border text-center">{km.toFixed(2)}</td>
//                         <td className="px-3 py-2 border text-center">{displayTime}</td>
//                         <td className="px-3 py-2 border text-center">{costPerKm.toFixed(2)}</td>
//                         <td className="px-3 py-2 border text-center">{routeTax.toFixed(2)}</td>
//                         <td className="px-3 py-2 border text-center">{totalCost.toFixed(2)}</td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>
//           )}

//           {/* ROW 3: List of aggregated costs + Route Results */}
//           {routes.length > 0 && (
//             <div className="flex space-x-4">
//               <div className="w-1/2 bg-white p-4 rounded shadow-sm">
//                 <h3 className="text-md font-semibold mb-2">List of aggregated costs</h3>
//                 {tollCosts[selectedRouteIndex] &&
//                 tollCosts[selectedRouteIndex].tollList &&
//                 tollCosts[selectedRouteIndex].tollList.length > 0 ? (
//                   <ul className="space-y-1 text-sm text-gray-700 max-h-40 overflow-y-auto">
//                     {tollCosts[selectedRouteIndex].tollList.map((toll, idx) => (
//                       <li key={idx} className={`px-2 py-1 ${idx % 2 === 0 ? "bg-white" : "bg-gray-100"}`}>
//                         {toll.name} - {toll.country}: {toll.cost.toFixed(2)} {toll.currency || "EUR"}
//                       </li>
//                     ))}
//                   </ul>
//                 ) : (
//                   <p className="text-gray-500">Loading toll costs...</p>
//                 )}
//               </div>

//               <div className="w-1/2 bg-white p-4 rounded shadow-sm">
//                 <h3 className="text-md font-semibold mb-2">Route Results</h3>
//                 {distance ? (
//                   <>
//                     <p className="text-sm text-gray-700">
//                       <strong>Distance:</strong> {distance} km
//                     </p>
//                     <p className="text-sm text-gray-700">
//                       <strong>Travel time:</strong> {duration}
//                     </p>
//                     <p className="text-sm text-gray-700">
//                       <strong>Price per Km:</strong>{" "}
//                       {distance && vehicleType.EuroPerKm ? (distance * vehicleType.EuroPerKm).toFixed(2) : "0.00"} EUR
//                     </p>
//                     <p className="text-sm text-gray-700">
//                       <strong>Tolls:</strong> {routeTaxCosts[selectedRouteIndex] ? routeTaxCosts[selectedRouteIndex].toFixed(2) : "0.00"} EUR
//                     </p>
//                     <p className="text-sm text-gray-700 font-semibold">
//                       <strong>Total Cost:</strong>{" "}
//                       {distance && vehicleType.EuroPerKm
//                         ? (costPerKmForSelected() + (routeTaxCosts[selectedRouteIndex] || 0)).toFixed(2)
//                         : routeTaxCosts[selectedRouteIndex]
//                         ? routeTaxCosts[selectedRouteIndex].toFixed(2)
//                         : "0.00"} EUR
//                     </p>
//                   </>
//                 ) : (
//                   <p className="text-gray-500">There are no results available.</p>
//                 )}
//               </div>
//             </div>
//           )}
//         </div>

//         {/* RIGHT SIDE - MAP */}
//         <div className="w-1/2 h-full" id="mapContainer"></div>
//       </div>

//       {/* FOOTER */}
//       <footer className="bg-white border-t border-gray-200 p-4 text-center text-sm text-gray-500">
//         © 2025 Route Truck Wizard - Planificare rute și calcul taxe rutiere pentru camioane
//       </footer>

//       {/* Montăm un TollCalculator (invizibil) pentru fiecare rută */}
//       <div style={{ display: "none" }}>
//         {routes.map((route, index) => (
//           <TollCalculator
//             key={index}
//             startCoordinates={addresses.length >= 2 ? addresses[0] : null}
//             endCoordinates={addresses.length >= 2 ? addresses[addresses.length - 1] : null}
//             intermediatePoints={addresses.length > 2 ? addresses.slice(1, addresses.length - 1) : []}
//             vehicleType={vehicleType}
//             rawDuration={rawDuration}
//             rawDistance={rawDistance}
//             selectedRoute={route}
//             onTollUpdate={(tollData) => updateTollCostForRoute(index, tollData)}
//           />
//         ))}
//       </div>
//     </div>
//   );
// };

// export default App;

return <div>Under maintenance</div>
























// // import React, { useEffect, useRef, useState } from "react";
// // import L from "leaflet";
// // import "leaflet-routing-machine";
// // import "leaflet/dist/leaflet.css";
// // import AutoCompleteInput from "./AutoCompleteInput";
// // import TollCalculator from "./TollCalculator";
// // import "./App.css";

// // const App = () => {
// //   const [activeTab, setActiveTab] = useState("input"); // "input" | "results"
// //   const [addresses, setAddresses] = useState([]);
// //   const [distance, setDistance] = useState(null);
// //   const [routes, setRoutes] = useState([]); // store alternative routes
// //   const [selectedRouteIndex, setSelectedRouteIndex] = useState(null);
// //   const [vehicleType, setVehicleType] = useState({
// //     axles: 5,
// //     weight: 40000,
// //     EuroPerKm: 0,
// //   });
// //   const [tollCost, setTollCost] = useState({ totalCost: 0, tollList: [] });
// //   const [duration, setDuration] = useState(null);
// //   const [rawDistance, setRawDistance] = useState(null);
// //   const [rawDuration, setRawDuration] = useState(null);

// //   const mapRef = useRef(null);

// //   // Callback for adding an address
// //   const addAddress = (coordsWithLabel) => {
// //     setAddresses((prev) => [...prev, coordsWithLabel]);
// //   };

// //   const moveUp = (index) => {
// //     if (index === 0) return;
// //     const newArr = [...addresses];
// //     [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
// //     setAddresses(newArr);
// //   };

// //   const moveDown = (index) => {
// //     if (index === addresses.length - 1) return;
// //     const newArr = [...addresses];
// //     [newArr[index], newArr[index + 1]] = [newArr[index + 1], newArr[index]];
// //     setAddresses(newArr);
// //   };

// //   const removeAddress = (index) => {
// //     const newArr = [...addresses];
// //     newArr.splice(index, 1);
// //     setAddresses(newArr);
// //   };

// //   const getRoute = async () => {
// //     if (addresses.length < 2) {
// //       alert("Te rog introdu cel puțin două adrese!");
// //       return;
// //     }
// //     const startCoordinates = addresses[0];
// //     const endCoordinates = addresses[addresses.length - 1];
// //     const intermediatePoints = addresses.slice(1, addresses.length - 1);

// //     try {
// //       // Add alternative route support if available – adjust parameters as needed.
// //       let url = `https://router.hereapi.com/v8/routes?origin=${startCoordinates.lat},${startCoordinates.lng}`;
// //       intermediatePoints.forEach((point) => {
// //         url += `&via=${point.lat},${point.lng}`;
// //       });
// //       url += `&destination=${endCoordinates.lat},${endCoordinates.lng}`;
// //       url += `&return=polyline,summary,actions,instructions,tolls`;
// //       url += `&alternatives=3`; // request 3 alternative routes (if supported by your plan)
// //       url += `&transportMode=truck`;
// //       url += `&vehicle[height]=400`;
// //       url += `&vehicle[width]=255`;
// //       url += `&vehicle[length]=1600`;
// //       url += `&truck[axleCount]=${vehicleType.axles}`;
// //       url += `&vehicle[grossWeight]=${vehicleType.weight}`;
// //       url += `&tolls[emissionType]=euro6`;
// //       url += `&apikey=NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s`;

// //       const response = await fetch(url);
// //       const data = await response.json();

// //       if (!data.routes || data.routes.length === 0) {
// //         console.error("No routes found:", data);
// //         return;
// //       }

// //       // Save the alternative routes in state
// //       setRoutes(data.routes);
// //       // For now select the first route by default
// //       setSelectedRouteIndex(0);

// //       // Use the first route for display on the map and summary calculations
// //       displayRoute(data.routes[0]);

// //       if (data.routes[0].sections && data.routes[0].sections.length > 0) {
// //         let totalDistance = 0;
// //         let totalDuration = 0;
// //         data.routes[0].sections.forEach((section) => {
// //           if (section.summary) {
// //             totalDistance += section.summary.length;
// //             totalDuration += section.summary.duration;
// //           }
// //         });
// //         setDistance((totalDistance / 1000).toFixed(2));
// //         setRawDistance(totalDistance);
// //         setRawDuration(totalDuration);

// //         const hours = Math.floor(totalDuration / 3600);
// //         const minutes = Math.floor((totalDuration % 3600) / 60);
// //         setDuration(`${hours}h ${minutes}m`);
// //       }

// //       setActiveTab("results");
// //     } catch (error) {
// //       console.error("Error fetching route:", error);
// //     }
// //   };

// //   const displayRoute = (route) => {
// //     if (!mapRef.current) return;
// //     mapRef.current.getObjects().forEach((obj) => mapRef.current.removeObject(obj));
// //     route.sections.forEach((section) => {
// //       const lineString = window.H.geo.LineString.fromFlexiblePolyline(section.polyline);
// //       const routeLine = new window.H.map.Polyline(lineString, {
// //         style: { strokeColor: "blue", lineWidth: 6 },
// //       });
// //       mapRef.current.addObject(routeLine);
// //       const boundingBox = routeLine.getBoundingBox();
// //       if (boundingBox) {
// //         mapRef.current.getViewModel().setLookAtData({ bounds: boundingBox });
// //       }
// //     });
// //   };

// //   // This callback is triggered when TollCalculator returns the toll details
// //   const handleTollUpdate = (tollData) => {
// //     // IMPORTANT: Check if you are dividing the toll cost by 2.
// //     // Remove any division so that the full toll is used.
// //     setTollCost(tollData);
// //     if (tollData.duration) {
// //       setDuration(tollData.duration);
// //     }
// //   };

// //   // When an alternative row is clicked, update the map and toll info:
// //   const handleRouteSelect = (index) => {
// //     setSelectedRouteIndex(index);
// //     displayRoute(routes[index]);
// //     // Recalculate the summary for the selected route:
// //     if (routes[index].sections && routes[index].sections.length > 0) {
// //       let totalDistance = 0;
// //       let totalDuration = 0;
// //       routes[index].sections.forEach((section) => {
// //         if (section.summary) {
// //           totalDistance += section.summary.length;
// //           totalDuration += section.summary.duration;
// //         }
// //       });
// //       setDistance((totalDistance / 1000).toFixed(2));
// //       setRawDistance(totalDistance);
// //       setRawDuration(totalDuration);
// //       const hours = Math.floor(totalDuration / 3600);
// //       const minutes = Math.floor((totalDuration % 3600) / 60);
// //       setDuration(`${hours}h ${minutes}m`);
// //     }
// //     // If needed, trigger TollCalculator update for the selected route.
// //     // This depends on how TollCalculator is implemented.
// //   };

// //   const handleSubmit = async (e) => {
// //     e.preventDefault();
// //     await getRoute();
// //   };

// //   useEffect(() => {
// //     if (mapRef.current) return;
// //     const platform = new window.H.service.Platform({
// //       apikey: "NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s",
// //     });
// //     const defaultLayers = platform.createDefaultLayers();
// //     const map = new window.H.Map(
// //       document.getElementById("mapContainer"),
// //       defaultLayers.vector.normal.map,
// //       { zoom: 6, center: { lat: 44.4268, lng: 26.1025 } }
// //     );
// //     new window.H.ui.UI.createDefault(map, defaultLayers);
// //     new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(map));
// //     mapRef.current = map;
// //     window.addEventListener("resize", () => map.getViewPort().resize());
// //     return () => {
// //       window.removeEventListener("resize", () => map.getViewPort().resize());
// //     };
// //   }, []);

// //   return (
// //     <div className="App flex flex-col h-screen">
// //       {/* HEADER */}
// //       <header className="bg-white shadow-sm p-4 flex items-center justify-between">
// //         <div className="flex items-center gap-2">
// //           <svg
// //             xmlns="http://www.w3.org/2000/svg"
// //             className="h-6 w-6 text-blue-600"
// //             fill="none"
// //             viewBox="0 0 24 24"
// //             stroke="currentColor"
// //           >
// //             <path
// //               strokeLinecap="round"
// //               strokeLinejoin="round"
// //               strokeWidth={2}
// //               d="M9 2l.01 6L7 8c0 1.333 4 2 4 2s4-.667 4-2l-2-.01V2H9zM3 13h7v7H5.5a2.5 2.5 0 01-2.5-2.5V13zM21 13h-7v7h4.5a2.5 2.5 0 002.5-2.5V13z"
// //             />
// //           </svg>
// //           <h1 className="text-xl font-bold text-gray-800">Rossik Route Calculation</h1>
// //         </div>
// //       </header>
  
// //       {/* MAIN CONTENT: LEFT (rows) + RIGHT (map) */}
// //       <div className="flex flex-row flex-1 overflow-hidden">
        
// //         {/* LEFT SIDE (50% width) */}
// //         <div className="w-1/2 p-4 overflow-auto space-y-4">
          
// //           {/* ROW 1: Two columns – Adress + Vehicle Parameters */}
// //           <div className="flex space-x-4">
            
// //             {/* Adress column (50% of Row 1) */}
// //             <div className="w-1/2 bg-white p-4 rounded shadow-sm">
// //               <h2 className="text-lg font-semibold mb-2">Address</h2>
// //               <form onSubmit={handleSubmit} className="flex flex-col gap-3">
// //                 <div>
// //                   <label className="block mb-1 font-medium text-sm text-gray-700">
// //                     Enter the address:
// //                   </label>
// //                   <AutoCompleteInput
// //                     apiKey="NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s"
// //                     onSelect={addAddress}
// //                   />
// //                 </div>
// //                 {addresses.length === 0 && (
// //                   <p className="text-sm text-gray-500">No address entered.</p>
// //                 )}
// //                 <ul className="border rounded p-2 max-h-40 overflow-y-auto space-y-1">
// //                   {addresses.map((point, index) => (
// //                     <li key={index} className="flex justify-between items-center">
// //                       <div className="text-sm text-gray-800">
// //                         {point.label || `Lat: ${point.lat}, Lng: ${point.lng}`}
// //                       </div>
// //                       <div className="flex gap-2">
// //                         <button
// //                           type="button"
// //                           onClick={() => moveUp(index)}
// //                           className="text-xs text-blue-600 hover:underline"
// //                         >
// //                           Up
// //                         </button>
// //                         <button
// //                           type="button"
// //                           onClick={() => moveDown(index)}
// //                           className="text-xs text-blue-600 hover:underline"
// //                         >
// //                           Down
// //                         </button>
// //                         <button
// //                           type="button"
// //                           onClick={() => removeAddress(index)}
// //                           className="text-xs text-red-600 hover:underline"
// //                         >
// //                           X
// //                         </button>
// //                       </div>
// //                     </li>
// //                   ))}
// //                 </ul>
  
// //                 <button
// //                   type="submit"
// //                   className="mt-3 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded font-semibold text-sm"
// //                 >
// //                   Calculate route
// //                 </button>
// //               </form>
// //             </div>
  
// //             {/* Vehicle Parameters column (50% of Row 1) */}
// //             <div className="w-1/2 bg-white p-4 rounded shadow-sm">
// //               <h2 className="text-lg font-semibold mb-2">Vehicle Parameters</h2>
// //               <div className="grid grid-cols-1 gap-2">
// //                 {/* Number of axles */}
// //                 <div>
// //                   <label className="block text-sm font-medium mb-1">Number of axles</label>
// //                   <input
// //                     type="number"
// //                     name="axles"
// //                     value={vehicleType.axles}
// //                     onChange={(e) => {
// //                       const value = parseFloat(e.target.value);
// //                       setVehicleType((prev) => ({
// //                         ...prev,
// //                         axles: isNaN(value) ? prev.axles : value,
// //                       }));
// //                     }}
// //                     min="2"
// //                     max="10"
// //                     className="border rounded w-full p-1 text-sm"
// //                   />
// //                 </div>
  
// //                 {/* Tonnage */}
// //                 <div>
// //                   <label className="block text-sm font-medium mb-1">Tonnage (kg)</label>
// //                   <input
// //                     type="number"
// //                     name="weight"
// //                     value={vehicleType.weight}
// //                     onChange={(e) => {
// //                       const value = parseFloat(e.target.value);
// //                       setVehicleType((prev) => ({
// //                         ...prev,
// //                         weight: isNaN(value) ? prev.weight : value,
// //                       }));
// //                     }}
// //                     min="1000"
// //                     max="60000"
// //                     className="border rounded w-full p-1 text-sm"
// //                   />
// //                 </div>
  
// //                 {/* Euro per km */}
// //                 <div>
// //                   <label className="block text-sm font-medium mb-1">Euro/km</label>
// //                   <input
// //                     type="number"
// //                     inputMode="decimal"
// //                     step="0.01"
// //                     name="EuroPerKm"
// //                     value={vehicleType.EuroPerKm}
// //                     onChange={(e) => {
// //                       const raw = e.target.value.trim().replace(",", ".");
// //                       const parsed = parseFloat(raw);
// //                       setVehicleType((prev) => ({
// //                         ...prev,
// //                         EuroPerKm: isNaN(parsed) ? prev.EuroPerKm : parsed,
// //                       }));
// //                     }}
// //                     min="0"
// //                     max="10"
// //                     className="border rounded w-full p-1 text-sm"
// //                   />
// //                 </div>
// //               </div>
// //             </div>
// //           </div>
  
// //           {/* ROW 2: Alternative Routes (full width of left side) */}
// //           {routes.length > 0 && (
// //             <div className="w-full bg-white p-4 rounded shadow-sm">
// //               <h2 className="text-md font-semibold mb-2">Alternative Routes</h2>
// //               <table className="min-w-full text-sm border border-gray-200">
// //                 <thead>
// //                   <tr className="bg-gray-50">
// //                     <th className="px-3 py-2 border">Route</th>
// //                     <th className="px-3 py-2 border">Distance (km)</th>
// //                     <th className="px-3 py-2 border">Time</th>
// //                     <th className="px-0 py-2 border">Price per Km (EUR)</th>
// //                     <th className="px-3 py-2 border">Tolls (EUR)</th>
// //                     <th className="px-3 py-2 border">Total Cost (EUR)</th>
// //                   </tr>
// //                 </thead>
// //                 <tbody>
// //                   {routes.map((rt, index) => {
// //                     // Summaries for this route
// //                     let altDistance = 0;
// //                     let altDuration = 0;
// //                     rt.sections.forEach((section) => {
// //                       if (section.summary) {
// //                         altDistance += section.summary.length;
// //                         altDuration += section.summary.duration;
// //                       }
// //                     });
// //                     const km = (altDistance / 1000).toFixed(2);
// //                     const hours = Math.floor(altDuration / 3600);
// //                     const minutes = Math.floor((altDuration % 3600) / 60);
// //                     const displayTime = `${hours}h ${minutes}m`;
  
// //                     // Example toll calculation
// //                     const tolls = rt.tolls
// //                       ? rt.tolls.reduce((acc, toll) => acc + (toll.fares[0].price.value || 0), 0)
// //                       : 0;
// //                     const costPerKm = km * (vehicleType.EuroPerKm || 0);
// //                     const totalCost = tolls + costPerKm;
  
// //                     return (
// //                       <tr
// //                         key={index}
// //                         className={`cursor-pointer ${selectedRouteIndex === index ? "bg-blue-50" : ""}`}
// //                         onClick={() => handleRouteSelect(index)}
// //                       >
// //                         <td className="px-3 py-2 border text-center">Route {index + 1}</td>
// //                         <td className="px-3 py-2 border text-center">{km}</td>
// //                         <td className="px-3 py-2 border text-center">{displayTime}</td>
// //                         <td className="px-3 py-2 border text-center">{totalCost.toFixed(2)}</td>
// //                         <td className="px-3 py-2 border text-center">{tollCost.totalCost.toFixed(2)}</td>
// //                         <td className="px-3 py-2 border text-center">{distance && vehicleType.EuroPerKm
// //                         ? (distance * vehicleType.EuroPerKm + tollCost.totalCost).toFixed(2)
// //                         : tollCost.totalCost.toFixed(2)}</td>

// //                       </tr>
// //                     );
// //                   })}
// //                 </tbody>
// //               </table>
// //             </div>
// //           )}
  
// //           {/* ROW 3: Two columns – List of aggregated costs + Route Results */}
// //           {routes.length > 0 && (
// //             <div className="flex space-x-4">
// //               {/* List of aggregated costs */}
// //               <div className="w-1/2 bg-white p-4 rounded shadow-sm">
// //                 <h3 className="text-md font-semibold mb-2">List of aggregated costs</h3>
// //                 {tollCost?.tollList?.length > 0 ? (
// //                   <ul className="space-y-1 text-sm text-gray-700 max-h-40 overflow-y-auto">
// //                     {tollCost.tollList.map((toll, index) => (
// //                       <li 
// //                       key={index}
// //                       className={`px-2 py-1 ${index % 2 === 0 ? "bg-white" : "bg-gray-100"}`}
// //                       >
// //                         {toll.name} - {toll.country}: {toll.cost.toFixed(2)} {"EUR"}
// //                       </li>
// //                     ))}
// //                   </ul>
// //                 ) : (
// //                   <p className="text-gray-500">No individual fees available.</p>
// //                 )}
// //               </div>
  
// //               {/* Route Results */}
// //               <div className="w-1/2 bg-white p-4 rounded shadow-sm">
// //                 <h3 className="text-md font-semibold mb-2">Route Results</h3>
// //                 {distance ? (
// //                   <>
// //                     <p className="text-sm text-gray-700">
// //                       <strong>Distance:</strong> {distance} km
// //                     </p>
// //                     <p className="text-sm text-gray-700">
// //                       <strong>Travel time:</strong> {duration}
// //                     </p>
// //                     <p className="text-sm text-gray-700">
// //                       <strong>Price per Km:</strong>{" "}
// //                       {distance && vehicleType.EuroPerKm
// //                         ? (distance * vehicleType.EuroPerKm).toFixed(2)
// //                         : 0}{" "}
// //                       EUR
// //                     </p>
// //                     <p className="text-sm text-gray-700">
// //                       <strong>Tolls:</strong> {tollCost.totalCost.toFixed(2)} EUR
// //                     </p>
// //                     <p className="text-sm text-gray-700">
// //                       <strong>Total Cost:</strong>{" "}
// //                       {distance && vehicleType.EuroPerKm
// //                         ? (distance * vehicleType.EuroPerKm + tollCost.totalCost).toFixed(2)
// //                         : tollCost.totalCost.toFixed(2)}{" "}
// //                       EUR
// //                     </p>
// //                   </>
// //                 ) : (
// //                   <p className="text-gray-500">There are no results available.</p>
// //                 )}
// //               </div>
// //             </div>
// //           )}
// //         </div>
  
// //         {/* RIGHT SIDE (50% width) – MAP */}
// //         <div className="w-1/2 h-full" id="mapContainer">
// //         </div>
// //       </div>
  
// //       {/* FOOTER */}
// //       <footer className="bg-white border-t border-gray-200 p-4 text-center text-sm text-gray-500">
// //         © 2025 Route Truck Wizard - Planificare rute și calcul taxe rutiere pentru camioane
// //       </footer>
  
// //       {/* TollCalculator logic */}
// //       <TollCalculator
// //         startCoordinates={addresses.length >= 2 ? addresses[0] : null}
// //         endCoordinates={addresses.length >= 2 ? addresses[addresses.length - 1] : null}
// //         intermediatePoints={addresses.length > 2 ? addresses.slice(1, addresses.length - 1) : []}
// //         vehicleType={vehicleType}
// //         rawDuration={rawDuration}
// //         rawDistance={rawDistance}
// //         onTollUpdate={handleTollUpdate}
// //         // Use selectedRouteIndex to send the selected route if desired
// //         selectedRoute={selectedRouteIndex !== null ? routes[selectedRouteIndex] : null}
// //       />
// //     </div>
// //   );
  
// // };

// // export default App;

