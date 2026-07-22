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

    formatText(text) {
        if (text === null || text === undefined || text === '') return '-';
        // Use real spaces instead of zero-width spaces (\u200B) because PDFKit sometimes miscalculates their width
        return String(text).replace(/([/,_.\-])(?!\s)/g, '$1 ').trim();
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
            const logoPath = path.resolve(__dirname, '..', 'assets', 'shreno-logo.png');
            if (fs.existsSync(logoPath)) {
                try { 
                    // Use only the image, as the image itself contains the company name
                    doc.image(logoPath, startX + 5, y + 4, { height: 32 }); 
                } catch (e) {
                    console.error('Error loading logo:', e);
                }
            }

            this.drawLine(doc, startX + logoW, y, startX + logoW, y + headerH, 1);
            doc.font(this.fonts.bold).fontSize(14).fillColor(this.colors.black)
                .text('SHRENO ENGINEERING LIMITED', startX + logoW, y + 8, { width: pageWidth - logoW, align: 'center' });
            
            this.drawLine(doc, startX + logoW, y + 20, startX + pageWidth, y + 20, 0.8);
            const reportTitle = data.isSelective ? 'Material Identification Report' : 'MATERIAL HEAT CHART';
            doc.font(this.fonts.bold).fontSize(12)
                .text(reportTitle, startX + logoW, y + 24, { width: pageWidth - logoW, align: 'center' });

            y += headerH;

            // ─── 2. INFO GRID ───────────────────────────────────────────────────────
            const infoRows = [
                { l1: 'CLIENT', v1: this.formatText(data.client), l2: 'MSN', v2: this.formatText(data.msn) },
                { l1: 'EQUIPMENT NAME.', v1: this.formatText(data.equipment_name), l2: 'TAG NO.', v2: this.formatText(data.tag_no) },
                { l1: 'DRG. No.', v1: this.formatText(data.shreno_drg_no), l2: 'PO. NO.', v2: this.formatText(data.po_no) },
                { l1: 'CODE:', v1: this.formatText(data.code), l2: 'INSPECTION BY', v2: this.formatText(data.inspection_by) }
            ];

            const midX = startX + (pageWidth * 0.6);
            const lineX1 = startX + 115;
            const lineX2 = midX + 80;
            let infoGridStartY = y;
            doc.fontSize(8); // Needed for heightOfString calculations

            infoRows.forEach((row, i) => {
                const v1H = doc.heightOfString(row.v1, { width: (midX - lineX1) - 10 });
                const v2H = doc.heightOfString(row.v2, { width: (startX + pageWidth - lineX2) - 10 });
                const rH = Math.max(16, v1H + 8, v2H + 8);
                
                doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.black).text(row.l1, startX + 5, y + (rH/2) - 3.5);
                doc.font(this.fonts.regular).fontSize(8).text(row.v1, lineX1 + 5, y + (rH/2) - (v1H/2) + 1, { width: (midX - lineX1) - 10, height: rH - 2, ellipsis: true, lineBreak: true });
                
                doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.black).text(row.l2, midX + 5, y + (rH/2) - 3.5);
                doc.font(this.fonts.regular).fontSize(8).text(row.v2, lineX2 + 5, y + (rH/2) - (v2H/2) + 1, { width: (startX + pageWidth - lineX2) - 10, height: rH - 2, ellipsis: true, lineBreak: true });
                
                y += rH;
                if (i < 3) this.drawLine(doc, startX, y, startX + pageWidth, y);
            });
            
            this.drawBox(doc, startX, infoGridStartY, pageWidth, y - infoGridStartY, 1);
            this.drawLine(doc, midX, infoGridStartY, midX, y, 1);
            this.drawLine(doc, lineX1, infoGridStartY, lineX1, y, 1);
            this.drawLine(doc, lineX2, infoGridStartY, lineX2, y, 1);

            // ─── 3. TABLE HEADER ───────────────────────────────────────────────────
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

            let tableHeaderH = 30;
            doc.font(this.fonts.bold).fontSize(7);
            cols.forEach(col => {
                const h = doc.heightOfString(col.label, { width: col.w - 4 });
                if (h + 10 > tableHeaderH) tableHeaderH = h + 10;
            });

            this.drawBox(doc, startX, y, pageWidth, tableHeaderH, 1);
            let tx = startX;
            cols.forEach((col, i) => {
                const textH = doc.heightOfString(col.label, { width: col.w - 4 });
                doc.text(col.label, tx, y + (tableHeaderH/2) - (textH/2) + 1, { width: col.w, align: 'center' });
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
        const bodyMaxY = 440; 

        const items = data.items || [];
        items.forEach((item, idx) => {
            const isHeading = item.is_heading;
            
            if (isHeading) {
                doc.font(this.fonts.regular).fontSize(8);
                const headH = doc.heightOfString(`${item.heading_text || 'HEADING'}`, { width: pageWidth - 10 });
                const headingH = Math.max(18, headH + 10);

                if (curY + headingH > bodyMaxY) {
                    doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' });
                    drawHeader(30);
                }
                this.drawBox(doc, startX, curY, pageWidth, headingH, 0.5);
                doc.fillColor(this.colors.black)
                    .text(`${item.heading_text || 'HEADING'}`, startX + 5, curY + (headingH/2) - (headH/2) + 1, { width: pageWidth - 10 });
                curY += headingH;
            } 
            if (item.item_no || item.description) {
                doc.font(this.fonts.regular).fontSize(7);
                
                const getH = (val, w) => doc.heightOfString(this.formatText(val), { width: w - 12, lineBreak: true });
                const h0 = getH(item.item_no, cols[0].w);
                const h1 = getH(item.description, cols[1].w);
                const h2 = getH(item.size, cols[2].w);
                const h3 = getH(item.material_spec, cols[3].w);
                const h4 = getH(item.quantity_unit, cols[4].w);
                const h5 = getH(item.heat_no, cols[5].w);
                const h6 = getH(item.mtr_no, cols[6].w);
                const h7 = getH(item.manufacturer, cols[7].w);
                const h8 = getH(item.remarks, cols[8].w);
                
                let rowH = Math.max(22, h0+10, h1+10, h2+10, h3+10, h4+10, h5+10, h6+10, h7+10, h8+10);
                if (rowH > 320) rowH = 320; // Bound max height to safely fit within a single page layout
                
                if (curY + rowH > bodyMaxY) {
                    doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' });
                    drawHeader(30);
                }

                this.drawBox(doc, startX, curY, pageWidth, rowH, 0.5);
                
                let tx = startX;
                doc.fillColor(this.colors.black);
                const drawCell = (val, w, align = 'center') => {
                    const formatted = this.formatText(val);
                    const textH = doc.heightOfString(formatted, { width: w - 12, lineBreak: true });
                    const renderH = Math.min(textH, rowH - 4);
                    doc.text(formatted, tx + 6, curY + (rowH/2) - (renderH/2) + 1, { width: w - 12, height: renderH + 2, align, lineBreak: true, ellipsis: true });
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
                
                const val8 = this.formatText(item.remarks);
                const textH8 = doc.heightOfString(val8, { width: cols[8].w - 12, lineBreak: true });
                const renderH8 = Math.min(textH8, rowH - 4);
                doc.text(val8, tx + 6, curY + (rowH/2) - (renderH8/2) + 1, { width: cols[8].w - 12, height: renderH8 + 2, align: 'center', lineBreak: true, ellipsis: true });
                
                curY += rowH;
            }
        });

        // ─── 5. FOOTER ──────────────────────────────────────────────────────────
        // Finalize page numbering and signature row on every page
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i++) {
            doc.switchToPage(i);
            
            // Signature Row
            const footerH = 100;
            const footerY = 440; // Fixed absolute bottom position
            this.drawBox(doc, startX, footerY, pageWidth, footerH, 1);
            const footerCols = [{ label: 'Q.C ENGINEER', w: pageWidth / 3 }, { label: 'AI', w: pageWidth / 3 }, { label: 'CLIENT / TPI', w: pageWidth / 3 }];
            let fx = startX;
            footerCols.forEach((col, idx) => {
                doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.black).text(col.label, fx, footerY + footerH - 25, { width: col.w, align: 'center' });
                fx += col.w;
                if (idx < footerCols.length - 1) this.drawLine(doc, fx, footerY, fx, footerY + footerH, 1);
            });

            // Page Information
            const absoluteFooterY = 595.28 - 40; // Safely below the signature box
            doc.fontSize(7).font(this.fonts.regular).fillColor(this.colors.black);
            doc.text('EXHIBIT: 9/8 MATERIAL HEAT CHARTS', startX, absoluteFooterY);
            doc.text(`Page ${i + 1} of ${range.count}`, startX, absoluteFooterY, { align: 'right', width: pageWidth });
        }
        doc.end();
    }
}

module.exports = new MhcPdfGenerator();
