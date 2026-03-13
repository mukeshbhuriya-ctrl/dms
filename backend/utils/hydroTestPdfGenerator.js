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

    drawLogoAndTitle(doc, x, y, width, height, companyInfo) {
        const logoBoxW = 160;
        const titleBoxW = width - logoBoxW;
        
        // Logo Box
        doc.lineWidth(0.5).strokeColor(this.colors.black);
        doc.rect(x, y, logoBoxW, height).stroke();
        
        // Title Box split vertically
        doc.rect(x + logoBoxW, y, titleBoxW, height / 2).stroke();
        doc.rect(x + logoBoxW, y + height / 2, titleBoxW, height / 2).stroke();

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

        // Company Name in Title Box Top
        doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.red)
            .text((companyInfo?.name || 'SHRENO ENGINEERING LIMITED').toUpperCase(), x + logoBoxW, y + 8, { width: titleBoxW, align: 'center' });
        
        // Report Title in Title Box Bottom
        doc.font(this.fonts.bold).fontSize(12).fillColor(this.colors.red)
            .text('HYDROSTATIC PRESSURE TEST REPORT', x + logoBoxW, y + height / 2 + 10, { width: titleBoxW, align: 'center' });
        
        // Separator between rows in the outer border is handled by drawing rects
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
        doc.fontSize(8);
        const labelW = 95; // Slightly reduced for better fit in 3-col rows

        // Based on SS2 grid structure
        const infoRows = [
            [
                { l: 'MSN :', v: data.msn, w: 0.35 },
                { l: 'TAG No. :', v: data.tag_no, w: 0.35 },
                { l: 'DATE :', v: data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-GB') : '-', w: 0.3 }
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
            ],
            [
                { l: 'PROCEDURE No :', v: data.procedure_no, w: 1.0 }
            ]
        ];

        infoRows.forEach((row, rowIndex) => {
            let currentX = startX;
            doc.rect(startX, curY, width, rowH).stroke();

            row.forEach((cell, cellIndex) => {
                const cellW = width * cell.w;
                
                // Determine label width for this cell (prevent overflow in small cells like DATE)
                const currentLabelW = (cell.w < 0.35) ? 50 : labelW;
                
                // Draw internal boundary lines for labels vs values
                doc.rect(currentX, curY, currentLabelW, rowH).stroke();
                
                // Draw Vertical line for the cell end if not the last one
                if (cellIndex < row.length - 1) {
                    doc.moveTo(currentX + cellW, curY).lineTo(currentX + cellW, curY + rowH).stroke();
                }

                doc.font(this.fonts.bold).fillColor(this.colors.red).text(cell.l, currentX + 5, curY + 7);
                doc.font(this.fonts.regular).fillColor(this.colors.black).text(String(cell.v || '-'), currentX + currentLabelW + 5, curY + 7, {
                    width: cellW - currentLabelW - 10,
                    ellipsis: true
                });

                currentX += cellW;
            });
            curY += rowH;
        });

        // 3. Pressure Test Details Table
        const greenHeaderH = 65; 
        doc.rect(startX, curY, width, greenHeaderH).fillAndStroke(this.colors.green, this.colors.black);
        
        // Revised column widths to prevent header wrapping and provide more space for results
        const c1 = 60;  // PARTICULARS
        const c2 = 50;  // MAWP
        const c3 = 65;  // REQUIRED TEST PRESSURE
        const c4 = 55;  // ACTUAL TEST PRESSURE
        const c5 = 150; // PRESSURE GAUGE DETAIL (Total) - Reduced to give c7 more space
        const c6 = 45;  // HOLDING TIME
        const c7 = width - c1-c2-c3-c4-c5-c6; // TEST RESULT (approx 90)
        
        doc.font(this.fonts.bold).fontSize(6.5).fillColor(this.colors.red);
        
        // Table Headers
        doc.text('PARTICULARS', startX, curY + 28, { width: c1, align: 'center' });
        doc.text('MAWP INT. / EXT. PSI (g)', startX + c1, curY + 22, { width: c2, align: 'center' });
        doc.text('REQUIRED TEST PRESSURE PSI (Kg/Cm2) (g)', startX + c1 + c2, curY + 18, { width: c3, align: 'center' });
        doc.text('ACTUAL TEST PRESSURE Kg/Cm2 (g)', startX + c1 + c2 + c3, curY + 18, { width: c4, align: 'center' });
        
        doc.text('PRESSURE GAUGE DETAIL', startX + c1+c2+c3+c4, curY + 10, { width: c5, align: 'center' });
        doc.moveTo(startX + c1+c2+c3+c4, curY + 25).lineTo(startX + c1+c2+c3+c4 + c5, curY + 25).stroke();
        
        const gcW = c5 / 4;
        doc.text('RANGE (Kg/Cm2) (g)', startX + c1+c2+c3+c4, curY + 32, { width: gcW, align: 'center' });
        doc.text('I.D No.', startX + c1+c2+c3+c4 + gcW, curY + 38, { width: gcW, align: 'center' });
        doc.text('DATE OF CALIBRATION', startX + c1+c2+c3+c4 + 2*gcW, curY + 32, { width: gcW, align: 'center' });
        doc.text('DATE OF DUE', startX + c1+c2+c3+c4 + 3*gcW, curY + 38, { width: gcW, align: 'center' });

        doc.text('HOLDING TIME', startX + c1+c2+c3+c4+c5, curY + 22, { width: c6, align: 'center' });
        doc.text('TEST RESULT', startX + c1+c2+c3+c4+c5+c6, curY + 28, { width: c7, align: 'center' });

        // Vertical lines for header
        [c1, c1+c2, c1+c2+c3, c1+c2+c3+c4, c1+c2+c3+c4+gcW, c1+c2+c3+c4+2*gcW, c1+c2+c3+c4+3*gcW, c1+c2+c3+c4+c5, c1+c2+c3+c4+c5+c6].forEach(lx => {
            doc.moveTo(startX + lx, curY).lineTo(startX + lx, curY + greenHeaderH).stroke();
        });
        curY += greenHeaderH;

        if (data.items && data.items.length > 0) {
            data.items.forEach(item => {
                const rowH = 50; // Increased height to prevent text overlap
                doc.rect(startX, curY, width, rowH).stroke();
                
                // Vertical lines for main columns
                [c1, c1+c2, c1+c2+c3, c1+c2+c3+c4, c1+c2+c3+c4+c5, c1+c2+c3+c4+c5+c6].forEach(lx => {
                    doc.moveTo(startX + lx, curY).lineTo(startX + lx, curY + rowH).stroke();
                });
                
                // Vertical lines for Gauge columns
                [gcW, 2*gcW, 3*gcW].forEach(gx => {
                    doc.moveTo(startX + c1+c2+c3+c4 + gx, curY).lineTo(startX + c1+c2+c3+c4 + gx, curY + rowH).stroke();
                });

                doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black);
                doc.text(item.particulars || '', startX + 5, curY + 15, { width: c1 - 10 });
                doc.text(item.mawp_int_ext || '', startX + c1 + 2, curY + 15, { width: c2 - 4, align: 'center' });
                doc.text(item.required_test_pressure || '', startX + c1 + c2 + 2, curY + 15, { width: c3 - 4, align: 'center' });
                doc.text(item.actual_test_pressure || '', startX + c1 + c2 + c3 + 2, curY + 15, { width: c4 - 4, align: 'center' });
                
                // Horizontal split for PG1/PG2
                doc.moveTo(startX + c1+c2+c3+c4, curY + rowH / 2).lineTo(startX + c1+c2+c3+c4 + c5, curY + rowH / 2).stroke();

                // Row 1 (PG1)
                doc.text(item.pg1_range || '', startX + c1 + c2 + c3 + c4, curY + 6, { width: gcW, align: 'center' });
                doc.text(item.pg1_id_no || '', startX + c1 + c2 + c3 + c4 + gcW, curY + 6, { width: gcW, align: 'center' });
                doc.text(item.pg1_calib_date || '', startX + c1 + c2 + c3 + c4 + 2*gcW, curY + 6, { width: gcW, align: 'center' });
                doc.text(item.pg1_due_date || '', startX + c1 + c2 + c3 + c4 + 3*gcW, curY + 6, { width: gcW, align: 'center' });

                // Row 2 (PG2)
                doc.text(item.pg2_range || '', startX + c1 + c2 + c3 + c4, curY + rowH/2 + 6, { width: gcW, align: 'center' });
                doc.text(item.pg2_id_no || '', startX + c1 + c2 + c3 + c4 + gcW, curY + rowH/2 + 6, { width: gcW, align: 'center' });
                doc.text(item.pg2_calib_date || '', startX + c1 + c2 + c3 + c4 + 2*gcW, curY + rowH/2 + 6, { width: gcW, align: 'center' });
                doc.text(item.pg2_due_date || '', startX + c1 + c2 + c3 + c4 + 3*gcW, curY + rowH/2 + 6, { width: gcW, align: 'center' });

                doc.text(item.holding_time || '', startX + c1 + c2 + c3 + c4 + c5 + 2, curY + 15, { width: c6 - 4, align: 'center' });
                doc.text(item.test_result || '', startX + c1 + c2 + c3 + c4 + c5 + c6 + 2, curY + 15, { width: c7 - 4, align: 'center' });

                curY += rowH;
            });
        }

        // 4. Remarks section (Updated to match SS1 precisely)
        curY += 15;
        const remRowH = 22; // Slightly taller for cleaner look
        doc.font(this.fonts.bold).fontSize(8);
        
        // Label Row
        doc.rect(startX, curY, 80, remRowH).fillAndStroke(this.colors.green, this.colors.black);
        doc.fillColor(this.colors.red).text('REMARKS :', startX + 5, curY + 7);
        doc.rect(startX + 80, curY, width - 80, remRowH).stroke(); 
        curY += remRowH;

        if (data.remarks && data.remarks.length > 0) {
            data.remarks.forEach(rem => {
                const text = String(rem.text || '');
                doc.font(this.fonts.regular).fontSize(7.5).fillColor(this.colors.red);
                
                // Calculate height needed for this specific remark
                const textHeight = doc.heightOfString(text, { width: width - 10 });
                const rowH = Math.max(remRowH, textHeight + 6); // Add small padding
                
                doc.rect(startX, curY, width, rowH).stroke();
                doc.text(text, startX + 5, curY + 4, { width: width - 10 });
                curY += rowH;
            });
            
            // Add a placeholder empty row if only one remark exists
            if (data.remarks.length < 2) {
                doc.rect(startX, curY, width, remRowH).stroke();
                curY += remRowH;
            }
        } else {
            for(let i=0; i<3; i++) {
                doc.rect(startX, curY, width, remRowH).stroke();
                curY += remRowH;
            }
        }

        // 5. Signatures
        const sigBoxH = 80;
        const sigY = (startY + height) - sigBoxH; // Stick to bottom border
        
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
