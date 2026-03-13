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

    drawHeader(doc, x, y, width, data) {
        const logoBoxW = 160;
        const headerH = 45;

        // Outer Header Border
        doc.lineWidth(0.5).strokeColor(this.colors.black);
        
        // 1. Logo Section
        doc.rect(x, y, logoBoxW, headerH).stroke();
        const logoPath = path.join(process.cwd(), 'frontend', 'public', 'lego_logo.png');
        if (fs.existsSync(logoPath)) {
            try {
                doc.image(logoPath, x + 3, y + 8, { height: 28 });
            } catch (e) {
                const altLogo = path.join(process.cwd(), 'backend', 'public', 'logo.png');
                if (fs.existsSync(altLogo)) doc.image(altLogo, x + 3, y + 8, { height: 28 });
            }
        }
        doc.font(this.fonts.bold).fontSize(11).fillColor('#005596')
            .text('Shreno Engineering\nLimited', x + 35, y + 13, { width: logoBoxW - 40, align: 'center' });

        // 2. Title Section
        const titleX = x + logoBoxW;
        const titleW = width - logoBoxW;
        doc.rect(titleX, y, titleW, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(18).fillColor(this.colors.black)
            .text('SHRENO ENGINEERING LIMITED', titleX, y + 14, { width: titleW, align: 'center' });

        // 3. Sub-header (Design Change Request)
        const subHeaderY = y + headerH;
        const subHeaderH = 22;
        doc.rect(x, subHeaderY, width, subHeaderH).stroke();
        doc.font(this.fonts.bold).fontSize(12)
            .text('DESIGN CHANGE REQUEST', x, subHeaderY + 5, { width: width, align: 'center' });

        return headerH + subHeaderH;
    }

    drawInfoGrid(doc, x, y, width, data) {
        const rowH = 24;
        const fontSize = 9;
        doc.font(this.fonts.bold).fontSize(fontSize);

        // Precise Grid alignment to match SS1
        // Row 1 & 2 vertical lines should align at x=150, x=300 (relative)
        const gridW1 = 150;
        const gridW2 = 150;
        const remainingW = width - gridW1 - gridW2;

        let curX = x;

        // Row 1
        // Col 1: MSN
        doc.rect(curX, y, 60, rowH).stroke();
        doc.font(this.fonts.bold).text('MSN', curX + 5, y + 8);
        doc.rect(curX + 60, y, gridW1 - 60, rowH).stroke();
        doc.font(this.fonts.regular).text(String(data.job_number || data.job?.job_number || '-'), curX + 65, y + 8, { width: gridW1 - 65 });
        curX += gridW1;

        // Col 2: DATE
        doc.rect(curX, y, 60, rowH).stroke();
        doc.font(this.fonts.bold).text('DATE:-', curX + 5, y + 8);
        doc.rect(curX + 60, y, gridW2 - 60, rowH).stroke();
        doc.font(this.fonts.regular).text(data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-GB') : '-', curX + 65, y + 8, { width: gridW2 - 65 });
        curX += gridW2;

        // Col 3: DCR NO
        doc.rect(curX, y, 90, rowH).stroke();
        doc.font(this.fonts.bold).text('DCR NO.', curX + 5, y + 8);
        doc.rect(curX + 90, y, remainingW - 90, rowH).stroke();
        doc.font(this.fonts.regular).text(String(data.dcr_no || '-'), curX + 95, y + 8, { width: remainingW - 95 });

        // Row 2
        const row2Y = y + rowH;
        curX = x;

        // Col 1: DRAWING NO
        doc.rect(curX, row2Y, 85, rowH).stroke();
        doc.font(this.fonts.bold).text('DRAWING NO.', curX + 5, row2Y + 8);
        doc.rect(curX + 85, row2Y, gridW1 - 85, rowH).stroke();
        doc.font(this.fonts.regular).text(String(data.drg_no || '-'), curX + 90, row2Y + 8, { width: gridW1 - 90 });
        curX += gridW1;

        // Col 2: EQUIPMENT NO
        doc.rect(curX, row2Y, 95, rowH).stroke();
        doc.font(this.fonts.bold).text('EQUIPMENT NO.', curX + 2, row2Y + 8); // Tight
        doc.rect(curX + 95, row2Y, gridW2 - 95, rowH).stroke();
        doc.font(this.fonts.regular).text(String(data.equ_no || '-'), curX + 98, row2Y + 8, { width: gridW2 - 100 });
        curX += gridW2;

        // Split remaining for INSP. BY and CLIENT/TPI
        const halfRem = remainingW / 2;
        // Col 3: INSP. BY
        doc.rect(curX, row2Y, 70, rowH).stroke();
        doc.font(this.fonts.bold).text('INSP. BY', curX + 5, row2Y + 8);
        doc.rect(curX + 70, row2Y, halfRem - 70, rowH).stroke();
        doc.font(this.fonts.regular).text(String(data.inspect_by || '-'), curX + 75, row2Y + 8, { width: halfRem - 75 });
        curX += halfRem;

        // Col 4: CLIENT/TPI
        doc.rect(curX, row2Y, 80, rowH).stroke();
        doc.font(this.fonts.bold).text('CLIENT/TPI', curX + 5, row2Y + 8);
        doc.rect(curX + 80, row2Y, width - (curX - x) - 80, rowH).stroke();
        doc.font(this.fonts.regular).text('-', curX + 85, row2Y + 8);

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
        const gridH = 80;
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

    generatePDF(data, res) {
        const doc = new PDFDocument({ margin: 20, size: 'A4', bufferPages: true });
        doc.pipe(res);

        const startX = 20;
        let curY = 20;
        const pageWidth = doc.page.width - 40;

        // Header
        curY += this.drawHeader(doc, startX, curY, pageWidth, data);

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
                // Should only be called if strictly necessary
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
        const approvalH = 102; // titleH + gridH
        const bottomLimit = doc.page.height - 40 - approvalH;
        
        while (curY < bottomLimit) {
            const h = 40;
            if (curY + h > bottomLimit) break;
            doc.rect(startX, curY, colWs.item, h).stroke();
            doc.rect(startX + colWs.item, curY, colWs.from, h).stroke();
            doc.rect(startX + colWs.item + colWs.from, curY, colWs.to, h).stroke();
            doc.rect(startX + colWs.item + colWs.from + colWs.to, curY, colWs.reason, h).stroke();
            curY += h;
        }

        // Approval Grid
        if (curY + approvalH > doc.page.height - 20) {
            doc.addPage();
            curY = 20;
        }
        this.drawApprovalGrid(doc, startX, curY, pageWidth, data);

        // Page numbering and static footer
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            const footerY = doc.page.height - 20;
            doc.fontSize(8).font(this.fonts.regular).fillColor(this.colors.black);
            doc.text('EXHIBIT: 8/4', startX, footerY);
            doc.text('DESIGN CHANGE REQUEST', startX, footerY, { align: 'center', width: pageWidth });
            doc.text('REV: R1', startX, footerY, { align: 'right', width: pageWidth });
        }

        doc.end();
    }
}

module.exports = new DcrPdfGenerator();
