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
const WORLD_GATE_HEIGHT = 11;

const PASSIVE_OPACITY = 0.3;
const ACTIVE_OPACITY = 0.85;

const GATE_COLOR = 0xffe2a0;

const PARTICLE_COUNT = 140;
const PARTICLE_SPEED = 0.1;


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
      color: GATE_COLOR,
      transparent: true,
      opacity: PASSIVE_OPACITY,
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
      color: GATE_COLOR,
      transparent: true,
      opacity: 0.9
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
  Светящиеся частицы,
  поднимающиеся снизу вверх.
*/

  const particleGeometry =
    new THREE.BufferGeometry();

  const particlePositions =
    new Float32Array(
      PARTICLE_COUNT * 3
    );

  const particleSeeds = [];

  for (
    let i = 0;
    i < PARTICLE_COUNT;
    i++
  ) {
    const x =
      (
        Math.random() - 0.5
      ) *
      WORLD_GATE_WIDTH;

    const y =
      Math.random() *
      WORLD_GATE_HEIGHT;

    particlePositions[
      i * 3
    ] = x;

    particlePositions[
      i * 3 + 1
    ] = y;

    particlePositions[
      i * 3 + 2
    ] = 0.05;

  particleSeeds.push({
    x,

    offset:
      Math.random(),

    speed:
      0.6 +
      Math.random() * 0.8,

    blinkOffset:
      Math.random() *
      Math.PI * 2,

    blinkSpeed:
      0.8 +
      Math.random() * 2.2,

    blinkStrength:
      0.25 +
      Math.random() * 0.75
  });
  }

  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      particlePositions,
      3
    )
  );

  const particleTexture =
    createParticleTexture();

  const particleMaterial =
    new THREE.PointsMaterial({
      map: particleTexture,
      color: GATE_COLOR,

      size: 0.2,

      transparent: true,
      opacity: 0.65,

      depthWrite: false,

      blending:
        THREE.AdditiveBlending
    });

  const particles =
    new THREE.Points(
      particleGeometry,
      particleMaterial
    );

  group.add(
    particles
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

    particles,
    particleSeeds,
    particleTexture,

    gradientTexture,

    currentOpacity:
      PASSIVE_OPACITY
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
    "rgba(255,245,205,0.70)"
  );

  gradient.addColorStop(
    0.12,
    "rgba(255,235,175,0.38)"
  );

  gradient.addColorStop(
    0.28,
    "rgba(255,225,150,0.15)"
  );

  gradient.addColorStop(
    0.52,
    "rgba(255,220,140,0.035)"
  );

  gradient.addColorStop(
    0.72,
    "rgba(255,220,140,0)"
  );

  gradient.addColorStop(
    1,
    "rgba(255,220,140,0)"
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

function createParticleTexture() {
  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = 64;
  canvas.height = 64;

  const ctx =
    canvas.getContext(
      "2d"
    );

  const gradient =
    ctx.createRadialGradient(
      32,
      32,
      0,

      32,
      32,
      32
    );

  gradient.addColorStop(
    0,
    "rgba(255,255,230,1)"
  );

  gradient.addColorStop(
    0.25,
    "rgba(255,225,150,0.8)"
  );

  gradient.addColorStop(
    1,
    "rgba(255,210,100,0)"
  );

  ctx.fillStyle =
    gradient;

  ctx.fillRect(
    0,
    0,
    64,
    64
  );

  return new THREE.CanvasTexture(
    canvas
  );
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

  const targetOpacity =
    (
      active
        ? 0.95
        : 0.55
    ) *
    strength;

  gateObject.currentOpacity +=
    (
      targetOpacity -
      gateObject.currentOpacity
    ) * 0.10;

  plane.material.opacity =
    gateObject.currentOpacity;

const targetEdgeOpacity =
  (
    active
      ? 1
      : 0.8
  ) *
  strength;

  bottomEdge.material.opacity +=
    (
      targetEdgeOpacity -
      bottomEdge.material.opacity
    ) * 0.10;

  group.visible = true;
  updateGateParticles(
  gateObject,
  active
);
}

function updateGateParticles(
  gateObject,
  active
) {
  const {
    particles,
    particleSeeds
  } = gateObject;

  if (!particles) {
    return;
  }

  const positions =
    particles.geometry
      .attributes
      .position;

  const time =
    performance.now() *
    0.001;

  for (
    let i = 0;
    i < particleSeeds.length;
    i++
  ) {
    const seed =
      particleSeeds[i];

    /*
      0 → 1 постоянно
      движется вверх.
    */

    const progress =
      (
        seed.offset +
        time *
          PARTICLE_SPEED *
          seed.speed
      ) % 1;

    positions.array[
      i * 3
    ] =
      seed.x;

    positions.array[
      i * 3 + 1
    ] =
      progress *
      WORLD_GATE_HEIGHT;

    positions.array[
      i * 3 + 2
    ] =
      0.08;
    const blink =
      0.5 +
      0.5 *
      Math.sin(
        time *
          seed.blinkSpeed +
        seed.blinkOffset
      );

    const brightness =
      0.35 +
      blink *
      seed.blinkStrength;
  }

  positions.needsUpdate =
    true;

  /*
    При наведении частицы
    становятся немного ярче.
  */

  const targetOpacity =
    active
      ? 0.95
      : 0.45;

  particles.material.opacity +=
    (
      targetOpacity -
      particles.material.opacity
    ) * 0.08;
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
    gateObject.particles?.geometry
      .dispose();

    gateObject.particles?.material
      .dispose();

    gateObject.particleTexture
      ?.dispose();

  }


  gateObjects.clear();

  sceneRef = null;
}