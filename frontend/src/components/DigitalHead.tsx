"use client";

import { useEffect, useRef } from "react";

/**
 * DigitalHead — 3D wireframe-голова в терминальной эстетике.
 *
 * Поведение:
 *  - Голова плавно доворачивается (yaw/pitch) вслед за курсором.
 *  - При наведении курсора вершины рядом с его проекцией отталкиваются
 *    вдоль нормали и пружинисто восстанавливаются (деформация меша).
 *
 * Технологии и производительность (по STANDARDS):
 *  - three.js грузится ЛЕНИВО через dynamic import — на других страницах
 *    бандл не подтягивается, главная не платит за него на старте.
 *  - Координаты курсора живут в ref, не в React-state (нет ререндеров на кадр).
 *  - Один WebGL renderer + один rAF-цикл; при размонтировании всё освобождается.
 *  - prefers-reduced-motion: голова статична, слежение/деформация отключены.
 *
 * Модель: "Lee Perry-Smith" © Infinite-Realities, CC-BY 3.0 (из примеров
 *  three.js). Это полный бюст; плечи отсекаются программно по линии шеи,
 *  чтобы остался только верх головы.
 */

// Доля высоты модели, отсекаемая снизу (плечи/грудь). 0.34 = нижние 34%.
const CROP_BOTTOM_FRACTION = 0.34;

export const DigitalHead = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let cleanup: (() => void) | null = null;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    (async () => {
      const THREE = await import("three");
      const { GLTFLoader } =
        await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { MeshBVH, acceleratedRaycast } = await import("three-mesh-bvh");
      if (disposed || !mount) return;

      // Подключаем ускоренный рейкаст BVH к three.Mesh (для occlusion-теста).
      THREE.Mesh.prototype.raycast = acceleratedRaycast;

      const width = mount.clientWidth || 400;
      const height = mount.clientHeight || 400;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
      camera.position.set(0, 0, 8);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);

      const group = new THREE.Group();
      scene.add(group);

      const cssGreen =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--color-terminal-green")
          .trim() || "#4af626";
      const green = new THREE.Color(cssGreen);
      // Цвет подсветки касания — холодный cyan, контрастирует с фосфорным зелёным.
      const hot = new THREE.Color("#aeffff");

      const pointer = { x: 0, y: 0, active: false };
      const rot = { x: 0, y: 0 };
      const localHit = new THREE.Vector3();
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();

      let mesh: import("three").Mesh | null = null;
      let basePos: Float32Array | null = null;
      let curOffset: Float32Array | null = null;
      let normals: Float32Array | null = null;

      const INFLUENCE = 0.75; // радиус влияния курсора (был 0.55)
      const PUSH = 0.6; // макс. смещение вершины наружу (было 0.35)
      const SPRING = 0.18;

      /**
       * Отсекает треугольники ниже линии шеи (по координате Y).
       * Работает с non-indexed геометрией: каждый треугольник = 9 значений.
       * Возвращает новую обрезанную BufferGeometry.
       */
      const cropShoulders = (
        src: import("three").BufferGeometry,
      ): import("three").BufferGeometry => {
        const geo = src.index ? src.toNonIndexed() : src.clone();
        geo.computeBoundingBox();
        const bb = geo.boundingBox!;
        const minY = bb.min.y;
        const sizeY = bb.max.y - bb.min.y;
        const threshold = minY + sizeY * CROP_BOTTOM_FRACTION;

        const pos = geo.getAttribute("position");
        const arr = pos.array as ArrayLike<number>;
        const kept: number[] = [];

        // Каждый треугольник: 3 вершины по 3 координаты = 9 чисел.
        for (let t = 0; t < pos.count; t += 3) {
          const y0 = arr[t * 3 + 1];
          const y1 = arr[(t + 1) * 3 + 1];
          const y2 = arr[(t + 2) * 3 + 1];
          // Оставляем треугольник, если его центр выше линии шеи.
          const cy = (y0 + y1 + y2) / 3;
          if (cy >= threshold) {
            for (let v = 0; v < 3; v++) {
              const ix = (t + v) * 3;
              kept.push(arr[ix], arr[ix + 1], arr[ix + 2]);
            }
          }
        }

        const out = new THREE.BufferGeometry();
        out.setAttribute("position", new THREE.Float32BufferAttribute(kept, 3));
        out.computeVertexNormals();
        return out;
      };

      /**
       * Удаляет внутренние грани (полость рта, глазные яблоки, ушные каналы).
       *
       * Идея: треугольник, видимый снаружи, имеет хотя бы один луч из своего
       * центра вдоль внешней нормали, который НЕ упирается в другую грань
       * (вырывается наружу). Внутренние структуры заперты со всех сторон —
       * любой их наружный луч сразу попадает в окружающую оболочку.
       *
       * Для скорости используем BVH (three-mesh-bvh): тест ~17k треугольников
       * проходит за миллисекунды на этапе загрузки, не в кадре.
       */
      const removeInteriorFaces = (
        src: import("three").BufferGeometry,
      ): import("three").BufferGeometry => {
        const bvh = new MeshBVH(src);
        const pos = src.getAttribute("position");
        const arr = pos.array as ArrayLike<number>;

        const a = new THREE.Vector3();
        const b = new THREE.Vector3();
        const c = new THREE.Vector3();
        const center = new THREE.Vector3();
        const e1 = new THREE.Vector3();
        const e2 = new THREE.Vector3();
        const normal = new THREE.Vector3();
        const raycaster = new THREE.Raycaster();
        raycaster.firstHitOnly = true;
        src.boundsTree = bvh;
        const tmpMesh = new THREE.Mesh(src);

        const EPS = 1e-4;
        const kept: number[] = [];

        for (let t = 0; t < pos.count; t += 3) {
          a.set(arr[t * 3], arr[t * 3 + 1], arr[t * 3 + 2]);
          b.set(arr[(t + 1) * 3], arr[(t + 1) * 3 + 1], arr[(t + 1) * 3 + 2]);
          c.set(arr[(t + 2) * 3], arr[(t + 2) * 3 + 1], arr[(t + 2) * 3 + 2]);
          center
            .copy(a)
            .add(b)
            .add(c)
            .multiplyScalar(1 / 3);
          e1.subVectors(b, a);
          e2.subVectors(c, a);
          normal.crossVectors(e1, e2).normalize();

          // Точка чуть снаружи грани вдоль нормали.
          const origin = center.clone().addScaledVector(normal, EPS);
          raycaster.set(origin, normal);
          const hits = raycaster.intersectObject(tmpMesh, false);

          // Если наружу ничего не мешает (нет попаданий) — грань внешняя.
          const visible = hits.length === 0;
          if (visible) {
            kept.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
          }
        }

        src.boundsTree = undefined;

        // Если фильтр почему-то отсёк почти всё — возвращаем исходную геометрию.
        if (kept.length < pos.count * 3 * 0.2) {
          console.warn(
            "[DigitalHead] occlusion отсёк слишком много, оставляю исходный меш",
          );
          return src;
        }

        const out = new THREE.BufferGeometry();
        out.setAttribute("position", new THREE.Float32BufferAttribute(kept, 3));
        out.computeVertexNormals();
        return out;
      };

      const loader = new GLTFLoader();
      loader.load(
        "/models/head.glb",
        (gltf) => {
          if (disposed) return;

          let srcMesh: import("three").Mesh | null = null;
          gltf.scene.traverse((child) => {
            if (!srcMesh && (child as import("three").Mesh).isMesh) {
              srcMesh = child as import("three").Mesh;
            }
          });
          if (!srcMesh) {
            console.error("[DigitalHead] меш не найден в модели");
            return;
          }

          // Обрезаем плечи, затем убираем внутренние структуры
          // (полость рта, глазные яблоки, ушные каналы).
          const srcGeo = (srcMesh as import("three").Mesh)
            .geometry as import("three").BufferGeometry;
          const cropped = cropShoulders(srcGeo);
          const geo = removeInteriorFaces(cropped);
          if (geo !== cropped) cropped.dispose();
          geo.center();
          geo.computeBoundingBox();

          const wire = new THREE.MeshBasicMaterial({
            wireframe: true,
            transparent: true,
            opacity: 0.6,
            vertexColors: true, // цвет берётся из атрибута color (подсветка касания)
          });

          mesh = new THREE.Mesh(geo, wire);

          // BVH для финальной геометрии: ускоряет рейкаст слежения за курсором.
          geo.boundsTree = new MeshBVH(geo);

          const size = new THREE.Vector3();
          geo.boundingBox!.getSize(size);
          const scale = 3.4 / Math.max(size.x, size.y, size.z);
          mesh.scale.setScalar(scale);

          const posAttr = geo.getAttribute("position");
          basePos = Float32Array.from(posAttr.array as Float32Array);
          curOffset = new Float32Array(posAttr.count);
          const nrm = geo.getAttribute("normal");
          normals = Float32Array.from(nrm.array as Float32Array);

          // Атрибут цвета: стартуем с базового зелёного на всех вершинах.
          const colorArr = new Float32Array(posAttr.count * 3);
          for (let i = 0; i < posAttr.count; i++) {
            colorArr[i * 3] = green.r;
            colorArr[i * 3 + 1] = green.g;
            colorArr[i * 3 + 2] = green.b;
          }
          geo.setAttribute("color", new THREE.BufferAttribute(colorArr, 3));

          group.add(mesh);
        },
        undefined,
        (err) => {
          console.error("[DigitalHead] ошибка загрузки модели:", err);
        },
      );

      const onMove = (e: PointerEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        pointer.active = true;
      };
      const onLeave = () => {
        pointer.active = false;
      };

      if (!reduce) {
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerleave", onLeave);
      }

      const deform = () => {
        if (!mesh || !basePos || !curOffset || !normals) return;
        const geo = mesh.geometry as import("three").BufferGeometry;
        const posAttr = geo.getAttribute("position");

        let hit = false;
        if (pointer.active) {
          ndc.set(pointer.x, pointer.y);
          raycaster.setFromCamera(ndc, camera);
          const hits = raycaster.intersectObject(mesh, false);
          if (hits.length > 0) {
            mesh.worldToLocal(localHit.copy(hits[0].point));
            hit = true;
          }
        }

        const arr = posAttr.array as Float32Array;
        const colorAttr = geo.getAttribute("color");
        const col = colorAttr ? (colorAttr.array as Float32Array) : null;
        // Нормируем подсветку по максимально возможному смещению (PUSH).
        for (let i = 0; i < curOffset.length; i++) {
          const ix = i * 3;
          const bx = basePos[ix];
          const by = basePos[ix + 1];
          const bz = basePos[ix + 2];

          let target = 0;
          if (hit) {
            const dx = bx - localHit.x;
            const dy = by - localHit.y;
            const dz = bz - localHit.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < INFLUENCE) {
              target = (1 - dist / INFLUENCE) * PUSH;
            }
          }
          curOffset[i] += (target - curOffset[i]) * SPRING;

          const o = curOffset[i];
          arr[ix] = bx + normals[ix] * o;
          arr[ix + 1] = by + normals[ix + 1] * o;
          arr[ix + 2] = bz + normals[ix + 2] * o;

          // Подсветка: чем сильнее вершина смещена сейчас, тем ближе к hot.
          if (col) {
            const t = Math.min(o / PUSH, 1);
            col[ix] = green.r + (hot.r - green.r) * t;
            col[ix + 1] = green.g + (hot.g - green.g) * t;
            col[ix + 2] = green.b + (hot.b - green.b) * t;
          }
        }
        posAttr.needsUpdate = true;
        if (colorAttr) colorAttr.needsUpdate = true;
      };

      let raf = 0;
      const render = () => {
        const targetY = pointer.active ? pointer.x * 0.5 : 0;
        const targetX = pointer.active ? -pointer.y * 0.35 : 0;
        rot.y += (targetY - rot.y) * 0.06;
        rot.x += (targetX - rot.x) * 0.06;
        group.rotation.y = rot.y;
        group.rotation.x = rot.x;

        if (!reduce) deform();

        renderer.render(scene, camera);
        raf = requestAnimationFrame(render);
      };

      if (reduce) {
        // Один статичный кадр (модель ещё может грузиться — перерисуем по загрузке).
        const once = () => {
          renderer.render(scene, camera);
          if (!mesh && !disposed) requestAnimationFrame(once);
        };
        once();
      } else {
        raf = requestAnimationFrame(render);
      }

      const onResize = () => {
        const w = mount.clientWidth || width;
        const h = mount.clientHeight || height;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("resize", onResize);
        if (mesh) {
          (mesh.geometry as import("three").BufferGeometry).dispose();
          (mesh.material as import("three").Material).dispose();
        }
        renderer.dispose();
        if (renderer.domElement.parentNode === mount) {
          mount.removeChild(renderer.domElement);
        }
      };
    })();

    return () => {
      disposed = true;
      if (cleanup) cleanup();
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" aria-hidden="true" />;
};
