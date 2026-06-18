const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class TubeSheetPdfGenerator {
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

        doc.lineWidth(0.5).strokeColor(this.colors.black);
        doc.rect(x, y, logoBoxW, height).stroke();
        doc.rect(x + logoBoxW, y, titleBoxW, height).stroke();

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

        doc.font(this.fonts.bold).fontSize(16).fillColor(this.colors.red)
            .text('TUBE SHEET INSPECTION REPORT', x + logoBoxW, y + 25, { width: titleBoxW, align: 'center' });
    }

    generatePDF(data, res, companyInfo) {
        const doc = new PDFDocument({ margin: 25, size: 'A4' });
        doc.pipe(res);

        const startX = 40;
        let startY = 40;
        const width = doc.page.width - 80;
        
        let curY = startY;

        const headerH = 65;
        this.drawLogoAndTitle(doc, startX, curY, width, headerH, companyInfo);
        curY += headerH;

        const rowH = 22;
        doc.fontSize(9);

        // Row 1
        doc.rect(startX, curY, width, rowH).stroke();
        const col3W = width / 3;

        doc.font(this.fonts.bold).fillColor(this.colors.red).text('MSN:', startX + 5, curY + 7);
        doc.font(this.fonts.regular).fillColor(this.colors.black).text(String(data.msn || '-'), startX + 50, curY + 7);
        doc.moveTo(startX + col3W, curY).lineTo(startX + col3W, curY + rowH).stroke();

        doc.font(this.fonts.bold).fillColor(this.colors.red).text('TAG NO.:', startX + col3W + 5, curY + 7);
        doc.font(this.fonts.regular).fillColor(this.colors.black).text(String(data.tag_no || '-'), startX + col3W + 60, curY + 7);
        doc.moveTo(startX + 2 * col3W, curY).lineTo(startX + 2 * col3W, curY + rowH).stroke();

        doc.font(this.fonts.bold).fillColor(this.colors.red).text('DATE:', startX + 2 * col3W + 5, curY + 7);
        const reportDate = data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-GB') : '-';
        doc.font(this.fonts.regular).fillColor(this.colors.black).text(reportDate, startX + 2 * col3W + 50, curY + 7);
        curY += rowH;

        // Rows 2-4
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
            doc.font(this.fonts.regular).fillColor(this.colors.black).text(String(row.v1 || '-'), startX + 80, curY + 7, { width: col2W - 85, ellipsis: true });

            doc.font(this.fonts.bold).fillColor(this.colors.red).text(row.l2, startX + col2W + 5, curY + 7);
            doc.font(this.fonts.regular).fillColor(this.colors.black).text(String(row.v2 || '-'), startX + col2W + 80, curY + 7, { width: col2W - 85, ellipsis: true });
            curY += rowH;
        });

        // Subtitle Row
        doc.rect(startX, curY, width, 18).stroke();
        doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.red)
            .text('Description of works inspected', startX, curY + 5, { width: width, align: 'center' });
        curY += 18;

        // Table Header
        const col1 = 30; // SR NO
        const col2 = 180; // DESCRIPTION
        const col3 = 80; // DRG DIM
        const col4 = 120; // ACTUAL 1 + ACTUAL 2
        const col5 = width - col1 - col2 - col3 - col4; // REMARKS

        doc.rect(startX, curY, width, 25).stroke();
        doc.moveTo(startX + col1, curY).lineTo(startX + col1, curY + 25).stroke();
        doc.moveTo(startX + col1 + col2, curY).lineTo(startX + col1 + col2, curY + 25).stroke();
        doc.moveTo(startX + col1 + col2 + col3, curY).lineTo(startX + col1 + col2 + col3, curY + 25).stroke();
        doc.moveTo(startX + col1 + col2 + col3 + col4, curY).lineTo(startX + col1 + col2 + col3 + col4, curY + 25).stroke();

        doc.moveTo(startX + col1 + col2 + col3, curY + 12).lineTo(startX + col1 + col2 + col3 + col4, curY + 12).stroke();
        doc.moveTo(startX + col1 + col2 + col3 + col4/2, curY + 12).lineTo(startX + col1 + col2 + col3 + col4/2, curY + 25).stroke();

        doc.fontSize(8).font(this.fonts.bold).fillColor(this.colors.red);
        doc.text('SR NO.', startX, curY + 8, { width: col1, align: 'center' });
        doc.text('DESCRIPTION', startX + col1, curY + 8, { width: col2, align: 'center' });
        doc.text('DRG. DIM', startX + col1 + col2, curY + 8, { width: col3, align: 'center' });
        doc.text('ACTUAL DIMENSION', startX + col1 + col2 + col3, curY + 2, { width: col4, align: 'center' });
        
        doc.fontSize(7);
        doc.text(String(data.actual_dimension_1_header || '-'), startX + col1 + col2 + col3, curY + 15, { width: col4/2, align: 'center' });
        doc.text(String(data.actual_dimension_2_header || '-'), startX + col1 + col2 + col3 + col4/2, curY + 15, { width: col4/2, align: 'center' });

        doc.fontSize(8);
        doc.text('REMARKS', startX + col1 + col2 + col3 + col4, curY + 8, { width: col5, align: 'center' });
        curY += 25;

        // Table Rows
        const tRowH = 15;
        if (data.items && data.items.length > 0) {
            data.items.forEach((item, i) => {
                // Handle page breaks
                if (curY + tRowH > doc.page.height - 50) {
                    doc.addPage();
                    curY = startY;
                }

                doc.rect(startX, curY, width, tRowH).stroke();
                doc.moveTo(startX + col1, curY).lineTo(startX + col1, curY + tRowH).stroke();
                doc.moveTo(startX + col1 + col2, curY).lineTo(startX + col1 + col2, curY + tRowH).stroke();
                doc.moveTo(startX + col1 + col2 + col3, curY).lineTo(startX + col1 + col2 + col3, curY + tRowH).stroke();
                doc.moveTo(startX + col1 + col2 + col3 + col4/2, curY).lineTo(startX + col1 + col2 + col3 + col4/2, curY + tRowH).stroke();
                doc.moveTo(startX + col1 + col2 + col3 + col4, curY).lineTo(startX + col1 + col2 + col3 + col4, curY + tRowH).stroke();

                doc.fontSize(8).font(this.fonts.regular).fillColor(this.colors.black);
                doc.text(String(item.sr_no || (i + 1)), startX, curY + 4, { width: col1, align: 'center' });

                doc.fillColor(this.colors.red);
                const desc = String(item.description || '');
                doc.text(desc, startX + col1 + 5, curY + 4, { width: col2 - 10, height: tRowH - 4, ellipsis: true });

                doc.fillColor(this.colors.black);
                doc.text(String(item.drg_dim || ''), startX + col1 + col2 + 5, curY + 4, { width: col3 - 10, align: 'center' });
                doc.text(String(item.actual_dimension_1 || ''), startX + col1 + col2 + col3 + 5, curY + 4, { width: col4/2 - 10, align: 'center' });
                doc.text(String(item.actual_dimension_2 || ''), startX + col1 + col2 + col3 + col4/2 + 5, curY + 4, { width: col4/2 - 10, align: 'center' });
                doc.text(String(item.remarks || ''), startX + col1 + col2 + col3 + col4 + 5, curY + 4, { width: col5 - 10, align: 'center' });
                curY += tRowH;
            });
        }

        // Instrument Calibration Table
        if (curY + 100 > doc.page.height - 50) {
            doc.addPage();
            curY = startY;
        } else {
            curY += 10;
        }

        doc.rect(startX, curY, width, 15).stroke();
        doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.red).text('INSTRUMENT CALIBRATION DETAILS:', startX + 5, curY + 3);
        curY += 15;

        const instCol1W = 120;
        const dataColW = (width - instCol1W) / 3;
        const iRowH = 20;

        doc.rect(startX, curY, width, iRowH).stroke();
        doc.moveTo(startX + instCol1W, curY).lineTo(startX + instCol1W, curY + iRowH).stroke();
        [1, 2, 3].forEach((n, i) => {
            const ix = startX + instCol1W + (i * dataColW);
            doc.font(this.fonts.bold).fillColor(this.colors.black).text(String(n), ix, curY + 6, { width: dataColW, align: 'center' });
            if (i < 2) doc.moveTo(ix + dataColW, curY).lineTo(ix + dataColW, curY + iRowH).stroke();
        });
        curY += iRowH;

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

        curY += 10;
        
        // General Remarks
        if (curY + 60 > doc.page.height - 50) {
            doc.addPage();
            curY = startY;
        }

        doc.rect(startX, curY, width, 15).stroke();
        doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.red).text('REMARKS:', startX + 5, curY + 3);
        curY += 15;

        const remH = Math.max(30, (data.remarks?.length || 1) * 15 + 10);
        doc.rect(startX, curY, width, remH).stroke();
        if (data.remarks && data.remarks.length > 0) {
            doc.font(this.fonts.regular).fillColor(this.colors.black).fontSize(8);
            data.remarks.forEach((rem, i) => {
                doc.text(`${i + 1}. ${rem.text}`, startX + 5, curY + 5 + (i * 15));
            });
        }
        curY += remH;

        // Signatures area
        if (curY + 40 > doc.page.height - 50) {
            doc.addPage();
            curY = startY;
        }
        
        const sigH = 50;
        doc.rect(startX, curY, width, sigH).stroke();
        const sigW = width / 3;
        doc.moveTo(startX + sigW, curY).lineTo(startX + sigW, curY + sigH).stroke();
        doc.moveTo(startX + 2 * sigW, curY).lineTo(startX + 2 * sigW, curY + sigH).stroke();

        doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.red);
        const sigLabelY = curY + sigH - 15;
        doc.text('Production ENGINEER', startX, sigLabelY, { width: sigW, align: 'center' });
        doc.text('QC Engineer', startX + sigW, sigLabelY, { width: sigW, align: 'center' });
        doc.text('TPIA/AI/CLIENT', startX + 2 * sigW, sigLabelY, { width: sigW, align: 'center' });

        // Footer Text
        const footY = curY + sigH + 5;
        doc.fontSize(7).fillColor(this.colors.black).font(this.fonts.regular);
        doc.text('EXHIBIT 10/3', startX, footY);
        doc.text('GENERAL INSPECTION REPORT', startX, footY, { width: width, align: 'center' });
        doc.text('REV.: R1', startX + width - 60, footY);

        doc.end();
    }
}

module.exports = new TubeSheetPdfGenerator();
