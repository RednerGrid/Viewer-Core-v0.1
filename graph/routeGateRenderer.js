const gateObjects =
  new Map();

let sceneRef = null;


/*
  Базовые размеры gate в world units.

  gateWidth из JSON масштабирует
  физическую ширину относительно
  DEFAULT_GATE_WIDTH.
*/

const DEFAULT_GATE_WIDTH = 120;

const WORLD_GATE_WIDTH = 24;
const WORLD_GATE_HEIGHT = 22;

const PASSIVE_OPACITY = 0.32;
const ACTIVE_OPACITY = 0.85;


export function initRouteGates(
  scene3d
) {
  destroyRouteGates();

  sceneRef = scene3d;
}


export function updateRouteGates(
  gates
) {
  if (!sceneRef) return;

  const visibleIds =
    new Set(
      gates.map(
        gate => gate.id
      )
    );


  /*
    Скрываем gates,
    которых сейчас нет в visible.
  */

  for (
    const [
      edgeId,
      gateObject
    ]
    of gateObjects
  ) {
    gateObject.group.visible =
      visibleIds.has(edgeId);
  }


  /*
    Создаём / обновляем
    видимые gates.
  */

  for (const gate of gates) {
    let gateObject =
      gateObjects.get(
        gate.id
      );

    if (!gateObject) {
      gateObject =
        createGateObject();

      sceneRef.add(
        gateObject.group
      );

      gateObjects.set(
        gate.id,
        gateObject
      );
    }

    updateGateObject(
      gateObject,
      gate
    );
  }
}


function createGateObject() {
  const group =
    new THREE.Group();


  /*
    Градиентная плоскость.
  */

  const gradientTexture =
    createGradientTexture();

  const planeMaterial =
    new THREE.MeshBasicMaterial({
      map: gradientTexture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

  const planeGeometry =
    new THREE.PlaneGeometry(
      WORLD_GATE_WIDTH,
      WORLD_GATE_HEIGHT
    );

  /*
    PlaneGeometry имеет центр
    посередине.

    Смещаем mesh вверх,
    чтобы origin группы находился
    на нижнем ребре gate.
  */

  planeGeometry.translate(
    0,
    WORLD_GATE_HEIGHT / 2,
    0
  );

  const plane =
    new THREE.Mesh(
      planeGeometry,
      planeMaterial
    );

  group.add(
    plane
  );


  /*
    Нижнее светлое ребро.
  */

  const edgeGeometry =
    new THREE.BufferGeometry()
      .setFromPoints([
        new THREE.Vector3(
          -WORLD_GATE_WIDTH / 2,
          0,
          0.02
        ),

        new THREE.Vector3(
          WORLD_GATE_WIDTH / 2,
          0,
          0.02
        )
      ]);

  const edgeMaterial =
    new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.8
    });

  const bottomEdge =
    new THREE.Line(
      edgeGeometry,
      edgeMaterial
    );

  group.add(
    bottomEdge
  );


  /*
    Gate не участвует
    в depth buffer как обычная
    геометрия сцены.
  */

  group.renderOrder = 100;

  return {
    group,
    plane,
    bottomEdge,
    gradientTexture
  };
}


function createGradientTexture() {
  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = 8;
  canvas.height = 256;

  const ctx =
    canvas.getContext(
      "2d"
    );

  const gradient =
    ctx.createLinearGradient(
      0,
      canvas.height,
      0,
      0
    );

  gradient.addColorStop(
    0,
    "rgba(255,255,255,0.30)"
  );

  gradient.addColorStop(
    0.18,
    "rgba(255,255,255,0.16)"
  );

  gradient.addColorStop(
    0.38,
    "rgba(255,255,255,0.05)"
  );

  gradient.addColorStop(
    0.62,
    "rgba(255,255,255,0)"
  );

  gradient.addColorStop(
    1,
    "rgba(255,255,255,0)"
  );

  ctx.fillStyle =
    gradient;

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const texture =
    new THREE.CanvasTexture(
      canvas
    );

  texture.needsUpdate =
    true;

  return texture;
}


function updateGateObject(
  gateObject,
  {
    yaw = 0,
    pitch = 0,
    distance = 250,

    width = DEFAULT_GATE_WIDTH,
    rotation = 0,

    active = false,
    strength = 1
  }
) {
  const {
    group,
    plane,
    bottomEdge
  } = gateObject;


  /*
    POSITION

    yaw / pitch задают направление
    от центра panorama.

    distance задаёт реальную
    удалённость.
  */

  const yawRad =
    THREE.MathUtils.degToRad(
      yaw
    );

  const pitchRad =
    THREE.MathUtils.degToRad(
      pitch
    );

  const cosPitch =
    Math.cos(
      pitchRad
    );

  group.position.set(
    distance *
      Math.cos(yawRad) *
      cosPitch,

    distance *
      Math.sin(pitchRad),

    distance *
      Math.sin(yawRad) *
      cosPitch
  );


  /*
    ROTATION

    Вращаем плоскость вокруг
    мировой вертикальной оси Y.

    rotation = 0:
    gate ориентирован по своему
    базовому положению.

    В Three.js Y-up соответствует
    Z-up в 3ds Max.
  */

/*
    ROTATION

    Базовое положение:
    gate фронтально смотрит
    в центр panorama.

    gateRotation задаёт
    дополнительный поворот
    вокруг мировой оси Y.
  */

  const baseRotation =
    Math.atan2(
      -group.position.x,
      -group.position.z
    );

  const rotationOffset =
    THREE.MathUtils.degToRad(
      rotation
    );

  group.rotation.set(
    0,
    baseRotation +
      rotationOffset,
    0
  );


  /*
    WIDTH

    gateWidth = 120
    соответствует базовой ширине.
  */

  const widthScale =
    width /
    DEFAULT_GATE_WIDTH;

  group.scale.set(
    widthScale,
    1,
    1
  );


  /*
    ACTIVE / PASSIVE

    Геометрию не меняем.
    Только прозрачность.
  */

  const opacity =
    active
      ? ACTIVE_OPACITY
      : PASSIVE_OPACITY *
        Math.max(
          0.35,
          strength
        );

  plane.material.opacity =
    opacity;

  bottomEdge.material.opacity =
    active
      ? 1
      : Math.max(
          0.3,
          strength * 0.75
        );

  group.visible = true;
}


export function hideRouteGates() {
  for (
    const gateObject
    of gateObjects.values()
  ) {
    gateObject.group.visible =
      false;
  }
}


export function destroyRouteGates() {
  for (
    const gateObject
    of gateObjects.values()
  ) {
    if (sceneRef) {
      sceneRef.remove(
        gateObject.group
      );
    }

    gateObject.plane.geometry
      .dispose();

    gateObject.plane.material.map
      ?.dispose();

    gateObject.plane.material
      .dispose();

    gateObject.bottomEdge.geometry
      .dispose();

    gateObject.bottomEdge.material
      .dispose();
  }

  gateObjects.clear();

  sceneRef = null;
}