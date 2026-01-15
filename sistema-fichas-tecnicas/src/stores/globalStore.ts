/**
 * Global Store - Estado global de la aplicación
 * Requirements: 9.1, 9.6
 * 
 * Principio: "estado local por ficha, estado global solo explícito"
 * Este store maneja únicamente datos compartidos entre fichas y configuración global.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Pozo, FotoInfo } from '@/types';

export type WorkflowStep = 'upload' | 'review' | 'edit' | 'preview' | 'export';

export interface GlobalConfig {
  guidedMode: boolean;
  autoSaveInterval: number;
  maxSnapshots: number;
  defaultTemplate: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  customizations: {
    colors: {
      headerBg: string;
      headerText: string;
      sectionBg: string;
      sectionText: string;
    };
    fonts: {
      titleSize: number;
      labelSize: number;
      valueSize: number;
      fontFamily: string;
    };
  };
}

interface GlobalState {
  // Datos cargados (inmutables después de carga)
  pozos: Map<string, Pozo>;
  photos: Map<string, FotoInfo>;
  uploadedImages: { id: string; name: string; date: number; data: string }[];

  // Configuración global
  config: GlobalConfig;
  templates: Template[];

  // Estado de la aplicación
  currentStep: WorkflowStep;
  guidedMode: boolean;
  isLoading: boolean;

  // Acciones de datos
  loadPozos: (pozos: Pozo[]) => void;
  setPozos: (pozos: Map<string, Pozo>) => void;
  addPozo: (pozo: Pozo) => void;
  removePozo: (pozoId: string) => void;

  // Acciones de imágenes subidas
  addUploadedImage: (image: { name: string; data: string }) => void;
  removeUploadedImage: (id: string) => void;

  // Acciones de fotos
  indexPhotos: (photos: FotoInfo[]) => void;
  setPhotos: (photos: Map<string, FotoInfo>) => void;
  addPhoto: (photo: FotoInfo) => void;
  removePhoto: (photoId: string) => void;

  // Acciones de configuración
  setConfig: (config: Partial<GlobalConfig>) => void;
  setGuidedMode: (enabled: boolean) => void;

  // Acciones de templates
  addTemplate: (template: Template) => void;
  removeTemplate: (templateId: string) => void;
  setDefaultTemplate: (templateId: string) => void;

  // Acciones de estado
  setCurrentStep: (step: WorkflowStep) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;

  // Getters
  getPozoById: (id: string) => Pozo | undefined;
  getPhotoById: (id: string) => FotoInfo | undefined;
  getPhotosByPozoId: (pozoId: string) => FotoInfo[];
}

const defaultConfig: GlobalConfig = {
  guidedMode: true,
  autoSaveInterval: 30000,
  maxSnapshots: 10,
  defaultTemplate: 'standard',
};

const defaultTemplates: Template[] = [
  {
    id: 'standard',
    name: 'Estándar',
    description: 'Plantilla estándar para fichas técnicas',
    isDefault: true,
    customizations: {
      colors: {
        headerBg: '#1F4E79',
        headerText: '#FFFFFF',
        sectionBg: '#FFFFFF',
        sectionText: '#333333',
      },
      fonts: {
        titleSize: 16,
        labelSize: 12,
        valueSize: 12,
        fontFamily: 'Inter',
      },
    },
  },
  {
    id: 'compact',
    name: 'Compacta',
    description: 'Plantilla compacta con menos espaciado',
    isDefault: false,
    customizations: {
      colors: {
        headerBg: '#2E7D32',
        headerText: '#FFFFFF',
        sectionBg: '#F5F5F5',
        sectionText: '#333333',
      },
      fonts: {
        titleSize: 14,
        labelSize: 10,
        valueSize: 10,
        fontFamily: 'Inter',
      },
    },
  },
];

// Custom storage to handle Map serialization
const mapStorage = {
  getItem: (name: string) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    const parsed = JSON.parse(str);
    // Convert arrays back to Maps
    if (parsed.state) {
      if (parsed.state.pozos) {
        parsed.state.pozos = new Map(parsed.state.pozos);
      }
      if (parsed.state.photos) {
        parsed.state.photos = new Map(parsed.state.photos);
      }
    }
    return parsed;
  },
  setItem: (name: string, value: { state: any }) => {
    const state = value.state as GlobalState;

    // Serialización segura de Maps
    const serializedPozos = state.pozos instanceof Map
      ? Array.from(state.pozos.entries())
      : (Array.isArray(state.pozos) ? state.pozos : []);

    const serializedPhotos = state.photos instanceof Map
      ? Array.from(state.photos.entries())
      : (Array.isArray(state.photos) ? state.photos : []);

    const toStore = {
      ...value,
      state: {
        ...state,
        pozos: serializedPozos,
        photos: serializedPhotos
      }
    };

    localStorage.setItem(name, JSON.stringify(toStore));
  },
  removeItem: (name: string) => localStorage.removeItem(name),
};

export const useGlobalStore = create<GlobalState>()(
  persist(
    (set, get) => ({
      // Initial state
      pozos: new Map(),
      photos: new Map(),
      uploadedImages: [],
      config: defaultConfig,
      templates: defaultTemplates,
      currentStep: 'upload',
      guidedMode: true,
      isLoading: false,

      // Data actions
      loadPozos: (pozos) => set(() => {
        const pozosMap = new Map<string, Pozo>();
        pozos.forEach((pozo) => pozosMap.set(pozo.id, pozo));
        return { pozos: pozosMap };
      }),

      setPozos: (pozos) => set({ pozos }),

      addPozo: (pozo) => set((state) => {
        const newPozos = new Map(state.pozos);
        newPozos.set(pozo.id, pozo);
        return { pozos: newPozos };
      }),

      removePozo: (pozoId) => set((state) => {
        const newPozos = new Map(state.pozos);
        newPozos.delete(pozoId);
        return { pozos: newPozos };
      }),

      // Uploaded Images actions
      addUploadedImage: (image) => set((state) => ({
        uploadedImages: [
          ...state.uploadedImages,
          {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
            name: image.name,
            date: Date.now(),
            data: image.data
          }
        ]
      })),

      removeUploadedImage: (id) => set((state) => ({
        uploadedImages: state.uploadedImages.filter(img => img.id !== id)
      })),

      // Photo actions
      indexPhotos: (photos) => set(() => {
        const photosMap = new Map<string, FotoInfo>();
        photos.forEach((photo) => photosMap.set(photo.id, photo));
        return { photos: photosMap };
      }),

      setPhotos: (photos) => set({ photos }),

      addPhoto: (photo) => set((state) => {
        const newPhotos = new Map(state.photos);
        // Aseguramos que solo guardamos la referencia (id, blobId, etc.)
        newPhotos.set(photo.id, photo);
        return { photos: newPhotos };
      }),

      removePhoto: (photoId) => set((state) => {
        const newPhotos = new Map(state.photos);
        newPhotos.delete(photoId);
        return { photos: newPhotos };
      }),

      // Config actions
      setConfig: (config) => set((state) => ({
        config: { ...state.config, ...config },
        guidedMode: config.guidedMode ?? state.guidedMode,
      })),

      setGuidedMode: (enabled) => set((state) => ({
        guidedMode: enabled,
        config: { ...state.config, guidedMode: enabled },
      })),

      // Template actions
      addTemplate: (template) => set((state) => ({
        templates: [...state.templates, template],
      })),

      removeTemplate: (templateId) => set((state) => ({
        templates: state.templates.filter((t) => t.id !== templateId),
      })),

      setDefaultTemplate: (templateId) => set((state) => ({
        templates: state.templates.map((t) => ({
          ...t,
          isDefault: t.id === templateId,
        })),
        config: { ...state.config, defaultTemplate: templateId },
      })),

      // State actions
      setCurrentStep: (step) => set({ currentStep: step }),

      setLoading: (loading) => set({ isLoading: loading }),

      reset: () => set({
        pozos: new Map(),
        photos: new Map(),
        config: defaultConfig,
        templates: defaultTemplates,
        currentStep: 'upload',
        guidedMode: true,
        isLoading: false,
      }),

      // Getters
      getPozoById: (id) => get().pozos.get(id),

      getPhotoById: (id) => get().photos.get(id),

      getPhotosByPozoId: (pozoId) => {
        const photos: FotoInfo[] = [];
        if (!pozoId) return photos;

        const safePozoId = String(pozoId);

        // El pozoId ahora es único por sesión (pozo-M680-timestamp-index)
        // Extraemos solo la parte del código (ej: M680) para asociar fotos
        const codigoMatch = safePozoId.match(/^pozo-([A-Z0-9]+)-/i);
        const targetCode = (codigoMatch ? codigoMatch[1] : safePozoId).toUpperCase();

        get().photos.forEach((photo) => {
          if (!photo?.filename) return;

          // El filename suele empezar con el código (ej: M680-P.jpg)
          const match = String(photo.filename).match(/^([A-Z0-9]+)/i);
          if (match && match[1] && match[1].toUpperCase() === targetCode) {
            photos.push(photo);
          }
        });
        return photos;
      },
    }),
    {
      name: 'fichas:global',
      storage: mapStorage,
      partialize: (state) => ({
        config: state.config,
        templates: state.templates,
        guidedMode: state.guidedMode,
        uploadedImages: state.uploadedImages,
        // Don't persist pozos and photos - they should be reloaded
      }),
    }
  )
);
