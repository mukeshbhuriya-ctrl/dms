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

    drawHeader(doc, x, y, width, data, companyInfo) {
        const logoBoxW = 160;
        const docNoBoxW = 200;
        const titleBoxW = width - logoBoxW - docNoBoxW;
        const headerH = 45;

        // Outer Header Border
        doc.lineWidth(0.5).strokeColor(this.colors.black);
        doc.rect(x, y, width, headerH).stroke();

        // 1. Logo Section
        doc.rect(x, y, logoBoxW, headerH).stroke();
        const logoPath = path.resolve(__dirname, '..', 'assets', 'shreno-logo.png');
        if (fs.existsSync(logoPath)) {
            try {
                // Center the image within the logo box
                doc.image(logoPath, x + 5, y + 5, { 
                    fit: [logoBoxW - 10, headerH - 10],
                    align: 'center',
                    valign: 'center'
                });
            } catch (e) {
                console.error("Failed to load primary logo:", e);
            }
        }

        // 2. Title Section
        const titleX = x + logoBoxW;
        doc.rect(titleX, y, titleBoxW, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(12).fillColor(this.colors.black)
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
        let currentY = y;
        
        infoRows.forEach((row) => {
            const v0H = doc.heightOfString(String(row[0].v || '-'), { width: valW - 10 });
            const v1H = doc.heightOfString(String(row[1].v || '-'), { width: valW - 10 });
            const rowH = Math.max(18, v0H + 10, v1H + 10);
            
            // Left Side
            doc.rect(x, currentY, labelW, rowH).fillAndStroke(this.colors.grey, this.colors.black);
            doc.fillColor(this.colors.black).font(this.fonts.bold).text(row[0].l, x + 5, currentY + (rowH / 2) - 3.5);
            doc.rect(x + labelW, currentY, valW, rowH).stroke();
            doc.font(this.fonts.regular).text(String(row[0].v || '-'), x + labelW + 5, currentY + (rowH / 2) - (v0H/2) + 1, { width: valW - 10, lineBreak: true });

            // Right Side
            const rightX = x + (width / 2);
            doc.rect(rightX, currentY, labelW, rowH).fillAndStroke(this.colors.grey, this.colors.black);
            doc.fillColor(this.colors.black).font(this.fonts.bold).text(row[1].l, rightX + 5, currentY + (rowH / 2) - 3.5);
            doc.rect(rightX + labelW, currentY, valW, rowH).stroke();
            doc.font(this.fonts.regular).text(String(row[1].v || '-'), rightX + labelW + 5, currentY + (rowH / 2) - (v1H/2) + 1, { width: valW - 10, lineBreak: true });
            
            currentY += rowH;
        });

        return currentY - y;
    }

    drawTableHeaders(doc, x, y, width, dynamicCols) {
        const headerH = 35;
        const fixedWs = {
            cSr: 25,
            cShreno: 30,
            cClient: 40
        };
        
        const weights = {
            cAct: 3,
            cType: 2.5,
            cCrit: 2.5,
            cDoc: 2,
            cRemark: 2
        };

        const dynamicColsCount = dynamicCols ? dynamicCols.length : 0;
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) + (dynamicColsCount * 2);
        
        const availableWidth = width - Object.values(fixedWs).reduce((a, b) => a + b, 0);
        const widthPerWeight = availableWidth / totalWeight;

        let finalCols = { ...fixedWs };
        Object.keys(weights).forEach(key => {
            finalCols[key] = weights[key] * widthPerWeight;
        });

        if (dynamicCols) {
            dynamicCols.forEach(col => {
                finalCols[col.id] = 2 * widthPerWeight;
            });
        }

        doc.font(this.fonts.bold).fontSize(7.5).fillColor(this.colors.black);
        
        let maxHeaderH = 35;
        const fixedTexts = [
            { t: 'Sr. No.', w: finalCols.cSr },
            { t: 'Activity', w: finalCols.cAct },
            { t: 'Type / Method of Check / Extent', w: finalCols.cType },
            { t: 'Acceptance Criteria / Reference Documents', w: finalCols.cCrit },
            { t: 'Verifying Document', w: finalCols.cDoc },
            { t: 'Shreno', w: finalCols.cShreno },
            { t: 'Client / TPIA', w: finalCols.cClient },
            { t: 'Remarks', w: finalCols.cRemark }
        ];

        fixedTexts.forEach(ft => {
            const h = doc.heightOfString(ft.t, { width: ft.w - 4 });
            if (h + 16 > maxHeaderH) maxHeaderH = h + 16;
        });

        if (dynamicCols) {
            dynamicCols.forEach(col => {
                const h = doc.heightOfString(col.name, { width: finalCols[col.id] - 4 });
                if (h + 16 > maxHeaderH) maxHeaderH = h + 16;
            });
        }

        doc.rect(x, y, width, maxHeaderH).fillAndStroke(this.colors.grey, this.colors.black);
        doc.font(this.fonts.bold).fontSize(7.5).fillColor(this.colors.black);

        let curX = x;
        const drawH = (txt, w, align = 'center') => {
            doc.rect(curX, y, w, maxHeaderH).stroke();
            const textH = doc.heightOfString(txt, { width: w - 4 });
            doc.text(txt, curX + 2, y + (maxHeaderH / 2) - (textH / 2) + 1, { width: w - 4, align });
            curX += w;
        };

        drawH('Sr. No.', finalCols.cSr);
        drawH('Activity', finalCols.cAct, 'left');
        drawH('Type / Method of Check / Extent', finalCols.cType);
        drawH('Acceptance Criteria / Reference Documents', finalCols.cCrit);
        drawH('Verifying Document', finalCols.cDoc);
        drawH('Shreno', finalCols.cShreno);
        drawH('Client / TPIA', finalCols.cClient);
        
        // Dynamic columns in between
        if (dynamicCols) {
            dynamicCols.forEach(col => {
                drawH(col.name, finalCols[col.id]);
            });
        }

        // Remarks at the end
        drawH('Remarks', finalCols.cRemark);

        return { height: maxHeaderH, columnWidths: finalCols };
    }

    drawFooterSections(doc, x, y, width, data) {
        const sigH = 105;
        const sigGap = 8;
        
        let remarksH = 60;
        if (data.remarks) {
            doc.font(this.fonts.regular).fontSize(8);
            const textH = doc.heightOfString(data.remarks, { width: width - 10, lineBreak: true });
            remarksH = Math.max(60, textH + 15);
        }
        
        // Prevent remarks box from going off the top of the page
        const maxRemarksH = doc.page.height - 155 - sigGap - 60; // 60 is top margin/padding
        if (remarksH > maxRemarksH) {
            remarksH = maxRemarksH;
        }
        
        const footerSpaceNeeded = remarksH + sigGap + sigH + 40; 
        
        let currentY = y + 20;

        // If the entire footer block doesn't fit on the current page, move it to the next page
        if (currentY + footerSpaceNeeded > doc.page.height - 30) {
            doc.addPage();
            currentY = 50; 
        }

        const remarksY = currentY + 12;

        // 1. Remarks / General Notes
        doc.font(this.fonts.bold).fontSize(8).fillColor(this.colors.black);
        doc.text('NOTES:', x, currentY);
        doc.rect(x, remarksY, width, remarksH).stroke();
        
        if (data.remarks) {
            doc.font(this.fonts.regular).fontSize(8).fillColor(this.colors.black);
            doc.text(data.remarks, x + 5, remarksY + 5, { width: width - 10, height: remarksH - 10, lineBreak: true });
        }
        
        const sigY = remarksY + remarksH + sigGap;

        // 2. Integrated Signature & Exhibit Section
        doc.rect(x, sigY, width, sigH).stroke();
        const sigW = width / 3;
        doc.moveTo(x + sigW, sigY).lineTo(x + sigW, sigY + sigH).stroke();
        doc.moveTo(x + 2 * sigW, sigY).lineTo(x + 2 * sigW, sigY + sigH).stroke();

        doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.black);
        doc.text('PREPARED BY', x, sigY + sigH - 14, { width: sigW, align: 'center' });
        doc.text('CHECKED BY', x + sigW, sigY + sigH - 14, { width: sigW, align: 'center' });
        doc.text('APPROVED BY', x + 2 * sigW, sigY + sigH - 14, { width: sigW, align: 'center' });

        return sigY + sigH;
    }

    generatePDF(data, res, companyInfo) {
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
            const hH = this.drawHeader(doc, startX, curY, pageWidth, data, companyInfo);
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
                const actH = doc.heightOfString(item.activity || '', { width: colWs.cAct - 8 });
                const typeH = doc.heightOfString(`${item.type_method_check || ''}\n${item.extent || ''}`.trim(), { width: colWs.cType - 8 });
                const critH = doc.heightOfString(`${item.acceptance_criteria || ''}\n${item.reference_documents || ''}`.trim(), { width: colWs.cCrit - 8 });
                const docH = doc.heightOfString(item.verifying_document || '', { width: colWs.cDoc - 8 });
                const remarkH = doc.heightOfString(item.remark || '', { width: colWs.cRemark - 8 });
                
                const shrenoH = doc.heightOfString(item.shreno || '', { width: colWs.cShreno - 8 });
                const clientH = doc.heightOfString(item.client_tpia || '', { width: colWs.cClient - 8 });

                let maxDynH = 0;
                if (dynamicCols) {
                    dynamicCols.forEach(col => {
                        const val = item.dynamic_values ? item.dynamic_values[col.id] : '-';
                        const h = doc.heightOfString(String(val), { width: colWs[col.id] - 8 });
                        if (h > maxDynH) maxDynH = h;
                    });
                }
                
                let rowH = Math.max(22, actH + 10, typeH + 10, critH + 10, docH + 10, remarkH + 10, shrenoH + 10, clientH + 10, maxDynH + 10);
                if (item.is_heading) {
                    doc.fontSize(8);
                    const headH = doc.heightOfString(item.heading_text || item.activity || '', { width: pageWidth - colWs.cSr - 10 });
                    rowH = Math.max(18, headH + 10);
                    doc.fontSize(7); // reset to normal font size
                }

                if (curY + rowH > doc.page.height - 50) {
                    doc.addPage();
                    pageNum++;
                    colWs = initPageHeader(false);
                }

                if (item.is_heading) {
                    doc.rect(startX, curY, pageWidth, rowH).fillAndStroke(this.colors.grey, this.colors.black);
                    doc.font(this.fonts.bold).fontSize(8).fillColor(this.colors.black);
                    doc.text(item.sr_no || '', startX, curY + (rowH / 2) - 4, { width: colWs.cSr, align: 'center' });
                    doc.text(item.heading_text || item.activity || '', startX + colWs.cSr + 5, curY + (rowH / 2) - 4, { width: pageWidth - colWs.cSr - 10 });
                } else {
                    doc.rect(startX, curY, pageWidth, rowH).stroke();
                    doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black);
                    
                    let cx = startX;
                    const drawC = (txt, w, align = 'center', isBold = false) => {
                        doc.font(isBold ? this.fonts.bold : this.fonts.regular);
                        // Add lineBreak and ellipsis to ensure long unbroken words don't bleed out of the cell horizontally
                        doc.text(txt || '-', cx + 4, curY + 6, { width: w - 8, align, lineBreak: true, ellipsis: true });
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

                    if (dynamicCols) {
                        dynamicCols.forEach(col => {
                            const val = item.dynamic_values ? item.dynamic_values[col.id] : '-';
                            drawC(val, colWs[col.id]);
                        });
                    }

                    // Remarks column at the end
                    drawC(item.remark, colWs.cRemark, 'left');
                }
                curY += rowH;
            });
        }

        // Add General Notes and Signatures
        this.drawFooterSections(doc, startX, curY, pageWidth, data);

        // Finalize page numbering and footer
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            // Standard footer for all pages
            doc.switchToPage(i);
            const footerY = doc.page.height - 45; // Static position at bottom of page
            doc.fontSize(7).font(this.fonts.regular).fillColor(this.colors.black);
            doc.text('EXHIBIT: 10/1 QUALITY ASSURANCE PLAN  Rev. 1', startX, footerY);
            doc.text(`Page ${i + 1} of ${range.count}`, startX, footerY, { align: 'right', width: pageWidth });
        }

        doc.end();
    }
}

module.exports = new QapPdfGenerator();
