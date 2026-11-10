import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { SceneGraphNode, Transform, Vector3, Euler, Color } from "@/types";

interface LightData {
  type: string;
  color: Color;
  intensity: number;
  position: Vector3;
  target: Vector3;
}

interface SceneState {
  objects: Map<string, SceneGraphNode>;
  selectedObjectId: string | null;
  hoveredObjectId: string | null;
  camera: {
    position: Vector3;
    rotation: Euler;
    fov: number;
    near: number;
    far: number;
  };
  lights: Map<string, LightData>;
  grid: { visible: boolean; size: number; divisions: number; color: Color };
  axes: { visible: boolean; size: number };
  environment: { preset: string; intensity: number; rotation: number };
}

interface SceneActions {
  addObject: (object: SceneGraphNode) => void;
  removeObject: (objectId: string) => void;
  updateObject: (objectId: string, updates: Partial<SceneGraphNode>) => void;
  updateObjectTransform: (objectId: string, transform: Partial<Transform>) => void;
  selectObject: (objectId: string | null) => void;
  hoverObject: (objectId: string | null) => void;
  duplicateObject: (objectId: string) => void;
  setCamera: (camera: Partial<SceneState["camera"]>) => void;
  addLight: (id: string, light: LightData) => void;
  removeLight: (id: string) => void;
  updateLight: (id: string, updates: Partial<LightData>) => void;
  setGrid: (grid: Partial<SceneState["grid"]>) => void;
  setAxes: (axes: Partial<SceneState["axes"]>) => void;
  setEnvironment: (env: Partial<SceneState["environment"]>) => void;
  reset: () => void;
  getObject: (objectId: string) => SceneGraphNode | undefined;
  getAllObjects: () => SceneGraphNode[];
  getObjectHierarchy: (objectId: string) => string[];
  setObjectParent: (childId: string, parentId: string | null) => void;
}

const initialState: SceneState = {
  objects: new Map(),
  selectedObjectId: null,
  hoveredObjectId: null,
  camera: {
    position: { x: 0, y: 5, z: 10 },
    rotation: { x: -0.4, y: 0, z: 0 },
    fov: 50,
    near: 0.1,
    far: 1000,
  },
  lights: new Map(),
  grid: { visible: true, size: 100, divisions: 100, color: { r: 0.5, g: 0.5, b: 0.5 } },
  axes: { visible: false, size: 5 },
  environment: { preset: "studio", intensity: 1, rotation: 0 },
};

let objectCounter = 0;

export const useSceneStore = create<SceneState & SceneActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    addObject: (object) => set((state) => {
      const newObjects = new Map(state.objects);
      newObjects.set(object.id, object);
      return { objects: newObjects };
    }),

    removeObject: (objectId) => set((state) => {
      const newObjects = new Map(state.objects);
      const removeRecursive = (id: string) => {
        const obj = newObjects.get(id);
        if (obj) {
          obj.children.forEach((child) => removeRecursive(child.id));
          newObjects.delete(id);
        }
      };
      removeRecursive(objectId);
      return {
        objects: newObjects,
        selectedObjectId: state.selectedObjectId === objectId ? null : state.selectedObjectId,
        hoveredObjectId: state.hoveredObjectId === objectId ? null : state.hoveredObjectId,
      };
    }),

    updateObject: (objectId, updates) => set((state) => {
      const obj = state.objects.get(objectId);
      if (!obj) return state;
      const newObjects = new Map(state.objects);
      newObjects.set(objectId, { ...obj, ...updates });
      return { objects: newObjects };
    }),

    updateObjectTransform: (objectId, transform) => set((state) => {
      const obj = state.objects.get(objectId);
      if (!obj) return state;
      const newObjects = new Map(state.objects);
      newObjects.set(objectId, {
        ...obj,
        transform: { ...obj.transform, ...transform },
      });
      return { objects: newObjects };
    }),

    selectObject: (objectId) => set({ selectedObjectId: objectId }),

    hoverObject: (objectId) => set({ hoveredObjectId: objectId }),

    duplicateObject: (objectId) => {
      const obj = get().objects.get(objectId);
      if (!obj) return;

      const cloneObject = (source: SceneGraphNode, newParentId?: string): SceneGraphNode => {
        const newId = `${source.id}_copy_${++objectCounter}_${Date.now()}`;
        const cloned: SceneGraphNode = {
          ...source,
          id: newId,
          name: `${source.name} (copy)`,
          transform: {
            ...source.transform,
            position: { ...source.transform.position, x: source.transform.position.x + 1 },
          },
          children: [],
        };
        source.children.forEach((child) => {
          const clonedChild = cloneObject(child, newId);
          cloned.children.push(clonedChild);
        });
        return cloned;
      };

      const cloned = cloneObject(obj);
      get().addObject(cloned);
      get().selectObject(cloned.id);
    },

    setCamera: (camera) => set((state) => ({ camera: { ...state.camera, ...camera } })),

    addLight: (id, light) => set((state) => {
      const newLights = new Map(state.lights);
      newLights.set(id, light);
      return { lights: newLights };
    }),

    removeLight: (id) => set((state) => {
      const newLights = new Map(state.lights);
      newLights.delete(id);
      return { lights: newLights };
    }),

    updateLight: (id, updates) => set((state) => {
      const light = state.lights.get(id);
      if (!light) return state;
      const newLights = new Map(state.lights);
      newLights.set(id, { ...light, ...updates });
      return { lights: newLights };
    }),

    setGrid: (grid) => set((state) => ({ grid: { ...state.grid, ...grid } })),

    setAxes: (axes) => set((state) => ({ axes: { ...state.axes, ...axes } })),

    setEnvironment: (env) => set((state) => ({ environment: { ...state.environment, ...env } })),

    reset: () => set(initialState),

    getObject: (objectId) => get().objects.get(objectId),

    getAllObjects: () => Array.from(get().objects.values()),

    getObjectHierarchy: (objectId) => {
      const hierarchy: string[] = [];
      const buildHierarchy = (id: string, depth = 0) => {
        const obj = get().objects.get(id);
        if (obj) {
          hierarchy.push("  ".repeat(depth) + obj.name);
          obj.children.forEach((child) => buildHierarchy(child.id, depth + 1));
        }
      };
      buildHierarchy(objectId);
      return hierarchy;
    },

    setObjectParent: (childId, parentId) => set((state) => {
      const child = state.objects.get(childId);
      if (!child) return state;

      const newObjects = new Map(state.objects);

      const removeFromParent = (obj: SceneGraphNode, childId: string) => {
        obj.children = obj.children.filter((c) => c.id !== childId);
        obj.children.forEach((c) => removeFromParent(c, childId));
      };

      state.objects.forEach((obj) => {
        const newObj = { ...obj, children: [...obj.children] };
        removeFromParent(newObj, childId);
        newObjects.set(obj.id, newObj);
      });

      if (parentId) {
        const parent = newObjects.get(parentId);
        if (parent) {
          const newParent = { ...parent, children: [...parent.children, child] };
          newObjects.set(parentId, newParent);
        }
      }

      return { objects: newObjects };
    }),
  }))
);

export const useSelectedObject = () => useSceneStore((state) => {
  const obj = state.objects.get(state.selectedObjectId!);
  return obj ?? null;
});

export const useSceneObjects = () => useSceneStore((state) => Array.from(state.objects.values()));