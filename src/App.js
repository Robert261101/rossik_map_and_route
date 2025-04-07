import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet/dist/leaflet.css";
import AutoCompleteInput from "./AutoCompleteInput";
import TollCalculator from "./TollCalculator";
import "./App.css";

const App = () => {
  const [startCoordinates, setStartCoordinates] = useState(null);
  const [endCoordinates, setEndCoordinates] = useState(null);

  // 1. Stocăm locațiile intermediare într-un array.
  const [intermediatePoints, setIntermediatePoints] = useState([]);

  // 2. Pentru inputul de locații intermediare avem un "buffer" de selectare.
  const [newIntermediate, setNewIntermediate] = useState(null);

  const [distance, setDistance] = useState(null);
  const [vehicleType, setVehicleType] = useState({ axles: 5, weight: 30000, EuroPerKm: 0 });
  const [tollCost, setTollCost] = useState({ totalCost: 0, tollList: [] });
  const [duration, setDuration] = useState(null);
  const [rawDistance, setRawDistance] = useState(null);
  const [rawDuration, setRawDuration] = useState(null);

  const mapRef = useRef(null);

  // --- Eveniment de schimbare a tipului de vehicul (nr. axe, greutate etc.)
  const handleVehicleTypeChange = (e) => {
    const { name, value } = e.target;
  
    const raw = e.target.value.trim().replace(",", ".");
    const parsed = parseFloat(raw);

    if (!isNaN(parsed)) {
      setVehicleType((prev) => ({
        ...prev,
        [name]: parsed
      }));
    } else {
      // Opțional: salvează valoarea brută ca string (dacă vrei feedback vizual)
    }
  };

  // --- Adăugăm locația intermediară din buffer în lista de locații intermediare
  const handleAddIntermediate = () => {
    if (!newIntermediate) return;
    // Adăugăm obiectul { lat, lng, label } în array
    setIntermediatePoints([...intermediatePoints, newIntermediate]);
    // Resetăm buffer-ul
    setNewIntermediate(null);
  };

  // --- Funcții pentru reordonarea locațiilor intermediare
  const moveUp = (index) => {
    if (index === 0) return; // nu putem muta mai sus dacă e deja primul
    const newArr = [...intermediatePoints];
    const temp = newArr[index];
    newArr[index] = newArr[index - 1];
    newArr[index - 1] = temp;
    setIntermediatePoints(newArr);
  };

  const moveDown = (index) => {
    if (index === intermediatePoints.length - 1) return; // nu putem muta mai jos dacă e deja ultimul
    const newArr = [...intermediatePoints];
    const temp = newArr[index];
    newArr[index] = newArr[index + 1];
    newArr[index + 1] = temp;
    setIntermediatePoints(newArr);
  };

  // (Opțional) Funcție de ștergere a unui waypoint intermediar
  const removeIntermediate = (index) => {
    const newArr = [...intermediatePoints];
    newArr.splice(index, 1);
    setIntermediatePoints(newArr);
  };

  // --- Funcție de calcul al rutei
  const getRoute = async () => {
    if (!startCoordinates || !endCoordinates) {
      return;
    }
    try {
      // Construim URL-ul cu origin, via (pentru fiecare intermediar) și destination
      let url = `https://router.hereapi.com/v8/routes?origin=${startCoordinates.lat},${startCoordinates.lng}`;
      // Adăugăm parametrii &via=... pentru fiecare locație intermediară în ordinea din array
      intermediatePoints.forEach((point) => {
        url += `&via=${point.lat},${point.lng}`;
      });
      url += `&destination=${endCoordinates.lat},${endCoordinates.lng}`;
      url += `&return=polyline,summary,actions,instructions,tolls`;
      url += `&transportMode=truck`;
      url += `&vehicle[axleCount]=5`;
      url += `&vehicle[grossWeight]=40000`;
      url += `&apikey=NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        console.error("No routes found:", data);
        return;
      }

      // Folosim doar prima rută
      const route = data.routes[0];
      // Afișăm polilinia pe hartă
      displayRoute(route);

      // Actualizăm distanța și durata
      if (route.sections && route.sections.length > 0) {
        // Ultima secțiune conține summary-ul total, dar pot fi și cumulate
        // Ca simplificare, luăm summary din fiecare secțiune și cumulăm
        let totalDistance = 0;
        let totalDuration = 0;
        route.sections.forEach((section) => {
          if (section.summary) {
            totalDistance += section.summary.length;
            totalDuration += section.summary.duration;
          }
        });
        setDistance((totalDistance / 1000).toFixed(2));
        setRawDistance(totalDistance);
        setRawDuration(totalDuration);

        const hours = Math.floor(totalDuration / 3600);
        const minutes = Math.floor((totalDuration % 3600) / 60);
        setDuration(`${hours}h ${minutes}m`);
      }
    } catch (error) {
      console.error("Error fetching route:", error);
    }
  };

  // --- Afișează ruta pe hartă
  const displayRoute = (route) => {
    if (!mapRef.current) return;

    // Ștergem obiectele existente (rute vechi etc.)
    mapRef.current.getObjects().forEach((obj) => mapRef.current.removeObject(obj));

    route.sections.forEach((section) => {
      const lineString = window.H.geo.LineString.fromFlexiblePolyline(section.polyline);
      const routeLine = new window.H.map.Polyline(lineString, {
        style: { strokeColor: "blue", lineWidth: 6 },
      });
      mapRef.current.addObject(routeLine);

      const boundingBox = routeLine.getBoundingBox();
      if (boundingBox) {
        mapRef.current.getViewModel().setLookAtData({ bounds: boundingBox });
      }
    });
  };

  // --- Callback-ul primit de la TollCalculator
  const handleTollUpdate = (tollData) => {
    setTollCost(tollData);
    if (tollData.duration) {
      setDuration(tollData.duration);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (startCoordinates && endCoordinates) {
      // 1. Calculăm ruta
      await getRoute();
      // 2. După ce se setează rawDistance/rawDuration, `TollCalculator` își va face calculele
      //    (prin useEffect). Deci nu trebuie să mai facem nimic suplimentar aici.
    } else {
      alert("Te rog selectează locațiile pentru plecare și destinație!");
    }
  };

  // --- Inițializare H.Map
  useEffect(() => {
    if (mapRef.current) return; // harta a fost deja inițializată

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
    new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(map));

    mapRef.current = map;
    window.addEventListener("resize", () => map.getViewPort().resize());

    return () => {
      window.removeEventListener("resize", () => map.getViewPort().resize());
    };
  }, []);

  // --- Recalculăm ruta (și taxele) automat când se schimbă start, end, intermediare sau param. vehicul
  useEffect(() => {
    getRoute();
  }, [startCoordinates, endCoordinates, intermediatePoints, vehicleType]);

  return (
    <div className="App">
      <h1>Calculare Rută Camion</h1>
      <div className="container">
        <div className="sidebar">
          <form onSubmit={handleSubmit}>  
            {/* Form-ul pentru Start și Destinație */}
            <label>
              Locație plecare: <AutoCompleteInput apiKey="NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s" onSelect={(coordsWithLabel) => { setStartCoordinates(coordsWithLabel); }} />
            </label>

            <label>
              Locație destinație: <AutoCompleteInput apiKey="NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s" onSelect={(coordsWithLabel) => { setEndCoordinates(coordsWithLabel); }} />
            </label>

            {/* Form pentru adăugarea de locații intermediare */}
            <label>
              Locație intermediară: <AutoCompleteInput apiKey="NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s" onSelect={(coordsWithLabel) => setNewIntermediate(coordsWithLabel)} />
            </label>
            <button onClick={handleAddIntermediate}>Adaugă loc. intermediară</button>

            {/* Afișăm lista de locații intermediare adăugate, cu butoane de reordonare */}
            <h3>Locații intermediare</h3>
            {intermediatePoints.length === 0 && <p>Nicio locație intermediară adăugată.</p>}
            <ul>
              {intermediatePoints.map((point, index) => (
                <li key={index} style={{ marginBottom: "5px" }}>
                  <div>
                    {point.label || `Lat: ${point.lat}, Lng: ${point.lng}`}
                  </div>
                  <div style={{ display: "flex", gap: "5px", marginTop: "3px" }}>
                    <button onClick={() => moveUp(index)}>Up</button>
                    <button onClick={() => moveDown(index)}>Down</button>
                    {/* (Opțional) buton de ștergere */}
                    <button onClick={() => removeIntermediate(index)}>X</button>
                  </div>
                </li>
              ))}
            </ul>
          
            {/* Parametri de vehicul */}
            <table>
              <thead>
                <tr>
                  <th>Numar de axe:</th>
                  <th>Tonaj (kg):</th>
                  <th>Euro per km:</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                  <input type="number" name="axles" value={vehicleType.axles} onChange={handleVehicleTypeChange} min="2" max="10" />
                  </td>
                  <td>
                  <input type="number" name="weight" value={vehicleType.weight} onChange={handleVehicleTypeChange} min="1000" max="40000"/>
                  </td>
                  <td>
                  <input type="number" inputMode="decimal" step="0.01" pattern="[0-9]+([,.][0-9]+)?" name="EuroPerKm" value={vehicleType.EuroPerKm} onChange={handleVehicleTypeChange} min="0"max="10" />
                  </td>
                </tr>
              </tbody>
            </table>
            <button type="submit">Calculare rută</button>
          </form>
          {/* Date rute și costuri */}
          <h3>Detalii Taxe Rutiere</h3>
          <p>
            <strong>Distanta:</strong> {distance} km
          </p>
          <p>
            <strong>Durata deplasării:</strong> {duration}
          </p>
          <p>
            <strong>Pret per Km:</strong>{" "} {distance && vehicleType.EuroPerKm ? (distance * vehicleType.EuroPerKm).toFixed(2) : 0}{" "} EUR
          </p>
          <p>
            <strong>Cost Taxe:</strong> {tollCost.totalCost.toFixed(2)} EUR
          </p>
          <p>
            <strong>Cost Total:</strong>{" "} {distance && vehicleType.EuroPerKm ? ((distance * vehicleType.EuroPerKm) + tollCost.totalCost).toFixed(2) : tollCost.totalCost.toFixed(2)}{" "} EUR
          </p>
          <ul>
            {tollCost.tollList.map((toll, index) => (
              <li key={index}>
                {toll.name} - {toll.country}: {toll.cost.toFixed(2)} {toll.currency}
              </li>
            ))}
          </ul>
        </div>

        <div
          id="mapContainer"
          style={{ height: "90vh", width: "100%", border: "2px solid black" }}
        />
      </div>

      {/* TollCalculator primește și array-ul de locații intermediare, plus callback */}
      <TollCalculator
        startCoordinates={startCoordinates}
        endCoordinates={endCoordinates}
        // Îi transmitem și intermediatePoints, ca să refacă logica de tolls
        intermediatePoints={intermediatePoints}
        vehicleType={vehicleType}
        rawDuration={rawDuration}
        rawDistance={rawDistance}
        onTollUpdate={handleTollUpdate}
      />
    </div>
  );
};

export default App;


