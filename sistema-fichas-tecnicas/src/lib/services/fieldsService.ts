import { 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    orderBy 
} from 'firebase/firestore';
import { db } from './firebaseClient';
import type { AvailableField } from '@/types/fichaDesign';

const FIELDS_COLLECTION = 'ficha_available_fields';

export const fieldsService = {
    /**
     * Obtiene todos los campos dinámicos de Firebase
     */
    async getDynamicFields(): Promise<AvailableField[]> {
        try {
            const q = query(collection(db, FIELDS_COLLECTION), orderBy('label', 'asc'));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id // Usamos el ID de Firebase como ID del campo si no tiene uno
            } as AvailableField));
        } catch (error) {
            console.error('Error fetching dynamic fields:', error);
            return [];
        }
    },

    /**
     * Crea un nuevo campo dinámico
     */
    async createField(field: Omit<AvailableField, 'id'>): Promise<string | null> {
        try {
            const docRef = await addDoc(collection(db, FIELDS_COLLECTION), field);
            return docRef.id;
        } catch (error) {
            console.error('Error creating field:', error);
            return null;
        }
    },

    /**
     * Actualiza un campo existente
     */
    async updateField(id: string, updates: Partial<AvailableField>): Promise<boolean> {
        try {
            const fieldRef = doc(db, FIELDS_COLLECTION, id);
            await updateDoc(fieldRef, updates);
            return true;
        } catch (error) {
            console.error('Error updating field:', error);
            return false;
        }
    },

    /**
     * Elimina un campo
     */
    async deleteField(id: string): Promise<boolean> {
        try {
            await deleteDoc(doc(db, FIELDS_COLLECTION, id));
            return true;
        } catch (error) {
            console.error('Error deleting field:', error);
            return false;
        }
    }
};
