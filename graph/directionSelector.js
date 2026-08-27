export function selectDirections({
  yaw,
  edges,
  visibleAngle = 45,
  activeAngle = 10,
  previousActiveEdgeId = null,
  switchMargin = 2.5
}) {
  if (!Array.isArray(edges)) {
    return {
      visible: [],
      active: null
    };
  }

  const candidates = edges
    .map(edge => ({
      edge,
      distance: getAngularDistance(
        yaw,
        edge.yaw
      )
    }))
    .filter(item =>
      item.distance <= visibleAngle
    )
    .sort(
      (a, b) =>
        a.distance - b.distance
    );

  if (candidates.length === 0) {
    return {
      visible: [],
      active: null
    };
  }

  let active = null;

  const best = candidates[0];

  /*
    Новый gate может стать active
    только внутри узкого сектора.
  */
  if (best.distance <= activeAngle) {
    active = best;
  }

  /*
    Hysteresis между двумя соседними gates.

    Если предыдущий active всё ещё рядом,
    новый должен быть заметно ближе,
    прежде чем подсветка перескочит.
  */
  if (previousActiveEdgeId) {
    const previous =
      candidates.find(
        item =>
          item.edge.id ===
          previousActiveEdgeId
      );

    if (
      previous &&
      previous.distance <= activeAngle
    ) {
      if (
        !active ||
        previous.distance <=
          active.distance +
          switchMargin
      ) {
        active = previous;
      }
    }
  }

  return {
    visible: candidates,
    active
  };
}

export function getAngularDistance(
  a,
  b
) {
  return Math.abs(
    normalizeAngle(
      a - b
    )
  );
}

function normalizeAngle(angle) {
  return (
    (
      (angle + 180) %
      360 +
      360
    ) %
    360
  ) - 180;
}