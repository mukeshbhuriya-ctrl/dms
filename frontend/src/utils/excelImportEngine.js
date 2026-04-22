import * as XLSX from "xlsx";

/**
 * Generates an Excel template from an array of arrays and triggers a download.
 * @param {Array<Array<string>>} data - The data rows (first row should be headers).
 * @param {string} filename - The name of the file to save (e.g., 'Template.xlsx').
 * @param {string} sheetName - The name of the sheet.
 */
export const generateExcelTemplate = (data, filename = "Template.xlsx", sheetName = "Template") => {
    const ws = XLSX.utils.aoa_to_sheet(data);
    // Auto-size columns crudely based on header length
    if (data && data.length > 0) {
        const colWidths = data[0].map(header => ({ wch: Math.max(String(header).length + 5, 10) }));
        ws['!cols'] = colWidths;
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
};

/**
 * Parses an Excel file and returns an Array of Arrays (pure rows without the header row).
 * Attempts to intelligently identify the header row by searching for specific column names starting in the first cell up to 20 rows down.
 * @param {File} file - The file object from `<input type="file" />`.
 * @param {Array<string>} expectedFirstCellHeaders - Array of lowercased header names to look for in column A (e.g., ['job number', 'msn']). If empty, uses the first row.
 * @returns {Promise<{ rows: Array<Array<any>>, warning?: string }>} - A promise resolving to an array of rows and an optional warning.
 */
export const parseExcelFile = (file, expectedFirstCellHeaders = []) => {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error("No file provided."));

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (!json || json.length < 1) {
                    return reject(new Error("Excel file appears to be empty."));
                }

                let headerIdx = 0;
                let warning = undefined;
                
                if (expectedFirstCellHeaders.length > 0) {
                    headerIdx = -1;
                    for (let i = 0; i < Math.min(json.length, 20); i++) {
                        const firstCell = String(json[i][0] || "").toLowerCase().trim();
                        if (expectedFirstCellHeaders.includes(firstCell)) {
                            headerIdx = i;
                            break;
                        }
                    }
                    if (headerIdx === -1) {
                        warning = "Could not identify standard headers. Defaulting to first row as header.";
                        headerIdx = 0;
                    }
                }

                // Return all rows after the header
                const rows = json.slice(headerIdx + 1);
                resolve({ rows, warning });

            } catch (err) {
                console.error("Excel read error:", err);
                reject(new Error("Failed to read Excel file format."));
            }
        };
        reader.onerror = () => reject(new Error("Browser file reading error."));
        reader.readAsArrayBuffer(file);
    });
};
