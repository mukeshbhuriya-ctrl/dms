const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class HydroTestPdfGenerator {
    constructor() {
        this.colors = {
            red: '#FF0000',
            black: '#000000',
            white: '#FFFFFF',
            green: '#92D050'
        };
        this.fonts = {
            regular: 'Helvetica',
            bold: 'Helvetica-Bold'
        };
    }

    drawLogoAndTitle(doc, x, y, width, height) {
        const logoBoxW = 160;
        const titleBoxW = width - logoBoxW;
        
        doc.lineWidth(0.5).strokeColor(this.colors.black);
        doc.rect(x, y, logoBoxW, height).stroke();
        doc.rect(x + logoBoxW, y, titleBoxW, height).stroke();

        // Sub-rect for the title box split
        doc.rect(x + logoBoxW, y, titleBoxW, height / 2).stroke();

        const logoPath = path.join(process.cwd(), 'frontend', 'public', 'lego_logo.png');
        if (fs.existsSync(logoPath)) {
            try {
                doc.image(logoPath, x + 5, y + 15, { width: 35 });
            } catch (e) {
                console.error("Logo Error:", e);
            }
        }
        doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.black)
            .text('Shreno Engineering Limited', x + 45, y + 27);

        doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.red)
            .text('SHRENO ENGINEERING LIMITED', x + logoBoxW, y + 8, { width: titleBoxW, align: 'center' });
        
        doc.font(this.fonts.bold).fontSize(12).fillColor(this.colors.red)
            .text('HYDROSTATIC PRESSURE TEST REPORT', x + logoBoxW, y + height / 2 + 10, { width: titleBoxW, align: 'center' });
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

        // 1. Header Section
        const headerH = 65;
        this.drawLogoAndTitle(doc, startX, curY, width, headerH);
        curY += headerH;

        // 2. Info Grid Section
        const rowH = 18;
        doc.fontSize(8);
        const labelW = 90;

        const infoRows = [
            [
                { l: 'MSN :', v: data.msn, w: 0.5 },
                { l: 'TAG No. :', v: data.tag_no, w: 0.3 },
                { l: 'DATE :', v: data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-GB') : '-', w: 0.2 }
            ],
            [
                { l: 'CLIENT :', v: data.client, w: 0.5 },
                { l: 'REPORT No. :', v: data.report_no, w: 0.5 }
            ],
            [
                { l: 'P.O. No. :', v: data.po_no, w: 0.5 },
                { l: 'DRG. No. :', v: (data.shreno_drg_no || data.customer_drg_no || '-'), w: 0.5 }
            ],
            [
                { l: 'CONSTRUCTION CODE :', v: data.construction_code, w: 0.5 },
                { l: 'EQUIPMENT :', v: data.equipment_name, w: 0.5 }
            ],
            [
                { l: 'CHLORINE CONTENT :', v: data.chlorine_content, w: 0.5 },
                { l: 'INSPECTION. AGENCY :', v: data.inspection_agency, w: 0.5 }
            ],
            [
                { l: 'TEST POSITION :', v: data.test_position, w: 0.5 },
                { l: 'PROCEDURE NO.', v: data.procedure_no, w: 0.5 }
            ],
            [
                { l: 'TEST MEDIUM :', v: data.test_medium || 'WATER', w: 0.5 },
                { l: 'METAL TEMP.:', v: data.metal_temp || '-', w: 0.5 }
            ]
        ];

        infoRows.forEach(row => {
            doc.rect(startX, curY, width, rowH).stroke();
            let currentX = startX;
            row.forEach(cell => {
                const cellW = width * cell.w;
                doc.rect(currentX, curY, labelW, rowH).stroke();
                doc.font(this.fonts.bold).fillColor(this.colors.red).text(cell.l, currentX + 5, curY + 5);
                doc.font(this.fonts.regular).fillColor(this.colors.black).text(String(cell.v || '-'), currentX + labelW + 5, curY + 5);
                currentX += cellW;
                if (currentX < startX + width) {
                    doc.moveTo(currentX, curY).lineTo(currentX, curY + rowH).stroke();
                }
            });
            curY += rowH;
        });

        // 3. Pressure Test Details Table
        const greenHeaderH = 50;
        doc.rect(startX, curY, width, greenHeaderH).fillAndStroke(this.colors.green, this.colors.black);
        
        const c1 = 80, c2 = 70, c3 = 80, c4 = 60, c5 = 200, c6 = 60, c7 = width - c1-c2-c3-c4-c5-c6;
        
        doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.red);
        doc.text('PARTICULARS', startX, curY + 20, { width: c1, align: 'center' });
        doc.text('MAWP INT. / EXT. PSI (g)', startX + c1, curY + 15, { width: c2, align: 'center' });
        doc.text('REQUIRED TEST PRESSURE PSI (Kg/Cm2) (g)', startX + c1 + c2, curY + 10, { width: c3, align: 'center' });
        doc.text('ACTUAL TEST PRESSURE Kg/Cm2 (g)', startX + c1 + c2 + c3, curY + 10, { width: c4, align: 'center' });
        
        doc.text('PRESSURE GAUGE DETAIL', startX + c1+c2+c3+c4, curY + 10, { width: c5, align: 'center' });
        doc.moveTo(startX + c1+c2+c3+c4, curY + 25).lineTo(startX + c1+c2+c3+c4 + c5, curY + 25).stroke();
        
        const gcW = c5 / 4;
        doc.text('RANGE (Kg/Cm2) (g)', startX + c1+c2+c3+c4, curY + 30, { width: gcW, align: 'center' });
        doc.text('I.D No.', startX + c1+c2+c3+c4 + gcW, curY + 35, { width: gcW, align: 'center' });
        doc.text('DATE OF CALIBRATION', startX + c1+c2+c3+c4 + 2*gcW, curY + 30, { width: gcW, align: 'center' });
        doc.text('DATE OF DUE', startX + c1+c2+c3+c4 + 3*gcW, curY + 30, { width: gcW, align: 'center' });

        doc.text('HOLDING TIME', startX + c1+c2+c3+c4+c5, curY + 15, { width: c6, align: 'center' });
        doc.text('TEST RESULT', startX + c1+c2+c3+c4+c5+c6, curY + 20, { width: c7, align: 'center' });

        // Vertical lines for header
        [c1, c1+c2, c1+c2+c3, c1+c2+c3+c4, c1+c2+c3+c4+gcW, c1+c2+c3+c4+2*gcW, c1+c2+c3+c4+3*gcW, c1+c2+c3+c4+c5, c1+c2+c3+c4+c5+c6].forEach(lx => {
            doc.moveTo(startX + lx, curY).lineTo(startX + lx, curY + greenHeaderH).stroke();
        });
        curY += greenHeaderH;

        if (data.items && data.items.length > 0) {
            data.items.forEach(item => {
                const rowH = 40; // Double row for PG1 and PG2
                doc.rect(startX, curY, width, rowH).stroke();
                
                // Vertical lines
                [c1, c1+c2, c1+c2+c3, c1+c2+c3+c4, c1+c2+c3+c4+c5, c1+c2+c3+c4+c5+c6].forEach(lx => {
                    doc.moveTo(startX + lx, curY).lineTo(startX + lx, curY + rowH).stroke();
                });
                
                // Particulars etc. (Centered vertically)
                doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black);
                doc.text(item.particulars || '', startX + 5, curY + 15, { width: c1 - 10 });
                doc.text(item.mawp_int_ext || '', startX + c1 + 5, curY + 15, { width: c2 - 10, align: 'center' });
                doc.text(item.required_test_pressure || '', startX + c1 + c2 + 5, curY + 15, { width: c3 - 10, align: 'center' });
                doc.text(item.actual_test_pressure || '', startX + c1 + c2 + c3 + 5, curY + 15, { width: c4 - 10, align: 'center' });
                
                // PG Details (Two rows inside)
                doc.moveTo(startX + c1+c2+c3+c4, curY + 20).lineTo(startX + c1+c2+c3+c4 + c5, curY + 20).stroke();
                [gcW, 2*gcW, 3*gcW].forEach(gx => {
                    doc.moveTo(startX + c1+c2+c3+c4 + gx, curY).lineTo(startX + c1+c2+c3+c4 + gx, curY + rowH).stroke();
                });

                // Row 1 (PG1)
                doc.text(item.pg1_range || '', startX + c1 + c2 + c3 + c4, curY + 5, { width: gcW, align: 'center' });
                doc.text(item.pg1_id_no || '', startX + c1 + c2 + c3 + c4 + gcW, curY + 5, { width: gcW, align: 'center' });
                doc.text(item.pg1_calib_date || '', startX + c1 + c2 + c3 + c4 + 2*gcW, curY + 5, { width: gcW, align: 'center' });
                doc.text(item.pg1_due_date || '', startX + c1 + c2 + c3 + c4 + 3*gcW, curY + 5, { width: gcW, align: 'center' });

                // Row 2 (PG2)
                doc.text(item.pg2_range || '', startX + c1 + c2 + c3 + c4, curY + 25, { width: gcW, align: 'center' });
                doc.text(item.pg2_id_no || '', startX + c1 + c2 + c3 + c4 + gcW, curY + 25, { width: gcW, align: 'center' });
                doc.text(item.pg2_calib_date || '', startX + c1 + c2 + c3 + c4 + 2*gcW, curY + 25, { width: gcW, align: 'center' });
                doc.text(item.pg2_due_date || '', startX + c1 + c2 + c3 + c4 + 3*gcW, curY + 25, { width: gcW, align: 'center' });

                doc.text(item.holding_time || '', startX + c1 + c2 + c3 + c4 + c5 + 5, curY + 15, { width: c6 - 10, align: 'center' });
                doc.text(item.test_result || '', startX + c1 + c2 + c3 + c4 + c5 + c6 + 5, curY + 15, { width: c7 - 10, align: 'center' });

                curY += rowH;
            });
        }

        // 4. Remarks section
        curY += 10;
        doc.rect(startX, curY, 80, 15).fillAndStroke(this.colors.green, this.colors.black);
        doc.font(this.fonts.bold).fontSize(8).fillColor(this.colors.red).text('REMARKS :', startX + 5, curY + 4);
        curY += 15;

        doc.rect(startX, curY, width, 50).stroke();
        if (data.remarks && data.remarks.length > 0) {
            let remText = data.remarks.map(r => r.text).join('\n');
            doc.font(this.fonts.bold).fontSize(8).fillColor(this.colors.red);
            doc.text(remText, startX + 5, curY + 5, { width: width - 10 });
        }
        curY += 50;

        // 5. Signatures
        const sigBoxH = 100;
        const availableSpace = (startY + height) - curY - 20;
        const sigY = curY + 20;
        
        doc.rect(startX, sigY, width, sigBoxH).stroke();
        const sigW = width / 3;
        doc.moveTo(startX + sigW, sigY).lineTo(startX + sigW, sigY + sigBoxH).stroke();
        doc.moveTo(startX + 2 * sigW, sigY).lineTo(startX + 2 * sigW, sigY + sigBoxH).stroke();

        doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.red);
        doc.text('Q.C ENGINEER', startX, sigY + sigBoxH - 15, { width: sigW, align: 'center' });
        doc.text('CLIENT', startX + sigW, sigY + sigBoxH - 15, { width: sigW, align: 'center' });
        doc.text('AI', startX + 2 * sigW, sigY + sigBoxH - 15, { width: sigW, align: 'center' });

        // Footer
        doc.fontSize(7).fillColor(this.colors.black).font(this.fonts.regular);
        doc.text('PRESSURE TEST REPORT', startX, startY + height + 5);

        doc.end();
    }
}

module.exports = new HydroTestPdfGenerator();
