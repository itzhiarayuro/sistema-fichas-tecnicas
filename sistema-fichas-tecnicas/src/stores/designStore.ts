/**
 * Design Store - Gestión profesional de diseños con versiones
 * Soporta 56 campos, placements, y persistencia completa
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FichaDesignVersion, FieldPlacement, DesignState, ShapeElement, GroupElement } from '@/types/fichaDesign';

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
    groups: [],
    version: '1.0.0',
    numPages: 1
});

export const useDesignStore = create<DesignState>()(
    persist(
        (set, get) => ({
            versions: [],
            currentVersionId: null,
            past: {},
            future: {},
            selectedPlacementId: null,
            selectedShapeId: null,
            selectedGroupId: null,

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
                    placements: (Array.isArray(original.placements) ? original.placements : []).map(p => ({
                        ...p,
                        id: generateId()
                    })),
                    shapes: (Array.isArray(original.shapes) ? original.shapes : []).map(s => ({
                        ...s,
                        id: generateId()
                    })),
                    groups: (Array.isArray(original.groups) ? original.groups : []).map(g => ({
                        ...g,
                        id: generateId()
                    }))
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
                set({ currentVersionId: id, selectedPlacementId: null, selectedShapeId: null, selectedGroupId: null });
            },

            setSelectedPlacementId: (id) => {
                set({ selectedPlacementId: id, selectedShapeId: id ? null : get().selectedShapeId, selectedGroupId: null });
            },

            setSelectedShapeId: (id) => {
                set({ selectedShapeId: id, selectedPlacementId: id ? null : get().selectedPlacementId, selectedGroupId: null });
            },

            setSelectedGroupId: (id) => {
                set({ selectedGroupId: id, selectedPlacementId: null, selectedShapeId: null });
            },

            // Persistencia externa
            exportVersion: (id) => {
                const version = get().versions.find(v => v.id === id);
                if (!version) return null;
                return JSON.stringify(version, null, 2);
            },

            importVersion: (json) => {
                try {
                    const imported = JSON.parse(json) as FichaDesignVersion;
                    // Validaciones básicas
                    if (!imported.name || !Array.isArray(imported.placements)) return false;

                    // Generar nuevo ID para evitar colisiones
                    const newId = generateId();
                    const now = Date.now();

                    const versionToSave = {
                        ...imported,
                        id: newId,
                        createdAt: now,
                        updatedAt: now,
                        isDefault: false
                    };

                    set(state => ({
                        versions: [...state.versions, versionToSave],
                        currentVersionId: newId,
                        past: { ...state.past, [newId]: [] },
                        future: { ...state.future, [newId]: [] }
                    }));
                    return true;
                } catch (e) {
                    console.error('Error importing version', e);
                    return false;
                }
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
                return placementId;
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
                                shapes: [...(Array.isArray(v.shapes) ? v.shapes : []), { ...shape, id: shapeId } as ShapeElement],
                                updatedAt: Date.now()
                            } : v
                        ),
                        past: { ...state.past, [versionId]: newPast },
                        future: { ...state.future, [versionId]: [] }
                    };
                });
                return shapeId;
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

            // Gestión de grupos
            createGroup: (versionId, elementIds, name) => {
                const groupId = generateId();
                set((state) => {
                    const version = state.versions.find(v => v.id === versionId);
                    if (!version) return state;

                    // Calcular bounding box de los elementos
                    const elements = [
                        ...version.placements.filter(p => elementIds.includes(p.id)),
                        ...version.shapes.filter(s => elementIds.includes(s.id))
                    ];

                    if (elements.length === 0) return state;

                    const minX = Math.min(...elements.map(e => e.x));
                    const minY = Math.min(...elements.map(e => e.y));
                    const maxX = Math.max(...elements.map(e => e.x + e.width));
                    const maxY = Math.max(...elements.map(e => e.y + e.height));

                    const newGroup = {
                        id: groupId,
                        type: 'group' as const,
                        name: name || `Grupo ${(version.groups?.length || 0) + 1}`,
                        x: minX,
                        y: minY,
                        width: maxX - minX,
                        height: maxY - minY,
                        zIndex: Math.max(...elements.map(e => e.zIndex)) + 1,
                        childIds: elementIds,
                        isVisible: true,
                        isLocked: false
                    };

                    const newPast = [...(state.past[versionId] || []), version].slice(-20);

                    return {
                        versions: state.versions.map((v) =>
                            v.id === versionId ? {
                                ...v,
                                groups: [...(Array.isArray(v.groups) ? v.groups : []), newGroup],
                                placements: (Array.isArray(v.placements) ? v.placements : []).map(p =>
                                    elementIds.includes(p.id) ? { ...p, groupId } : p
                                ),
                                shapes: (Array.isArray(v.shapes) ? v.shapes : []).map(s =>
                                    elementIds.includes(s.id) ? { ...s, groupId } : s
                                ),
                                updatedAt: Date.now()
                            } : v
                        ),
                        past: { ...state.past, [versionId]: newPast },
                        future: { ...state.future, [versionId]: [] }
                    };
                });
                return groupId;
            },

            updateGroup: (versionId, groupId, updates) => {
                set((state) => {
                    const version = state.versions.find(v => v.id === versionId);
                    if (!version) return state;
                    const newPast = [...(state.past[versionId] || []), version].slice(-20);

                    return {
                        versions: state.versions.map((v) =>
                            v.id === versionId ? {
                                ...v,
                                groups: (Array.isArray(v.groups) ? v.groups : []).map((g) =>
                                    g.id === groupId ? { ...g, ...updates } : g
                                ),
                                updatedAt: Date.now()
                            } : v
                        ),
                        past: { ...state.past, [versionId]: newPast },
                        future: { ...state.future, [versionId]: [] }
                    };
                });
            },

            removeGroup: (versionId, groupId) => {
                set((state) => {
                    const version = state.versions.find(v => v.id === versionId);
                    if (!version) return state;
                    const group = version.groups?.find(g => g.id === groupId);
                    if (!group) return state;

                    const newPast = [...(state.past[versionId] || []), version].slice(-20);

                    return {
                        versions: state.versions.map((v) =>
                            v.id === versionId ? {
                                ...v,
                                groups: (Array.isArray(v.groups) ? v.groups : []).filter((g) => g.id !== groupId),
                                placements: (Array.isArray(v.placements) ? v.placements : []).filter(p => !group.childIds.includes(p.id)),
                                shapes: (Array.isArray(v.shapes) ? v.shapes : []).filter(s => !group.childIds.includes(s.id)),
                                updatedAt: Date.now()
                            } : v
                        ),
                        past: { ...state.past, [versionId]: newPast },
                        future: { ...state.future, [versionId]: [] }
                    };
                });
            },

            ungroupElements: (versionId, groupId) => {
                set((state) => {
                    const version = state.versions.find(v => v.id === versionId);
                    if (!version) return state;
                    const newPast = [...(state.past[versionId] || []), version].slice(-20);

                    return {
                        versions: state.versions.map((v) =>
                            v.id === versionId ? {
                                ...v,
                                groups: (Array.isArray(v.groups) ? v.groups : []).filter((g) => g.id !== groupId),
                                placements: (Array.isArray(v.placements) ? v.placements : []).map(p =>
                                    p.groupId === groupId ? { ...p, groupId: undefined } : p
                                ),
                                shapes: (Array.isArray(v.shapes) ? v.shapes : []).map(s =>
                                    s.groupId === groupId ? { ...s, groupId: undefined } : s
                                ),
                                updatedAt: Date.now()
                            } : v
                        ),
                        past: { ...state.past, [versionId]: newPast },
                        future: { ...state.future, [versionId]: [] }
                    };
                });
            },

            addToGroup: (versionId, groupId, elementIds) => {
                set((state) => {
                    const version = state.versions.find(v => v.id === versionId);
                    if (!version) return state;
                    const group = version.groups?.find(g => g.id === groupId);
                    if (!group) return state;

                    const newPast = [...(state.past[versionId] || []), version].slice(-20);

                    return {
                        versions: state.versions.map((v) =>
                            v.id === versionId ? {
                                ...v,
                                groups: (Array.isArray(v.groups) ? v.groups : []).map(g =>
                                    g.id === groupId ? { ...g, childIds: [...g.childIds, ...elementIds] } : g
                                ),
                                placements: (Array.isArray(v.placements) ? v.placements : []).map(p =>
                                    elementIds.includes(p.id) ? { ...p, groupId } : p
                                ),
                                shapes: (Array.isArray(v.shapes) ? v.shapes : []).map(s =>
                                    elementIds.includes(s.id) ? { ...s, groupId } : s
                                ),
                                updatedAt: Date.now()
                            } : v
                        ),
                        past: { ...state.past, [versionId]: newPast },
                        future: { ...state.future, [versionId]: [] }
                    };
                });
            },

            removeFromGroup: (versionId, groupId, elementIds) => {
                set((state) => {
                    const version = state.versions.find(v => v.id === versionId);
                    if (!version) return state;
                    const group = version.groups?.find(g => g.id === groupId);
                    if (!group) return state;

                    const newPast = [...(state.past[versionId] || []), version].slice(-20);

                    return {
                        versions: state.versions.map((v) =>
                            v.id === versionId ? {
                                ...v,
                                groups: (Array.isArray(v.groups) ? v.groups : []).map(g =>
                                    g.id === groupId ? { ...g, childIds: g.childIds.filter(id => !elementIds.includes(id)) } : g
                                ),
                                placements: (Array.isArray(v.placements) ? v.placements : []).map(p =>
                                    elementIds.includes(p.id) ? { ...p, groupId: undefined } : p
                                ),
                                shapes: (Array.isArray(v.shapes) ? v.shapes : []).map(s =>
                                    elementIds.includes(s.id) ? { ...s, groupId: undefined } : s
                                ),
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
                const version = state.versions.find((v) => v.id === state.currentVersionId) || null;

                // Asegurar que la versión tiene todos los campos requeridos
                if (version) {
                    return {
                        ...version,
                        groups: Array.isArray(version.groups) ? version.groups : [],
                        shapes: Array.isArray(version.shapes) ? version.shapes : [],
                        placements: Array.isArray(version.placements) ? version.placements : []
                    };
                }
                return null;
            },

            getVersionById: (id) => {
                const version = get().versions.find((v) => v.id === id);

                // Asegurar que la versión tiene todos los campos requeridos
                if (version) {
                    return {
                        ...version,
                        groups: Array.isArray(version.groups) ? version.groups : [],
                        shapes: Array.isArray(version.shapes) ? version.shapes : [],
                        placements: Array.isArray(version.placements) ? version.placements : []
                    };
                }
                return undefined;
            },
        }),
        {
            name: 'fichas:design-versions',
            version: 1,
            partialize: (state) => ({ versions: state.versions, currentVersionId: state.currentVersionId }),
            // Migración automática para asegurar que todas las versiones tengan el campo groups
            migrate: (persistedState: any, version: number) => {
                console.log('🔧 Ejecutando migración de store...');

                if (persistedState && persistedState.versions && Array.isArray(persistedState.versions)) {
                    persistedState.versions = persistedState.versions.map((v: any) => {
                        const migrated = {
                            ...v,
                            groups: Array.isArray(v.groups) ? v.groups : [],
                            shapes: Array.isArray(v.shapes) ? v.shapes : [],
                            placements: Array.isArray(v.placements) ? v.placements : []
                        };

                        if (!Array.isArray(v.groups) || !Array.isArray(v.shapes) || !Array.isArray(v.placements)) {
                            console.log('✅ Versión migrada:', v.id, {
                                hadGroups: Array.isArray(v.groups),
                                hadShapes: Array.isArray(v.shapes),
                                hadPlacements: Array.isArray(v.placements)
                            });
                        }

                        return migrated;
                    });
                }

                console.log('✅ Migración completada');
                return persistedState;
            }
        }
    )
);
