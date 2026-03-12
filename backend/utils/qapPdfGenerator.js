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
        const logoBoxW = 140;
        const titleBoxW = width - 400; // Adjusted for Doc No box
        const docNoBoxW = 260;
        const headerH = 50;

        // Outer Header Border
        doc.lineWidth(0.5).strokeColor(this.colors.black);
        doc.rect(x, y, width, headerH).stroke();

        // 1. Logo Section
        doc.rect(x, y, logoBoxW, headerH).stroke();
        const logoPath = path.join(process.cwd(), 'frontend', 'public', 'lego_logo.png');
        if (fs.existsSync(logoPath)) {
            try {
                doc.image(logoPath, x + 5, y + 10, { width: 25 });
            } catch (e) { console.error("Logo Error:", e); }
        }
        doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.blue)
            .text('Shreno Engineering Limited', x + 35, y + 18);

        // 2. Title Section
        const titleX = x + logoBoxW;
        doc.rect(titleX, y, titleBoxW, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(16).fillColor(this.colors.black)
            .text('Quality Assurance Plan', titleX, y + 15, { width: titleBoxW, align: 'center' });

        // 3. Document No. Section
        const docNoX = titleX + titleBoxW;
        doc.rect(docNoX, y, docNoBoxW, headerH).stroke();
        
        doc.fontSize(8).fillColor(this.colors.black);
        doc.font(this.fonts.bold).text('Document No.: ', docNoX + 5, y + 8, { continued: true })
            .font(this.fonts.regular).text(data.report_no || '-');
        
        doc.font(this.fonts.bold).text('Rev. 0 Date: ', docNoX + 5, y + 22, { continued: true })
            .font(this.fonts.regular).text(data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-GB') : '-');

        return headerH;
    }

    drawInfoGrid(doc, x, y, width, data) {
        const rowH = 18;
        const labelW1 = 110;
        const valueW1 = width / 2 - labelW1;
        const labelW2 = 110;
        const valueW2 = width / 2 - labelW2;

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

        doc.fontSize(8);
        infoRows.forEach((row, i) => {
            const curY = y + (i * rowH);
            
            // Left Column
            doc.rect(x, curY, labelW1, rowH).fillAndStroke(this.colors.grey, this.colors.black);
            doc.fillColor(this.colors.black).font(this.fonts.bold).text(row[0].l, x + 5, curY + 5);
            doc.rect(x + labelW1, curY, valueW1, rowH).stroke();
            doc.font(this.fonts.regular).text(String(row[0].v || '-'), x + labelW1 + 5, curY + 5, { width: valueW1 - 10, ellipsis: true });

            // Right Column
            const rightX = x + width / 2;
            doc.rect(rightX, curY, labelW2, rowH).fillAndStroke(this.colors.grey, this.colors.black);
            doc.fillColor(this.colors.black).font(this.fonts.bold).text(row[1].l, rightX + 5, curY + 5);
            doc.rect(rightX + labelW2, curY, valueW2, rowH).stroke();
            doc.font(this.fonts.regular).text(String(row[1].v || '-'), rightX + labelW2 + 5, curY + 5, { width: valueW2 - 10, ellipsis: true });
        });

        return infoRows.length * rowH;
    }

    drawTableHeaders(doc, x, y, width, dynamicCols) {
        const headerH = 35;
        const cSr = 35;
        const cAct = 120;
        const cType = 100;
        const cCrit = 100;
        const cDoc = 80;
        
        // Distribution of remaining space
        const remainingW = width - (cSr + cAct + cType + cCrit + cDoc);
        const staticColsCount = 3; // Shreno, Client/TPIA, AI (from logic but SS shows 3)
        const totalDynamicParts = staticColsCount + (dynamicCols ? dynamicCols.length : 0);
        const partW = remainingW / totalDynamicParts;

        doc.rect(x, y, width, headerH).fillAndStroke(this.colors.grey, this.colors.black);
        doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.black);

        let curX = x;
        const drawH = (txt, w, align = 'center') => {
            doc.text(txt, curX, y + 10, { width: w, align });
            doc.rect(curX, y, w, headerH).stroke();
            curX += w;
        };

        drawH('Sr. No.', cSr);
        drawH('Activity', cAct, 'left');
        drawH('Type / Method of Check / Extent', cType);
        drawH('Acceptance Criteria / Reference Documents', cCrit);
        drawH('Verifying Document', cDoc);
        drawH('Shreno', partW);
        drawH('Client / TPIA', partW);
        drawH('AI', partW);
        
        if (dynamicCols) {
            dynamicCols.forEach(col => {
                drawH(col.name, partW);
            });
        }

        return { height: headerH, columnWidths: { cSr, cAct, cType, cCrit, cDoc, partW } };
    }

    generatePDF(data, res) {
        const doc = new PDFDocument({ margin: 25, size: 'A4' });
        doc.pipe(res);

        const startX = 30;
        let curY = 30;
        const pageWidth = doc.page.width - 60;
        let pageNum = 1;

        const dynamicCols = data.dynamic_columns || [];

        const initPage = () => {
            // Footer
            const footerY = doc.page.height - 40;
            doc.fontSize(8).font(this.fonts.regular).fillColor(this.colors.black);
            doc.text('EXHIBIT: 10/1 QUALITY ASSURANCE PLAN  Rev. 1', startX, footerY);
            doc.text(`Page ${pageNum} of ${doc.bufferedPageRange().count + (pageNum > 1 ? pageNum - 1 : 0)}`, startX, footerY, { align: 'right', width: pageWidth });
            
            // Re-draw header and info on every page? SS show Info Grid on Page 1 but Header might be consistent.
            // Usually QAP has a consistent header.
            curY = 30;
            const hH = this.drawHeader(doc, startX, curY, pageWidth, data);
            curY += hH + 10;
            
            if (pageNum === 1) {
                const igH = this.drawInfoGrid(doc, startX, curY, pageWidth, data);
                curY += igH + 15;
            }

            const headerRes = this.drawTableHeaders(doc, startX, curY, pageWidth, dynamicCols);
            curY += headerRes.height;
            return headerRes.columnWidths;
        };

        let colWs = initPage();

        if (data.items && data.items.length > 0) {
            data.items.forEach((item, idx) => {
                // Calculate max height needed
                const actH = doc.heightOfString(item.activity || '', { width: colWs.cAct - 10 });
                const typeH = doc.heightOfString(`${item.type_method_check || ''}\n${item.extent || ''}`, { width: colWs.cType - 10 });
                const critH = doc.heightOfString(`${item.acceptance_criteria || ''}\n${item.reference_documents || ''}`, { width: colWs.cCrit - 10 });
                
                let rowH = Math.max(25, actH + 10, typeH + 10, critH + 10);
                if (item.is_heading) rowH = 18;

                // Page break check
                if (curY + rowH > doc.page.height - 60) {
                    doc.addPage();
                    pageNum++;
                    colWs = initPage();
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
                    const drawCell = (txt, w, align = 'center') => {
                        doc.text(txt || '-', cx + 5, curY + 5, { width: w - 10, align });
                        doc.rect(cx, curY, w, rowH).stroke();
                        cx += w;
                    };

                    drawCell(item.sr_no, colWs.cSr);
                    drawCell(item.activity, colWs.cAct, 'left');
                    drawCell(`${item.type_method_check || ''}\n${item.extent || ''}`, colWs.cType, 'left');
                    drawCell(`${item.acceptance_criteria || ''}\n${item.reference_documents || ''}`, colWs.cCrit, 'left');
                    drawCell(item.verifying_document, colWs.cDoc, 'left');
                    drawCell(item.shreno, colWs.partW);
                    drawCell(item.client_tpia, colWs.partW);
                    drawCell(item.ai, colWs.partW);

                    if (dynamicCols) {
                        dynamicCols.forEach(col => {
                            const val = item.dynamic_values ? item.dynamic_values[col.id] : '-';
                            drawCell(val, colWs.partW);
                        });
                    }
                }
                curY += rowH;
            });
        }

        // Finalize page numbering
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            const footerY = doc.page.height - 40;
            doc.fontSize(8).font(this.fonts.regular).fillColor(this.colors.black);
            doc.text(`Page ${i + 1} of ${range.count}`, startX, footerY, { align: 'right', width: pageWidth });
        }

        doc.end();
    }
}

module.exports = new QapPdfGenerator();
