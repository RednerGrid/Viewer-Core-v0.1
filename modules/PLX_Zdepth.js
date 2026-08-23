import { renderToolbar } from "../ui/toolbar.js";

const THREE = window.THREE;

if (!THREE) {
  throw new Error("Three.js не загружен");
}

let viewerRef = null;
let renderer = null;
let material = null;
let geometry = null;
let mesh = null;

let beautyTexture = null;
let depthTexture = null;

let onPointerMoveRef = null;
let onResizeRef = null;

export async function init({
  project,
  scene,
  viewer,
  openScene
}) {
  viewerRef = viewer;

  renderToolbar(
    scene.actions ?? [],
    openScene
  );

  const assets =
    scene.assets ?? {};

  const beautyPath =
    `${project.basePath}${assets.beauty}`;

  const depthPath =
    `${project.basePath}${assets.depth}`;

  const strength =
    Number.isFinite(Number(assets.strength))
      ? Number(assets.strength)
      : 0.08;

  const focusDepth =
    Number.isFinite(Number(assets.focusDepth))
      ? Number(assets.focusDepth)
      : 0.7;

  const overscan =
    Number.isFinite(Number(assets.overscan))
      ? Number(assets.overscan)
      : 1.08;

  const textureLoader =
    new THREE.TextureLoader();

  [beautyTexture, depthTexture] =
    await Promise.all([
      textureLoader.loadAsync(beautyPath),
      textureLoader.loadAsync(depthPath)
    ]);

  beautyTexture.colorSpace =
    THREE.SRGBColorSpace;

  beautyTexture.minFilter =
    THREE.LinearFilter;

  beautyTexture.magFilter =
    THREE.LinearFilter;

  beautyTexture.generateMipmaps = false;

  depthTexture.colorSpace =
    THREE.NoColorSpace;

  depthTexture.minFilter =
    THREE.LinearFilter;

  depthTexture.magFilter =
    THREE.LinearFilter;

  depthTexture.generateMipmaps = false;

  renderer =
    new THREE.WebGLRenderer({
      antialias: false,
      alpha: false
    });

  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      1.5
    )
  );

  renderer.setSize(
    viewer.clientWidth,
    viewer.clientHeight,
    false
  );

  renderer.domElement.className =
    "plx-zdepth";

  viewer.appendChild(
    renderer.domElement
  );

  const threeScene =
    new THREE.Scene();

  const camera =
    new THREE.OrthographicCamera(
      -1,
      1,
      1,
      -1,
      0,
      1
    );

  geometry =
    new THREE.PlaneGeometry(
      2,
      2
    );

  material =
    new THREE.ShaderMaterial({
      uniforms: {
        uBeautyMap: {
          value: beautyTexture
        },

        uDepthMap: {
          value: depthTexture
        },

        uPointer: {
          value:
            new THREE.Vector2(0, 0)
        },

        uStrength: {
          value: strength
        },

        uFocusDepth: {
          value: focusDepth
        },

        uOverscan: {
          value: overscan
        },

        uImageAspect: {
          value:
            beautyTexture.image.width /
            beautyTexture.image.height
        },

        uViewportAspect: {
          value:
            viewer.clientWidth /
            viewer.clientHeight
        },

        uInvertDepth: {
          value:
            assets.invertDepth
              ? 1
              : 0
        }
      },

      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;

          gl_Position =
            vec4(
              position.xy,
              0.0,
              1.0
            );
        }
      `,

      fragmentShader: `
        uniform sampler2D uBeautyMap;
        uniform sampler2D uDepthMap;

        uniform vec2 uPointer;

        uniform float uStrength;
        uniform float uFocusDepth;
        uniform float uOverscan;

        uniform float uImageAspect;
        uniform float uViewportAspect;
        uniform float uInvertDepth;

        varying vec2 vUv;

        vec2 getImageUv(vec2 screenUv) {
          vec2 imageUv =
            screenUv;

          if (
            uViewportAspect >
            uImageAspect
          ) {
            float scale =
              uImageAspect /
              uViewportAspect;

            imageUv.y =
              (
                imageUv.y -
                0.5
              ) * scale + 0.5;
          } else {
            float scale =
              uViewportAspect /
              uImageAspect;

            imageUv.x =
              (
                imageUv.x -
                0.5
              ) * scale + 0.5;
          }

          imageUv =
            (
              imageUv -
              0.5
            ) / uOverscan + 0.5;

          return imageUv;
        }

        void main() {
          vec2 imageUv =
            getImageUv(vUv);

          float depth =
            texture2D(
              uDepthMap,
              imageUv
            ).r;

          if (
            uInvertDepth >
            0.5
          ) {
            depth =
              1.0 - depth;
          }

          float disparity =
            depth -
            uFocusDepth;

          vec2 displacedUv =
            imageUv -
            uPointer *
            disparity *
            uStrength;

          displacedUv =
            clamp(
              displacedUv,
              vec2(0.001),
              vec2(0.999)
            );

          gl_FragColor =
            texture2D(
              uBeautyMap,
              displacedUv
            );
        }
      `
    });

  mesh =
    new THREE.Mesh(
      geometry,
      material
    );

  threeScene.add(mesh);

  function render() {
    renderer.render(
      threeScene,
      camera
    );
  }

  onPointerMoveRef =
    event => {
      const rect =
        viewer.getBoundingClientRect();

      const horizontal =
        (
          (
            event.clientX -
            rect.left
          ) /
          rect.width
        ) * 2 - 1;

      const vertical =
        -(
          (
            (
              event.clientY -
              rect.top
            ) /
            rect.height
          ) * 2 - 1
        );

      material.uniforms
        .uPointer.value.set(
          horizontal,
          vertical
        );

      render();
    };

  onResizeRef =
    () => {
      const width =
        viewer.clientWidth;

      const height =
        viewer.clientHeight;

      if (
        width <= 0 ||
        height <= 0
      ) {
        return;
      }

      renderer.setSize(
        width,
        height,
        false
      );

      material.uniforms
        .uViewportAspect.value =
          width / height;

      render();
    };

  viewer.addEventListener(
    "pointermove",
    onPointerMoveRef
  );

  window.addEventListener(
    "resize",
    onResizeRef
  );

  render();
}

export function destroy() {
  if (
    viewerRef &&
    onPointerMoveRef
  ) {
    viewerRef.removeEventListener(
      "pointermove",
      onPointerMoveRef
    );
  }

  if (onResizeRef) {
    window.removeEventListener(
      "resize",
      onResizeRef
    );
  }

  onPointerMoveRef = null;
  onResizeRef = null;

  geometry?.dispose();
  material?.dispose();

  beautyTexture?.dispose();
  depthTexture?.dispose();

  renderer?.dispose();
  renderer?.domElement?.remove();

  mesh = null;
  geometry = null;
  material = null;

  beautyTexture = null;
  depthTexture = null;

  renderer = null;
  viewerRef = null;
}