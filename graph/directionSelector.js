export function selectDirection({
  yaw,
  edges,
  activationAngle = 25
}) {
  if (!Array.isArray(edges) || edges.length === 0) {
    return null;
  }

  let bestEdge = null;
  let bestDistance = Infinity;

  for (const edge of edges) {
    const distance =
      getAngularDistance(
        yaw,
        edge.yaw
      );

    if (
      distance <= activationAngle &&
      distance < bestDistance
    ) {
      bestEdge = edge;
      bestDistance = distance;
    }
  }

  if (!bestEdge) {
    return null;
  }

  return {
    edge: bestEdge,
    distance: bestDistance
  };
}

function getAngularDistance(a, b) {
  const delta =
    normalizeAngle(a - b);

  return Math.abs(delta);
}

function normalizeAngle(angle) {
  return (
    ((angle + 180) % 360 + 360) % 360
  ) - 180;
}