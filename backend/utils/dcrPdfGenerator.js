const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class DcrPdfGenerator {
    constructor() {
        this.colors = {
            black: '#000000',
            white: '#FFFFFF',
            grey: '#D9D9D9',
            lightGrey: '#F2F2F2'
        };
        this.fonts = {
            regular: 'Helvetica',
            bold: 'Helvetica-Bold'
        };
    }

    drawHeader(doc, x, y, width, data, companyInfo) {
        const logoBoxW = 150;
        const titleRowH = 45;
        const dcrRowH = 22;
        const totalH = titleRowH + dcrRowH;

        // Outer Border
        doc.lineWidth(0.5).strokeColor(this.colors.black);
        
        // 1. Logo Box (Tall, on the left)
        doc.rect(x, y, logoBoxW, totalH).stroke();
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

        const titleX = x + logoBoxW;
        const titleW = width - logoBoxW;
        doc.rect(titleX, y, titleW, titleRowH).stroke();
        doc.font(this.fonts.bold).fontSize(16).fillColor(this.colors.black)
            .text((companyInfo?.name || 'SHRENO ENGINEERING LIMITED').toUpperCase(), titleX, y + 15, { width: titleW, align: 'center' });

        // 3. Sub-header (DCR)
        const dcrY = y + titleRowH;
        doc.rect(titleX, dcrY, titleW, dcrRowH).stroke();
        doc.font(this.fonts.bold).fontSize(11)
            .text('DESIGN CHANGE REQUEST', titleX, dcrY + 5, { width: titleW, align: 'center' });

        return totalH;
    }

    drawInfoGrid(doc, x, y, width, data) {
        const rowH = 24;
        const fontSize = 8.5;
        doc.font(this.fonts.bold).fontSize(fontSize).fillColor(this.colors.black);

        // Absolute vertical line positions (relative to x)
        // Adjusting for perfect alignment and enough text space
        const L1 = 160; 
        const L2 = 330; 
        const LEnd = width;

        const drawBox = (x1, x2, txt, isBold = false, cy = y, align = 'left') => {
            doc.rect(x + x1, cy, x2 - x1, rowH).stroke();
            doc.font(isBold ? this.fonts.bold : this.fonts.regular);
            const val = String(txt || '-');
            doc.text(val, x + x1 + 5, cy + 8, { width: x2 - x1 - 10, align, ellipsis: true });
        };

        // --- Row 1 ---
        drawBox(0, 50, 'MSN', true);
        drawBox(50, L1, data.job_number || data.job?.job_number, false);
        
        drawBox(L1, L1 + 60, 'DATE:-', true);
        drawBox(L1 + 60, L2, data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-GB') : '', false);
        
        drawBox(L2, L2 + 70, 'DCR NO.', true);
        drawBox(L2 + 70, LEnd, data.dcr_no, false);

        // --- Row 2 ---
        const r2y = y + rowH;
        drawBox(0, 90, 'DRAWING NO.', true, r2y); // Slightly wider label
        drawBox(90, L1, data.drg_no, false, r2y);
        
        drawBox(L1, L1 + 105, 'EQUIPMENT NO.', true, r2y);
        drawBox(L1 + 105, L2, data.equ_no, false, r2y);
        
        // Segment 3 (Split into INSP BY and CLIENT/TPI)
        const L3 = 460;
        drawBox(L2, L2 + 65, 'INSP. BY', true, r2y);
        drawBox(L2 + 65, L3, data.inspect_by, false, r2y);
        
        drawBox(L3, L3 + 70, 'CLIENT/TPI', true, r2y);
        drawBox(L3 + 70, LEnd, '-', false, r2y);

        return rowH * 2;
    }

    drawTableHeader(doc, x, y, width) {
        const headerH = 35;
        const cols = {
            item: 60,
            from: 180,
            to: 180,
            reason: width - 60 - 180 - 180
        };

        doc.lineWidth(0.5).strokeColor(this.colors.black);
        doc.font(this.fonts.bold).fontSize(9);

        let curX = x;
        const drawH = (txt, w) => {
            doc.rect(curX, y, w, headerH).stroke();
            doc.text(txt, curX, y + 10, { width: w, align: 'center' });
            curX += w;
        };

        drawH('ITEM /\nPART NO.', cols.item);
        drawH('CHANGE FROM', cols.from);
        drawH('CHANGE TO', cols.to);
        drawH('REASON FOR CHANGE', cols.reason);

        return { height: headerH, columnWidths: cols };
    }

    drawApprovalGrid(doc, x, y, width, data) {
        const titleH = 22;
        const gridH = 120;
        const colW = width / 4;

        // Change Requested By
        doc.rect(x, y, width, titleH).stroke();
        doc.font(this.fonts.bold).fontSize(10).text(`CHANGE REQUESTED BY : ${data.quality_engineer?.name || data.qualityEngineer?.name || '-'}`, x + 5, y + 7);

        const gridY = y + titleH;
        const approvalCols = [
            'COMMENTS FROM QUALITY',
            'COMMENT FROM DESIGN',
            'REVIEWED BY AI/TPI',
            'INCORPORATED\nIN DRAWING BY'
        ];

        approvalCols.forEach((col, i) => {
            const curX = x + (i * colW);
            // Label box
            doc.rect(curX, gridY, colW, 25).stroke();
            doc.font(this.fonts.bold).fontSize(8).text(col, curX, gridY + 5, { width: colW, align: 'center' });
            // Value box
            doc.rect(curX, gridY + 25, colW, gridH - 25).stroke();
        });

        return titleH + gridH;
    }

    generatePDF(data, res, companyInfo) {
        const doc = new PDFDocument({ margin: 20, size: 'A4', bufferPages: true });
        doc.pipe(res);

        const startX = 20;
        let curY = 20;
        const pageWidth = doc.page.width - 40;

        // Header
        curY += this.drawHeader(doc, startX, curY, pageWidth, data, companyInfo);

        // Info Grid
        curY += this.drawInfoGrid(doc, startX, curY, pageWidth, data);

        // Table Header
        const { height: tableHeaderH, columnWidths: colWs } = this.drawTableHeader(doc, startX, curY, pageWidth);
        curY += tableHeaderH;

        // Items
        const renderItem = (item) => {
            doc.fontSize(9).font(this.fonts.regular).fillColor(this.colors.black);
            const itemH = doc.heightOfString(String(item.item_part_no || ''), { width: colWs.item - 10 });
            const fromH = doc.heightOfString(String(item.chnage_from || item.change_from || ''), { width: colWs.from - 10 });
            const toH = doc.heightOfString(String(item.chnage_to || item.change_to || ''), { width: colWs.to - 10 });
            const reasonH = doc.heightOfString(String(item.reason || ''), { width: colWs.reason - 10 });
            
            const rowH = Math.max(40, itemH + 15, fromH + 15, toH + 15, reasonH + 15);

            if (curY + rowH > doc.page.height - 150) {
                doc.addPage();
                curY = 20;
                const { height: thH } = this.drawTableHeader(doc, startX, curY, pageWidth);
                curY += thH;
            }

            let cx = startX;
            doc.rect(cx, curY, colWs.item, rowH).stroke();
            doc.text(String(item.item_part_no || '-'), cx + 5, curY + 12, { width: colWs.item - 10, align: 'center' });
            cx += colWs.item;

            doc.rect(cx, curY, colWs.from, rowH).stroke();
            doc.text(String(item.chnage_from || item.change_from || '-'), cx + 5, curY + 12, { width: colWs.from - 10 });
            cx += colWs.from;

            doc.rect(cx, curY, colWs.to, rowH).stroke();
            doc.text(String(item.chnage_to || item.change_to || '-'), cx + 5, curY + 12, { width: colWs.to - 10 });
            cx += colWs.to;

            doc.rect(cx, curY, colWs.reason, rowH).stroke();
            doc.text(String(item.reason || '-'), cx + 5, curY + 12, { width: colWs.reason - 10 });
            
            curY += rowH;
        };

        const changeRequests = data.change_request || data.dcr_change_request || [];
        changeRequests.forEach(renderItem);

        // Filling empty rows to match SS and occupy space
        const approvalH = 145; 
        const bottomLimit = doc.page.height - 40 - approvalH;
        
        const remainingH = bottomLimit - curY;
        if (remainingH > 0) {
            doc.rect(startX, curY, colWs.item, remainingH).stroke();
            doc.rect(startX + colWs.item, curY, colWs.from, remainingH).stroke();
            doc.rect(startX + colWs.item + colWs.from, curY, colWs.to, remainingH).stroke();
            doc.rect(startX + colWs.item + colWs.from + colWs.to, curY, colWs.reason, remainingH).stroke();
            curY += remainingH;
        }

        // Approval Grid
        if (curY + approvalH > doc.page.height - 35) {
            doc.addPage();
            curY = 20;
        }
        this.drawApprovalGrid(doc, startX, curY, pageWidth, data);

        // Footer - Positioning it higher to avoid triggering auto-page breaks
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            const footerY = doc.page.height - 35;
            doc.fontSize(8).font(this.fonts.regular).fillColor(this.colors.black);
            doc.text('EXHIBIT: 8/4', startX, footerY, { lineBreak: false });
            doc.text('DESIGN CHANGE REQUEST', startX, footerY, { align: 'center', width: pageWidth, lineBreak: false });
            doc.text('REV: R1', startX, footerY, { align: 'right', width: pageWidth, lineBreak: false });
        }

        doc.end();
    }
}

module.exports = new DcrPdfGenerator();
