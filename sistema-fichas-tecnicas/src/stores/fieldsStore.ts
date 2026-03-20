import { create } from 'zustand';
import { AVAILABLE_FIELDS, type AvailableField } from '@/types/fichaDesign';
import { fieldsService } from '@/lib/services/fieldsService';

interface FieldsState {
    staticFields: AvailableField[]; // Campos hardcoded
    dynamicFields: AvailableField[]; // Campos de Firestore
    isLoading: boolean;
    error: string | null;

    // Acciones
    fetchDynamicFields: () => Promise<void>;
    addField: (field: Omit<AvailableField, 'id'>) => Promise<boolean>;
    updateField: (id: string, updates: Partial<AvailableField>) => Promise<boolean>;
    deleteField: (id: string) => Promise<boolean>;

    // Getters
    getAllFields: () => AvailableField[];
}

export const useFieldsStore = create<FieldsState>()((set, get) => ({
    staticFields: AVAILABLE_FIELDS,
    dynamicFields: [],
    isLoading: false,
    error: null,

    fetchDynamicFields: async () => {
        set({ isLoading: true, error: null });
        try {
            const dynamicFields = await fieldsService.getDynamicFields();
            set({ dynamicFields, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    addField: async (field) => {
        set({ isLoading: true, error: null });
        try {
            const id = await fieldsService.createField(field);
            if (id) {
                const newField = { ...field, id };
                set(state => ({
                    dynamicFields: [...state.dynamicFields, newField],
                    isLoading: false
                }));
                return true;
            }
            return false;
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            return false;
        }
    },

    updateField: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
            const success = await fieldsService.updateField(id, updates);
            if (success) {
                set(state => ({
                    dynamicFields: state.dynamicFields.map(f => f.id === id ? { ...f, ...updates } : f),
                    isLoading: false
                }));
                return true;
            }
            return false;
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            return false;
        }
    },

    deleteField: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const success = await fieldsService.deleteField(id);
            if (success) {
                set(state => ({
                    dynamicFields: state.dynamicFields.filter(f => f.id !== id),
                    isLoading: false
                }));
                return true;
            }
            return false;
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            return false;
        }
    },

    getAllFields: () => {
        const { staticFields, dynamicFields } = get();
        return [...staticFields, ...dynamicFields];
    }
}));
