const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class DishEndPdfGenerator {
    constructor() {
        this.colors = {
            red: '#FF0000',
            black: '#000000',
            white: '#FFFFFF'
        };
        this.fonts = {
            regular: 'Helvetica',
            bold: 'Helvetica-Bold'
        };
    }

    drawLogo(doc, x, y, width, height) {
        const logoPath = path.join(process.cwd(), 'frontend', 'public', 'lego_logo.png');
        if (fs.existsSync(logoPath)) {
            try {
                const imgW = 80;
                const imgH = 40;
                const ix = x + (width - imgW) / 2;
                const iy = y + (height - imgH) / 2;
                doc.image(logoPath, ix, iy, { width: imgW, height: imgH });
            } catch (e) {
                console.error("Logo draw error:", e);
            }
        }
    }

    generatePDF(data, res) {
        const doc = new PDFDocument({ margin: 25, size: 'A4' });
        doc.pipe(res);

        const startX = 40;
        const startY = 40;
        const width = doc.page.width - 80;
        const height = doc.page.height - 80;

        // Outer Border
        doc.lineWidth(1).strokeColor(this.colors.black).rect(startX, startY, width, height).stroke();

        let curY = startY;

        // Header Section
        const headerH = 70;
        const logoW = 160;
        doc.lineWidth(0.5).rect(startX, curY, logoW, headerH).stroke();
        this.drawLogo(doc, startX, curY, logoW, headerH);

        const titleBoxW = width - logoW;
        const titleRowH = 40;
        const reportRowH = 30;
        doc.rect(startX + logoW, curY, titleBoxW, titleRowH).stroke();
        doc.rect(startX + logoW, curY + titleRowH, titleBoxW, reportRowH).stroke();

        doc.font(this.fonts.bold).fontSize(14).fillColor(this.colors.red)
            .text('SHRENO ENGINEERING LIMITED', startX + logoW, curY + 14, { width: titleBoxW, align: 'center' });
        doc.fontSize(12)
            .text('DISH END INSPECTION REPORT', startX + logoW, curY + titleRowH + 8, { width: titleBoxW, align: 'center' });

        curY += headerH;

        // Info Grid
        const rowH = 18;
        const colW = width / 2;
        doc.fontSize(9);
        const infoRows = [
            { l1: 'MSN:', v1: data.msn, l2: 'TAG NO.:', v2: data.tag_no },
            { l1: 'CLIENT:', v1: data.client, l2: 'DRG. NO.:', v2: data.drg_no },
            { l1: 'P.O. NO.:', v1: data.po_no, l2: 'EQUIPMENT:', v2: data.equipment_name },
            { l1: 'CODE:', v1: data.code, l2: 'INSP. AGENCY:', v2: data.insp_agency }
        ];

        infoRows.forEach((row) => {
            doc.lineWidth(0.5).rect(startX, curY, width, rowH).stroke();
            doc.font(this.fonts.bold).fillColor(this.colors.red).text(row.l1, startX + 5, curY + 5);
            doc.font(this.fonts.regular).fillColor(this.colors.black).text(String(row.v1 || '-'), startX + 80, curY + 5);
            doc.font(this.fonts.bold).fillColor(this.colors.red).text(row.l2, startX + colW + 5, curY + 5);
            doc.font(this.fonts.regular).fillColor(this.colors.black).text(String(row.v2 || '-'), startX + colW + 80, curY + 5);
            curY += rowH;
        });

        // Works Inspected Header
        doc.rect(startX, curY, width, 18).stroke();
        doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.red)
            .text('Description of works inspected', startX, curY + 5, { width: width, align: 'center' });
        curY += 18;

        const c1 = 40, c2 = 180, c3 = 120, c4 = 100, c5 = width - c1 - c2 - c3 - c4;
        doc.rect(startX, curY, width, 35).stroke();
        doc.fontSize(8).font(this.fonts.bold).fillColor(this.colors.red);
        doc.text('SR NO.', startX, curY + 12, { width: c1, align: 'center' });
        doc.text('DESCRIPTION', startX + c1, curY + 12, { width: c2, align: 'center' });
        doc.text('AS PER DRG.', startX + c1 + c2, curY + 12, { width: c3, align: 'center' });
        doc.text('ACTUAL', startX + c1 + c2 + c3, curY + 6, { width: c4, align: 'center' });
        doc.font(this.fonts.regular).fillColor(this.colors.black).fontSize(7)
            .text(`(${data.vendor_dish_end_number || ''})`, startX + c1 + c2 + c3, curY + 18, { width: c4, align: 'center' });
        doc.font(this.fonts.bold).fillColor(this.colors.red).fontSize(8)
            .text('REMARKS', startX + c1 + c2 + c3 + c4, curY + 12, { width: c5, align: 'center' });
        curY += 35;

        // Table Rows
        const tRowH = 15;
        if (data.items && data.items.length > 0) {
            data.items.forEach((item, i) => {
                doc.rect(startX, curY, width, tRowH).stroke();
                doc.fontSize(8).font(this.fonts.regular).fillColor(this.colors.black);
                doc.text(String(item.sr_no || (i+1)), startX, curY + 4, { width: c1, align: 'center' });
                doc.text(String(item.description || ''), startX + c1 + 5, curY + 4, { width: c2 - 10 });
                doc.text(String(item.as_per_drg || ''), startX + c1 + c2 + 5, curY + 4, { width: c3 - 10 });
                doc.text(String(item.actual || ''), startX + c1 + c2 + c3 + 5, curY + 4, { width: c4 - 10 });
                doc.text(String(item.remarks || ''), startX + c1 + c2 + c3 + c4 + 5, curY + 4, { width: c5 - 10 });
                curY += tRowH;
            });
        }

        // Fill remaining table space if needed? No, let it be dynamic or fill to a certain point.
        // For now, just continue.

        // Notes
        const noteH = 40;
        doc.rect(startX, curY, width, noteH).stroke();
        doc.font(this.fonts.bold).fontSize(8).fillColor(this.colors.red).text('NOTE:', startX + 5, curY + 5);
        doc.font(this.fonts.regular).fillColor(this.colors.red)
            .text('1. ALL DIMENSIONS ARE IN MM UNLESS OTHERWISE SPECIFIED.', startX + 40, curY + 5);
        doc.text('2. RELEASE FOR FURTHER PROCESS.', startX + 40, curY + 15);
        doc.text('3. REPORT NO: ' + (data.report_no || '-'), startX + 40, curY + 25);
        curY += noteH;

        // Instruments
        doc.rect(startX, curY, width, 15).stroke();
        doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.red).text('INSTRUMENT CALIBRATION DETAILS:', startX + 5, curY + 3);
        curY += 15;

        const iCol = width / 4;
        const iRowH = 18;
        // SR line
        doc.rect(startX, curY, width, iRowH).stroke();
        [1, 2, 3].forEach((n, i) => {
            doc.font(this.fonts.bold).fillColor(this.colors.black).text(String(n), startX + iCol * (i + 1), curY + 5, { width: iCol, align: 'center' });
        });
        curY += iRowH;

        // Data lines
        const iLabels = ['NAME:', 'ID NO. / SR NO.:', 'DUE DATE:'];
        const iFields = ['name', 'id_no', 'due_date'];
        iLabels.forEach((lbl, idx) => {
            doc.rect(startX, curY, width, iRowH).stroke();
            doc.font(this.fonts.bold).fillColor(this.colors.red).text(lbl, startX + 5, curY + 5);
            if (data.instruments) {
                data.instruments.slice(0, 3).forEach((inst, i) => {
                    doc.font(this.fonts.regular).fillColor(this.colors.black).text(String(inst[iFields[idx]] || ''), startX + iCol * (i + 1), curY + 5, { width: iCol, align: 'center' });
                });
            }
            curY += iRowH;
        });

        // Signatures area - stretch to bottom
        const sigY = curY;
        const sigH = (startY + height) - sigY;
        doc.rect(startX, sigY, width, sigH).stroke();
        const sigW = width / 3;
        doc.moveTo(startX + sigW, sigY).lineTo(startX + sigW, startY + height).stroke();
        doc.moveTo(startX + 2 * sigW, sigY).lineTo(startX + 2 * sigW, startY + height).stroke();

        doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.red);
        const sigLabelY = startY + height - 15;
        doc.text('Production ENGINEER', startX, sigLabelY, { width: sigW, align: 'center' });
        doc.text('QC Engineer', startX + sigW, sigLabelY, { width: sigW, align: 'center' });
        doc.text('TPIA/AI/CLIENT', startX + 2 * sigW, sigLabelY, { width: sigW, align: 'center' });

        // Footer
        const footY = startY + height + 5;
        doc.fontSize(7).fillColor(this.colors.black).font(this.fonts.regular);
        doc.text('EXHIBIT 10/3', startX, footY);
        doc.text('GENERAL INSPECTION REPORT', startX, footY, { width: width, align: 'center' });
        doc.text('REV.: R1', startX + width - 60, footY);

        doc.end();
    }
}

module.exports = new DishEndPdfGenerator();
