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

    drawLogoAndTitle(doc, x, y, width, height, companyInfo) {
        const logoBoxW = 160;
        const titleBoxW = width - logoBoxW;

        // Draw boxes
        doc.lineWidth(0.5).strokeColor(this.colors.black);
        doc.rect(x, y, logoBoxW, height).stroke();
        doc.rect(x + logoBoxW, y, titleBoxW, height).stroke();

        // Left Side: Logo + Name
        doc.rect(x, y, logoBoxW, height).stroke();
        const logoPath = companyInfo?.logoPath || path.join(process.cwd(), 'frontend', 'public', 'lego_logo.png');
        if (fs.existsSync(logoPath)) {
            try {
                doc.image(logoPath, x + 5, y + 10, { height: 30 });
            } catch (e) {
                const altLogo = path.join(process.cwd(), 'backend', 'public', 'logo.png');
                if (fs.existsSync(altLogo)) doc.image(altLogo, x + 5, y + 10, { height: 30 });
            }
        }
        doc.font(this.fonts.bold).fontSize(10).fillColor('#005596')
            .text(companyInfo?.name || 'Shreno Engineering Limited', x + 38, y + 15, { width: logoBoxW - 40, align: 'left' });

        // Right Side: Report Title
        doc.font(this.fonts.bold).fontSize(16).fillColor(this.colors.red)
            .text('DISH END INSPECTION REPORT', x + logoBoxW, y + 25, { width: titleBoxW, align: 'center' });
    }

    generatePDF(data, res, companyInfo) {
        const doc = new PDFDocument({ margin: 25, size: 'A4' });
        doc.pipe(res);

        const startX = 40;
        const startY = 40;
        const width = doc.page.width - 80;
        const height = doc.page.height - 80;

        // Outer Border
        doc.lineWidth(1).strokeColor(this.colors.black).rect(startX, startY, width, height).stroke();

        let curY = startY;

        // 1. Header Section
        const headerH = 65;
        this.drawLogoAndTitle(doc, startX, curY, width, headerH, companyInfo);
        curY += headerH;

        // 2. Info Grid Section
        const rowH = 22;
        doc.fontSize(9);

        // Row 1: 3 columns (MSN, TAG NO, DATE)
        doc.rect(startX, curY, width, rowH).stroke();
        const col3W = width / 3;

        // col 1 (MSN)
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('MSN:', startX + 5, curY + 7);
        doc.font(this.fonts.regular).fillColor(this.colors.black).text(String(data.msn || '-'), startX + 80, curY + 7);
        doc.moveTo(startX + col3W, curY).lineTo(startX + col3W, curY + rowH).stroke();

        // col 2 (TAG NO)
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('TAG NO.:', startX + col3W + 5, curY + 7);
        doc.font(this.fonts.regular).fillColor(this.colors.black).text(String(data.tag_no || '-'), startX + col3W + 80, curY + 7);
        doc.moveTo(startX + 2 * col3W, curY).lineTo(startX + 2 * col3W, curY + rowH).stroke();

        // col 3 (DATE)
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('DATE:', startX + 2 * col3W + 5, curY + 7);
        const reportDate = data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-GB') : '-';
        doc.font(this.fonts.regular).fillColor(this.colors.black).text(reportDate, startX + 2 * col3W + 50, curY + 7);

        curY += rowH;

        // Rows 2-4: 2 columns
        const col2W = width / 2;
        const rows = [
            { l1: 'CLIENT:', v1: data.client, l2: 'DRG. NO.:', v2: data.drg_no },
            { l1: 'P.O. NO.:', v1: data.po_no, l2: 'EQUIPMENT:', v2: data.equipment_name },
            { l1: 'CODE:', v1: data.code, l2: 'INSP. AGENCY:', v2: data.insp_agency }
        ];

        rows.forEach(row => {
            doc.rect(startX, curY, width, rowH).stroke();
            doc.moveTo(startX + col2W, curY).lineTo(startX + col2W, curY + rowH).stroke();

            doc.font(this.fonts.bold).fillColor(this.colors.red).text(row.l1, startX + 5, curY + 7);
            doc.font(this.fonts.regular).fillColor(this.colors.black).text(String(row.v1 || '-'), startX + 80, curY + 7);

            doc.font(this.fonts.bold).fillColor(this.colors.red).text(row.l2, startX + col2W + 5, curY + 7);
            doc.font(this.fonts.regular).fillColor(this.colors.black).text(String(row.v2 || '-'), startX + col2W + 80, curY + 7);
            curY += rowH;
        });

        // 3. Subtitle Row
        doc.rect(startX, curY, width, 18).stroke();
        doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.red)
            .text('Description of works inspected', startX, curY + 5, { width: width, align: 'center' });
        curY += 18;

        // 4. Works Table Header
        const col1 = 40;
        const col2 = 180;
        const col3 = 120;
        const col4 = 100;
        const col5 = width - col1 - col2 - col3 - col4;

        // --- SUB-HEADER ROW (~ss1) ---
        const subRowH = 20;
        doc.rect(startX, curY, width, subRowH).stroke();
        // Vertical lines for sub-header
        doc.moveTo(startX + col1, curY).lineTo(startX + col1, curY + subRowH).stroke();
        doc.moveTo(startX + col1 + col2, curY).lineTo(startX + col1 + col2, curY + subRowH).stroke();
        doc.moveTo(startX + col1 + col2 + col3, curY).lineTo(startX + col1 + col2 + col3, curY + subRowH).stroke();
        doc.moveTo(startX + col1 + col2 + col3 + col4, curY).lineTo(startX + col1 + col2 + col3 + col4, curY + subRowH).stroke();

        doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.red);
        doc.text('DISH END', startX + col1, curY + 6, { width: col2, align: 'center' });
        doc.text('PART NO', startX + col1 + col2 + col3, curY + 6, { width: col4, align: 'center' });
        curY += subRowH;

        // --- ACTUAL HEADER ROW ---
        doc.rect(startX, curY, width, 35).stroke();
        // Vertical lines for header
        doc.moveTo(startX + col1, curY).lineTo(startX + col1, curY + 35).stroke();
        doc.moveTo(startX + col1 + col2, curY).lineTo(startX + col1 + col2, curY + 35).stroke();
        doc.moveTo(startX + col1 + col2 + col3, curY).lineTo(startX + col1 + col2 + col3, curY + 35).stroke();
        doc.moveTo(startX + col1 + col2 + col3 + col4, curY).lineTo(startX + col1 + col2 + col3 + col4, curY + 35).stroke();

        doc.fontSize(8).font(this.fonts.bold).fillColor(this.colors.red);
        doc.text('SR NO.', startX, curY + 12, { width: col1, align: 'center' });
        doc.text('DESCRIPTION', startX + col1, curY + 12, { width: col2, align: 'center' });
        doc.text('AS PER DRG.', startX + col1 + col2, curY + 12, { width: col3, align: 'center' });
        doc.text('ACTUAL', startX + col1 + col2 + col3, curY + 6, { width: col4, align: 'center' });
        doc.font(this.fonts.regular).fillColor(this.colors.black).fontSize(7)
            .text(`(${data.vendor_dish_end_number || ''})`, startX + col1 + col2 + col3, curY + 18, { width: col4, align: 'center' });
        doc.font(this.fonts.bold).fillColor(this.colors.red).fontSize(8)
            .text('REMARKS', startX + col1 + col2 + col3 + col4, curY + 12, { width: col5, align: 'center' });
        curY += 35;

        // 5. Table Rows
        const tRowH = 15;
        if (data.items && data.items.length > 0) {
            data.items.forEach((item, i) => {
                doc.rect(startX, curY, width, tRowH).stroke();
                // Vertical grid lines
                doc.moveTo(startX + col1, curY).lineTo(startX + col1, curY + tRowH).stroke();
                doc.moveTo(startX + col1 + col2, curY).lineTo(startX + col1 + col2, curY + tRowH).stroke();
                doc.moveTo(startX + col1 + col2 + col3, curY).lineTo(startX + col1 + col2 + col3, curY + tRowH).stroke();
                doc.moveTo(startX + col1 + col2 + col3 + col4, curY).lineTo(startX + col1 + col2 + col3 + col4, curY + tRowH).stroke();

                doc.fontSize(8).font(this.fonts.regular).fillColor(this.colors.black);
                doc.text(String(item.sr_no || (i + 1)), startX, curY + 4, { width: col1, align: 'center' });

                // Description (Red color as per ss, and handle overflow)
                doc.fillColor(this.colors.red);
                const desc = String(item.description || '');
                let descFontSize = 8;
                if (desc.length > 30) descFontSize = 7;
                if (desc.length > 40) descFontSize = 6;
                doc.fontSize(descFontSize).text(desc, startX + col1 + 5, curY + 4, { width: col2 - 10, height: tRowH - 4, ellipsis: true });

                doc.fontSize(8).fillColor(this.colors.black);
                doc.text(String(item.as_per_drg || ''), startX + col1 + col2 + 5, curY + 4, { width: col3 - 10, align: 'center' });
                doc.text(String(item.actual || ''), startX + col1 + col2 + col3 + 5, curY + 4, { width: col4 - 10, align: 'center' });
                doc.text(String(item.remarks || ''), startX + col1 + col2 + col3 + col4 + 5, curY + 4, { width: col5 - 10, align: 'center' });
                curY += tRowH;
            });
        }

        // 6. Notes Section
        const noteH = 40;
        doc.rect(startX, curY, width, noteH).stroke();
        doc.font(this.fonts.bold).fontSize(8).fillColor(this.colors.red).text('NOTE:', startX + 5, curY + 5);
        doc.font(this.fonts.regular).fillColor(this.colors.red)
            .text('1. ALL DIMENSIONS ARE IN MM UNLESS OTHERWISE SPECIFIED.', startX + 40, curY + 5);
        doc.text('2. RELEASE FOR FURTHER PROCESS.', startX + 40, curY + 15);
        doc.text('3. REPORT NO: ' + (data.report_no || '-'), startX + 40, curY + 25);
        curY += noteH;

        // 7. Instrument Calibration Table (~ss3)
        doc.rect(startX, curY, width, 15).stroke();
        doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.red).text('INSTRUMENT CALIBRATION DETAILS:', startX + 5, curY + 3);
        curY += 15;

        const instCol1W = 120; // Label column
        const dataColW = (width - instCol1W) / 3;
        const iRowH = 20;

        // Row 0: SR Numbers
        doc.rect(startX, curY, width, iRowH).stroke();
        doc.moveTo(startX + instCol1W, curY).lineTo(startX + instCol1W, curY + iRowH).stroke();
        [1, 2, 3].forEach((n, i) => {
            const ix = startX + instCol1W + (i * dataColW);
            doc.font(this.fonts.bold).fillColor(this.colors.black).text(String(n), ix, curY + 6, { width: dataColW, align: 'center' });
            if (i < 2) doc.moveTo(ix + dataColW, curY).lineTo(ix + dataColW, curY + iRowH).stroke();
        });
        curY += iRowH;

        // Rows: NAME, ID NO, DUE DATE
        const iLabels = ['NAME:', 'ID NO. / SR NO.:', 'DUE DATE:'];
        const iFields = ['name', 'id_no', 'due_date'];

        iLabels.forEach((lbl, idx) => {
            doc.rect(startX, curY, width, iRowH).stroke();
            doc.font(this.fonts.bold).fillColor(this.colors.red).text(lbl, startX + 5, curY + 6, { width: instCol1W });
            doc.moveTo(startX + instCol1W, curY).lineTo(startX + instCol1W, curY + iRowH).stroke();

            if (data.instruments) {
                data.instruments.slice(0, 3).forEach((inst, i) => {
                    const ix = startX + instCol1W + (i * dataColW);
                    let val = String(inst[iFields[idx]] || '');
                    if (iFields[idx] === 'due_date' && val) {
                        try { val = new Date(val).toLocaleDateString('en-GB'); } catch (e) { }
                    }
                    doc.font(this.fonts.regular).fillColor(this.colors.black).text(val, ix + 5, curY + 6, { width: dataColW - 10, align: 'center' });
                    if (i < 2) doc.moveTo(ix + dataColW, curY).lineTo(ix + dataColW, curY + iRowH).stroke();
                });
            }
            curY += iRowH;
        });

        // 8. Signatures area - Stretch to fill remaining space
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

        // 9. Footer Text
        const footY = startY + height + 5;
        doc.fontSize(7).fillColor(this.colors.black).font(this.fonts.regular);
        doc.text('EXHIBIT 10/3', startX, footY);
        doc.text('GENERAL INSPECTION REPORT', startX, footY, { width: width, align: 'center' });
        doc.text('REV.: R1', startX + width - 60, footY);

        doc.end();
    }
}

module.exports = new DishEndPdfGenerator();
