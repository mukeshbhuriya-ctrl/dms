const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * EXACT REPLICA GENERATOR FOR MATERIAL HEAT CHART (MHC)
 * Based on user-provided industrial standard screenshots.
 */
class MhcPdfGenerator {
    constructor() {
        this.colors = {
            black: '#000000',
            white: '#FFFFFF',
            grey: '#D9D9D9',
            red: '#FF0000'
        };
        this.fonts = {
            regular: 'Helvetica',
            bold: 'Helvetica-Bold'
        };
        this.fontSize = {
            header: 14,
            subHeader: 12,
            label: 8,
            text: 8,
            tiny: 6
        };
    }

    drawBox(doc, x, y, width, height, lineWidth = 0.8) {
        doc.lineWidth(lineWidth).strokeColor(this.colors.black).rect(x, y, width, height).stroke();
    }

    drawLine(doc, x1, y1, x2, y2, lineWidth = 0.5) {
        doc.lineWidth(lineWidth).strokeColor(this.colors.black).moveTo(x1, y1).lineTo(x2, y2).stroke();
    }

    generatePDF(data, res, companyInfo) {
        const doc = new PDFDocument({ 
            margin: 30, 
            size: 'A4', 
            layout: 'landscape', 
            bufferPages: true,
            autoFirstPage: true,
            autoPageBreak: false
        });
        doc.pipe(res);

        const startX = 30;
        let curY = 30;
        const pageWidth = 841.89 - 60; 

        // Refactor header rendering into a reusable function that DOES NOT add a page
        const drawHeader = (yPos) => {
            let y = yPos;
            // ─── 1. HEADER ──────────────────────────────────────────────────────────
            const headerH = 40;
            this.drawBox(doc, startX, y, pageWidth, headerH, 1.2);
            
            const logoW = 220;
            const logoPath = companyInfo?.logoPath || path.join(process.cwd(), '..', 'frontend', 'public', 'logo.png');
            if (fs.existsSync(logoPath)) {
                try { doc.image(logoPath, startX + 5, y + 5, { height: 30 }); } catch (e) {}
            }
            doc.font(this.fonts.bold).fontSize(12).fillColor('#005596')
                .text('Shreno Engineering Limited', startX + 45, y + 15, { width: logoW - 50 });

            this.drawLine(doc, startX + logoW, y, startX + logoW, y + headerH, 1);
            doc.font(this.fonts.bold).fontSize(14).fillColor(this.colors.black)
                .text('SHRENO ENGINEERING LIMITED', startX + logoW, y + 8, { width: pageWidth - logoW, align: 'center' });
            
            this.drawLine(doc, startX + logoW, y + 20, startX + pageWidth, y + 20, 0.8);
            doc.font(this.fonts.bold).fontSize(12)
                .text('MATERIAL HEAT CHART', startX + logoW, y + 24, { width: pageWidth - logoW, align: 'center' });

            y += headerH;

            // ─── 2. INFO GRID ───────────────────────────────────────────────────────
            const infoGridH = 64;
            this.drawBox(doc, startX, y, pageWidth, infoGridH, 1);
            const midX = startX + (pageWidth * 0.6);
            this.drawLine(doc, midX, y, midX, y + infoGridH, 1);

            const rowH = 16;
            const drawLabelValue = (lx, ly, lw, label, value, labelW = 120) => {
                doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.black).text(label, lx + 5, ly + 5);
                doc.font(this.fonts.regular).fontSize(8).text(value || '-', lx + labelW, ly + 5, { width: lw - labelW - 5, ellipsis: true });
                if (ly + rowH < y + infoGridH) {
                    this.drawLine(doc, lx, ly + rowH, lx + lw, ly + rowH);
                }
            };

            drawLabelValue(startX, y, (pageWidth * 0.6), 'CLIENT', data.client);
            drawLabelValue(midX, y, (pageWidth * 0.4), 'MSN', data.msn, 80);
            this.drawLine(doc, startX, y + rowH, startX + pageWidth, y + rowH);

            drawLabelValue(startX, y + rowH, (pageWidth * 0.6), 'EQUIPMENT NAME.', data.equipment_name);
            drawLabelValue(midX, y + rowH, (pageWidth * 0.4), 'TAG NO.', data.tag_no, 80);
            this.drawLine(doc, startX, y + (rowH * 2), startX + pageWidth, y + (rowH * 2));

            drawLabelValue(startX, y + (rowH * 2), (pageWidth * 0.6), 'DRG. No.', data.shreno_drg_no);
            drawLabelValue(midX, y + (rowH * 2), (pageWidth * 0.4), 'PO. NO.', data.po_no, 80);
            this.drawLine(doc, startX, y + (rowH * 3), startX + pageWidth, y + (rowH * 3));

            drawLabelValue(startX, y + (rowH * 3), (pageWidth * 0.6), 'CODE:', data.code);
            drawLabelValue(midX, y + (rowH * 3), (pageWidth * 0.4), 'INSPECTION BY', data.inspection_by, 80);

            y += infoGridH;

            // ─── 3. TABLE HEADER ───────────────────────────────────────────────────
            const tableHeaderH = 30;
            this.drawBox(doc, startX, y, pageWidth, tableHeaderH, 1);
            
            const cols = [
                { id: 'item_no', label: 'ITEM NO. / \nPART NO.', w: 40 },
                { id: 'description', label: 'DESCRIPTION', w: 80 },
                { id: 'size', label: 'SIZE', w: 120 },
                { id: 'material_spec', label: 'MATERIAL SPECIFICATION', w: 90 },
                { id: 'qty', label: 'QUANTITY / \nUNIT', w: 40 },
                { id: 'heat_no', label: 'HEAT NO. / CAST NO.\n/PLATE NO.', w: 90 },
                { id: 'mtr_no', label: 'MTR NO.', w: 130 },
                { id: 'manufacturer', label: 'MANUFACTURER NAME', w: 90 },
                { id: 'remarks', label: 'REMARKS\nNCR/DCR', w: pageWidth - 680 } 
            ];

            let tx = startX;
            doc.font(this.fonts.bold).fontSize(7);
            cols.forEach((col, i) => {
                doc.text(col.label, tx, y + 5, { width: col.w, align: 'center' });
                tx += col.w;
                if (i < cols.length - 1) {
                    this.drawLine(doc, tx, y, tx, y + tableHeaderH);
                }
            });

            curY = y + tableHeaderH;
            return cols;
        };

        const cols = drawHeader(30);

        // ─── 4. TABLE BODY ─────────────────────────────────────────────────────
        const rowH = 22;
        const headingH = 18;
        const bodyMaxY = 480; 

        const items = data.items || [];
        items.forEach((item, idx) => {
            const isHeading = item.is_heading;
            
            // 1. If it's a heading, draw the heading banner
            if (isHeading) {
                if (curY + headingH > bodyMaxY) {
                    doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' });
                    drawHeader(30);
                }
                this.drawBox(doc, startX, curY, pageWidth, headingH, 0.5);
                doc.font(this.fonts.bold).fontSize(8).fillColor(this.colors.black)
                    .text(`${item.heading_text || 'HEADING'}`, startX + 5, curY + 5, { height: headingH - 5 });
                curY += headingH;
            }

            // 2. If it has item data (or it's NOT a heading), draw the item row
            // We check for item_no or description to avoid drawing empty rows for headings that are ONLY headings
            if (!isHeading || (item.item_no || item.description)) {
                if (curY + rowH > bodyMaxY) {
                    doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' });
                    drawHeader(30);
                }

                this.drawBox(doc, startX, curY, pageWidth, rowH, 0.5);
                
                let tx = startX;
                doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black);
                const drawCell = (val, w, align = 'center') => {
                    doc.text(String(val || '-'), tx + 2, curY + 5, { width: w - 4, height: rowH - 5, align, ellipsis: true });
                    tx += w;
                    this.drawLine(doc, tx, curY, tx, curY + rowH, 0.5);
                };

                drawCell(item.item_no, cols[0].w);
                drawCell(item.description, cols[1].w);
                drawCell(item.size, cols[2].w, 'left');
                drawCell(item.material_spec, cols[3].w);
                drawCell(item.quantity_unit, cols[4].w);
                drawCell(item.heat_no, cols[5].w);
                drawCell(item.mtr_no, cols[6].w);
                drawCell(item.manufacturer, cols[7].w);
                doc.text(String(item.remarks || '-'), tx + 2, curY + 5, { width: cols[8].w - 4, height: rowH - 5, align: 'center', ellipsis: true });
                
                curY += rowH;
            }
        });

        // Fill empty rows for the professional industrial look
        const bottomY = 480; 
        if (curY < bottomY) {
            const remainingH = bottomY - curY;
            this.drawBox(doc, startX, curY, pageWidth, remainingH, 0.5);
            let tx = startX;
            for (let i = 0; i < cols.length - 1; i++) {
                tx += cols[i].w;
                this.drawLine(doc, tx, curY, tx, bottomY, 0.5);
            }
            curY = bottomY;
        }

        // ─── 5. FOOTER ──────────────────────────────────────────────────────────
        const footerH = 60;
        this.drawBox(doc, startX, curY, pageWidth, footerH, 1);
        const footerCols = [{ label: 'Q.C ENGINEER', w: pageWidth / 3 }, { label: 'CLIENT', w: pageWidth / 3 }, { label: 'AI', w: pageWidth / 3 }];
        let fx = startX;
        footerCols.forEach((col, i) => {
            doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.red).text(col.label, fx, curY + 40, { width: col.w, align: 'center' });
            fx += col.w;
            if (i < footerCols.length - 1) this.drawLine(doc, fx, curY, fx, curY + footerH, 1);
        });

        // Page Numbers
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(7).font(this.fonts.regular).fillColor(this.colors.black)
                .text(`Page ${i + 1} of ${range.count}`, startX, 595.28 - 20, { align: 'right', width: pageWidth });
        }
        doc.end();
    }
}

module.exports = new MhcPdfGenerator();
