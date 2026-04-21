const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class MasterListPdfGenerator {
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

    drawLine(doc, x1, y1, x2, y2, lineWidth = 0.5) {
        doc.lineWidth(lineWidth).strokeColor(this.colors.black).moveTo(x1, y1).lineTo(x2, y2).stroke();
    }

    drawHeader(doc, x, y, width, jobData) {
        const logoBoxW = 160;
        const mainTitleW = 180;
        const infoGridW = width - logoBoxW - mainTitleW;
        const totalH = 68;

        // Outer Border
        doc.lineWidth(0.5).strokeColor(this.colors.black);
        
        // 1. Logo Box
        doc.rect(x, y, logoBoxW, totalH).stroke();
        const logoPath = path.join(process.cwd(), '..', 'frontend', 'public', 'logo.png'); // Standard logo path
        if (fs.existsSync(logoPath)) {
            try {
                doc.image(logoPath, x + 5, y + 15, { height: 35 });
            } catch (e) {
                // Silently skip if image fails
            }
        }
        doc.font(this.fonts.bold).fontSize(10).fillColor('#005596')
            .text('Shreno Engineering Limited', x + 50, y + 25, { width: logoBoxW - 55, align: 'left' });

        // 2. Main Title Box
        const titleX = x + logoBoxW;
        doc.rect(titleX, y, mainTitleW, totalH).stroke();
        doc.font(this.fonts.bold).fontSize(13).fillColor(this.colors.black)
            .text('MASTER LIST OF\nDRAWING/DOCUMENTS', titleX, y + 22, { width: mainTitleW, align: 'center', lineGap: 5 });

        // 3. Info Grid Box (Top Right)
        const gridX = titleX + mainTitleW;
        const rowH = totalH / 4;
        const labelW = 60;

        const drawInfoRow = (label, val, rowIdx) => {
            const rowY = y + (rowIdx * rowH);
            // Label
            doc.rect(gridX, rowY, labelW, rowH).stroke();
            doc.font(this.fonts.bold).fontSize(7).text(label, gridX + 3, rowY + 5);
            // Value
            doc.rect(gridX + labelW, rowY, infoGridW - labelW, rowH).stroke();
            doc.font(this.fonts.regular).fontSize(7).text(val || '-', gridX + labelW + 3, rowY + 5, { ellipsis: true });
        };

        drawInfoRow('PO NO.', jobData.po_number ? `${jobData.po_number} dt ${jobData.po_date ? new Date(jobData.po_date).toLocaleDateString('en-GB').replace(/\//g, '-') : '-'}` : '-', 0);
        drawInfoRow('MSN', jobData.msn || '-', 1);
        drawInfoRow('DATE', new Date().toLocaleDateString('en-GB').replace(/\//g, '-'), 2);
        drawInfoRow('REV NO.', '02', 3);

        return totalH;
    }

    drawTableHeader(doc, x, y, width) {
        const h1 = 15;
        const h2 = 12;
        const totalH = h1 + h2;

        const cols = {
            sr: 25,
            drg: 130,
            sheet: 45,
            rev: 45,
            dcrs: 180, // Colspan 5
            remark: width - 25 - 130 - 45 - 45 - 180
        };

        doc.lineWidth(0.5).strokeColor(this.colors.black).font(this.fonts.bold).fontSize(7);

        let curX = x;
        // SR NO
        doc.rect(curX, y, cols.sr, totalH).stroke();
        doc.text('SR NO.', curX, y + 10, { width: cols.sr, align: 'center' });
        curX += cols.sr;

        // DRG NO
        doc.rect(curX, y, cols.drg, totalH).stroke();
        doc.text('DRG NO. /\nDOCUMENT NO.', curX, y + 5, { width: cols.drg, align: 'center' });
        curX += cols.drg;

        // SHEET NO
        doc.rect(curX, y, cols.sheet, totalH).stroke();
        doc.text('SHEET NO', curX, y + 10, { width: cols.sheet, align: 'center' });
        curX += cols.sheet;

        // LATEST REV
        doc.rect(curX, y, cols.rev, totalH).stroke();
        doc.text('LATEST\nREV. NO', curX, y + 5, { width: cols.rev, align: 'center' });
        curX += cols.rev;

        // DCR AND DATE
        doc.rect(curX, y, cols.dcrs, h1).stroke();
        doc.text('DCR AND DATE', curX, y + 4, { width: cols.dcrs, align: 'center' });
        
        const dcrSubW = cols.dcrs / 5;
        for (let i = 0; i < 5; i++) {
            doc.rect(curX + (i * dcrSubW), y + h1, dcrSubW, h2).stroke();
            doc.text(String(i + 1), curX + (i * dcrSubW), y + h1 + 3, { width: dcrSubW, align: 'center' });
        }
        curX += cols.dcrs;

        // REMARK
        doc.rect(curX, y, cols.remark, totalH).stroke();
        doc.text('REMARK', curX, y + 10, { width: cols.remark, align: 'center' });

        return { height: totalH, colWs: cols, dcrSubW };
    }

    generatePDF(data, res, jobHeader) {
        const doc = new PDFDocument({ margin: 20, size: 'A4', bufferPages: true });
        doc.pipe(res);

        const startX = 20;
        let curY = 20;
        const pageWidth = doc.page.width - 40;

        // Header
        curY += this.drawHeader(doc, startX, curY, pageWidth, jobHeader);
        curY += 5;

        // Table Header
        const { height: headerH, colWs, dcrSubW } = this.drawTableHeader(doc, startX, curY, pageWidth);
        curY += headerH;

        // Items
        const rowH = 18;
        doc.font(this.fonts.regular).fontSize(7);

        data.forEach((item, idx) => {
            // New Page check
            if (curY + rowH > doc.page.height - 40) {
                doc.addPage();
                curY = 20;
                this.drawTableHeader(doc, startX, curY, pageWidth);
                curY += headerH;
            }

            let cx = startX;
            // Border
            doc.rect(startX, curY, pageWidth, rowH).stroke();

            // SR
            doc.text(String(idx + 1), cx, curY + 6, { width: colWs.sr, align: 'center' });
            this.drawLine(doc, cx + colWs.sr, curY, cx + colWs.sr, curY + rowH);
            cx += colWs.sr;

            // DRG NO
            doc.text(item.drgNo || '-', cx + 3, curY + 6, { width: colWs.drg - 6, align: 'center' });
            this.drawLine(doc, cx + colWs.drg, curY, cx + colWs.drg, curY + rowH);
            cx += colWs.drg;

            // SHEET
            doc.text('1 OF 1', cx, curY + 6, { width: colWs.sheet, align: 'center' });
            this.drawLine(doc, cx + colWs.sheet, curY, cx + colWs.sheet, curY + rowH);
            cx += colWs.sheet;

            // REV
            doc.text(item.rev || '00', cx, curY + 6, { width: colWs.rev, align: 'center' });
            this.drawLine(doc, cx + colWs.rev, curY, cx + colWs.rev, curY + rowH);
            cx += colWs.rev;

            // DCRs
            const rowDcrs = item.dcrs || [];
            for (let i = 0; i < 5; i++) {
                if (rowDcrs[i]) {
                    doc.fontSize(5).text(rowDcrs[i], cx + (i * dcrSubW), curY + 7, { width: dcrSubW, align: 'center' });
                }
                this.drawLine(doc, cx + (i + 1) * dcrSubW, curY, cx + (i + 1) * dcrSubW, curY + rowH);
            }
            cx += colWs.dcrs;

            // REMARK
            doc.fontSize(7).text(item.remark || '-', cx + 3, curY + 6, { width: colWs.remark - 6, align: 'center' });

            curY += rowH;
        });

        // Fill remaining rows to end of page OR at least some empty rows (Optimization: Purely blank box)
        const bottomY = doc.page.height - 40;
        if (curY < bottomY) {
            const emptyAreaH = bottomY - curY;
            doc.rect(startX, curY, pageWidth, emptyAreaH).stroke();
            curY = bottomY;
        }

        // Add Footer to all pages
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            const footerY = doc.page.height - 30;
            doc.fontSize(7).font(this.fonts.bold).fillColor(this.colors.black);
            doc.text('EXHIBIT: 8_7 MASTER LIST OF DRAWING / DOCUMENT', startX, footerY, { lineBreak: false });
            doc.text('REV: R1', startX, footerY, { align: 'right', width: pageWidth, lineBreak: false });
        }

        doc.end();
    }
}

module.exports = new MasterListPdfGenerator();
