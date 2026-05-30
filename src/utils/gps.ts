export function haversineDistance(coords1: { lat: number, lng: number }, coords2: { lat: number, lng: number }) {
  const R = 6371e3; // metres
  const phi1 = coords1.lat * (Math.PI / 180);
  const phi2 = coords2.lat * (Math.PI / 180);
  const deltaPhi = (coords2.lat - coords1.lat) * (Math.PI / 180);
  const deltaLambda = (coords2.lng - coords1.lng) * (Math.PI / 180);

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function gpsToLocal(lat: number, lng: number, originLat: number, originLng: number) {
  // Approximate coordinate conversion relative to origin
  const dz = (originLat - lat) * 111320; // Z axis (North/South)
  const dx = (lng - originLng) * 111320 * Math.cos(originLat * Math.PI / 180); // X axis (East/West)
  return { x: dx, z: dz };
}

export function localToGps(x: number, z: number, originLat: number, originLng: number) {
  const lat = originLat - (z / 111320);
  const lng = originLng + (x / (111320 * Math.cos(originLat * Math.PI / 180)));
  return { lat, lng };
}
