import { describe, it, expect } from 'vitest';
import {
    parseExcelData,
    parseTuberiaRow,
    parseSumideroRow,
    parseFotoRow,
    createEmptyResult,
    TUBERIA_MAPPING,
    SUMIDERO_MAPPING,
    FOTO_MAPPING
} from '@/lib/parsers/excelParser';

describe('Excel Parser', () => {
    describe('parseTuberiaRow', () => {
        it('should parse valid tuberia row', () => {
            const row = {
                'id_tuberia': 'T1',
                'id_pozo': 'PZ1',
                'tipo': 'entrada',
                'diametro': '100',
                'material': 'PVC',
                'cota': '2.5',
                'estado': 'Bueno',
                'emboquillado': 'No',
                'longitud': '5.0'
            };

            const map = {
                'id_tuberia': 'idTuberia',
                'id_pozo': 'idPozo',
                'tipo': 'tipoTuberia',
                'diametro': 'diametro',
                'material': 'material',
                'cota': 'cota',
                'estado': 'estado',
                'emboquillado': 'emboquillado',
                'longitud': 'longitud'
            };

            const result = createEmptyResult();
            const tuberia = parseTuberiaRow(row, map, 0, result);

            expect(tuberia).not.toBeNull();
            expect(tuberia?.idTuberia.value).toBe('T1');
            expect(tuberia?.idPozo.value).toBe('PZ1');
            expect(tuberia?.tipoTuberia.value).toBe('entrada');
            expect(tuberia?.emboquillado?.value).toBe('No');
            expect(tuberia?.longitud?.value).toBe('5.0');
        });

        it('should return null for orphan tuberia (no id_pozo)', () => {
            const row = { 'id_tuberia': 'T1' };
            const map = { 'id_tuberia': 'idTuberia' };
            const result = createEmptyResult();

            const tuberia = parseTuberiaRow(row, map, 0, result);
            expect(tuberia).toBeNull();
        });
    });

    describe('parseSumideroRow', () => {
        it('should parse valid sumidero row', () => {
            const row = {
                'id_sumidero': 'S1',
                'id_pozo': 'PZ1',
                'tipo': 'Rejilla',
                'numero_esquema': '1'
            };

            const map = {
                'id_sumidero': 'idSumidero',
                'id_pozo': 'idPozo',
                'tipo': 'tipoSumidero',
                'numero_esquema': 'numeroEsquema'
            };

            const result = createEmptyResult();
            const sumidero = parseSumideroRow(row, map, 0, result);

            expect(sumidero).not.toBeNull();
            expect(sumidero?.idSumidero.value).toBe('S1');
            expect(sumidero?.numeroEsquema?.value).toBe('1');
        });
    });

    describe('parseFotoRow', () => {
        it('should parse valid foto row', () => {
            const row = {
                'id_foto': 'F1',
                'id_pozo': 'PZ1',
                'tipo': 'tapa',
                'ruta': 'f1.jpg'
            };

            const map = {
                'id_foto': 'idFoto',
                'id_pozo': 'idPozo',
                'tipo': 'tipoFoto',
                'ruta': 'rutaArchivo'
            };

            const result = createEmptyResult();
            const foto = parseFotoRow(row, map, 0, result);

            expect(foto).not.toBeNull();
            expect(foto?.id).toBe('F1');
            expect(foto?.tipo).toBe('tapa');
        });
    });

    describe('parseExcelData (Pozos)', () => {
        it('should parse pozo data correctly', () => {
            const data = [
                {
                    'codigo': 'PZ1',
                    'coordenada_x': '-74',
                    'coordenada_y': '4',
                    'fecha': '2024-01-01',
                    'levanto': 'Test',
                    'estado': 'Bueno'
                }
            ];

            const result = parseExcelData(data);

            expect(result.pozos).toHaveLength(1);
            expect(result.pozos[0].identificacion.idPozo.value).toBe('PZ1');
            expect(result.stats.validRows).toBe(1);
        });

        it('should warn on missing required columns', () => {
            const data = [
                {
                    'codigo': 'PZ1'
                    // Missing coords, date, etc.
                }
            ];

            const result = parseExcelData(data);

            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.stats.columnsMissing.length).toBeGreaterThan(0);
            // It should still parse the row but missing fields will be default
            expect(result.pozos).toHaveLength(1);
        });
    });
});
