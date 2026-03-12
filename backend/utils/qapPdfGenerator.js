const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class QapPdfGenerator {
    constructor() {
        this.colors = {
            red: '#FF0000',
            black: '#000000',
            white: '#FFFFFF',
            green: '#92D050',
            grey: '#D9D9D9',
            blue: '#005596'
        };
        this.fonts = {
            regular: 'Helvetica',
            bold: 'Helvetica-Bold'
        };
    }

    drawHeader(doc, x, y, width, data) {
        const logoBoxW = 160;
        const docNoBoxW = 200;
        const titleBoxW = width - logoBoxW - docNoBoxW;
        const headerH = 45;

        // Outer Header Border
        doc.lineWidth(0.5).strokeColor(this.colors.black);
        doc.rect(x, y, width, headerH).stroke();

        // 1. Logo Section
        doc.rect(x, y, logoBoxW, headerH).stroke();
        const logoPath = path.join(process.cwd(), 'frontend', 'public', 'lego_logo.png');
        if (fs.existsSync(logoPath)) {
            try {
                doc.image(logoPath, x + 5, y + 8, { width: 22 });
            } catch (e) {
                const altLogo = path.join(process.cwd(), 'backend', 'public', 'logo.png');
                if (fs.existsSync(altLogo)) doc.image(altLogo, x + 5, y + 8, { width: 22 });
            }
        }
        doc.font(this.fonts.bold).fontSize(10).fillColor('#005596')
            .text('Shreno Engineering Limited', x + 35, y + 16);

        // 2. Title Section
        const titleX = x + logoBoxW;
        doc.rect(titleX, y, titleBoxW, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(16).fillColor(this.colors.black)
            .text('Quality Assurance Plan', titleX, y + 14, { width: titleBoxW, align: 'center' });

        // 3. Document No. Section
        const docNoX = titleX + titleBoxW;
        doc.rect(docNoX, y, docNoBoxW, headerH).stroke();
        
        doc.fontSize(7.5).fillColor(this.colors.black);
        doc.font(this.fonts.bold).text('Document No.: ', docNoX + 5, y + 10, { continued: true })
            .font(this.fonts.regular).text(data.report_no || '-');
        
        doc.font(this.fonts.bold).text('Rev. 0 Date: ', docNoX + 5, y + 25, { continued: true })
            .font(this.fonts.regular).text(data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-GB') : '-');

        return headerH;
    }

    drawInfoGrid(doc, x, y, width, data) {
        const rowH = 18;
        const labelW = 100;
        const valW = (width / 2) - labelW;

        const infoRows = [
            [
                { l: 'P.O. No.', v: data.po_no },
                { l: 'P.O. Date', v: data.po_date || '-' }
            ],
            [
                { l: 'Client', v: data.client },
                { l: 'Drg. No.', v: data.shreno_drg_no || '-' }
            ],
            [
                { l: 'MSN', v: data.msn },
                { l: 'Equipment Description', v: data.equipment_name }
            ],
            [
                { l: 'Construction Code', v: data.code || data.construction_code || '-' },
                { l: 'Tag No.', v: data.tag_no }
            ]
        ];

        doc.fontSize(7.5);
        infoRows.forEach((row, i) => {
            const curY = y + (i * rowH);
            
            // Left Side
            doc.rect(x, curY, labelW, rowH).fillAndStroke(this.colors.grey, this.colors.black);
            doc.fillColor(this.colors.black).font(this.fonts.bold).text(row[0].l, x + 5, curY + 6);
            doc.rect(x + labelW, curY, valW, rowH).stroke();
            doc.font(this.fonts.regular).text(String(row[0].v || '-'), x + labelW + 5, curY + 6, { width: valW - 10, ellipsis: true });

            // Right Side
            const rightX = x + (width / 2);
            doc.rect(rightX, curY, labelW, rowH).fillAndStroke(this.colors.grey, this.colors.black);
            doc.fillColor(this.colors.black).font(this.fonts.bold).text(row[1].l, rightX + 5, curY + 6);
            doc.rect(rightX + labelW, curY, valW, rowH).stroke();
            doc.font(this.fonts.regular).text(String(row[1].v || '-'), rightX + labelW + 5, curY + 6, { width: valW - 10, ellipsis: true });
        });

        return infoRows.length * rowH;
    }

    drawTableHeaders(doc, x, y, width, dynamicCols) {
        const headerH = 35;
        const colWs = {
            cSr: 30,
            cAct: 110,
            cType: 105,
            cCrit: 105,
            cDoc: 75,
            cShreno: 35,
            cClient: 45,
            cAI: 30
        };
        
        const staticTotal = Object.values(colWs).reduce((a, b) => a + b, 0);
        let finalCols = { ...colWs };
        if (dynamicCols && dynamicCols.length > 0) {
            const availableForDyn = width - staticTotal;
            const dynW = availableForDyn / dynamicCols.length;
            dynamicCols.forEach(col => {
                finalCols[col.id] = dynW;
            });
        } else {
            const extra = (width - staticTotal) / 3;
            finalCols.cAct += extra;
            finalCols.cType += extra;
            finalCols.cCrit += extra;
        }

        doc.rect(x, y, width, headerH).fillAndStroke(this.colors.grey, this.colors.black);
        doc.font(this.fonts.bold).fontSize(7.5).fillColor(this.colors.black);

        let curX = x;
        const drawH = (txt, w, align = 'center') => {
            doc.rect(curX, y, w, headerH).stroke();
            doc.text(txt, curX + 2, y + 8, { width: w - 4, align });
            curX += w;
        };

        drawH('Sr. No.', finalCols.cSr);
        drawH('Activity', finalCols.cAct, 'left');
        drawH('Type / Method of Check / Extent', finalCols.cType);
        drawH('Acceptance Criteria / Reference Documents', finalCols.cCrit);
        drawH('Verifying Document', finalCols.cDoc);
        drawH('Shreno', finalCols.cShreno);
        drawH('Client / TPIA', finalCols.cClient);
        drawH('AI', finalCols.cAI);
        
        if (dynamicCols) {
            dynamicCols.forEach(col => {
                drawH(col.name, finalCols[col.id]);
            });
        }

        return { height: headerH, columnWidths: finalCols };
    }

    generatePDF(data, res) {
        const doc = new PDFDocument({ 
            margin: 30, 
            size: 'A4', 
            bufferPages: true 
        });
        doc.pipe(res);

        const startX = 30;
        let curY = 30;
        const pageWidth = doc.page.width - 60;
        let pageNum = 1;

        const dynamicCols = data.dynamic_columns || [];

        const initPageHeader = (firstPage = false) => {
            curY = 30;
            const hH = this.drawHeader(doc, startX, curY, pageWidth, data);
            curY += hH; 
            
            if (firstPage) {
                const igH = this.drawInfoGrid(doc, startX, curY, pageWidth, data);
                curY += igH + 10;
            } else {
                curY += 10;
            }

            const headerRes = this.drawTableHeaders(doc, startX, curY, pageWidth, dynamicCols);
            curY += headerRes.height;
            return headerRes.columnWidths;
        };

        let colWs = initPageHeader(true);

        if (data.items && data.items.length > 0) {
            data.items.forEach((item) => {
                doc.fontSize(7);
                const actH = doc.heightOfString(item.activity || '', { width: colWs.cAct - 10 });
                const typeH = doc.heightOfString(`${item.type_method_check || ''}\n${item.extent || ''}`.trim(), { width: colWs.cType - 10 });
                const critH = doc.heightOfString(`${item.acceptance_criteria || ''}\n${item.reference_documents || ''}`.trim(), { width: colWs.cCrit - 10 });
                const docH = doc.heightOfString(item.verifying_document || '', { width: colWs.cDoc - 10 });
                
                let rowH = Math.max(22, actH + 10, typeH + 10, critH + 10, docH + 10);
                if (item.is_heading) rowH = 18;

                if (curY + rowH > doc.page.height - 50) {
                    doc.addPage();
                    pageNum++;
                    colWs = initPageHeader(false);
                }

                if (item.is_heading) {
                    doc.rect(startX, curY, pageWidth, rowH).fillAndStroke(this.colors.grey, this.colors.black);
                    doc.font(this.fonts.bold).fontSize(8).fillColor(this.colors.black);
                    doc.text(item.sr_no || '', startX, curY + 5, { width: colWs.cSr, align: 'center' });
                    doc.text(item.heading_text || item.activity || '', startX + colWs.cSr + 5, curY + 5);
                } else {
                    doc.rect(startX, curY, pageWidth, rowH).stroke();
                    doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black);
                    
                    let cx = startX;
                    const drawC = (txt, w, align = 'center', isBold = false) => {
                        doc.font(isBold ? this.fonts.bold : this.fonts.regular);
                        doc.text(txt || '-', cx + 4, curY + 6, { width: w - 8, align });
                        doc.rect(cx, curY, w, rowH).stroke();
                        cx += w;
                    };

                    drawC(item.sr_no, colWs.cSr, 'center', true);
                    drawC(item.activity, colWs.cAct, 'left', true);
                    drawC(`${item.type_method_check || ''}\n${item.extent || ''}`.trim(), colWs.cType, 'left');
                    drawC(`${item.acceptance_criteria || ''}\n${item.reference_documents || ''}`.trim(), colWs.cCrit, 'left');
                    drawC(item.verifying_document, colWs.cDoc, 'left');
                    drawC(item.shreno, colWs.cShreno);
                    drawC(item.client_tpia, colWs.cClient);
                    drawC(item.ai, colWs.cAI);

                    if (dynamicCols) {
                        dynamicCols.forEach(col => {
                            const val = item.dynamic_values ? item.dynamic_values[col.id] : '-';
                            drawC(val, colWs[col.id]);
                        });
                    }
                }
                curY += rowH;
            });
        }

        // Finalize page numbering and footer
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            const footerY = doc.page.height - 40;
            doc.fontSize(7).font(this.fonts.regular).fillColor(this.colors.black);
            doc.text('EXHIBIT: 10/1 QUALITY ASSURANCE PLAN  Rev. 1', startX, footerY);
            doc.text(`Page ${i + 1} of ${range.count}`, startX, footerY, { align: 'right', width: pageWidth });
        }

        doc.end();
    }
}

module.exports = new QapPdfGenerator();
