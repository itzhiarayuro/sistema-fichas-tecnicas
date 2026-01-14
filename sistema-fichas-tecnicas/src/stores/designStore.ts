/**
 * Design Store - Gestión profesional de diseños con versiones
 * Soporta 56 campos, placements, y persistencia completa
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FichaDesignVersion, FieldPlacement, DesignState } from '@/types/fichaDesign';

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
                    currentVersionId: id
                }));

                return id;
            },

            updateVersion: (id, updates) => {
                set((state) => ({
                    versions: state.versions.map((v) =>
                        v.id === id ? { ...v, ...updates, updatedAt: Date.now() } : v
                    ),
                }));
            },

            deleteVersion: (id) => {
                set((state) => {
                    const newVersions = state.versions.filter((v) => v.id !== id);
                    const newCurrentId = state.currentVersionId === id
                        ? (newVersions[0]?.id || null)
                        : state.currentVersionId;

                    return {
                        versions: newVersions,
                        currentVersionId: newCurrentId
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

                const duplicate: FichaDesignVersion = {
                    ...original,
                    id: newId,
                    name: newName,
                    isDefault: false,
                    createdAt: now,
                    updatedAt: now,
                    placements: clonedPlacements
                };

                set((state) => ({
                    versions: [...state.versions, duplicate],
                }));

                return newId;
            },

            setDefaultVersion: (id) => {
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
                set((state) => ({
                    versions: state.versions.map((v) =>
                        v.id === versionId ? {
                            ...v,
                            placements: [...v.placements, { ...placement, id: placementId }],
                            updatedAt: Date.now()
                        } : v
                    ),
                }));
            },

            updatePlacement: (versionId, placementId, updates) => {
                set((state) => ({
                    versions: state.versions.map((v) =>
                        v.id === versionId ? {
                            ...v,
                            placements: v.placements.map((p) =>
                                p.id === placementId ? { ...p, ...updates } : p
                            ),
                            updatedAt: Date.now()
                        } : v
                    ),
                }));
            },

            removePlacement: (versionId, placementId) => {
                set((state) => ({
                    versions: state.versions.map((v) =>
                        v.id === versionId ? {
                            ...v,
                            placements: v.placements.filter((p) => p.id !== placementId),
                            updatedAt: Date.now()
                        } : v
                    ),
                }));
            },

            // Gestión de shapes
            addShape: (versionId, shape) => {
                const shapeId = generateId();
                set((state) => ({
                    versions: state.versions.map((v) =>
                        v.id === versionId ? {
                            ...v,
                            shapes: [...(v.shapes || []), { ...shape, id: shapeId }],
                            updatedAt: Date.now()
                        } : v
                    ),
                }));
            },

            updateShape: (versionId, shapeId, updates) => {
                set((state) => ({
                    versions: state.versions.map((v) =>
                        v.id === versionId ? {
                            ...v,
                            shapes: (v.shapes || []).map((s) =>
                                s.id === shapeId ? { ...s, ...updates } : s
                            ),
                            updatedAt: Date.now()
                        } : v
                    ),
                }));
            },

            removeShape: (versionId, shapeId) => {
                set((state) => ({
                    versions: state.versions.map((v) =>
                        v.id === versionId ? {
                            ...v,
                            shapes: (v.shapes || []).filter((s) => s.id !== shapeId),
                            updatedAt: Date.now()
                        } : v
                    ),
                }));
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
        }
    )
);
