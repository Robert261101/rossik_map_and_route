import React, { useEffect, useState, useRef } from "react";
import AutoCompleteInput from "./AutoCompleteInput";
import "./App.css";

const App = () => {
  const [startCoordinates, setStartCoordinates] = useState(null);
  const [endCoordinates, setEndCoordinates] = useState(null);
  const [waypoints, setWaypoints] = useState([]);
  const [distance, setDistance] = useState(null);
  const mapRef = useRef(null);
  const behaviorRef = useRef(null); // Stocăm comportamentul hărții

  const handleSubmit = (e) => {
    e.preventDefault();
    if (startCoordinates && endCoordinates) {
      getRoute(startCoordinates, endCoordinates);
    } else {
      alert("Te rog selectează locațiile pentru plecare și destinație!");
    }
  };

  const getRoute = async (startCoordinates, endCoordinates) => {
    const apiKey = "NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s";
    let waypointParams = waypoints
      .map((wp) => `via=${wp.lat},${wp.lng}`)
      .join("&");

    //const url = `https://router.hereapi.com/v8/routes?transportMode=truck&origin=${startCoordinates.lat},${startCoordinates.lng}&destination=${endCoordinates.lat},${endCoordinates.lng}&${waypointParams}&return=polyline&apikey=${apiKey}`;
    const url = `https://router.hereapi.com/v8/routes?transportMode=truck&origin=${startCoordinates.lat},${startCoordinates.lng}&destination=${endCoordinates.lat},${endCoordinates.lng}&${waypointParams}&return=polyline,summary&apikey=${apiKey}`;

    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();

      console.log("API Response:", data);

      if (data.routes && data.routes.length > 0) {
        displayRoute(data.routes[0]);

        const route = data.routes[0];

        //calculez distanta totala de deplasare
        const totalDistance = route.sections.reduce((sum, section) => {
          if (section.summary && section.summary.length) {
            return sum + section.summary.length;
          }
          return sum;
        }, 0);

        setDistance((totalDistance / 1000).toFixed(2));

        displayRoute(route);
      }
    } catch (error) {
      console.error("Error fetching route:", error);
    }
  };

  const displayRoute = (route) => {
    if (!mapRef.current) return;
  
    // Șterge rutele și marcatorii anteriori
    mapRef.current.getObjects().forEach((obj) => mapRef.current.removeObject(obj));
  
    let routeLine;
  
    route.sections.forEach((section) => {
      const lineString = window.H.geo.LineString.fromFlexiblePolyline(section.polyline);
      routeLine = new window.H.map.Polyline(lineString, {
        style: { strokeColor: "blue", lineWidth: 6 },
      });
  
      mapRef.current.addObject(routeLine);
  
      // Ajustează harta pentru a include întreaga rută
      const boundingBox = routeLine.getBoundingBox();
      if (boundingBox) {
        mapRef.current.getViewModel().setLookAtData({ bounds: boundingBox });
      }
  
      // Eveniment "tap" pe rută -> Adaugă un waypoint
      routeLine.addEventListener("tap", (evt) => {
        let tapPosition = mapRef.current.screenToGeo(evt.currentPointer.viewportX, evt.currentPointer.viewportY);
      
        // Ștergem markerul anterior (dacă există)
        mapRef.current.getObjects().forEach((obj) => {
          if (obj instanceof window.H.map.Marker) {
            mapRef.current.removeObject(obj);
          }
        });
      
        // Creăm un nou marker
        let marker = new window.H.map.Marker(tapPosition, { volatility: true });
        marker.draggable = true;
        mapRef.current.addObject(marker);
      
        // Setăm doar un singur waypoint (cel nou)
        setWaypoints([{ lat: tapPosition.lat, lng: tapPosition.lng }]);
      
        // Eveniment "dragstart" -> Dezactivează mutarea hărții
        marker.addEventListener("dragstart", () => {
          if (behaviorRef.current) behaviorRef.current.disable();
        });
      
        // Eveniment "dragend" -> Mută markerul și recalculează ruta
        marker.addEventListener("dragend", (ev) => {
          let target = ev.target;
          let newPos = mapRef.current.screenToGeo(ev.currentPointer.viewportX, ev.currentPointer.viewportY);
          target.setGeometry(newPos);
      
          // Actualizăm waypointul mutat și păstrăm doar pe acesta
          setWaypoints([{ lat: newPos.lat, lng: newPos.lng }]);
      
          // Recalculăm traseul cu waypointul actualizat
          getRoute(startCoordinates, endCoordinates, [{ lat: newPos.lat, lng: newPos.lng }]);
      
          if (behaviorRef.current) behaviorRef.current.enable();
        });
      });
    });
  
    // Ascultăm mutarea rutei
    routeLine.addEventListener("drag", (evt) => {
      // Preia noile coordonate ale rutei
      let newRouteLine = new window.H.map.Polyline(routeLine.getGeometry(), {
        style: { strokeColor: "blue", lineWidth: 6 },
      });
  
      // Actualizează ruta
      mapRef.current.removeObject(routeLine);
      mapRef.current.addObject(newRouteLine);
  
      // Recalculează ruta cu waypointurile actualizate (deocamdată, doar cel nou)
      getRoute(startCoordinates, endCoordinates, [{ lat: newRouteLine.lat, lng: newRouteLine.lng }]);
    });
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

    const behavior = new window.H.mapevents.Behavior(new window.H.mapevents.MapEvents(map));
    behaviorRef.current = behavior; // Stocăm behavior pentru a-l dezactiva la drag

    new window.H.ui.UI.createDefault(map, defaultLayers);

    mapRef.current = map;

    window.addEventListener("resize", () => map.getViewPort().resize());

    return () => window.removeEventListener("resize", () => map.getViewPort().resize());
  }, []);

  return (
    <div className="App">
      <h1>Harta HERE</h1>
      <div className="container">
        <div className="sidebar">
          <form onSubmit={handleSubmit}>
            <label>
              Locație plecare:
              <AutoCompleteInput apiKey="NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s" onSelect={setStartCoordinates} />
            </label>
            <label>
              Locație destinație:
              <AutoCompleteInput apiKey="NtdXMcSjbr4h__U2wEhaC7i-4wTlX71ofanOwpm5E3s" onSelect={setEndCoordinates} />
            </label>
            <button type="submit">Calculare rută</button>
          </form>
          <div className="info">
            <h3>Informații Rută</h3>
            {distance ? <p>Distanță: {distance} km</p> : <p>Se calculează distanța...</p>}
          </div>
        </div>
        <div id="mapContainer" style={{ flex: 1, height: "90vh", border: "2px solid black" }} />
      </div>
    </div>
  );
};

export default App;
