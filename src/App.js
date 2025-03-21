import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet/dist/leaflet.css";
import AutoCompleteInput from "./AutoCompleteInput";
import TollCalculator from "./TollCalculator"; // Importăm TollCalculator
import "./App.css";

const App = () => {
  const [startCoordinates, setStartCoordinates] = useState(null);
  const [endCoordinates, setEndCoordinates] = useState(null);
  const [distance, setDistance] = useState(null);
  const [vehicleType, setVehicleType] = useState({ axles: 5, weight: 30000 });
  const [tollCost, setTollCost] = useState({ totalCost: 0, tollList: [] }); // Adăugăm obiectul cu detalii
  const [intermediateCoordinates, setIntermediateCoordinates] = useState(null);
  const mapRef = useRef(null);
  const routingControlRef = useRef(null);
  const [duration, setDuration] = useState(null);
  const [rawDistance, setRawDistance] = useState(null);
  const [rawDuration, setRawDuration] = useState(null);


  const handleVehicleTypeChange = (e) => {
    const { name, value } = e.target;
    setVehicleType((prev) => ({
      ...prev,
      [name]: Number(value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (startCoordinates && endCoordinates && vehicleType.axles && vehicleType.weight) {
      await getRoute(startCoordinates, intermediateCoordinates, endCoordinates, vehicleType);
    }
     else {
      alert("Te rog selectează locațiile pentru plecare și destinație!");
    }
  };

  // Funcția pentru calculul rutei:
  const getRoute = async (start, intermediate, end, vehicleType) => {
    let url = `https://router.hereapi.com/v8/routes?origin=${start.lat},${start.lng}&destination=${end.lat},${end.lng}`;
    // Adaugă punctul intermediar doar dacă există
    if (intermediate) {
      url += `&via=${intermediate.lat},${intermediate.lng}`;
    }
    url += `&return=polyline,summary,actions,instructions,tolls`
    url += `&transportMode=truck`;
    url += `&vehicle[axleCount]=5`;
    url += `&vehicle[grossWeight]=40000`;
    url += `&apikey=NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s`;
    
    /*url += `&return=summary,tolls,truckRoadTypes,polyline`;
    url += `&spans=truckRoadTypes`;
    url += `&transportMode=truck&vehicle[axleCount]=${vehicleType.axles}`;
    url += `&exclude[countries]=CHE`;
    url += `&apikey=NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s`;*/

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      //console.log("Data received from API:", data);

      if (!data.routes || data.routes.length === 0) {
        console.error("No routes found:", data);
        return;
      }
      
        if (data.routes && data.routes.length > 0) {
          console.log(data.routes);
          displayRoute(data.routes[0]);
        }
      
      const route = data.routes[0];
      if (route.sections && route.sections.length > 0) {
        const section = route.sections[0];
        if (section.summary) {
          const totalDistance = section.summary.length;
          setDistance((totalDistance / 1000).toFixed(2)); // Convertim în km
          const hours = Math.floor(section.summary.duration / 3600);
          const minutes = Math.floor((section.summary.duration % 3600) / 60);
          setDuration(`${hours}h ${minutes}m`);
          setRawDuration(section.summary.duration);
        }
      }
    } catch (error) {
      console.error("Error fetching route:", error);
    }
  };


  const displayRoute = (route) => {
    if (!mapRef.current) return;

    // Șterge rutele și marcatorii anteriori
    mapRef.current.getObjects().forEach((obj) => mapRef.current.removeObject(obj));

    //let newWaypoints = [...waypoints]; // Menține waypoints existente
    let routeLine;

    route.sections.forEach((section) => {
      const lineString = window.H.geo.LineString.fromFlexiblePolyline(section.polyline);
      routeLine = new window.H.map.Polyline(lineString, {
        style: { strokeColor: "blue", lineWidth: 6 },
      });

      /*newWaypoints.forEach((point) => {
        let marker = new window.H.map.Marker(point, { volatility: true });
        marker.draggable = true;
        mapRef.current.addObject(marker);
        
      });*/

      mapRef.current.addObject(routeLine);

      // Ajustează harta pentru a include întreaga rută
      const boundingBox = routeLine.getBoundingBox();
      if (boundingBox) {
        mapRef.current.getViewModel().setLookAtData({ bounds: boundingBox });
      }

      
      
    });
    
  };
  
  
  
  const handleTollUpdate = (tollData) => {
    setTollCost(tollData);
    setDuration(tollData.duration); // Actualizează durata
  };
  

  useEffect(() => {
    if (mapRef.current) return;

    const platform = new window.H.service.Platform({
      apikey: "NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s",
    });
    const defaultLayers = platform.createDefaultLayers();

    const map = new window.H.Map(
      document.getElementById("mapContainer"),
      defaultLayers.vector.normal.map,
      { zoom: 10, center: { lat: 44.4268, lng: 26.1025 } }
    );

    new window.H.ui.UI.createDefault(map, defaultLayers);

    // Enable interactions
    const behavior = new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(map));

    // Add UI controls
    const ui = window.H.ui.UI.createDefault(map, defaultLayers);

    
    mapRef.current = map;

    window.addEventListener("resize", () => map.getViewPort().resize());

    return () => window.addEventListener("resize", () => map.getViewPort().resize());
  }, []);
  

  return (
    <div className="App">
      <h1>Calculare Rută Camion</h1>
      <div className="container">
        <div className="sidebar">
          <form onSubmit={handleSubmit}>
            <label>
              Locație plecare:
              <AutoCompleteInput apiKey="ykLQWx4MFaivuUY1XxQzByycPVwKT4ERPsvB4a830oE" iconUrl = "/green_arrow.jpg" onSelect={setStartCoordinates} />
            </label>
            <label>
              Locație destinație:
              <AutoCompleteInput apiKey="ykLQWx4MFaivuUY1XxQzByycPVwKT4ERPsvB4a830oE" iconUrl = "/red_arrow.jpg" onSelect={setEndCoordinates} />
            </label>
            <label>
              Numar de axe:
              <input type="number" name="axles" value={vehicleType.axles} onChange={handleVehicleTypeChange} min="2" max="10" />
            </label>
            <label>
              Tonaj (kg):
              <input type="number" name="weight" value={vehicleType.weight} onChange={handleVehicleTypeChange} min="1000" max="40000" />
            </label>
            <label>
              Euro per km:
              <input type="decimal" name="EuroPerKm" onChange={handleVehicleTypeChange} min="0" max="10" />
            </label>
            <button type="submit">Calculare rută</button>
          </form>

          {/* Afișăm detaliile taxelor */}
          <h3>Detalii Taxe Rutiere</h3>
          <p><strong>Distanta:</strong> {distance} km</p>
          <p><strong>Durata deplasării:</strong> {duration}</p>
          <p><strong>Cost per Km:</strong> {" "} {distance && vehicleType.EuroPerKm ? (distance * vehicleType.EuroPerKm).toFixed(2) : 0} EUR</p>
          <p><strong>Cost Taxe:</strong> {tollCost.totalCost} EUR</p>
          <p><strong>Cost Total:</strong> {" "} {distance && vehicleType.EuroPerKm ? ((distance * vehicleType.EuroPerKm) + tollCost.totalCost).toFixed(2) : 0}{" "} EUR</p>
          <ul>
            {tollCost.tollList.map((toll, index) => (
              <li key={index}>
                {toll.name} - {toll.country}: {toll.cost} {toll.currency}
              </li>
            ))}
          </ul>
        </div>

        <div id="mapContainer" style={{ height: "90vh", border: "2px solid black" }} />
      </div>
      {/* Transmite coordonatele către RouteDetails */}
      <TollCalculator
        startCoordinates={startCoordinates}
        endCoordinates={endCoordinates}
        vehicleType={vehicleType}
        rawDuration={rawDuration}
        rawDistance={rawDistance}
        onTollUpdate={handleTollUpdate} // Callback pentru a actualiza costurile
      />
    </div>
  );
};

export default App;
