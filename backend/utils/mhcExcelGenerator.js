const ExcelJS = require('exceljs');

class MhcExcelGenerator {
    static async generateExcel(data, res) {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Shreno Engineering';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('Material Heat Chart', {
            pageSetup: { paperSize: 9, orientation: 'landscape', margins: { left: 0.25, right: 0.25, top: 0.25, bottom: 0.25, header: 0.1, footer: 0.1 } }
        });

        // Set column widths
        sheet.columns = [
            { width: 12 }, // A - Item No
            { width: 30 }, // B - Description
            { width: 15 }, // C - Size
            { width: 25 }, // D - Material Spec
            { width: 10 }, // E - Qty
            { width: 20 }, // F - Heat No
            { width: 20 }, // G - GRN/APP/AP No
            { width: 20 }, // H - MTR No
            { width: 20 }, // I - Manufacturer
            { width: 25 }  // J - Remarks
        ];

        const defaultFont = { name: 'Arial', size: 10 };
        const boldFont = { name: 'Arial', size: 10, bold: true };
        const headerFont = { name: 'Arial', size: 14, bold: true };
        
        // --- 1. HEADER SECTION ---
        
        // Company Name
        sheet.mergeCells('A1:J1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = 'SHRENO ENGINEERING LIMITED';
        titleCell.font = headerFont;
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        
        // Title
        sheet.mergeCells('A2:J2');
        const subtitleCell = sheet.getCell('A2');
        subtitleCell.value = 'MATERIAL HEAT CHART';
        subtitleCell.font = { name: 'Arial', size: 12, bold: true };
        subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // Metadata rows
        const metaFields = [
            { label: 'CLIENT:', value: data.client || '-' },
            { label: 'MSN / JOB NO.:', value: data.msn || '-' },
            { label: 'EQUIPMENT NAME:', value: data.equipment_name || '-' },
            { label: 'TAG NO.:', value: data.tag_no || '-' },
            { label: 'SHRENO DRG NO.:', value: data.shreno_drg_no || '-' },
            { label: 'PO. NO.:', value: data.po_no || '-' },
            { label: 'CODE:', value: data.code || '-' },
            { label: 'INSPECTION BY:', value: data.inspection_by || '-' },
        ];

        let currentRow = 4;
        for (let i = 0; i < metaFields.length; i += 2) {
            sheet.getCell(`A${currentRow}`).value = metaFields[i].label;
            sheet.getCell(`A${currentRow}`).font = boldFont;
            sheet.mergeCells(`B${currentRow}:E${currentRow}`);
            sheet.getCell(`B${currentRow}`).value = metaFields[i].value;
            sheet.getCell(`B${currentRow}`).font = defaultFont;

            if (i + 1 < metaFields.length) {
                sheet.getCell(`F${currentRow}`).value = metaFields[i + 1].label;
                sheet.getCell(`F${currentRow}`).font = boldFont;
                sheet.mergeCells(`G${currentRow}:J${currentRow}`);
                sheet.getCell(`G${currentRow}`).value = metaFields[i + 1].value;
                sheet.getCell(`G${currentRow}`).font = defaultFont;
            }
            currentRow++;
        }
        
        currentRow += 1; // Empty row

        // --- 2. TABLE HEADERS ---
        const tableHeaders = [
            'ITEM NO.',
            'DESCRIPTION',
            'SIZE',
            'MATERIAL SPEC',
            'QTY.',
            'HEAT NO.',
            'GRN / APP / AP NO.',
            'MTR NO.',
            'MANUFACTURER',
            'REMARKS'
        ];

        const headerRow = sheet.getRow(currentRow);
        tableHeaders.forEach((header, index) => {
            const cell = headerRow.getCell(index + 1);
            cell.value = header;
            cell.font = boldFont;
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
        });
        headerRow.height = 30;
        currentRow++;

        // --- 3. ITEMS ---
        const items = data.items || [];
        items.forEach(item => {
            const isHeading = item.is_heading;
            const row = sheet.getRow(currentRow);

            if (isHeading) {
                sheet.mergeCells(`A${currentRow}:J${currentRow}`);
                const cell = row.getCell(1);
                cell.value = item.heading_text || 'HEADING';
                cell.font = boldFont;
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF5F5F5' }
                };
                // Add borders to the merged cell range
                for (let i = 1; i <= 10; i++) {
                    row.getCell(i).border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                }
            } else if (item.item_no || item.description) {
                row.getCell(1).value = item.item_no || '';
                row.getCell(2).value = item.description || '';
                row.getCell(3).value = item.size || '';
                row.getCell(4).value = item.material_spec || '';
                row.getCell(5).value = item.quantity_unit || '';
                row.getCell(6).value = item.heat_no || '';
                row.getCell(7).value = item.grn_app_ap_no || '';
                row.getCell(8).value = item.mtr_no || '';
                row.getCell(9).value = item.manufacturer || '';
                row.getCell(10).value = item.remarks || '';

                row.font = defaultFont;
                row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }; // Description left aligned
                row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }; // Size left aligned

                for (let i = 1; i <= 10; i++) {
                    row.getCell(i).border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                }
            }
            currentRow++;
        });
        
        currentRow += 2;
        
        // --- 4. SIGNATURES ---
        sheet.getCell(`B${currentRow}`).value = 'Q.C ENGINEER';
        sheet.getCell(`B${currentRow}`).font = boldFont;
        sheet.getCell(`B${currentRow}`).alignment = { horizontal: 'center' };
        
        sheet.getCell(`F${currentRow}`).value = 'AI';
        sheet.getCell(`F${currentRow}`).font = boldFont;
        sheet.getCell(`F${currentRow}`).alignment = { horizontal: 'center' };
        
        sheet.getCell(`I${currentRow}`).value = 'CLIENT / TPI';
        sheet.getCell(`I${currentRow}`).font = boldFont;
        sheet.getCell(`I${currentRow}`).alignment = { horizontal: 'center' };
        
        await workbook.xlsx.write(res);
    }
}

module.exports = MhcExcelGenerator;
