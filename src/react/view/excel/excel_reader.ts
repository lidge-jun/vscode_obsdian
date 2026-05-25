import * as XLSX from 'xlsx-js-style';

interface SheetInfo {
    name: string;
    rows: any[];
    cols?: { [key: string]: { width: number } };
    styles?: any[];
}

export interface ExcelData {
    sheets: SheetInfo[];
    maxCols: number;
    maxLength?: number;
}

const MIN_COL_WIDTH = 70;
const MAX_COL_WIDTH = 300;
const CHAR_WIDTH = 8;
const MAX_ROWS_TO_CHECK = 10;

const defaultFont = {
    name: 'Arial',
    size: 10,
    bold: false,
    italic: false,
};

const calculateColWidth = (rows: any[], colIndex: number): number => {
    let maxLength = 0;
    for (let i = 0; i < Math.min(rows.length, MAX_ROWS_TO_CHECK); i++) {
        const cell = rows[i][colIndex];
        if (cell) {
            const length = String(cell).length;
            if (length > maxLength) {
                maxLength = length;
            }
        }
    }
    const width = maxLength * CHAR_WIDTH;
    return Math.min(Math.max(width, MIN_COL_WIDTH), MAX_COL_WIDTH);
};

const convert = (wb, sheetStyleMaps: Record<string, Map<string, any>> = {}) => {
    const sheets: SheetInfo[] = [];
    let maxLength = 0;
    let maxCols = 26;
    wb.SheetNames.forEach(name => {
        const sheet: SheetInfo = { name, rows: [] };
        const ws = wb.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(ws, { raw: false, header: 1 }) as any[];
        const sheetStyleMap = sheetStyleMaps[name];
        const styles: any[] = [];
        if (maxLength < rows.length) maxLength = rows.length

        // 计算列宽
        const cols: any = {};
        for (let i = 0; i < rows[0]?.length || 0; i++) {
            const width = calculateColWidth(rows, i);
            cols[i] = { width };
        }
        sheet.cols = cols;

        sheet.rows = rows.reduce((map, row, i) => {
            const cells = row.reduce((colMap, column, j) => {
                const address = XLSX.utils.encode_cell({ r: i, c: j });
                const sourceCell = ws[address];
                const cell: any = { text: column };
                if (sourceCell?.f) {
                    cell.formula = sourceCell.f;
                    cell.value = sourceCell.v;
                }
                const styleIndex = getCellStyleIndex(sourceCell, sheetStyleMap?.get(address), styles);
                if (styleIndex !== undefined) cell.style = styleIndex;
                colMap[j] = cell;
                return colMap
            }, {});
            map[i] = { cells }
            const colLen = Object.keys(cells).length;
            if (colLen > maxCols) {
                maxCols = colLen;
            }
            return map
        }, {})
        if (styles.length > 0) sheet.styles = styles;

        sheets.push(sheet);
    });
    return { sheets, maxLength, maxCols };
};

function getCellStyleIndex(sourceCell: any, styleFromTable: any, styles: any[]): number | undefined {
    const style = convertCellStyle(styleFromTable || sourceCell?.s);
    if (!style) return undefined;
    const existing = styles.findIndex(item => JSON.stringify(item) === JSON.stringify(style));
    if (existing >= 0) return existing;
    styles.push(style);
    return styles.length - 1;
}

function convertCellStyle(style: any): any | undefined {
    const font = style?.font;
    if (!font) return undefined;
    const mapped = {
        font: {
            ...defaultFont,
            name: font.name || defaultFont.name,
            size: font.sz || font.size || defaultFont.size,
            bold: Boolean(font.bold),
            italic: Boolean(font.italic),
        },
        strike: Boolean(font.strike),
        underline: Boolean(font.underline),
    };
    return mapped.strike || mapped.underline || mapped.font.bold || mapped.font.italic ? mapped : undefined;
}

function readWorkbookStyleMaps(ab: ArrayBuffer, sheetNames: string[]): Record<string, Map<string, any>> {
    try {
        const cfb = XLSX.CFB.read(new Uint8Array(ab), { type: "array" });
        const styles = parseStyleTable(readPackageText(cfb, "xl/styles.xml"));
        const sheetPaths = readWorkbookSheetPaths(cfb, sheetNames);
        return Object.fromEntries(Object.entries(sheetPaths).map(([name, path]) => {
            return [name, readSheetStyleMap(cfb, path, styles)];
        }));
    } catch {
        return {};
    }
}

function readPackageText(cfb: any, path: string): string {
    const normalized = normalizePackagePath(path);
    const index = cfb.FullPaths.findIndex(item => item === `Root Entry/${normalized}` || item.endsWith(`/${normalized}`));
    const content = cfb.FileIndex[index]?.content;
    return content ? new TextDecoder().decode(content) : "";
}

function readWorkbookSheetPaths(cfb: any, sheetNames: string[]): Record<string, string> {
    const workbook = parseXml(readPackageText(cfb, "xl/workbook.xml"));
    const rels = parseRelationships(readPackageText(cfb, "xl/_rels/workbook.xml.rels"));
    const result: Record<string, string> = {};
    Array.from(workbook.getElementsByTagName("sheet")).forEach((sheet, index) => {
        const name = sheet.getAttribute("name") || sheetNames[index];
        const relId = sheet.getAttribute("r:id");
        const target = relId ? rels[relId] : `worksheets/sheet${index + 1}.xml`;
        if (name && target) result[name] = resolveWorkbookTarget(target);
    });
    return result;
}

function parseRelationships(xml: string): Record<string, string> {
    const doc = parseXml(xml);
    const rels: Record<string, string> = {};
    Array.from(doc.getElementsByTagName("Relationship")).forEach(rel => {
        const id = rel.getAttribute("Id");
        const target = rel.getAttribute("Target");
        if (id && target) rels[id] = target;
    });
    return rels;
}

function parseStyleTable(xml: string): any[] {
    const doc = parseXml(xml);
    const fonts = Array.from(doc.getElementsByTagName("fonts")[0]?.getElementsByTagName("font") || []).map(readFont);
    return Array.from(doc.getElementsByTagName("cellXfs")[0]?.getElementsByTagName("xf") || []).map(xf => {
        const fontId = Number(xf.getAttribute("fontId") || 0);
        return { font: fonts[fontId] };
    });
}

function readFont(font: Element): any {
    const name = font.getElementsByTagName("name")[0]?.getAttribute("val");
    const size = Number(font.getElementsByTagName("sz")[0]?.getAttribute("val"));
    const underline = font.getElementsByTagName("u")[0]?.getAttribute("val");
    return {
        name,
        sz: Number.isFinite(size) ? size : undefined,
        bold: font.getElementsByTagName("b").length > 0,
        italic: font.getElementsByTagName("i").length > 0,
        strike: font.getElementsByTagName("strike").length > 0,
        underline: underline !== "none" && font.getElementsByTagName("u").length > 0,
    };
}

function readSheetStyleMap(cfb: any, sheetPath: string, styles: any[]): Map<string, any> {
    const doc = parseXml(readPackageText(cfb, sheetPath));
    const map = new Map<string, any>();
    Array.from(doc.getElementsByTagName("c")).forEach(cell => {
        const address = cell.getAttribute("r");
        const styleIndex = Number(cell.getAttribute("s"));
        if (address && Number.isFinite(styleIndex) && styles[styleIndex]) map.set(address, styles[styleIndex]);
    });
    return map;
}

function parseXml(xml: string): XMLDocument {
    return new DOMParser().parseFromString(xml, "application/xml");
}

function normalizePackagePath(path: string): string {
    return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^xl\/\//, "xl/");
}

function resolveWorkbookTarget(target: string): string {
    return target.startsWith("/") ? normalizePackagePath(target.slice(1)) : normalizePackagePath(`xl/${target}`);
}

export function loadSheets(buffer: ArrayBuffer, ext: string): ExcelData {
    const ab = new Uint8Array(buffer).buffer
    const wb = ext.toLowerCase() == ".csv"
        ? XLSX.read(new TextDecoder("utf-8").decode(ab), { type: "string", raw: true })
        : XLSX.read(ab, { type: "array", cellStyles: true, cellFormula: true });
    const sheetStyleMaps = ext.toLowerCase() == ".csv" ? {} : readWorkbookStyleMaps(ab, wb.SheetNames);
    return convert(wb, sheetStyleMaps);
}
