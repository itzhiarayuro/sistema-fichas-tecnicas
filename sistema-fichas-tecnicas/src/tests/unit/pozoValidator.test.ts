import { describe, it, expect, beforeEach } from 'vitest';
import {
  validatePozo,
  validatePozos,
  getValidationSummary,
  validateField,
  getFieldsWithIssues,
  formatValidationResult,
  VALIDATION_RULES,
} from '@/lib/validators/pozoValidator';
import { Pozo } from '@/types/pozo';
import { FieldValue } from '@/types/ficha';

/**
 * Helper to create a FieldValue
 */
function fv(value: string): FieldValue {
  return { value, source: 'manual' };
}

/**
 * Helper to create a minimal valid pozo for testing
 */
function createTestPozo(overrides?: Partial<Pozo>): Pozo {
  const basePozo: Pozo = {
    id: 'PZ1',
    identificacion: {
      idPozo: fv('PZ1'),
      coordenadaX: fv('-74.123456'),
      coordenadaY: fv('4.678901'),
      fecha: fv('2024-01-15'),
      levanto: fv('Inspector 1'),
      estado: fv('Bueno'),
    },
    ubicacion: {
      direccion: fv('Calle 1 #1'),
      barrio: fv('Centro'),
      elevacion: fv('2600'),
      profundidad: fv('2.5'),
    },
    componentes: {
      existeTapa: fv('Sí'),
      estadoTapa: fv('Bueno'),
      existeCilindro: fv('No'),
      diametroCilindro: fv(''),
      sistema: fv('Sistema 1'),
      anoInstalacion: fv('2020'),
      tipoCamara: fv('TÍPICA DE FONDO'),
      estructuraPavimento: fv('Asfalto'),
      materialTapa: fv('Hierro'),
      existeCono: fv('No'),
      tipoCono: fv(''),
      materialCono: fv(''),
      estadoCono: fv(''),
      materialCilindro: fv(''),
      estadoCilindro: fv(''),
      existeCanuela: fv('No'),
      materialCanuela: fv(''),
      estadoCanuela: fv(''),
      existePeldanos: fv('No'),
      materialPeldanos: fv(''),
      numeroPeldanos: fv(''),
      estadoPeldanos: fv(''),
    },
    observaciones: {
      observaciones: fv('Sin observaciones'),
    },
    tuberias: {
      tuberias: [],
    },
    sumideros: {
      sumideros: [],
    },
    fotos: {
      fotos: [],
    },
    metadata: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      source: 'manual',
      version: 1,
    },
  };

  return { ...basePozo, ...overrides };
}

describe('Pozo Validator', () => {
  describe('validatePozo - Identificación', () => {
    it('should accept valid pozo with all required fields', () => {
      const pozo = createTestPozo();
      const result = validatePozo(pozo);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject pozo with missing idPozo', () => {
      const pozo = createTestPozo({
        identificacion: {
          ...createTestPozo().identificacion,
          idPozo: fv(''),
        },
      });
      const result = validatePozo(pozo);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'POZO_ID_REQUIRED')).toBe(true);
    });

    it('should reject pozo with invalid date format', () => {
      const pozo = createTestPozo({
        identificacion: {
          ...createTestPozo().identificacion,
          fecha: fv('15/01/2024'), // Wrong format
        },
      });
      const result = validatePozo(pozo);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'FECHA_INVALID_FORMAT')).toBe(true);
    });

    it('should reject pozo with missing fecha', () => {
      const pozo = createTestPozo({
        identificacion: {
          ...createTestPozo().identificacion,
          fecha: fv(''),
        },
      });
      const result = validatePozo(pozo);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'FECHA_REQUIRED')).toBe(true);
    });

    it('should warn when levanto is empty', () => {
      const pozo = createTestPozo({
        identificacion: {
          ...createTestPozo().identificacion,
          levanto: fv(''),
        },
      });
      const result = validatePozo(pozo);

      expect(result.warnings.some(w => w.code === 'LEVANTO_EMPTY')).toBe(true);
    });
  });

  describe('validatePozo - Ubicación', () => {
    it('should reject profundidad that is not positive', () => {
      const pozo = createTestPozo({
        ubicacion: {
          ...createTestPozo().ubicacion,
          profundidad: fv('0'),
        },
      });
      const result = validatePozo(pozo);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'PROFUNDIDAD_INVALID')).toBe(true);
    });

    it('should reject profundidad with negative value', () => {
      const pozo = createTestPozo({
        ubicacion: {
          ...createTestPozo().ubicacion,
          profundidad: fv('-5'),
        },
      });
      const result = validatePozo(pozo);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'PROFUNDIDAD_INVALID')).toBe(true);
    });

    it('should accept valid profundidad', () => {
      const pozo = createTestPozo({
        ubicacion: {
          ...createTestPozo().ubicacion,
          profundidad: fv('3.5'),
        },
      });
      const result = validatePozo(pozo);

      expect(result.errors.filter(e => e.code === 'PROFUNDIDAD_INVALID')).toHaveLength(0);
    });

    it('should reject coordinates out of geographic range', () => {
      const pozo = createTestPozo({
        identificacion: {
          ...createTestPozo().identificacion,
          coordenadaX: fv('100'), // Out of range (> 13)
          coordenadaY: fv('50'),  // Out of range (> 80 in some contexts, but let's check validation logic: Valid Lat: -4 to 13, Lon: -82 to -66)
        },
      });
      const result = validatePozo(pozo);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'COORDENADAS_OUT_OF_RANGE')).toBe(true);
    });

    it('should warn when only one coordinate is provided', () => {
      const pozo = createTestPozo({
        identificacion: {
          ...createTestPozo().identificacion,
          coordenadaX: fv('-74.123456'),
          coordenadaY: fv(''),
        },
      });
      const result = validatePozo(pozo);

      expect(result.warnings.some(w => w.code === 'COORDENADAS_INCOMPLETE')).toBe(true);
    });

    it('should accept valid coordinates', () => {
      const pozo = createTestPozo({
        identificacion: {
          ...createTestPozo().identificacion,
          coordenadaX: fv('-74.123456'),
          coordenadaY: fv('4.678901'),
        },
      });
      const result = validatePozo(pozo);

      expect(result.errors.filter(e => e.code === 'COORDENADAS_OUT_OF_RANGE')).toHaveLength(0);
    });
  });

  describe('validatePozo - Componentes', () => {
    it('should require estadoTapa when existeTapa = Sí', () => {
      const pozo = createTestPozo({
        componentes: {
          ...createTestPozo().componentes,
          existeTapa: fv('Sí'),
          estadoTapa: fv(''),
        },
      });
      const result = validatePozo(pozo);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'ESTADO_TAPA_REQUIRED')).toBe(true);
    });

    it('should not require estadoTapa when existeTapa = No', () => {
      const pozo = createTestPozo({
        componentes: {
          ...createTestPozo().componentes,
          existeTapa: fv('No'),
          estadoTapa: fv(''),
        },
      });
      const result = validatePozo(pozo);

      expect(result.errors.filter(e => e.code === 'ESTADO_TAPA_REQUIRED')).toHaveLength(0);
    });

    it('should require diametroCilindro when existeCilindro = Sí', () => {
      const pozo = createTestPozo({
        componentes: {
          ...createTestPozo().componentes,
          existeCilindro: fv('Sí'),
          diametroCilindro: fv(''),
        },
      });
      const result = validatePozo(pozo);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'DIAMETRO_CILINDRO_REQUIRED')).toBe(true);
    });

    it('should reject diametroCilindro that is not positive', () => {
      const pozo = createTestPozo({
        componentes: {
          ...createTestPozo().componentes,
          existeCilindro: fv('Sí'),
          diametroCilindro: fv('0'),
        },
      });
      const result = validatePozo(pozo);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'DIAMETRO_CILINDRO_INVALID')).toBe(true);
    });

    it('should accept valid diametroCilindro', () => {
      const pozo = createTestPozo({
        componentes: {
          ...createTestPozo().componentes,
          existeCilindro: fv('Sí'),
          diametroCilindro: fv('1.2'),
        },
      });
      const result = validatePozo(pozo);

      expect(result.errors.filter(e => e.code === 'DIAMETRO_CILINDRO_INVALID')).toHaveLength(0);
    });

    it('should require numeroPeldanos when existePeldanos = Sí', () => {
      const pozo = createTestPozo({
        componentes: {
          ...createTestPozo().componentes,
          existePeldanos: fv('Sí'),
          numeroPeldanos: fv(''),
        },
      });
      const result = validatePozo(pozo);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'NUMERO_PELDANOS_REQUIRED')).toBe(true);
    });

    it('should reject numeroPeldanos that is not positive', () => {
      const pozo = createTestPozo({
        componentes: {
          ...createTestPozo().componentes,
          existePeldanos: fv('Sí'),
          numeroPeldanos: fv('0'),
        },
      });
      const result = validatePozo(pozo);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'NUMERO_PELDANOS_INVALID')).toBe(true);
    });

    it('should accept valid numeroPeldanos', () => {
      const pozo = createTestPozo({
        componentes: {
          ...createTestPozo().componentes,
          existePeldanos: fv('Sí'),
          numeroPeldanos: fv('8'),
        },
      });
      const result = validatePozo(pozo);

      expect(result.errors.filter(e => e.code === 'NUMERO_PELDANOS_INVALID')).toHaveLength(0);
    });

    it('should reject invalid tipoCamara', () => {
      const pozo = createTestPozo({
        componentes: {
          ...createTestPozo().componentes,
          tipoCamara: fv('Invalid Type'),
        },
      });
      const result = validatePozo(pozo);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'TIPO_CAMARA_INVALID')).toBe(true);
    });

    it('should accept valid tipoCamara from enum', () => {
      const pozo = createTestPozo({
        componentes: {
          ...createTestPozo().componentes,
          tipoCamara: fv('DE CAÍDA'),
        },
      });
      const result = validatePozo(pozo);

      expect(result.errors.filter(e => e.code === 'TIPO_CAMARA_INVALID')).toHaveLength(0);
    });

    it('should accept empty tipoCamara (blank)', () => {
      const pozo = createTestPozo({
        componentes: {
          ...createTestPozo().componentes,
          tipoCamara: fv(''),
        },
      });
      const result = validatePozo(pozo);

      expect(result.isValid).toBe(true);
      expect(result.errors.filter(e => e.code === 'TIPO_CAMARA_INVALID')).toHaveLength(0);
    });
  });

  describe('validatePozo - Tuberías', () => {
    it('should validate tuberia diameters', () => {
      const pozo = createTestPozo({
        tuberias: {
          tuberias: [
            {
              idTuberia: fv('T1'),
              idPozo: fv('PZ1'),
              tipoTuberia: fv('entrada'),
              diametro: fv('0'), // Invalid
              material: fv('PVC'),
              cota: fv('2.5'),
              estado: fv('Bueno'),
              emboquillado: fv('No'),
              longitud: fv(''),
            },
          ],
        },
      });
      const result = validatePozo(pozo);

      expect(result.errors.some(e => e.code === 'TUBERIA_DIAMETRO_INVALID')).toBe(true);
    });

    it('should validate tuberia referential integrity', () => {
      const pozo = createTestPozo({
        tuberias: {
          tuberias: [
            {
              idTuberia: fv('T1'),
              idPozo: fv('NONEXISTENT'),
              tipoTuberia: fv('entrada'),
              diametro: fv('100'),
              material: fv('PVC'),
              cota: fv('2.5'),
              estado: fv('Bueno'),
              emboquillado: fv('No'),
              longitud: fv(''),
            },
          ],
        },
      });
      const result = validatePozo(pozo);

      expect(result.errors.some(e => e.code === 'TUBERIA_POZO_NOT_FOUND')).toBe(true);
    });

    it('should accept valid tuberias', () => {
      const pozo = createTestPozo({
        tuberias: {
          tuberias: [
            {
              idTuberia: fv('T1'),
              idPozo: fv('PZ1'),
              tipoTuberia: fv('entrada'),
              diametro: fv('100'),
              material: fv('PVC'),
              cota: fv('2.5'),
              estado: fv('Bueno'),
              emboquillado: fv('No'),
              longitud: fv('5'),
            },
          ],
        },
      });
      const result = validatePozo(pozo);

      expect(result.errors.filter(e => e.code.includes('TUBERIA'))).toHaveLength(0);
    });
  });

  describe('validatePozo - Sumideros', () => {
    it('should validate sumidero referential integrity', () => {
      const pozo = createTestPozo({
        sumideros: {
          sumideros: [
            {
              idSumidero: fv('S1'),
              idPozo: fv('NONEXISTENT'),
              tipoSumidero: fv('Rejilla'),
              numeroEsquema: fv('1'),
              diametro: fv('100'),
              materialTuberia: fv('PVC'),
              alturaSalida: fv('1.5'),
              alturaLlegada: fv('2.0'),
            },
          ],
        },
      });
      const result = validatePozo(pozo);

      expect(result.errors.some(e => e.code === 'SUMIDERO_POZO_NOT_FOUND')).toBe(true);
    });

    it('should validate sumidero diameters', () => {
      const pozo = createTestPozo({
        sumideros: {
          sumideros: [
            {
              idSumidero: fv('S1'),
              idPozo: fv('PZ1'),
              tipoSumidero: fv('Rejilla'),
              numeroEsquema: fv('1'),
              diametro: fv('-50'), // Invalid
              materialTuberia: fv('PVC'),
              alturaSalida: fv('1.5'),
              alturaLlegada: fv('2.0'),
            },
          ],
        },
      });
      const result = validatePozo(pozo);

      expect(result.errors.some(e => e.code === 'SUMIDERO_DIAMETRO_INVALID')).toBe(true);
    });

    it('should accept valid sumideros', () => {
      const pozo = createTestPozo({
        sumideros: {
          sumideros: [
            {
              idSumidero: fv('S1'),
              idPozo: fv('PZ1'),
              tipoSumidero: fv('Rejilla'),
              numeroEsquema: fv('1'),
              diametro: fv('100'),
              materialTuberia: fv('PVC'),
              alturaSalida: fv('1.5'),
              alturaLlegada: fv('2.0'),
            },
          ],
        },
      });
      const result = validatePozo(pozo);

      expect(result.errors.filter(e => e.code.includes('SUMIDERO'))).toHaveLength(0);
    });
  });

  describe('validatePozo - Fotos', () => {
    it('should validate foto referential integrity', () => {
      const pozo = createTestPozo({
        fotos: {
          fotos: [
            {
              id: 'F1',
              idPozo: 'NONEXISTENT',
              tipo: 'tapa',
              categoria: 'PRINCIPAL',
              blobId: 'blob-1',
              filename: 'file.jpg',
              fechaCaptura: Date.now(),
              descripcion: 'Foto de tapa',
            },
          ],
        },
      });
      const result = validatePozo(pozo);

      expect(result.errors.some(e => e.code === 'FOTO_POZO_NOT_FOUND')).toBe(true);
    });

    it('should validate foto date format', () => {
      const pozo = createTestPozo({
        fotos: {
          fotos: [
            {
              id: 'F1',
              idPozo: 'PZ1',
              tipo: 'tapa',
              categoria: 'PRINCIPAL',
              blobId: 'blob-1',
              filename: 'file.jpg',
              fechaCaptura: NaN, // Invalid date
              descripcion: 'Foto de tapa',
            },
          ],
        },
      });
      const result = validatePozo(pozo);

      expect(result.errors.some(e => e.code === 'FOTO_FECHA_INVALID')).toBe(true);
    });

    it('should accept valid fotos', () => {
      const pozo = createTestPozo({
        fotos: {
          fotos: [
            {
              id: 'F1',
              idPozo: 'PZ1',
              tipo: 'tapa',
              categoria: 'PRINCIPAL',
              blobId: 'blob-1',
              filename: 'file.jpg',
              fechaCaptura: Date.now(),
              descripcion: 'Foto de tapa',
            },
          ],
        },
      });
      const result = validatePozo(pozo);

      expect(result.errors.filter(e => e.code.includes('FOTO'))).toHaveLength(0);
    });
  });

  describe('validatePozos - Multiple pozos', () => {
    it('should validate multiple pozos', () => {
      const pozo1 = createTestPozo({ id: 'PZ1' });
      const pozo2 = createTestPozo({
        id: 'PZ2',
        identificacion: {
          ...createTestPozo().identificacion,
          idPozo: fv('PZ2'),
          fecha: fv('invalid'), // Invalid
        },
      });

      const results = validatePozos([pozo1, pozo2]);

      expect(results.size).toBe(2);
      expect(results.get('PZ1')?.isValid).toBe(true);
      expect(results.get('PZ2')?.isValid).toBe(false);
    });
  });

  describe('getValidationSummary', () => {
    it('should generate correct summary', () => {
      const pozo1 = createTestPozo({ id: 'PZ1' });
      const pozo2 = createTestPozo({
        id: 'PZ2',
        identificacion: {
          ...createTestPozo().identificacion,
          idPozo: fv(''),
        },
      });

      const results = validatePozos([pozo1, pozo2]);
      const summary = getValidationSummary(results);

      expect(summary.totalPozos).toBe(2);
      expect(summary.validPozos).toBe(1);
      expect(summary.invalidPozos).toBe(1);
      expect(summary.totalErrors).toBeGreaterThan(0);
    });
  });

  describe('formatValidationResult', () => {
    it('should format valid result', () => {
      const pozo = createTestPozo();
      const result = validatePozo(pozo);
      const formatted = formatValidationResult(result);

      expect(formatted.summary).toContain('válido');
      expect(formatted.errors).toHaveLength(0);
    });

    it('should format invalid result', () => {
      const pozo = createTestPozo({
        identificacion: {
          ...createTestPozo().identificacion,
          idPozo: fv(''),
        },
      });
      const result = validatePozo(pozo);
      const formatted = formatValidationResult(result);

      expect(formatted.summary).toContain('error');
      expect(formatted.errors.length).toBeGreaterThan(0);
    });
  });

  describe('VALIDATION_RULES', () => {
    it('should export all validation rules', () => {
      expect(VALIDATION_RULES.tapaRequiereEstado).toBeDefined();
      expect(VALIDATION_RULES.cilindroRequiereDiametro).toBeDefined();
      expect(VALIDATION_RULES.peldanosRequiereNumero).toBeDefined();
      expect(VALIDATION_RULES.profundidadPositiva).toBeDefined();
      expect(VALIDATION_RULES.diametrosPositivos).toBeDefined();
      expect(VALIDATION_RULES.coordenadasValidas).toBeDefined();
      expect(VALIDATION_RULES.fechaFormato).toBeDefined();
      expect(VALIDATION_RULES.integridadReferencial).toBeDefined();
    });
  });
});
