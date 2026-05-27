const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * PDF Generator for Joint Type F — Simplified Nozzle Report
 * Same visual style as C/D: RED labels, outer border, header, bullet points
 */
class PDFGeneratorF {
    constructor() {
        this.colors = { red: '#FF0000', black: '#000000', darkBlue: '#000080', white: '#FFFFFF' };
        this.fonts = { regular: 'Helvetica', bold: 'Helvetica-Bold' };
    }

    drawLogo(doc, x, y, w, h, companyInfo) {
        const logoPath = path.join(__dirname, '..', 'assets', 'shreno-logo.png');
        
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, x + 5, y + 5, { fit: [w - 10, h - 10], align: 'center', valign: 'center' });
        } else if (companyInfo && companyInfo.name) {
            doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.darkBlue)
                .text(companyInfo.name, x, y + h / 2 - 6, { width: w, align: 'center' });
        }
    }

    generateReport(allStagesData, res, companyInfo) {
        const doc = new PDFDocument({ margin: 20, size: 'A4', bufferPages: true });
        doc.pipe(res);
        this._drawReport(doc, allStagesData, companyInfo);
        this._addFooters(doc);
        doc.end();
    }

    _drawReport(doc, allStagesData, companyInfo) {
        const startX = 25, startY = 25;
        const pageW = doc.page.width - 50;
        const pageH = doc.page.height - 50;
        doc.rect(startX, startY, pageW, pageH).strokeColor(this.colors.black).lineWidth(1.5).stroke();
        doc.lineWidth(0.5);

        let y = startY + 5;
        const innerW = pageW - 10;
        const x = startX + 5;
        const pad = 4;
        const rowH = 16;

        const firstData = allStagesData.stage1 || Object.values(allStagesData)[0] || {};

        // Header
        const headerH = 70, logoW = 160;
        doc.rect(x, y, logoW, headerH).stroke();
        this.drawLogo(doc, x, y, logoW, headerH, companyInfo);
        const titleBoxW = innerW - logoW;
        doc.rect(x + logoW, y, titleBoxW, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(13).fillColor(this.colors.red)
            .text('GENERAL INSPECTION REPORT', x + logoW, y + 10, { width: titleBoxW, align: 'center' });
        doc.fontSize(10)
            .text('(CHECK SHEET FOR', x + logoW, y + 28, { width: titleBoxW, align: 'center' });
        doc.text('NOZZLE SET-UP & WELDING INSPECTION)', x + logoW, y + 40, { width: titleBoxW, align: 'center' });
        y += headerH + 5;

        // Metadata
        const metaRowH = 20;
        [
            ['Shreno Manufacturer sr. no.:', firstData.msn || '-'],
            ['Equipment  Name & Tag Number:', `${firstData.equipment || ''} ${firstData.tagNo || ''}`.trim() || '-'],
            ['Drawing no. :', firstData.drgNo || '-']
        ].forEach(([l, v]) => {
            doc.rect(x, y, innerW, metaRowH).stroke();
            doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.red).text(l, x + pad, y + 5, { width: innerW * 0.4 });
            doc.font(this.fonts.regular).fillColor(this.colors.black).text(v, x + innerW * 0.4 + pad, y + 5, { width: innerW * 0.6 });
            y += metaRowH;
        });

        // Table
        const srW = innerW * 0.07, charW = innerW * 0.20, detW = innerW * 0.33, valW = innerW - srW - charW - detW;

        // Header row
        y = this._gridRow(doc, x, y, [srW, charW, detW + valW], rowH + 2, pad, [
            { t: 'Sr. No.', f: this.fonts.bold, c: this.colors.black },
            { t: 'Characteristics to be checked', f: this.fonts.bold, c: this.colors.black },
            { t: '' }
        ]);

        // Joint Number
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW], rowH, pad, [
            { t: '' }, { t: 'Joint Number', f: this.fonts.bold, c: this.colors.red },
            { t: firstData.jointNo || '-' }, { t: '' }
        ]);

        const s1 = allStagesData.stage1 || {};

        // Char 1: Material ID
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW], rowH, pad, [
            { t: '1', f: this.fonts.bold, c: this.colors.black },
            { t: 'Material identification Marks', f: this.fonts.bold, c: this.colors.red },
            { t: s1.materialIdMarks || '-' }, { t: '' }
        ]);
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW], rowH, pad, [
            { t: '' }, { t: '' }, { t: '• Tack Welder', f: this.fonts.bold, c: this.colors.red },
            { t: s1.tackWelder || '' }
        ]);
        y = this._compactSig(doc, x, y, innerW, rowH, pad, s1);

        // Char 2: Weld Visual
        const s2 = allStagesData.stage2 || {};
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW], rowH, pad, [
            { t: '2', f: this.fonts.bold, c: this.colors.black },
            { t: 'Weld Visual', f: this.fonts.bold, c: this.colors.red },
            { t: '• Welder Number', f: this.fonts.bold, c: this.colors.red },
            { t: s2.welderNumber || s2.welderNo || '' }
        ]);
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW], rowH, pad, [
            { t: '' }, { t: '' }, { t: '• Welding Process', f: this.fonts.bold, c: this.colors.red },
            { t: s2.weldingProcess || '' }
        ]);
        y = this._compactSig(doc, x, y, innerW, rowH, pad, s2);

        
        // ===== PWHT =====
        y = this._gridRow(doc, x, y, [innerW], rowH + 6, pad, [
            { t: 'PWHT', f: this.fonts.bold, c: this.colors.red, align: 'center' }
        ]);

        y = this._gridRow(doc, x, y, [innerW], rowH + 6, pad, [
            { t: 'Radiography Testing Requirement (After PWHT)', f: this.fonts.bold, c: this.colors.red, align: 'center' }
        ]);
        const s3_pwht = allStagesData.stage3 || null;
        if (s3_pwht) {
            y = this._sigBlockRed(doc, x, y, innerW, rowH, pad, s3_pwht, 'NDT Engineer');
        }

        y = this._gridRow(doc, x, y, [innerW], rowH + 6, pad, [
            { t: 'Liquid Penetrant Testing – After PWHT', f: this.fonts.bold, c: this.colors.red, align: 'center' }
        ]);
        const s4_pwht = allStagesData.stage4 || null;
        if (s4_pwht) {
            y = this._sigBlockRed(doc, x, y, innerW, rowH, pad, s4_pwht, 'NDT Engineer');
        }


        
    }

    _gridRow(doc, x, y, widths, minH, pad, cells) {
        let maxTextH = 0;
        cells.forEach((c, i) => {
            if (c && c.t) {
                doc.font(c.f || this.fonts.regular).fontSize(c.fs || 8);
                const textH = doc.heightOfString(c.t, { width: widths[i] - pad * 2, align: c.align || 'left' });
                if (textH > maxTextH) maxTextH = textH;
            }
        });
        const h = Math.max(minH, maxTextH + 6);

        let cx = x;
        widths.forEach((w, i) => {
            doc.rect(cx, y, w, h).stroke();
            const c = cells[i] || {};
            if (c.t) {
                doc.font(c.f || this.fonts.regular).fontSize(c.fs || 8).fillColor(c.c || this.colors.black)
                    .text(c.t, cx + pad, y + 3, { width: w - pad * 2, align: c.align || 'left' });
            }
            cx += w;
        });
        return y + h;
    }

    
    _sigBlockRed(doc, x, y, width, rowH, pad, data, qcTitle) {
        const col1W = width * 0.35;
        const col2W = width * 0.15;
        const col3W = width * 0.30;
        const extW = width - col1W - col2W - col3W;
        
        y = this._gridRow(doc, x, y, [col1W, col2W, col3W, extW], rowH, pad, [
            { t: 'Production Engineer', f: this.fonts.bold, c: this.colors.red },
            { t: 'Name', f: this.fonts.bold, c: this.colors.red },
            { t: data.productionEngineerName || data.prodName || '', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);
        y = this._gridRow(doc, x, y, [col1W, col2W, col3W, extW], rowH, pad, [
            { t: '', f: this.fonts.bold, c: this.colors.red },
            { t: 'Date', f: this.fonts.bold, c: this.colors.red },
            { t: data.submissionDate || data.prodDate || '', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);
        y = this._gridRow(doc, x, y, [col1W, col2W, col3W, extW], rowH, pad, [
            { t: qcTitle, f: this.fonts.bold, c: this.colors.red },
            { t: 'Name', f: this.fonts.bold, c: this.colors.red },
            { t: data.qcEngineerName || data.qcName || '', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);
        y = this._gridRow(doc, x, y, [col1W, col2W, col3W, extW], rowH, pad, [
            { t: '', f: this.fonts.bold, c: this.colors.red },
            { t: 'Date', f: this.fonts.bold, c: this.colors.red },
            { t: data.qcDate || '', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);
        y = this._gridRow(doc, x, y, [col1W, col2W, col3W, extW], rowH, pad, [
            { t: '', f: this.fonts.bold, c: this.colors.red },
            { t: 'Sign', f: this.fonts.bold, c: this.colors.red },
            { t: (data.qcStatus === 'approved' || data.status === 'approved') ? 'Approve' : '', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);
        y = this._gridRow(doc, x, y, [col1W, col2W, col3W, extW], rowH, pad, [
            { t: 'AI / CLIENT / TPIA', f: this.fonts.bold, c: this.colors.red },
            { t: 'Name', f: this.fonts.bold, c: this.colors.red },
            { t: '', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);
        y = this._gridRow(doc, x, y, [col1W, col2W, col3W, extW], rowH, pad, [
            { t: '', f: this.fonts.bold, c: this.colors.red },
            { t: 'Date', f: this.fonts.bold, c: this.colors.red },
            { t: '', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);
        y = this._gridRow(doc, x, y, [col1W, col2W, col3W, extW], rowH, pad, [
            { t: '', f: this.fonts.bold, c: this.colors.red },
            { t: 'Sign', f: this.fonts.bold, c: this.colors.red },
            { t: '', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);
        return y;
    }

_compactSig(doc, x, y, width, rowH, pad, data) {
        const sigH = rowH - 2;
        const lW = width * 0.50, vW = width * 0.35, eW = width - lW - vW;

        // Dynamic data from extractStageData
        const prodName = data.productionEngineerName || '';
        const prodDate = data.submissionDate || '';
        const qcName = data.qcEngineerName || '';
        const qcDate = data.qcDate || '';
        const qcApproved = data.qcStatus === 'approved';

        doc.rect(x, y, lW, sigH).stroke();
        doc.rect(x + lW, y, vW, sigH).stroke();
        doc.rect(x + lW + vW, y, eW, sigH).stroke();
        doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.red)
            .text('Engineer Production  Dated Signature', x + pad, y + 2, { width: lW - pad * 2 });
        doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black)
            .text(prodName && prodDate ? `${prodName} / ${prodDate}` : (prodName || prodDate || ''), x + lW + pad, y + 2, { width: vW - pad * 2 });
        y += sigH;

        doc.rect(x, y, lW, sigH).stroke();
        doc.rect(x + lW, y, vW, sigH).stroke();
        doc.rect(x + lW + vW, y, eW, sigH).stroke();
        doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.red)
            .text('Engineer Shop QC Dated Signature', x + pad, y + 2, { width: lW - pad * 2 });
        const qcText = [qcName, qcDate, qcApproved ? 'Approve' : ''].filter(Boolean).join(' / ');
        doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black)
            .text(qcText || '', x + lW + pad, y + 2, { width: vW - pad * 2 });
        y += sigH;

        doc.rect(x, y, lW, sigH).stroke();
        doc.rect(x + lW, y, vW, sigH).stroke();
        doc.rect(x + lW + vW, y, eW, sigH).stroke();
        doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.red)
            .text('CLIENT / AI /TPIA   Dated Signature', x + pad, y + 2, { width: lW - pad * 2 });
        doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black)
            .text('', x + lW + pad, y + 2);
        doc.text('Yes/No', x + lW + vW + pad, y + 2, { width: eW - pad * 2 });
        y += sigH;

        return y;
    }

    _addFooters(doc) {
        const range = doc.bufferedPageRange();
        const oldBottom = doc.page.margins.bottom;
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            doc.page.margins.bottom = 0; // Prevent auto page break
            
            // Border ends at doc.page.height - 25 = 817 (assuming startY=25 and pageH=doc.page.height-50)
            const borderBottom = doc.page.height - 25;
            
            // Exhibit No INSIDE the border, bottom left side
            const exhibitY = borderBottom - 10; // 807
            doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.black)
                .text('EXHIBIT 10_3 GENERAL INSPECTION REPORT Rev.01', 30, exhibitY, { align: 'left', lineBreak: false });
                
            // Note OUTSIDE the border, centered in footer
            const noteY = borderBottom + 6; // 823
            doc.font(this.fonts.bold).fontSize(8).fillColor('#555555')
                .text('This is computer generated copy, hence no any signature required', 25, noteY, { width: doc.page.width - 50, align: 'center', lineBreak: false });
                
            doc.page.margins.bottom = oldBottom;
        }
    }
}

module.exports = new PDFGeneratorF();
