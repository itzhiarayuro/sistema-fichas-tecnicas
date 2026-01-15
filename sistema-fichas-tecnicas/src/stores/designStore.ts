/**
 * Design Store - Gestión profesional de diseños con versiones
 * Soporta 56 campos, placements, y persistencia completa
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FichaDesignVersion, FieldPlacement, DesignState, ShapeElement } from '@/types/fichaDesign';

export const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Versión base vacía
const createEmptyVersion = (name: string, description?: string): Omit<FichaDesignVersion, 'id' | 'createdAt' | 'updatedAt'> => ({
    name,
    description,
    isDefault: false,
    pageSize: 'A4',
    orientation: 'portrait',
    unit: 'mm',
    placements: [],
    shapes: [],
    version: '1.0.0'
});

export const useDesignStore = create<DesignState>()(
    persist(
        (set, get) => ({
            versions: [],
            currentVersionId: null,
            past: {},
            future: {},

            // History Actions
            undo: () => {
                set((state) => {
                    const id = state.currentVersionId;
                    if (!id) return state;

                    const pastStart = state.past[id] || [];
                    if (pastStart.length === 0) return state;

                    const previous = pastStart[pastStart.length - 1];
                    const newPast = pastStart.slice(0, -1);

                    const currentVersion = state.versions.find(v => v.id === id);
                    if (!currentVersion) return state;

                    const newFuture = [currentVersion, ...(state.future[id] || [])];

                    return {
                        versions: state.versions.map(v => v.id === id ? previous : v),
                        past: { ...state.past, [id]: newPast },
                        future: { ...state.future, [id]: newFuture }
                    };
                });
            },

            redo: () => {
                set((state) => {
                    const id = state.currentVersionId;
                    if (!id) return state;

                    const futureStart = state.future[id] || [];
                    if (futureStart.length === 0) return state;

                    const next = futureStart[0];
                    const newFuture = futureStart.slice(1);

                    const currentVersion = state.versions.find(v => v.id === id);
                    if (!currentVersion) return state;

                    const newPast = [...(state.past[id] || []), currentVersion];

                    return {
                        versions: state.versions.map(v => v.id === id ? next : v),
                        past: { ...state.past, [id]: newPast },
                        future: { ...state.future, [id]: newFuture }
                    };
                });
            },

            // Helper to save history
            // Note: We can't use a helper internal function easily in 'create' unless defined outside or inside actions.
            // We will inline the history logic or define a helper outside

            // CRUD de versiones
            createVersion: (name, description) => {
                const id = generateId();
                const now = Date.now();
                const newVersion: FichaDesignVersion = {
                    ...createEmptyVersion(name, description),
                    id,
                    createdAt: now,
                    updatedAt: now,
                };

                set((state) => ({
                    versions: [...state.versions, newVersion],
                    currentVersionId: id,
                    past: { ...state.past, [id]: [] },
                    future: { ...state.future, [id]: [] }
                }));

                return id;
            },

            addVersion: (version) => {
                set((state) => ({
                    versions: [...state.versions, version],
                    past: { ...state.past, [version.id]: [] },
                    future: { ...state.future, [version.id]: [] }
                }));
            },

            // Limpieza de duplicados
            deduplicateVersions: () => {
                set((state) => {
                    const uniqueNames = new Set();
                    const uniqueVersions: FichaDesignVersion[] = [];

                    state.versions.forEach(v => {
                        const key = `${v.id}-${v.name}`;
                        if (!uniqueNames.has(key) && !uniqueNames.has(v.name)) {
                            uniqueNames.add(key);
                            uniqueNames.add(v.name);
                            uniqueVersions.push(v);
                        }
                    });

                    return { versions: uniqueVersions };
                });
            },

            updateVersion: (id, updates) => {
                set((state) => {
                    // History Logic
                    const version = state.versions.find(v => v.id === id);
                    if (!version) return state;
                    const newPast = [...(state.past[id] || []), version].slice(-20);

                    return {
                        versions: state.versions.map((v) =>
                            v.id === id ? { ...v, ...updates, updatedAt: Date.now() } : v
                        ),
                        past: { ...state.past, [id]: newPast },
                        future: { ...state.future, [id]: [] }
                    };
                });
            },

            deleteVersion: (id) => {
                set((state) => {
                    const newVersions = state.versions.filter((v) => v.id !== id);
                    const newCurrentId = state.currentVersionId === id
                        ? (newVersions[0]?.id || null)
                        : state.currentVersionId;

                    // Clean up history
                    const { [id]: deletedPast, ...remainingPast } = state.past;
                    const { [id]: deletedFuture, ...remainingFuture } = state.future;

                    return {
                        versions: newVersions,
                        currentVersionId: newCurrentId,
                        past: remainingPast,
                        future: remainingFuture
                    };
                });
            },

            duplicateVersion: (id, newName) => {
                const original = get().getVersionById(id);
                if (!original) return '';

                const newId = generateId();
                const now = Date.now();

                // Deep clone de placements
                const clonedPlacements: FieldPlacement[] = original.placements.map(p => ({
                    ...p,
                    id: generateId() // Nuevo ID para cada placement
                }));

                // Deep clone de shapes
                const clonedShapes = (original.shapes || []).map(s => ({
                    ...s,
                    id: generateId() // Nuevo ID para cada shape
                }));

                const duplicate: FichaDesignVersion = {
                    ...original,
                    id: newId,
                    name: newName,
                    isDefault: false,
                    createdAt: now,
                    updatedAt: now,
                    placements: clonedPlacements,
                    shapes: clonedShapes
                };

                set((state) => ({
                    versions: [...state.versions, duplicate],
                    currentVersionId: newId, // Cambiar automáticamente a la nueva versión
                    past: { ...state.past, [newId]: [] },
                    future: { ...state.future, [newId]: [] }
                }));

                return newId;
            },

            setDefaultVersion: (id) => {
                // No undo for this setting as it's global preference
                set((state) => ({
                    versions: state.versions.map((v) => ({
                        ...v,
                        isDefault: v.id === id
                    }))
                }));
            },

            setCurrentVersion: (id) => {
                set({ currentVersionId: id });
            },

            // Gestión de placements
            addPlacement: (versionId, placement) => {
                const placementId = generateId();
                set((state) => {
                    const version = state.versions.find(v => v.id === versionId);
                    if (!version) return state;
                    const newPast = [...(state.past[versionId] || []), version].slice(-20);

                    return {
                        versions: state.versions.map((v) =>
                            v.id === versionId ? {
                                ...v,
                                placements: [...v.placements, { ...placement, id: placementId } as FieldPlacement],
                                updatedAt: Date.now()
                            } : v
                        ),
                        past: { ...state.past, [versionId]: newPast },
                        future: { ...state.future, [versionId]: [] }
                    };
                });
            },

            updatePlacement: (versionId, placementId, updates) => {
                set((state) => {
                    const version = state.versions.find(v => v.id === versionId);
                    if (!version) return state;
                    const newPast = [...(state.past[versionId] || []), version].slice(-20);

                    return {
                        versions: state.versions.map((v) =>
                            v.id === versionId ? {
                                ...v,
                                placements: v.placements.map((p) =>
                                    p.id === placementId ? { ...p, ...updates } : p
                                ),
                                updatedAt: Date.now()
                            } : v
                        ),
                        past: { ...state.past, [versionId]: newPast },
                        future: { ...state.future, [versionId]: [] }
                    };
                });
            },

            removePlacement: (versionId, placementId) => {
                set((state) => {
                    const version = state.versions.find(v => v.id === versionId);
                    if (!version) return state;
                    const newPast = [...(state.past[versionId] || []), version].slice(-20);

                    return {
                        versions: state.versions.map((v) =>
                            v.id === versionId ? {
                                ...v,
                                placements: v.placements.filter((p) => p.id !== placementId),
                                updatedAt: Date.now()
                            } : v
                        ),
                        past: { ...state.past, [versionId]: newPast },
                        future: { ...state.future, [versionId]: [] }
                    };
                });
            },

            // Gestión de shapes
            addShape: (versionId, shape) => {
                const shapeId = generateId();
                set((state) => {
                    const version = state.versions.find(v => v.id === versionId);
                    if (!version) return state;
                    const newPast = [...(state.past[versionId] || []), version].slice(-20);

                    return {
                        versions: state.versions.map((v) =>
                            v.id === versionId ? {
                                ...v,
                                shapes: [...(v.shapes || []), { ...shape, id: shapeId } as ShapeElement],
                                updatedAt: Date.now()
                            } : v
                        ),
                        past: { ...state.past, [versionId]: newPast },
                        future: { ...state.future, [versionId]: [] }
                    };
                });
            },

            updateShape: (versionId, shapeId, updates) => {
                set((state) => {
                    const version = state.versions.find(v => v.id === versionId);
                    if (!version) return state;
                    const newPast = [...(state.past[versionId] || []), version].slice(-20);

                    return {
                        versions: state.versions.map((v) =>
                            v.id === versionId ? {
                                ...v,
                                shapes: (v.shapes || []).map((s) =>
                                    s.id === shapeId ? { ...s, ...updates } : s
                                ),
                                updatedAt: Date.now()
                            } : v
                        ),
                        past: { ...state.past, [versionId]: newPast },
                        future: { ...state.future, [versionId]: [] }
                    };
                });
            },

            removeShape: (versionId, shapeId) => {
                set((state) => {
                    const version = state.versions.find(v => v.id === versionId);
                    if (!version) return state;
                    const newPast = [...(state.past[versionId] || []), version].slice(-20);

                    return {
                        versions: state.versions.map((v) =>
                            v.id === versionId ? {
                                ...v,
                                shapes: (v.shapes || []).filter((s) => s.id !== shapeId),
                                updatedAt: Date.now()
                            } : v
                        ),
                        past: { ...state.past, [versionId]: newPast },
                        future: { ...state.future, [versionId]: [] }
                    };
                });
            },

            // Getters
            getCurrentVersion: () => {
                const state = get();
                if (!state.currentVersionId) return null;
                return state.versions.find((v) => v.id === state.currentVersionId) || null;
            },

            getVersionById: (id) => {
                return get().versions.find((v) => v.id === id);
            },
        }),
        {
            name: 'fichas:design-versions',
            // Opcional: blacklist de 'past' y 'future' si no queremos persistir historial entre sesiones
            // partialize: (state) => ({ versions: state.versions, currentVersionId: state.currentVersionId })
        }
    )
);
