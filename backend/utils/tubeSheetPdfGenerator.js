const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class TubeSheetPdfGenerator {
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
        const titleText = 'TUBE SHEET INSPECTION REPORT';
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
        let lx = x;
        lx += c1; doc.moveTo(lx, curY).lineTo(lx, curY + rowH).stroke();
        lx += c2; doc.moveTo(lx, curY).lineTo(lx, curY + rowH).stroke();
        lx += c3; doc.moveTo(lx, curY).lineTo(lx, curY + rowH).stroke();
        lx += c4; doc.moveTo(lx, curY).lineTo(lx, curY + rowH).stroke();
        curY += rowH;

        return curY;
    }

    drawTableHeader(doc, x, y, data) {
        let curY = y;
        const rowH1 = 15;
        const rowH2 = 15;
        const totalH = rowH1 + rowH2;

        const c1 = 30, c2 = 180, c3 = 80, c4 = 140; 
        const c5 = this.usableWidth - c1 - c2 - c3 - c4;

        doc.rect(x, curY, this.usableWidth, totalH).stroke();
        
        // Vertical lines
        doc.moveTo(x + c1, curY).lineTo(x + c1, curY + totalH).stroke();
        doc.moveTo(x + c1 + c2, curY).lineTo(x + c1 + c2, curY + totalH).stroke();
        doc.moveTo(x + c1 + c2 + c3, curY).lineTo(x + c1 + c2 + c3, curY + totalH).stroke();
        doc.moveTo(x + c1 + c2 + c3 + c4, curY).lineTo(x + c1 + c2 + c3 + c4, curY + totalH).stroke();

        // Horizontal line for Actual Dimension subheader
        doc.moveTo(x + c1 + c2 + c3, curY + rowH1).lineTo(x + c1 + c2 + c3 + c4, curY + rowH1).stroke();
        // Vertical line for sub columns
        doc.moveTo(x + c1 + c2 + c3 + (c4 / 2), curY + rowH1).lineTo(x + c1 + c2 + c3 + (c4 / 2), curY + totalH).stroke();

        doc.font(this.fonts.bold).fontSize(8).fillColor(this.colors.black);
        
        doc.text('SR.', x, curY + 4, { width: c1, align: 'center' });
        doc.text('NO.', x, curY + 4 + rowH1, { width: c1, align: 'center' });
        
        doc.text('DESCRIPTION', x + c1, curY + 12, { width: c2, align: 'center' });
        doc.text('DRG. DIM', x + c1 + c2, curY + 12, { width: c3, align: 'center' });
        
        doc.text('Actual Dimension', x + c1 + c2 + c3, curY + 4, { width: c4, align: 'center' });
        doc.text('REMARK', x + c1 + c2 + c3 + c4, curY + 12, { width: c5, align: 'center' });

        doc.fillColor(this.colors.red);
        doc.text(String(data.actual_dimension_1_header || 'text'), x + c1 + c2 + c3, curY + rowH1 + 4, { width: c4 / 2, align: 'center' });
        doc.text(String(data.actual_dimension_2_header || 'text'), x + c1 + c2 + c3 + (c4 / 2), curY + rowH1 + 4, { width: c4 / 2, align: 'center' });
        doc.fillColor(this.colors.black);

        curY += totalH;
        return curY;
    }

    drawItemRow(doc, x, y, item, i) {
        const c1 = 30, c2 = 180, c3 = 80, c4 = 140; 
        const c5 = this.usableWidth - c1 - c2 - c3 - c4;
        
        doc.font(this.fonts.regular).fontSize(8);
        
        const srNoText = String(item.sr_no || (i + 1));
        const descText = String(item.description || '');
        const drgDimText = String(item.drg_dim || '');
        const actual1Text = String(item.actual_dimension_1 || '');
        const actual2Text = String(item.actual_dimension_2 || '');
        const remarkText = String(item.remarks || '');

        const srNoHeight = doc.heightOfString(srNoText, { width: c1 - 4 });
        const descHeight = doc.heightOfString(descText, { width: c2 - 8 });
        const drgDimHeight = doc.heightOfString(drgDimText, { width: c3 - 4 });
        const actual1Height = doc.heightOfString(actual1Text, { width: (c4 / 2) - 4 });
        const actual2Height = doc.heightOfString(actual2Text, { width: (c4 / 2) - 4 });
        const remHeight = doc.heightOfString(remarkText, { width: c5 - 8 });

        const maxTextHeight = Math.max(srNoHeight, descHeight, drgDimHeight, actual1Height, actual2Height, remHeight);
        const rowH = Math.max(18, maxTextHeight + 10); // Minimum 18px height

        // Clean white Background (removed yellow)
        doc.rect(x, y, this.usableWidth, rowH).strokeColor(this.colors.black).stroke();

        // Vertical lines
        doc.moveTo(x + c1, y).lineTo(x + c1, y + rowH).stroke();
        doc.moveTo(x + c1 + c2, y).lineTo(x + c1 + c2, y + rowH).stroke();
        doc.moveTo(x + c1 + c2 + c3, y).lineTo(x + c1 + c2 + c3, y + rowH).stroke();
        doc.moveTo(x + c1 + c2 + c3 + (c4 / 2), y).lineTo(x + c1 + c2 + c3 + (c4 / 2), y + rowH).stroke();
        doc.moveTo(x + c1 + c2 + c3 + c4, y).lineTo(x + c1 + c2 + c3 + c4, y + rowH).stroke();

        doc.fillColor(this.colors.black);
        doc.text(srNoText, x, y + (rowH - srNoHeight) / 2, { width: c1, align: 'center' });
        
        doc.text(descText, x + c1 + 4, y + (rowH - descHeight) / 2, { width: c2 - 8, align: 'left' });
        doc.text(drgDimText, x + c1 + c2, y + (rowH - drgDimHeight) / 2, { width: c3, align: 'center' });
        
        doc.fillColor(this.colors.red);
        doc.text(actual1Text, x + c1 + c2 + c3, y + (rowH - actual1Height) / 2, { width: c4 / 2, align: 'center' });
        doc.text(actual2Text, x + c1 + c2 + c3 + (c4 / 2), y + (rowH - actual2Height) / 2, { width: c4 / 2, align: 'center' });
        
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
        
        // Render rows
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

            // Check page break during instrument rendering
            if (curY + rowH > doc.page.height - this.margin - 50) {
                doc.addPage();
                curY = this.margin;
                // Re-draw headers for instruments
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
            combinedRemarks = data.remarks.map(r => r.text).join(' ');
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
        const sigH = 130; // Increased height for signatures
        
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
        
        // Split at midX
        doc.moveTo(midX, curY).lineTo(midX, curY + formatH).stroke();
        
        // Add text to the left cell
        doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.black);
        const fH = doc.heightOfString('Format - F-QA-12');
        doc.text('Format - F-QA-12', x + 50, curY + (formatH - fH) / 2);

        // Split the right half into 3 equal cells
        const rightHalfWidth = this.usableWidth / 2;
        const cellWidth = rightHalfWidth / 3;
        
        // Draw vertical lines for the 3 cells
        doc.moveTo(midX + cellWidth, curY).lineTo(midX + cellWidth, curY + formatH).stroke();
        doc.moveTo(midX + (cellWidth * 2), curY).lineTo(midX + (cellWidth * 2), curY + formatH).stroke();

        return curY + formatH;
    }

    // Helper for pre-calculating item row height
    calculateItemHeight(doc, item) {
        const c1 = 30, c2 = 180, c3 = 80, c4 = 140; 
        const c5 = this.usableWidth - c1 - c2 - c3 - c4;
        
        doc.font(this.fonts.regular).fontSize(8);
        const srNoHeight = doc.heightOfString(String(item.sr_no || '1'), { width: c1 - 4 });
        const descHeight = doc.heightOfString(String(item.description || ''), { width: c2 - 8 });
        const drgDimHeight = doc.heightOfString(String(item.drg_dim || ''), { width: c3 - 4 });
        const actual1Height = doc.heightOfString(String(item.actual_dimension_1 || ''), { width: (c4 / 2) - 4 });
        const actual2Height = doc.heightOfString(String(item.actual_dimension_2 || ''), { width: (c4 / 2) - 4 });
        const remHeight = doc.heightOfString(String(item.remarks || ''), { width: c5 - 8 });

        const maxTextHeight = Math.max(srNoHeight, descHeight, drgDimHeight, actual1Height, actual2Height, remHeight);
        return Math.max(18, maxTextHeight + 10);
    }

    generatePDF(data, res, companyInfo) {
        const doc = new PDFDocument({ margin: this.margin, size: 'A4', bufferPages: true });
        doc.pipe(res);

        const x = this.margin;
        let y = this.margin;

        // 1. Draw Top Header
        y = this.drawTopHeader(doc, x, y, data);
        
        // 2. Draw Table Header
        y = this.drawTableHeader(doc, x, y, data);

        // 3. Draw Items (with strict bounds checking)
        if (data.items && data.items.length > 0) {
            data.items.forEach((item, i) => {
                const rowH = this.calculateItemHeight(doc, item);

                if (y + rowH > doc.page.height - this.margin - 30) { // Safety buffer
                    doc.addPage();
                    y = this.margin;
                    y = this.drawTopHeader(doc, x, y, data);
                    y = this.drawTableHeader(doc, x, y, data);
                }
                const result = this.drawItemRow(doc, x, y, item, i);
                y = result.curY;
            });
        }

        // 4. Instrument Details (Checks bounds inside loop)
        const instrumentsHeight = 18 * 2; // initial header space needed
        if (y + instrumentsHeight > doc.page.height - this.margin - 30) {
            doc.addPage();
            y = this.margin;
            y = this.drawTopHeader(doc, x, y, data); // Typically headers aren't redrawn if we ended the items table, but it's safer. Actually let's not redraw main header for just footer content, just start drawing.
        }
        y = this.drawInstruments(doc, x, y, data);

        // 5. Remarks
        // Calculate remarks height first
        doc.font(this.fonts.bold).fontSize(9);
        const combinedRemarks = data.remarks && data.remarks.length > 0 ? data.remarks.map(r => r.text).join(' ') : '';
        const remarksHeight = Math.max(18, doc.heightOfString('REMARKS : ' + combinedRemarks, { width: this.usableWidth - 10 }) + 10);
        
        if (y + remarksHeight > doc.page.height - this.margin - 30) {
            doc.addPage();
            y = this.margin;
        }
        const remResult = this.drawRemarks(doc, x, y, data);
        y = remResult.curY;

        // 6. Footer Signatures
        const footerH = 150;
        if (y + footerH > doc.page.height - this.margin - 20) {
            doc.addPage();
            y = this.margin;
        }
        y = this.drawFooter(doc, x, y);

        this._addFooters(doc);

        doc.end();
    }

    _addFooters(doc) {
        const range = doc.bufferedPageRange();
        const oldBottom = doc.page.margins.bottom;
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            doc.page.margins.bottom = 0; // Prevent auto page break
            
            // Draw thin outer page border wrapping the tables with 3px padding
            const outerX = 27;
            const outerY = 27;
            const outerW = doc.page.width - 54;
            const outerH = doc.page.height - 54;
            
            doc.lineWidth(0.5).strokeColor(this.colors.black);
            doc.rect(outerX, outerY, outerW, outerH).stroke();
            
            const borderBottom = outerY + outerH;
            
            // Exhibit No INSIDE the border, bottom left side
            const exhibitY = borderBottom - 10;
            doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.black)
                .text('EXHIBIT 10_3 TUBE SHEET INSPECTION REPORT', outerX + 5, exhibitY, { align: 'left', lineBreak: false });
                
            // Note OUTSIDE the border, centered in footer
            const noteY = borderBottom + 6;
            doc.font(this.fonts.bold).fontSize(8).fillColor('#555555')
                .text('*This is computer generated copy, hence no any signature required', outerX, noteY, { width: outerW, align: 'center', lineBreak: false });
                
            doc.page.margins.bottom = oldBottom;
        }
    }
}

module.exports = new TubeSheetPdfGenerator();
