

import {
  loadAssets
} from "../services/assetLoader.js";

import {
  RouteGraph
} from "../graph/routeGraph.js";

import {
  selectDirection
} from "../graph/directionSelector.js";

import {
  initRouteGate,
  updateRouteGate,
  destroyRouteGate
} from "../graph/routeGateRenderer.js";

import {
  playRouteEdge
} from "../graph/routeEdgePlayer.js";




let viewerRef = null;

let renderer = null;
let scene3d = null;
let camera = null;

let debugViewEl = null;

let sphere = null;
let material = null;
let textureLoader = null;

let animationId = null;

let graph = null;
let currentNode = null;

let activeEdge = null;
let isMoving = false;
let pointerDownX = 0;
let pointerDownY = 0;
let pointerMoved = false;

const CLICK_MOVE_THRESHOLD = 5;

let projectRef = null;

let lon = 0;
let lat = 0;
let targetFov = 50;

let isDown = false;
let startX = 0;
let startY = 0;

let startPinchDistance = 0;
let startPinchFov = 50;

const activePointers = new Map();

const ACTIVATION_ANGLE = 25;




export async function init({
  project,
  scene,
  viewer
}) {
  projectRef = project;
  viewerRef = viewer;

  resetControls();

  /*
    Создаём граф из scene.graph
  */

  graph = new RouteGraph(
    scene.graph
  );

  currentNode =
    graph.getStartNode();

  if (!currentNode) {
    throw new Error(
      "RouteGraphViewer: start node не найден."
    );
  }

  /*
    Стартовый взгляд.
    Сначала смотрим node.view,
    затем scene.view,
    затем defaults.
  */

  const startView =
    currentNode.view ??
    scene.view ??
    {};

  lon = Number(
    startView.yaw ?? 0
  );

  lat = Number(
    startView.pitch ?? 0
  );

  targetFov = Number(
    startView.fov ?? 50
  );


  /*
    THREE
  */

  scene3d =
    new THREE.Scene();

  camera =
    new THREE.PerspectiveCamera(
      targetFov,
      window.innerWidth /
        window.innerHeight,
      1,
      2000
    );

  camera.fov =
    targetFov;

  camera.updateProjectionMatrix();


  renderer =
    new THREE.WebGLRenderer({
      antialias: true
    });

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      2
    )
  );

  viewer.appendChild(
    renderer.domElement
  );

  debugViewEl = document.createElement("div");

    debugViewEl.style.position = "absolute";
    debugViewEl.style.top = "12px";
    debugViewEl.style.left = "12px";
    debugViewEl.style.zIndex = "1000";
    debugViewEl.style.padding = "6px 10px";
    debugViewEl.style.borderRadius = "8px";
    debugViewEl.style.background = "rgba(0,0,0,0.65)";
    debugViewEl.style.color = "#fff";
    debugViewEl.style.fontFamily = "monospace";
    debugViewEl.style.fontSize = "13px";

    viewer.appendChild(debugViewEl);

  /*
    PANORAMA SPHERE
  */

  const geometry =
    new THREE.SphereGeometry(
      500,
      128,
      64
    );

  geometry.scale(
    -1,
    1,
    1
  );

  material =
    new THREE.MeshBasicMaterial();

  sphere =
    new THREE.Mesh(
      geometry,
      material
    );

  scene3d.add(sphere);

  textureLoader =
    new THREE.TextureLoader();


  /*
    Загружаем start node.
  */

  await loadNode(
    project,
    currentNode
  );


  /*
    Route Gate
  */

    initRouteGate(
    viewer,
    {
        onActivate:
        activateCurrentEdge
    }
    );


  /*
    Controls
  */

  addControls(viewer);

  animate();
}


async function loadNode(
  project,
  node
) {
  if (!node.panorama) {
    throw new Error(
      `RouteGraphViewer: panorama отсутствует у node "${node.id}".`
    );
  }

  const path =
    `${project.basePath}` +
    `${node.panorama}`;

  const assets =
    await loadAssets(
      [path],
      {
        title:
          "Загрузка точки"
      }
    );

  const texture =
    await textureLoader.loadAsync(
      assets.urls[0]
    );

  setPanoramaTexture(
    texture
  );

  assets.revoke();
}


function setPanoramaTexture(
  texture,
  {
    disposePrevious = true
  } = {}
) {
  if (!material) return;

  const previousTexture =
    material.map;

  material.map =
    texture;

  material.needsUpdate =
    true;

  if (
    disposePrevious &&
    previousTexture &&
    previousTexture !== texture
  ) {
    previousTexture.dispose();
  }
}


function addControls(viewer) {
  viewer.style.touchAction =
    "none";

  viewer.style.userSelect =
    "none";

  viewer.addEventListener(
    "pointerdown",
    onPointerDown
  );

  viewer.addEventListener(
    "pointermove",
    onPointerMove
  );

  viewer.addEventListener(
    "pointerup",
    onPointerEnd
  );

  viewer.addEventListener(
    "pointercancel",
    onPointerEnd
  );
  viewer.addEventListener(
    "click",
    onViewerClick
  );

  window.addEventListener(
    "wheel",
    onWheel,
    {
      passive: false
    }
  );
}


function removeControls() {
  if (!viewerRef) return;

  viewerRef.removeEventListener(
    "pointerdown",
    onPointerDown
  );

  viewerRef.removeEventListener(
    "pointermove",
    onPointerMove
  );

  viewerRef.removeEventListener(
    "pointerup",
    onPointerEnd
  );

  viewerRef.removeEventListener(
    "pointercancel",
    onPointerEnd
  );

  viewerRef.removeEventListener(
    "click",
    onViewerClick
  );

  window.removeEventListener(
    "wheel",
    onWheel
  );
}

function onViewerClick() {
  if (pointerMoved) {
    pointerMoved = false;
    return;
  }

  if (isMoving) return;
  if (!activeEdge) return;

  console.log(
    "VIEWER ACTIVATE",
    activeEdge.id
  );

  activateCurrentEdge();
}

function onPointerDown(event) {
  pointerDownX = event.clientX;
  pointerDownY = event.clientY;
  pointerMoved = false;
  event.preventDefault();

  activePointers.set(
    event.pointerId,
    {
      x: event.clientX,
      y: event.clientY
    }
  );

  viewerRef.setPointerCapture(
    event.pointerId
  );

  if (
    activePointers.size === 1
  ) {
    isDown = true;

    startX =
      event.clientX;

    startY =
      event.clientY;
  }

  if (
    activePointers.size === 2
  ) {
    const points =
      [
        ...activePointers.values()
      ];

    startPinchDistance =
      getDistance(
        points[0],
        points[1]
      );

    startPinchFov =
      targetFov;

    isDown = false;
  }
}


function onPointerMove(event) {
  event.preventDefault();

  if (
    !activePointers.has(
      event.pointerId
    )
  ) {
    return;
  }

  /*
    Проверяем, был ли это drag,
    а не обычный click.
  */

  const moveX =
    event.clientX - pointerDownX;

  const moveY =
    event.clientY - pointerDownY;

  if (
    Math.hypot(
      moveX,
      moveY
    ) >
    CLICK_MOVE_THRESHOLD
  ) {
    pointerMoved = true;
  }

  activePointers.set(
    event.pointerId,
    {
      x: event.clientX,
      y: event.clientY
    }
  );

  /*
    Pinch zoom
  */

  if (
    activePointers.size === 2
  ) {
    const points =
      [
        ...activePointers.values()
      ];

    const currentDistance =
      getDistance(
        points[0],
        points[1]
      );

    const zoomFactor =
      startPinchDistance /
      currentDistance;

    targetFov =
      startPinchFov *
      zoomFactor;

    targetFov =
      Math.max(
        35,
        Math.min(
          60,
          targetFov
        )
      );

    return;
  }

  /*
    Rotation
  */

  if (!isDown) return;

  const dx =
    event.clientX -
    startX;

  const dy =
    event.clientY -
    startY;

  lon -=
    dx * 0.18;

  lat +=
    dy * 0.18;

  startX =
    event.clientX;

  startY =
    event.clientY;
}


function onPointerEnd(event) {
  activePointers.delete(
    event.pointerId
  );

  isDown = false;

  if (
    viewerRef &&
    viewerRef.hasPointerCapture(
      event.pointerId
    )
  ) {
    viewerRef.releasePointerCapture(
      event.pointerId
    );
  }
}


function onWheel(event) {
  event.preventDefault();

  targetFov +=
    event.deltaY * 0.03;

  targetFov =
    Math.max(
      35,
      Math.min(
        60,
        targetFov
      )
    );
}


function getDistance(a, b) {
  const dx =
    a.x - b.x;

  const dy =
    a.y - b.y;

  return Math.sqrt(
    dx * dx +
    dy * dy
  );
}


function animate() {
  if (
    !camera ||
    !renderer ||
    !scene3d
  ) {
    return;
  }


  animationId =
    requestAnimationFrame(
      animate
    );

  /*
    Camera
  */

  const phi =
    THREE.MathUtils.degToRad(
      90 - lat
    );

  const theta =
    THREE.MathUtils.degToRad(
      lon
    );

  camera.lookAt(
    500 *
      Math.sin(phi) *
      Math.cos(theta),

    500 *
      Math.cos(phi),

    500 *
      Math.sin(phi) *
      Math.sin(theta)
  );


    /*
    Smooth FOV
    */

    camera.fov +=
    (
        targetFov -
        camera.fov
    ) * 0.12;

    camera.updateProjectionMatrix();

    debugViewEl.textContent =
    `yaw ${lon.toFixed(1)}   pitch ${lat.toFixed(1)}   fov ${camera.fov.toFixed(1)}`;


    /*
    Определяем доступные
    направления текущего node.
    */

    updateDirectionGate();

    renderer.render(
    scene3d,
    camera
    );
}

async function activateCurrentEdge() {
  console.log("ACTIVATE EDGE", activeEdge);
  if (isMoving) return;
  if (!activeEdge) return;

  const targetNode =
    graph.getNode(
      activeEdge.targetNodeId
    );

  if (!targetNode) {
    console.warn(
      `RouteGraphViewer: target node "${activeEdge.targetNodeId}" не найден.`
    );

    return;
  }

  isMoving = true;

  updateRouteGate({
    visible: false
  });

  try {
    console.log(
      "PLAY EDGE",
      activeEdge.id,
      activeEdge.video,
      activeEdge.targetNodeId
    );
    const result =
      await playRouteEdge({
        project: projectRef,
        edge: activeEdge,
        sourceNode: currentNode,
        targetNode,
        setTexture: setPanoramaTexture,
        textureLoader
      });
    console.log(
      "ROUTE FINISHED",
      {
        resultNode: result.node?.id,
        targetNode: targetNode?.id,
        sourceNode: currentNode?.id,
        direction: result.direction
      }
    );


    currentNode =
      result.node;

    /*
      После перехода route больше
      не считается выбранным.
    */
    activeEdge = null;


    /*
      Если target node имеет свой
      стартовый view — применяем.
      Пока только если явно задан.
    */

    if (targetNode.view) {
      lon = Number(
        targetNode.view.yaw ?? lon
      );

      lat = Number(
        targetNode.view.pitch ?? lat
      );

      targetFov = Number(
        targetNode.view.fov ??
        targetFov
      );
    }

  } catch (error) {
    console.error(
      "Route transition failed:",
      error
    );
  } finally {
    isMoving = false;
  }
}

function updateDirectionGate() {
  if (
    !graph ||
    !currentNode
  ) {
    return;
  }

  const edges =
    graph.getEdgesForNode(
      currentNode.id
    );


  const selection =
    selectDirection({
      yaw: lon,
      edges,
      activationAngle:
        ACTIVATION_ANGLE
    });

  if (!selection) {
    activeEdge = null;
    updateRouteGate({
      visible: false
    });

    return;
  }

  const {
    edge,
    distance
  } = selection;

  activeEdge = edge;


  /*
    0 = край activation sector
    1 = смотрим точно на route
  */

  const strength =
    1 -
    Math.min(
      1,
      distance /
        ACTIVATION_ANGLE
    );


  /*
    Пока gate слегка двигаем
    относительно центра экрана.

    Позже сделаем настоящую
    spherical projection.
  */

  const angleDelta =
    normalizeAngle(
      edge.yaw - lon
    );

  const pixelsPerDegree =
    window.innerWidth /
    camera.fov;

  const offset =
    angleDelta *
    pixelsPerDegree;

  updateRouteGate({
    visible: true,
    offset,
    strength
  });
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


function resetControls() {
  isDown = false;

  startX = 0;
  startY = 0;

  startPinchDistance = 0;
  startPinchFov = 50;

  activePointers.clear();
}


export function resize() {
  if (
    !renderer ||
    !camera
  ) {
    return;
  }

  camera.aspect =
    window.innerWidth /
    window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );
}


export function update() {}


export function destroy() {
  destroyRouteGate();

  removeControls();

  if (animationId) {
    cancelAnimationFrame(
      animationId
    );
  }

  if (material?.map) {
    material.map.dispose();
  }

  if (material) {
    material.dispose();
  }

  if (sphere?.geometry) {
    sphere.geometry.dispose();
  }

  if (renderer) {
    renderer.dispose();
  }

  if (viewerRef) {
    viewerRef.innerHTML = "";
  }

  viewerRef = null;

  renderer = null;
  scene3d = null;
  camera = null;

  sphere = null;
  material = null;
  textureLoader = null;

  animationId = null;

  graph = null;
  currentNode = null;
  projectRef = null;

  resetControls();
}