const ExcelJS = require('exceljs');

/**
 * Utility class for generating Excel files.
 */
class ExcelGenerator {
    /**
     * Generates an Excel workbook from provided data.
     * @param {Array} sheets - Array of sheet configurations.
     * Each sheet config should have:
     *   - name: String (Sheet name)
     *   - columns: Array (Standard ExcelJS columns definition: { header: 'Name', key: 'name', width: 20 })
     *   - data: Array (Row data)
     * @returns {Promise<Buffer>} - Workbook buffer
     */
    async generateReport(sheets) {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'DMS System';
        workbook.lastModifiedBy = 'DMS System';
        workbook.created = new Date();
        workbook.modified = new Date();

        sheets.forEach(sheetConfig => {
            const sheet = workbook.addWorksheet(sheetConfig.name);
            
            // Set columns
            sheet.columns = sheetConfig.columns;

            // Style headers
            sheet.getRow(1).font = { bold: true };
            sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
            sheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            // Add data
            sheet.addRows(sheetConfig.data);

            // Auto-filter on columns
            sheet.autoFilter = {
                from: { row: 1, column: 1 },
                to: { row: 1, column: sheetConfig.columns.length }
            };

            // Basic alignment for data rows
            sheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) {
                    row.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                }
            });
        });

        return await workbook.xlsx.writeBuffer();
    }
}

module.exports = new ExcelGenerator();
