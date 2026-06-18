const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class TubeBundlePdfGenerator {
    constructor() {
        this.colors = {
            red: '#FF0000',
            black: '#000000',
            white: '#FFFFFF',
            grey: '#F4F4F5'
        };
        this.fonts = {
            regular: 'Helvetica',
            bold: 'Helvetica-Bold'
        };
        // A4 Width: 595.28, Height: 841.89
        this.margin = 30;
        this.pageWidth = 595.28;
        this.usableWidth = this.pageWidth - (this.margin * 2);
    }

    drawTopHeader(doc, x, y, data) {
        let curY = y;
        const rowH = 20;

        // Draw outer borders
        doc.lineWidth(1).strokeColor(this.colors.black);

        // Logo and Title Row (Height: 50)
        const logoRowH = 50;
        doc.rect(x, curY, this.usableWidth, logoRowH).stroke();
        
        // Split for Logo
        const logoBoxW = 160;
        doc.moveTo(x + logoBoxW, curY).lineTo(x + logoBoxW, curY + logoRowH).stroke();

        // Draw Logo (Centered in its box with padding)
        const logoPath = path.resolve(__dirname, '..', 'assets', 'shreno-logo.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, x + 5, curY + 5, { fit: [logoBoxW - 10, logoRowH - 10], align: 'center', valign: 'center' });
        }

        // Draw Title
        doc.font(this.fonts.bold).fontSize(14).fillColor(this.colors.black);
        const titleText = data.inspection_type === "Tube Skeleton" ? "TUBE SKELETON INSPECTION REPORT" : "TUBE BUNDLE INSPECTION REPORT";
        const titleHeight = doc.heightOfString(titleText, { width: this.usableWidth - logoBoxW });
        doc.text(titleText, x + logoBoxW, curY + (logoRowH - titleHeight) / 2, { width: this.usableWidth - logoBoxW, align: 'center' });

        curY += logoRowH;

        // Details grid: 5 columns
        // Col1 (60), Col2 (140), Col3 (50), Col4 (140), Col5 (Remaining)
        const c1 = 65, c2 = 145, c3 = 60, c4 = 145;
        
        const details = [
            { l1: 'Client', v1: data.client, l2: 'Date.', v2: data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-GB') : '-' },
            { l1: 'P.O.No.', v1: data.po_no, l2: 'Code', v2: data.code },
            { l1: 'Equipment', v1: data.equipment_name, l2: 'Drg. No.', v2: data.drg_no },
            { l1: 'Tag no.', v1: data.tag_no, l2: 'MSN No.', v2: data.msn, v2Red: true }
        ];

        details.forEach(row => {
            doc.rect(x, curY, this.usableWidth, rowH).stroke();
            
            // Vertical Lines
            let lx = x;
            lx += c1; doc.moveTo(lx, curY).lineTo(lx, curY + rowH).stroke();
            lx += c2; doc.moveTo(lx, curY).lineTo(lx, curY + rowH).stroke();
            lx += c3; doc.moveTo(lx, curY).lineTo(lx, curY + rowH).stroke();
            lx += c4; doc.moveTo(lx, curY).lineTo(lx, curY + rowH).stroke();

            // Calculate vertical center
            doc.font(this.fonts.bold).fontSize(9);
            const l1H = doc.heightOfString(row.l1);
            const l2H = doc.heightOfString(row.l2);

            doc.fillColor(this.colors.black);
            doc.text(row.l1, x + 3, curY + (rowH - l1H) / 2);
            doc.text(row.l2, x + c1 + c2 + 3, curY + (rowH - l2H) / 2);

            doc.font(this.fonts.regular);
            const v1Str = String(row.v1 || '');
            const v2Str = String(row.v2 || '');
            const v1H = doc.heightOfString(v1Str, { width: c2 - 6 });
            const v2H = doc.heightOfString(v2Str, { width: c4 - 6 });

            doc.text(v1Str, x + c1 + 3, curY + (rowH - v1H) / 2, { width: c2 - 6 });

            if (row.v2Red) doc.fillColor(this.colors.red);
            doc.text(v2Str, x + c1 + c2 + c3 + 3, curY + (rowH - v2H) / 2, { width: c4 - 6 });
            doc.fillColor(this.colors.black); // Reset

            curY += rowH;
        });

        // Empty row space as seen in screenshot
        doc.rect(x, curY, this.usableWidth, rowH).stroke();
        let lxEmpty = x;
        lxEmpty += c1; doc.moveTo(lxEmpty, curY).lineTo(lxEmpty, curY + rowH).stroke();
        lxEmpty += c2; doc.moveTo(lxEmpty, curY).lineTo(lxEmpty, curY + rowH).stroke();
        lxEmpty += c3; doc.moveTo(lxEmpty, curY).lineTo(lxEmpty, curY + rowH).stroke();
        lxEmpty += c4; doc.moveTo(lxEmpty, curY).lineTo(lxEmpty, curY + rowH).stroke();
        curY += rowH;

        return curY;
    }

    drawTableHeader(doc, x, y, data) {
        let curY = y;
        const totalH = 20;

        const c1 = 30, c2 = 180, c3 = 100, c4 = 100; 
        const c5 = this.usableWidth - c1 - c2 - c3 - c4;

        doc.rect(x, curY, this.usableWidth, totalH).stroke();
        
        // Vertical lines
        doc.moveTo(x + c1, curY).lineTo(x + c1, curY + totalH).stroke();
        doc.moveTo(x + c1 + c2, curY).lineTo(x + c1 + c2, curY + totalH).stroke();
        doc.moveTo(x + c1 + c2 + c3, curY).lineTo(x + c1 + c2 + c3, curY + totalH).stroke();
        doc.moveTo(x + c1 + c2 + c3 + c4, curY).lineTo(x + c1 + c2 + c3 + c4, curY + totalH).stroke();

        doc.font(this.fonts.bold).fontSize(8).fillColor(this.colors.black);
        
        doc.text('SR. NO.', x, curY + 6, { width: c1, align: 'center' });
        doc.text('DESCRIPTION', x + c1, curY + 6, { width: c2, align: 'center' });
        doc.text('AS PER DRG', x + c1 + c2, curY + 6, { width: c3, align: 'center' });
        doc.text('ACTUAL DIMENSION', x + c1 + c2 + c3, curY + 6, { width: c4, align: 'center' });
        doc.text('REMARK', x + c1 + c2 + c3 + c4, curY + 6, { width: c5, align: 'center' });

        curY += totalH;
        return curY;
    }

    drawItemRow(doc, x, y, item, i) {
        const c1 = 30, c2 = 180, c3 = 100, c4 = 100; 
        const c5 = this.usableWidth - c1 - c2 - c3 - c4;
        
        doc.font(this.fonts.regular).fontSize(8);
        
        const srNoText = String(item.sr_no || (i + 1));
        const descText = String(item.description || '');
        const asPerDrgText = String(item.as_per_drg || '');
        const actualText = String(item.actual_dimension || '');
        const remarkText = String(item.remarks || '');

        const srNoHeight = doc.heightOfString(srNoText, { width: c1 - 4 });
        const descHeight = doc.heightOfString(descText, { width: c2 - 8 });
        const drgDimHeight = doc.heightOfString(asPerDrgText, { width: c3 - 4 });
        const actualHeight = doc.heightOfString(actualText, { width: c4 - 4 });
        const remHeight = doc.heightOfString(remarkText, { width: c5 - 8 });

        const maxTextHeight = Math.max(srNoHeight, descHeight, drgDimHeight, actualHeight, remHeight);
        const rowH = Math.max(18, maxTextHeight + 10);

        // Clean white Background
        doc.rect(x, y, this.usableWidth, rowH).strokeColor(this.colors.black).stroke();

        // Vertical lines
        doc.moveTo(x + c1, y).lineTo(x + c1, y + rowH).stroke();
        doc.moveTo(x + c1 + c2, y).lineTo(x + c1 + c2, y + rowH).stroke();
        doc.moveTo(x + c1 + c2 + c3, y).lineTo(x + c1 + c2 + c3, y + rowH).stroke();
        doc.moveTo(x + c1 + c2 + c3 + c4, y).lineTo(x + c1 + c2 + c3 + c4, y + rowH).stroke();

        doc.fillColor(this.colors.black);
        doc.text(srNoText, x, y + (rowH - srNoHeight) / 2, { width: c1, align: 'center' });
        
        doc.text(descText, x + c1 + 4, y + (rowH - descHeight) / 2, { width: c2 - 8, align: 'left' });
        doc.text(asPerDrgText, x + c1 + c2, y + (rowH - drgDimHeight) / 2, { width: c3, align: 'center' });
        
        doc.fillColor(this.colors.red);
        doc.text(actualText, x + c1 + c2 + c3, y + (rowH - actualHeight) / 2, { width: c4, align: 'center' });
        
        doc.fillColor(this.colors.black);
        doc.text(remarkText, x + c1 + c2 + c3 + c4 + 4, y + (rowH - remHeight) / 2, { width: c5 - 8, align: 'left' });

        return { curY: y + rowH, height: rowH };
    }

    drawInstruments(doc, x, y, data) {
        let curY = y;
        
        // Header Row
        const headerH = 18;
        doc.rect(x, curY, this.usableWidth, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.black);
        doc.text('INSTRUMENT CALIBRATION DETAILS:', x + 5, curY + 5);
        curY += headerH;

        // Sub Headers
        const c1 = 150, c2 = 150;
        
        doc.rect(x, curY, this.usableWidth, headerH).stroke();
        doc.moveTo(x + c1, curY).lineTo(x + c1, curY + headerH).stroke();
        doc.moveTo(x + c1 + c2, curY).lineTo(x + c1 + c2, curY + headerH).stroke();

        doc.text('NAME:', x + 5, curY + 5);
        doc.text('ID NO. / SR NO.:', x + c1 + 5, curY + 5);
        doc.text('DUE DATE:', x + c1 + c2 + 5, curY + 5);
        curY += headerH;

        // Dynamic Data Rows
        doc.font(this.fonts.regular);
        const instruments = data.instruments && data.instruments.length > 0 ? data.instruments : [];
        
        for (let i = 0; i < instruments.length; i++) {
            const inst = instruments[i];
            const nameStr = String(inst.name || '');
            const idStr = String(inst.id_no || '');
            let dDate = inst.due_date;
            if (dDate) {
                try { dDate = new Date(dDate).toLocaleDateString('en-GB'); } catch (e) {}
            }
            const dateStr = String(dDate || '');

            const h1 = doc.heightOfString(nameStr, { width: c1 - 10 });
            const h2 = doc.heightOfString(idStr, { width: c2 - 10 });
            const rowH = Math.max(18, h1 + 10, h2 + 10);

            if (curY + rowH > doc.page.height - this.margin - 50) {
                doc.addPage();
                curY = this.margin;
                doc.font(this.fonts.bold);
                doc.rect(x, curY, this.usableWidth, headerH).stroke();
                doc.moveTo(x + c1, curY).lineTo(x + c1, curY + headerH).stroke();
                doc.moveTo(x + c1 + c2, curY).lineTo(x + c1 + c2, curY + headerH).stroke();
                doc.text('NAME:', x + 5, curY + 5);
                doc.text('ID NO. / SR NO.:', x + c1 + 5, curY + 5);
                doc.text('DUE DATE:', x + c1 + c2 + 5, curY + 5);
                curY += headerH;
                doc.font(this.fonts.regular);
            }

            doc.rect(x, curY, this.usableWidth, rowH).stroke();
            doc.moveTo(x + c1, curY).lineTo(x + c1, curY + rowH).stroke();
            doc.moveTo(x + c1 + c2, curY).lineTo(x + c1 + c2, curY + rowH).stroke();

            doc.text(nameStr, x + 5, curY + (rowH - h1) / 2, { width: c1 - 10 });
            doc.text(idStr, x + c1 + 5, curY + (rowH - h2) / 2, { width: c2 - 10 });
            const dH = doc.heightOfString(dateStr);
            doc.text(dateStr, x + c1 + c2 + 5, curY + (rowH - dH) / 2);
            
            curY += rowH;
        }

        return curY;
    }

    drawRemarks(doc, x, y, data) {
        let curY = y;
        
        doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.black);
        const prefix = 'REMARKS : ';
        
        let combinedRemarks = '';
        if (data.remarks && data.remarks.length > 0) {
            combinedRemarks = data.remarks.map(r => r.text).join('\n');
        }
        
        const contentStr = prefix + combinedRemarks;
        const totalHeight = doc.heightOfString(contentStr, { width: this.usableWidth - 10 });
        const rowH = Math.max(18, totalHeight + 10);

        doc.rect(x, curY, this.usableWidth, rowH).stroke();
        
        doc.text(prefix, x + 5, curY + 5, { continued: true });
        
        doc.fillColor(this.colors.red);
        doc.text(combinedRemarks);
        
        doc.fillColor(this.colors.black);
        curY += rowH;
        return { curY, height: rowH };
    }

    drawFooter(doc, x, y) {
        let curY = y;
        const sigH = 130; 
        
        doc.rect(x, curY, this.usableWidth, sigH).stroke();
        const midX = x + (this.usableWidth / 2);
        doc.moveTo(midX, curY).lineTo(midX, curY + sigH).stroke();

        doc.font(this.fonts.bold).fontSize(10);
        doc.text('Shreno Engineering', x + 5, curY + sigH - 15);
        doc.text('CLIENT / TPI / AI', midX + 5, curY + sigH - 15);

        curY += sigH;

        // Bottom Format Row
        const formatH = 20;
        doc.rect(x, curY, this.usableWidth, formatH).stroke();
        
        doc.moveTo(midX, curY).lineTo(midX, curY + formatH).stroke();
        
        doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.black);
        const fH = doc.heightOfString('Format - F-QA-12');
        doc.text('Format - F-QA-12', x + 50, curY + (formatH - fH) / 2);

        const rightHalfWidth = this.usableWidth / 2;
        const cellWidth = rightHalfWidth / 3;
        
        doc.moveTo(midX + cellWidth, curY).lineTo(midX + cellWidth, curY + formatH).stroke();
        doc.moveTo(midX + (cellWidth * 2), curY).lineTo(midX + (cellWidth * 2), curY + formatH).stroke();

        return curY + formatH;
    }

    calculateItemHeight(doc, item) {
        const c1 = 30, c2 = 180, c3 = 100, c4 = 100; 
        const c5 = this.usableWidth - c1 - c2 - c3 - c4;
        
        doc.font(this.fonts.regular).fontSize(8);
        const srNoHeight = doc.heightOfString(String(item.sr_no || '1'), { width: c1 - 4 });
        const descHeight = doc.heightOfString(String(item.description || ''), { width: c2 - 8 });
        const drgDimHeight = doc.heightOfString(String(item.as_per_drg || ''), { width: c3 - 4 });
        const actualHeight = doc.heightOfString(String(item.actual_dimension || ''), { width: c4 - 4 });
        const remHeight = doc.heightOfString(String(item.remarks || ''), { width: c5 - 8 });

        const maxTextHeight = Math.max(srNoHeight, descHeight, drgDimHeight, actualHeight, remHeight);
        return Math.max(18, maxTextHeight + 10);
    }

    generatePDF(data, res, companyInfo) {
        const doc = new PDFDocument({ margin: this.margin, size: 'A4', bufferPages: true });
        doc.pipe(res);

        const x = this.margin;
        let y = this.margin;

        y = this.drawTopHeader(doc, x, y, data);
        y = this.drawTableHeader(doc, x, y, data);

        if (data.items && data.items.length > 0) {
            data.items.forEach((item, i) => {
                const rowH = this.calculateItemHeight(doc, item);

                if (y + rowH > doc.page.height - this.margin - 30) {
                    doc.addPage();
                    y = this.margin;
                    y = this.drawTopHeader(doc, x, y, data);
                    y = this.drawTableHeader(doc, x, y, data);
                }
                const result = this.drawItemRow(doc, x, y, item, i);
                y = result.curY;
            });
        }

        const instrumentsHeight = 18 * 2; 
        if (y + instrumentsHeight > doc.page.height - this.margin - 30) {
            doc.addPage();
            y = this.margin;
            y = this.drawTopHeader(doc, x, y, data); 
        }
        y = this.drawInstruments(doc, x, y, data);

        doc.font(this.fonts.bold).fontSize(9);
        const combinedRemarks = data.remarks && data.remarks.length > 0 ? data.remarks.map(r => r.text).join('\n') : '';
        const remarksHeight = Math.max(18, doc.heightOfString('REMARKS : ' + combinedRemarks, { width: this.usableWidth - 10 }) + 10);
        
        if (y + remarksHeight > doc.page.height - this.margin - 30) {
            doc.addPage();
            y = this.margin;
        }
        const remResult = this.drawRemarks(doc, x, y, data);
        y = remResult.curY;

        const footerH = 150;
        if (y + footerH > doc.page.height - this.margin - 20) {
            doc.addPage();
            y = this.margin;
        }
        y = this.drawFooter(doc, x, y);

        this._addFooters(doc, data);

        doc.end();
    }

    _addFooters(doc, data) {
        const titleText = data.inspection_type === "Tube Skeleton" ? "TUBE SKELETON INSPECTION REPORT" : "TUBE BUNDLE INSPECTION REPORT";
        const range = doc.bufferedPageRange();
        const oldBottom = doc.page.margins.bottom;
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            doc.page.margins.bottom = 0; 
            
            const outerX = 27;
            const outerY = 27;
            const outerW = doc.page.width - 54;
            const outerH = doc.page.height - 54;
            
            doc.lineWidth(0.5).strokeColor(this.colors.black);
            doc.rect(outerX, outerY, outerW, outerH).stroke();
            
            const borderBottom = outerY + outerH;
            
            const exhibitY = borderBottom - 10;
            doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.black)
                .text(`EXHIBIT 10_3 ${titleText}`, outerX + 5, exhibitY, { align: 'left', lineBreak: false });
                
            const noteY = borderBottom + 6;
            doc.font(this.fonts.bold).fontSize(8).fillColor('#555555')
                .text('*This is computer generated copy, hence no any signature required', outerX, noteY, { width: outerW, align: 'center', lineBreak: false });
                
            doc.page.margins.bottom = oldBottom;
        }
    }
}

module.exports = new TubeBundlePdfGenerator();
