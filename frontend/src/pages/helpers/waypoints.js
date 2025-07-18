// src/pages/helpers/waypoints.js

/**
 * Samples points at regular index intervals along a HERE geo.LineString.
 * @param {H.geo.LineString} lineString - The full route geometry.
 * @param {number} pointInterval - Number of vertices to skip between samples.
 * @returns {H.geo.IPoint[]} Array of {lat, lng} objects along the route.
 */
export function sampleWaypoints(lineString, pointInterval = 50) {
  const totalPts = lineString.getPointCount();
  const pts = [];
  // start at pointInterval so we skip the start vertex
  for (let i = pointInterval; i < totalPts; i += pointInterval) {
    const geoPt = lineString.extractPoint(i);
    pts.push(geoPt); // {lat, lng}
  }
  return pts;
}

/**
 * Makes a HERE DomMarker draggable on the map.
 * @param {H.map.DomMarker} marker - The marker to make draggable.
 * @param {H.Map} map - The HERE map instance.
 * @param {H.mapevents.Behavior} behavior - The map behavior controller.
 * @param {(newGeo: {lat:number,lng:number}) => void} onDrop - Callback with new coords on drop.
 * @returns {() => void} cleanup function to remove listeners.
 */
export function makeDraggable(marker, map, behavior, onDrop) {
  let dragging = false;

  marker.addEventListener('pointerdown', evt => {
    evt.stopPropagation();
    dragging = true;
    const el = marker.getIcon().getElement();
    if (el) el.style.cursor = 'grabbing';
    behavior.disable(window.H.mapevents.Behavior.DRAGGING);
  });

  const moveListener = evt => {
    if (!dragging) return;
    const { viewportX, viewportY } = evt.currentPointer;
    const geo = map.screenToGeo(viewportX, viewportY);
    marker.setGeometry(geo);
  };

  const upListener = () => {
    if (!dragging) return;
    dragging = false;
    const el = marker.getIcon().getElement();
    if (el) el.style.cursor = 'grab';
    behavior.enable(window.H.mapevents.Behavior.DRAGGING);
    const { lat, lng } = marker.getGeometry();
    onDrop({ lat, lng });
  };

  map.addEventListener('pointermove', moveListener);
  map.addEventListener('pointerup', upListener);

  return () => {
    map.removeEventListener('pointermove', moveListener);
    map.removeEventListener('pointerup', upListener);
  };
}
