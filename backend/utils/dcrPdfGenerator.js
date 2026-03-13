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
        const logoBoxW = 150;
        const headerH = 40;

        // Outer Header Border
        doc.lineWidth(0.5).strokeColor(this.colors.black);
        
        // 1. Logo Section
        doc.rect(x, y, logoBoxW, headerH).stroke();
        const logoPath = path.join(process.cwd(), 'frontend', 'public', 'lego_logo.png');
        if (fs.existsSync(logoPath)) {
            try {
                doc.image(logoPath, x + 5, y + 5, { height: 30 });
            } catch (e) {
                const altLogo = path.join(process.cwd(), 'backend', 'public', 'logo.png');
                if (fs.existsSync(altLogo)) doc.image(altLogo, x + 5, y + 5, { height: 30 });
            }
        }
        doc.font(this.fonts.bold).fontSize(14).fillColor('#005596')
            .text('Shreno Engineering Limited', x + 40, y + 12);

        // 2. Title Section
        const titleX = x + logoBoxW;
        const titleW = width - logoBoxW;
        doc.rect(titleX, y, titleW, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(16).fillColor(this.colors.black)
            .text('SHRENO ENGINEERING LIMITED', titleX, y + 12, { width: titleW, align: 'center' });

        // 3. Sub-header (Design Change Request)
        const subHeaderY = y + headerH;
        const subHeaderH = 20;
        doc.rect(x, subHeaderY, width, subHeaderH).stroke();
        doc.font(this.fonts.bold).fontSize(11)
            .text('DESIGN CHANGE REQUEST', x, subHeaderY + 5, { width: width, align: 'center' });

        return headerH + subHeaderH;
    }

    drawInfoGrid(doc, x, y, width, data) {
        const rowH = 22;
        const fontSize = 8.5;
        doc.font(this.fonts.bold).fontSize(fontSize);

        // Row 1: MSN (label) | Val | DATE:- (label) | Val | DCR NO. (label) | Val
        const row1Cols = [
            { label: 'MSN', val: data.job?.job_number || data.job_number || '-', lw: 60, vw: 90 },
            { label: 'DATE:-', val: data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-GB') : '-', lw: 60, vw: 120 },
            { label: 'DCR NO.', val: data.dcr_no || '-', lw: 60, vw: width - 60 - 90 - 60 - 120 - 60 }
        ];

        let curX = x;
        row1Cols.forEach(col => {
            // Label box
            doc.rect(curX, y, col.lw, rowH).stroke();
            doc.font(this.fonts.bold).text(col.label, curX + 5, y + 7);
            curX += col.lw;
            // Value box
            doc.rect(curX, y, col.vw, rowH).stroke();
            doc.font(this.fonts.regular).text(String(col.val), curX + 5, y + 7, { width: col.vw - 10 });
            curX += col.vw;
        });

        // Row 2: DRAWING NO. | Val | EQUIPMENT NO. | Val | INSP. BY | Val | CLIENT/TPI | Val
        const row2Y = y + rowH;
        const row2Cols = [
            { label: 'DRAWING NO.', val: data.drg_no || '-', lw: 90, vw: 100 },
            { label: 'EQUIPMENT NO.', val: data.equ_no || '-', lw: 80, vw: 100 },
            { label: 'INSP. BY', val: data.inspect_by || '-', lw: 60, vw: 60 },
            { label: 'CLIENT/TPI', val: '-', lw: width - 90 - 100 - 80 - 100 - 60 - 60 - 60, vw: 60 }
        ];

        curX = x;
        row2Cols.forEach(col => {
            // Label box
            doc.rect(curX, row2Y, col.lw, rowH).stroke();
            doc.font(this.fonts.bold).text(col.label, curX + 5, row2Y + 7);
            curX += col.lw;
            // Value box
            doc.rect(curX, row2Y, col.vw, rowH).stroke();
            doc.font(this.fonts.regular).text(String(col.val), curX + 5, row2Y + 7, { width: col.vw - 10 });
            curX += col.vw;
        });

        return rowH * 2;
    }

    drawTableHeader(doc, x, y, width) {
        const headerH = 35;
        const cols = {
            item: 50,
            from: 180,
            to: 200,
            reason: width - 50 - 180 - 200
        };

        doc.rect(x, y, width, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(9);

        let curX = x;
        const drawH = (txt, w) => {
            doc.rect(curX, y, w, headerH).stroke();
            doc.text(txt, curX, y + 11, { width: w, align: 'center' });
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
        const gridH = 65;
        const colW = width / 4;

        // Change Requested By
        doc.rect(x, y, width, titleH).stroke();
        doc.font(this.fonts.bold).fontSize(9).text(`CHANGE REQUESTED BY : ${data.quality_engineer?.name || '-'}`, x + 5, y + 7);

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
            doc.rect(curX, gridY, colW, 20).stroke();
            doc.font(this.fonts.bold).fontSize(8).text(col, curX, gridY + 5, { width: colW, align: 'center' });
            // Value box
            doc.rect(curX, gridY + 20, colW, gridH - 20).stroke();
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
        const headerH = this.drawHeader(doc, startX, curY, pageWidth, data);
        curY += headerH;

        // Info Grid
        const infoGridH = this.drawInfoGrid(doc, startX, curY, pageWidth, data);
        curY += infoGridH;

        // Table Header
        const { height: tableHeaderH, columnWidths: colWs } = this.drawTableHeader(doc, startX, curY, pageWidth);
        curY += tableHeaderH;

        // Items
        const renderItem = (item) => {
            doc.fontSize(8.5).font(this.fonts.regular);
            const itemH = doc.heightOfString(item.item_part_no || '', { width: colWs.item - 10 });
            const fromH = doc.heightOfString(item.chnage_from || '', { width: colWs.from - 10 });
            const toH = doc.heightOfString(item.chnage_to || '', { width: colWs.to - 10 });
            const reasonH = doc.heightOfString(item.reason || '', { width: colWs.reason - 10 });
            
            const rowH = Math.max(35, itemH + 15, fromH + 15, toH + 15, reasonH + 15);

            if (curY + rowH > doc.page.height - 120) {
                // To maintain the "Look", if we break, we should draw footer and start new page
                // But for a single page requirement in many of these reports:
                // Let's just break if it hits limits
                doc.addPage();
                curY = 20;
                // Redraw table header on new page?
                const { height: thH } = this.drawTableHeader(doc, startX, curY, pageWidth);
                curY += thH;
            }

            let cx = startX;
            doc.rect(cx, curY, colWs.item, rowH).stroke();
            doc.text(String(item.item_part_no || '-'), cx + 5, curY + 12, { width: colWs.item - 10, align: 'center' });
            cx += colWs.item;

            doc.rect(cx, curY, colWs.from, rowH).stroke();
            doc.text(String(item.chnage_from || '-'), cx + 5, curY + 12, { width: colWs.from - 10 });
            cx += colWs.from;

            doc.rect(cx, curY, colWs.to, rowH).stroke();
            doc.text(String(item.chnage_to || '-'), cx + 5, curY + 12, { width: colWs.to - 10 });
            cx += colWs.to;

            doc.rect(cx, curY, colWs.reason, rowH).stroke();
            doc.text(String(item.reason || '-'), cx + 5, curY + 12, { width: colWs.reason - 10 });
            
            curY += rowH;
        };

        if (data.dcr_change_request && data.dcr_change_request.length > 0) {
            data.dcr_change_request.forEach(renderItem);
        } else if (data.change_request && data.change_request.length > 0) {
             data.change_request.forEach(renderItem);
        }

        // Filling empty rows to match SS
        const minRows = 12;
        const currentCount = (data.dcr_change_request || data.change_request || []).length;
        for (let i = currentCount; i < minRows; i++) {
            const h = 35;
            if (curY + h > doc.page.height - 150) break;
            doc.rect(startX, curY, colWs.item, h).stroke();
            doc.rect(startX + colWs.item, curY, colWs.from, h).stroke();
            doc.rect(startX + colWs.item + colWs.from, curY, colWs.to, h).stroke();
            doc.rect(startX + colWs.item + colWs.from + colWs.to, curY, colWs.reason, h).stroke();
            curY += h;
        }

        // Approval Grid
        curY += 0; // Tight fit
        if (curY + 100 > doc.page.height) {
            doc.addPage();
            curY = 20;
        }
        this.drawApprovalGrid(doc, startX, curY, pageWidth, data);

        // Page numbering and static footer
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            const footerY = doc.page.height - 15;
            doc.fontSize(7).font(this.fonts.regular).fillColor(this.colors.black);
            doc.text('EXHIBIT: 8/4', startX, footerY);
            doc.text('DESIGN CHANGE REQUEST', startX, footerY, { align: 'center', width: pageWidth });
            doc.text('REV: R1', startX, footerY, { align: 'right', width: pageWidth });
        }

        doc.end();
    }
}

module.exports = new DcrPdfGenerator();
