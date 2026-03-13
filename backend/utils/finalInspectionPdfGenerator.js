const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class FinalInspectionPdfGenerator {
    constructor() {
        this.colors = {
            red: '#FF0000',
            black: '#000000',
            white: '#FFFFFF',
            green: '#92D050' // From ss1/ss2
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

        // Logo Section
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

        doc.font(this.fonts.bold).fontSize(15).fillColor(this.colors.black)
            .text('FINAL INSPECTION REPORT', x + logoBoxW, y + 25, { width: titleBoxW, align: 'center' });
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
        const rowH = 18;
        doc.fontSize(9);

        // --- ROW 1: MSN, TAG NO, DATE (3 columns) ---
        doc.rect(startX, curY, width, rowH).stroke();
        const col3W = width / 3;
        const labelW = 45; // Width of red label boxes

        // col 1 (MSN)
        doc.rect(startX, curY, labelW, rowH).stroke();
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('MSN:', startX + 5, curY + 5);
        doc.font(this.fonts.regular).fillColor(this.colors.black).text(String(data.msn || '-'), startX + labelW + 5, curY + 5);
        doc.moveTo(startX + col3W, curY).lineTo(startX + col3W, curY + rowH).stroke();

        // col 2 (TAG NO)
        const startCol2 = startX + col3W;
        doc.rect(startCol2, curY, labelW + 10, rowH).stroke();
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('TAG NO.:', startCol2 + 5, curY + 5);
        doc.font(this.fonts.regular).fillColor(this.colors.black).text(String(data.tag_no || '-'), startCol2 + labelW + 15, curY + 5);
        doc.moveTo(startX + 2 * col3W, curY).lineTo(startX + 2 * col3W, curY + rowH).stroke();

        // col 3 (DATE)
        const startCol3 = startX + 2 * col3W;
        doc.rect(startCol3, curY, labelW, rowH).stroke();
        doc.font(this.fonts.bold).fillColor(this.colors.red).text('DATE:', startCol3 + 5, curY + 5);
        const reportDate = data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-GB') : '-';
        doc.font(this.fonts.regular).fillColor(this.colors.black).text(reportDate, startCol3 + labelW + 5, curY + 5);
        
        curY += rowH;

        // --- REMAINING ROWS: (2 columns each) ---
        const col2W = width / 2;
        const infoRows = [
            { l1: 'CLIENT:', v1: data.client, l2: 'DRG. NO.:', v2: data.drg_no },
            { l1: 'P.O. NO.:', v1: data.po_no, l2: 'EQUIPMENT:', v2: data.equipment_name },
            { l1: 'CODE:', v1: data.code, l2: 'QAP CLAUSE:', v2: data.qap_clause || '-' }
        ];

        infoRows.forEach(row => {
            doc.rect(startX, curY, width, rowH).stroke();
            doc.moveTo(startX + col2W, curY).lineTo(startX + col2W, curY + rowH).stroke();
            
            // Col 1
            doc.rect(startX, curY, labelW, rowH).stroke();
            doc.font(this.fonts.bold).fillColor(this.colors.red).text(row.l1, startX + 5, curY + 5);
            doc.font(this.fonts.regular).fillColor(this.colors.black).text(String(row.v1 || '-'), startX + labelW + 5, curY + 5);
            
            // Col 2
            const startC2 = startX + col2W;
            doc.rect(startC2, curY, labelW + 20, rowH).stroke();
            doc.font(this.fonts.bold).fillColor(this.colors.red).text(row.l2, startC2 + 5, curY + 5);
            doc.font(this.fonts.regular).fillColor(this.colors.black).text(String(row.v2 || '-'), startC2 + labelW + 25, curY + 5);
            
            curY += rowH;
        });

        // 3. FINAL DIMENSION REPORT Table
        const greenHeaderH = 18;
        doc.rect(startX, curY, width, greenHeaderH).fillAndStroke(this.colors.green, this.colors.black);
        doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.red).text('FINAL DIMENSION REPORT', startX, curY + 5, { width: width, align: 'center' });
        curY += greenHeaderH;

        const c1 = 40, c2 = 180, c3 = 120, c4 = 100, c5 = width - c1 - c2 - c3 - c4;
        doc.rect(startX, curY, width, greenHeaderH).fillAndStroke(this.colors.green, this.colors.black);
        doc.font(this.fonts.bold).fontSize(8).fillColor(this.colors.red);
        doc.text('SR NO.', startX, curY + 5, { width: c1, align: 'center' });
        doc.text('DESCRIPTION', startX + c1, curY + 5, { width: c2, align: 'center' });
        doc.text('REQUIRED', startX + c1 + c2, curY + 5, { width: c3, align: 'center' });
        doc.text('ACTUAL', startX + c1 + c2 + c3, curY + 5, { width: c4, align: 'center' });
        doc.text('REMARKS', startX + c1 + c2 + c3 + c4, curY + 5, { width: c5, align: 'center' });
        curY += greenHeaderH;

        if (data.details && data.details.length > 0) {
            data.details.forEach((item, i) => {
                doc.rect(startX, curY, width, 15).stroke();
                // Vertical lines
                [c1, c1 + c2, c1 + c2 + c3, c1 + c2 + c3 + c4].forEach(x => {
                    doc.moveTo(startX + x, curY).lineTo(startX + x, curY + 15).stroke();
                });
                doc.font(this.fonts.regular).fontSize(8).fillColor(this.colors.black);
                doc.text(String(item.sr_no || (i + 1)), startX, curY + 4, { width: c1, align: 'center' });
                doc.font(this.fonts.bold).fillColor(this.colors.red).text(String(item.description || ''), startX + c1 + 5, curY + 4, { width: c2 - 10 });
                doc.font(this.fonts.regular).fillColor(this.colors.black).text(String(item.required || ''), startX + c1 + c2 + 5, curY + 4, { width: c3 - 10, align: 'center' });
                doc.text(String(item.actual || ''), startX + c1 + c2 + c3 + 5, curY + 4, { width: c4 - 10, align: 'center' });
                doc.text(String(item.remarks || ''), startX + c1 + c2 + c3 + c4 + 5, curY + 4, { width: c5 - 10, align: 'center' });
                curY += 15;
            });
        }

        // 4. NOZZLE DETAILS Table
        doc.rect(startX, curY, width, greenHeaderH).fillAndStroke(this.colors.green, this.colors.black);
        doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.red).text('NOZZLE DETAILS', startX, curY + 5, { width: width, align: 'center' });
        curY += greenHeaderH;

        const nc1 = 50, nc2 = 80, nc3 = 50, nc4 = 60, nc5 = 60, nc6 = 60, nc7 = 60, nc8 = width - nc1 - nc2 - nc3 - nc4 - nc5 - nc6 - nc7;

        // Multi-level Header
        doc.rect(startX, curY, width, 30).fillAndStroke(this.colors.green, this.colors.black);
        doc.fontSize(7).font(this.fonts.bold).fillColor(this.colors.red);
        doc.text('NOZZLE MARK', startX, curY + 10, { width: nc1, align: 'center' });
        doc.text('ORIENTATION', startX + nc1, curY + 10, { width: nc2, align: 'center' });
        doc.text('SIZE', startX + nc1 + nc2, curY + 10, { width: nc3, align: 'center' });

        doc.text('DIMENSION AS PER APRROVED DRAWING', startX + nc1 + nc2 + nc3, curY + 5, { width: nc4 + nc5 + nc6, align: 'center' });
        doc.text('DIMENSION AT ACTUAL MEASURE', startX + nc1 + nc2 + nc3 + nc4 + nc5 + nc6, curY + 5, { width: nc7 + nc8, align: 'center' });

        doc.fontSize(6);
        doc.text('LOCATION', startX + nc1 + nc2 + nc3, curY + 18, { width: nc4, align: 'center' });
        doc.text('ELEVATION', startX + nc1 + nc2 + nc3 + nc4, curY + 18, { width: nc5, align: 'center' });
        doc.text('PROJECTION', startX + nc1 + nc2 + nc3 + nc4 + nc5, curY + 18, { width: nc6, align: 'center' });
        doc.text('ELEVATION', startX + nc1 + nc2 + nc3 + nc4 + nc5 + nc6, curY + 18, { width: nc7, align: 'center' });
        doc.text('PROJECTION', startX + nc1 + nc2 + nc3 + nc4 + nc5 + nc6 + nc7, curY + 18, { width: nc8, align: 'center' });

        // Vertical lines for header
        [nc1, nc1 + nc2, nc1 + nc2 + nc3, nc1 + nc2 + nc3 + nc4, nc1 + nc2 + nc3 + nc4 + nc5, nc1 + nc2 + nc3 + nc4 + nc5 + nc6, nc1 + nc2 + nc3 + nc4 + nc5 + nc6 + nc7].forEach(lx => {
            doc.moveTo(startX + lx, curY).lineTo(startX + lx, curY + 30).stroke();
        });
        curY += 30;

        if (data.nozzles && data.nozzles.length > 0) {
            data.nozzles.forEach(nz => {
                doc.rect(startX, curY, width, 15).stroke();
                [nc1, nc1 + nc2, nc1 + nc2 + nc3, nc1 + nc2 + nc3 + nc4, nc1 + nc2 + nc3 + nc4 + nc5, nc1 + nc2 + nc3 + nc4 + nc5 + nc6, nc1 + nc2 + nc3 + nc4 + nc5 + nc6 + nc7].forEach(lx => {
                    doc.moveTo(startX + lx, curY).lineTo(startX + lx, curY + 15).stroke();
                });
                doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black);
                doc.text(nz.nozzle_mark || '', startX, curY + 4, { width: nc1, align: 'center' });
                doc.text(nz.orientation || '', startX + nc1, curY + 4, { width: nc2, align: 'center' });
                doc.text(nz.size || '', startX + nc1 + nc2, curY + 4, { width: nc3, align: 'center' });
                doc.text(nz.location || '', startX + nc1 + nc2 + nc3, curY + 4, { width: nc4, align: 'center' });
                doc.text(nz.elevation_approved || '', startX + nc1 + nc2 + nc3 + nc4, curY + 4, { width: nc5, align: 'center' });
                doc.text(nz.projection_approved || '', startX + nc1 + nc2 + nc3 + nc4 + nc5, curY + 4, { width: nc6, align: 'center' });
                doc.text(nz.elevation_actual || '', startX + nc1 + nc2 + nc3 + nc4 + nc5 + nc6, curY + 4, { width: nc7, align: 'center' });
                doc.text(nz.projection_actual || '', startX + nc1 + nc2 + nc3 + nc4 + nc5 + nc6 + nc7, curY + 4, { width: nc8, align: 'center' });
                curY += 15;
            });
        }

        // 5. PART DETAILS Table (Similar structure)
        doc.rect(startX, curY, width, greenHeaderH).fillAndStroke(this.colors.green, this.colors.black);
        doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.red).text('PART DETAILS', startX, curY + 5, { width: width, align: 'center' });
        curY += greenHeaderH;

        doc.rect(startX, curY, width, 30).fillAndStroke(this.colors.green, this.colors.black);
        doc.fontSize(7).font(this.fonts.bold).fillColor(this.colors.red);
        doc.text('PART NO', startX, curY + 10, { width: nc1, align: 'center' });
        doc.text('DESCRIPTION', startX + nc1, curY + 10, { width: nc2 + nc3, align: 'center' });
        doc.text('DIMENSION AS PER APRROVED DRAWING', startX + nc1 + nc2 + nc3, curY + 5, { width: nc4 + nc5 + nc6, align: 'center' });
        doc.text('DIMENSION AT ACTUAL MEASURE', startX + nc1 + nc2 + nc3 + nc4 + nc5 + nc6, curY + 5, { width: nc7 + nc8, align: 'center' });

        doc.fontSize(6);
        doc.text('ORIENTATION', startX + nc1 + nc2 + nc3, curY + 18, { width: nc4, align: 'center' });
        doc.text('ELEVATION', startX + nc1 + nc2 + nc3 + nc4, curY + 18, { width: nc5, align: 'center' });
        doc.text('PROJECTION', startX + nc1 + nc2 + nc3 + nc4 + nc5, curY + 18, { width: nc6, align: 'center' });
        doc.text('ELEVATION', startX + nc1 + nc2 + nc3 + nc4 + nc5 + nc6, curY + 18, { width: nc7, align: 'center' });
        doc.text('PROJECTION', startX + nc1 + nc2 + nc3 + nc4 + nc5 + nc6 + nc7, curY + 18, { width: nc8, align: 'center' });

        [nc1, nc1 + nc2 + nc3, nc1 + nc2 + nc3 + nc4, nc1 + nc2 + nc3 + nc4 + nc5, nc1 + nc2 + nc3 + nc4 + nc5 + nc6, nc1 + nc2 + nc3 + nc4 + nc5 + nc6 + nc7].forEach(lx => {
            doc.moveTo(startX + lx, curY).lineTo(startX + lx, curY + 30).stroke();
        });
        curY += 30;

        if (data.parts && data.parts.length > 0) {
            data.parts.forEach(pt => {
                doc.rect(startX, curY, width, 15).stroke();
                [nc1, nc1 + nc2 + nc3, nc1 + nc2 + nc3 + nc4, nc1 + nc2 + nc3 + nc4 + nc5, nc1 + nc2 + nc3 + nc4 + nc5 + nc6, nc1 + nc2 + nc3 + nc4 + nc5 + nc6 + nc7].forEach(lx => {
                    doc.moveTo(startX + lx, curY).lineTo(startX + lx, curY + 15).stroke();
                });
                doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black);
                doc.text(pt.part_no || '', startX, curY + 4, { width: nc1, align: 'center' });
                doc.text(pt.description || '', startX + nc1, curY + 4, { width: nc2 + nc3, align: 'center' });
                doc.text(pt.orientation_approved || '', startX + nc1 + nc2 + nc3, curY + 4, { width: nc4, align: 'center' });
                doc.text(pt.elevation_approved || '', startX + nc1 + nc2 + nc3 + nc4, curY + 4, { width: nc5, align: 'center' });
                doc.text(pt.projection_approved || '', startX + nc1 + nc2 + nc3 + nc4 + nc5, curY + 4, { width: nc6, align: 'center' });
                doc.text(pt.elevation_actual || '', startX + nc1 + nc2 + nc3 + nc4 + nc5 + nc6, curY + 4, { width: nc7, align: 'center' });
                doc.text(pt.projection_actual || '', startX + nc1 + nc2 + nc3 + nc4 + nc5 + nc6 + nc7, curY + 4, { width: nc8, align: 'center' });
                curY += 15;
            });
        }

        // 6. Remarks section
        doc.rect(startX, curY, width, 15).fillAndStroke(this.colors.green, this.colors.black);
        doc.font(this.fonts.bold).fontSize(8).fillColor(this.colors.red).text('REMARK:', startX + 5, curY + 4);
        curY += 15;

        const idxColW = 35;
        if (data.remarks && data.remarks.length > 0) {
            data.remarks.forEach((rem, idx) => {
                const textWidth = width - idxColW - 10;
                doc.fontSize(7).font(this.fonts.regular);
                const textHeight = Math.max(15, doc.heightOfString(rem.text, { width: textWidth }) + 8);
                
                // Row Box
                doc.rect(startX, curY, width, textHeight).stroke();
                
                // Vertical Line
                doc.moveTo(startX + idxColW, curY).lineTo(startX + idxColW, curY + textHeight).stroke();
                
                // Index
                doc.font(this.fonts.regular).fillColor(this.colors.black);
                const idxH = doc.currentLineHeight();
                doc.text(String(idx + 1), startX, curY + (textHeight - idxH) / 2, { width: idxColW, align: 'center' });
                
                // Remark Text
                doc.fillColor(this.colors.red);
                const actualTextH = doc.heightOfString(rem.text, { width: textWidth });
                doc.text(rem.text, startX + idxColW + 5, curY + (textHeight - actualTextH) / 2, { width: textWidth });
                
                curY += textHeight;
            });
        }

        // 7. Instruments
        doc.fontSize(8).font(this.fonts.bold).fillColor(this.colors.red).text('INSTRUMENT CALIBRATION DETAILS:', startX, curY + 5);
        curY += 15;

        const iColW = width / 4;
        const iRowH = 15;

        // Header Row: 1, 2, 3
        doc.rect(startX, curY, width, iRowH).stroke();
        [1, 2, 3].forEach(num => {
            const ix = startX + num * iColW;
            doc.moveTo(ix, curY).lineTo(ix, curY + iRowH).stroke();
            doc.font(this.fonts.bold).fillColor(this.colors.black).text(String(num), ix, curY + 4, { width: iColW, align: 'center' });
        });
        curY += iRowH;

        ['NAME:', 'ID NO. / SR NO.:', 'DUE DATE:'].forEach((lbl, lIdx) => {
            doc.rect(startX, curY, width, iRowH).stroke();
            
            // Vertical lines for each column
            [1, 2, 3].forEach(num => {
                const ix = startX + num * iColW;
                doc.moveTo(ix, curY).lineTo(ix, curY + iRowH).stroke();
            });

            doc.font(this.fonts.bold).fillColor(this.colors.red).text(lbl, startX + 5, curY + 4);
            if (data.instruments) {
                data.instruments.slice(0, 3).forEach((inst, i) => {
                    const fields = ['name', 'id_no', 'due_date'];
                    let val = String(inst[fields[lIdx]] || '');
                    if (fields[lIdx] === 'due_date' && val) {
                        try { val = new Date(val).toLocaleDateString('en-GB'); } catch(e){}
                    }
                    doc.font(this.fonts.regular).fillColor(this.colors.black).text(val, startX + iColW * (i + 1), curY + 4, { width: iColW, align: 'center' });
                });
            }
            curY += iRowH;
        });

        // 8. Signatures
        const sigY = curY + 10;
        const sigH = (startY + height) - sigY;
        doc.rect(startX, sigY, width, sigH).stroke();
        const sigW = width / 3;
        doc.moveTo(startX + sigW, sigY).lineTo(startX + sigW, startY + height).stroke();
        doc.moveTo(startX + 2 * sigW, sigY).lineTo(startX + 2 * sigW, startY + height).stroke();

        doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.red);
        doc.text('SEL QC', startX, startY + height - 20, { width: sigW, align: 'center' });
        doc.text('AI / TPI', startX + sigW, startY + height - 20, { width: sigW, align: 'center' });
        doc.text('CLIENT', startX + 2 * sigW, startY + height - 20, { width: sigW, align: 'center' });

        // Footer
        doc.fontSize(7).fillColor(this.colors.black).font(this.fonts.regular);
        doc.text('EXHIBIT 10/3', startX, startY + height + 5);
        doc.text('GENERAL INSPECTION REPORT', startX, startY + height + 5, { width: width, align: 'center' });
        doc.text('REV.: R1', startX + width - 60, startY + height + 5);

        doc.end();
    }
}

module.exports = new FinalInspectionPdfGenerator();
