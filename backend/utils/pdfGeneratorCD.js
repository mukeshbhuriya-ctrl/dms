const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * PDF Generator for Joint Types C & D
 * Matches client's "Nozzle Report" (ss4) exactly:
 * - Outer page border, Header with logo + "GENERAL INSPECTION REPORT" title
 * - Header metadata rows, Main numbered characteristics grid
 * - RED (#FF0000) bold labels, bullet points (•) for sub-items
 */
class PDFGeneratorCD {
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
        this._drawNozzleReport(doc, allStagesData, companyInfo);
        doc.end();
    }

    _drawNozzleReport(doc, allStagesData, companyInfo) {
        const startX = 25, startY = 25;
        const pageW = doc.page.width - 50;
        const pageH = doc.page.height - 50;

        // Outer page border
        doc.rect(startX, startY, pageW, pageH).strokeColor(this.colors.black).lineWidth(1.5).stroke();
        doc.lineWidth(0.5);

        let y = startY + 5;
        const innerW = pageW - 10;
        const x = startX + 5;

        const firstData = allStagesData.stage1 || Object.values(allStagesData)[0] || {};

        // ===== HEADER =====
        const headerH = 70;
        const logoW = 160;
        doc.rect(x, y, logoW, headerH).stroke();
        this.drawLogo(doc, x, y, logoW, headerH, companyInfo);

        const titleBoxW = innerW - logoW;
        doc.rect(x + logoW, y, titleBoxW, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(13).fillColor(this.colors.red)
            .text('GENERAL INSPECTION REPORT', x + logoW, y + 10, { width: titleBoxW, align: 'center' });
        doc.font(this.fonts.bold).fontSize(10).fillColor(this.colors.red)
            .text('(CHECK SHEET FOR', x + logoW, y + 28, { width: titleBoxW, align: 'center' });
        doc.text('NOZZLE SET-UP & WELDING INSPECTION)', x + logoW, y + 40, { width: titleBoxW, align: 'center' });
        y += headerH + 5;

        // ===== HEADER METADATA =====
        const metaRowH = 20;
        const pad = 4;
        const metaRows = [
            { l: 'Shreno Manufacturer sr. no.:', v: firstData.msn || '-' },
            { l: 'Equipment  Name & Tag Number:', v: `${firstData.equipment || ''} ${firstData.tagNo || ''}`.trim() || '-' },
            { l: 'Drawing no. :', v: firstData.drgNo || '-' }
        ];
        metaRows.forEach(r => {
            doc.rect(x, y, innerW, metaRowH).stroke();
            doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.red)
                .text(r.l, x + pad, y + 5, { width: innerW * 0.4 - pad * 2 });
            doc.font(this.fonts.regular).fontSize(9).fillColor(this.colors.black)
                .text(r.v, x + innerW * 0.4 + pad, y + 5, { width: innerW * 0.6 - pad * 2 });
            y += metaRowH;
        });

        // ===== MAIN TABLE =====
        const srW = innerW * 0.07;
        const charW = innerW * 0.20;
        const detW = innerW * 0.33;
        const valW = innerW * 0.20;
        const extW = innerW - srW - charW - detW - valW;
        const rowH = 16;

        // Table header
        y = this._gridRow(doc, x, y, [srW, charW, detW + valW + extW], rowH + 2, pad, [
            { t: 'Sr. No.', f: this.fonts.bold, c: this.colors.black },
            { t: 'Characteristics to be checked', f: this.fonts.bold, c: this.colors.black },
            { t: '', f: this.fonts.regular, c: this.colors.black }
        ]);

        // Nozzle Number row — dynamic from joint data
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW + extW], rowH, pad, [
            { t: '' },
            { t: 'Nozzle Number', f: this.fonts.bold, c: this.colors.red },
            { t: firstData.nozzleNumber || firstData.jointNo || '-', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);

        const s1 = allStagesData.stage1 || {};

        // ===== CHAR 1: Material identification =====
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW + extW], rowH, pad, [
            { t: '1', f: this.fonts.bold, c: this.colors.black },
            { t: 'Material identification Marks', f: this.fonts.bold, c: this.colors.red },
            { t: 'Available / Not Available', f: this.fonts.regular, c: this.colors.black },
            { t: s1.materialIdMarks || '' }
        ]);

        // ===== CHAR 2: Nozzle pipe to Flange Set-Up =====
        y = this._checkPage(doc, y, 120, startX, pageW, pageH);
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW + extW], rowH, pad, [
            { t: '2', f: this.fonts.bold, c: this.colors.black },
            { t: 'Nozzle pipe to\nFlange Set-Up', f: this.fonts.bold, c: this.colors.red },
            { t: '• Tack Welder', f: this.fonts.bold, c: this.colors.red },
            { t: s1.tackWelder || '' }
        ]);
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW + extW], rowH, pad, [
            { t: '' }, { t: '' },
            { t: '• Visual Inspection', f: this.fonts.bold, c: this.colors.red },
            { t: s1.visualInspection || 'OK / Not OK' }
        ]);
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW + extW], rowH, pad, [
            { t: '' }, { t: '' },
            { t: '• Acceptance of L-Seam RT', f: this.fonts.bold, c: this.colors.red },
            { t: s1.lSeamRt || 'OK / Not OK' }
        ]);
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW + extW], rowH + 6, pad, [
            { t: '' }, { t: '' },
            { t: '• Dimensions\n    - Nozzle Size\n    - Total Length', f: this.fonts.bold, c: this.colors.red },
            { t: `${s1.nozzleSize || ''}\n${s1.totalLength || ''}` }
        ]);

        // Signature for Char 2
        y = this._compactSig(doc, x, y, innerW, rowH, pad, s1);

        // ===== CHAR 3: Weld Visual / Overlay PT =====
        y = this._checkPage(doc, y, 100, startX, pageW, pageH);
        const s3_cd = allStagesData.stage3 || {};

        // In nozzle report, char 3 has QC sign + TPIA sign + Overlay PT
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW + extW], rowH, pad, [
            { t: '3', f: this.fonts.bold, c: this.colors.black },
            { t: '', f: this.fonts.bold, c: this.colors.red },
            { t: '• Overlay PT ( If applicable)', f: this.fonts.bold, c: this.colors.red },
            { t: s3_cd.overlayPt || '' }
        ]);
        y = this._compactSig(doc, x, y, innerW, rowH, pad, s3_cd);

        // ===== CHAR 4: Inspection Of Nozzle Opening =====
        y = this._checkPage(doc, y, 120, startX, pageW, pageH);
        const s4_cd = allStagesData.stage4 || {};
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW + extW], rowH, pad, [
            { t: '4', f: this.fonts.bold, c: this.colors.black },
            { t: 'Inspection\nOf\nNozzle Opening', f: this.fonts.bold, c: this.colors.red },
            { t: 'Opening size', f: this.fonts.bold, c: this.colors.red },
            { t: s4_cd.openingSize || '' }
        ]);
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW + extW], rowH, pad, [
            { t: '' }, { t: '' },
            { t: 'Orientation (°)', f: this.fonts.bold, c: this.colors.red },
            { t: s4_cd.orientation || '' }
        ]);
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW + extW], rowH, pad, [
            { t: '' }, { t: '' },
            { t: 'Elevation', f: this.fonts.bold, c: this.colors.red },
            { t: s4_cd.elevation || '' }
        ]);
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW + extW], rowH, pad, [
            { t: '' }, { t: '' },
            { t: 'Edge preparation', f: this.fonts.bold, c: this.colors.red },
            { t: s4_cd.edgePreparation || '' }
        ]);
        y = this._compactSig(doc, x, y, innerW, rowH, pad, s4_cd);

        // ===== CHAR 5: Nozzle Set-Up on Shell / Dish =====
        y = this._checkPage(doc, y, 180, startX, pageW, pageH);
        const s5_cd = allStagesData.stage5 || {};
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW + extW], rowH + 10, pad, [
            { t: '5', f: this.fonts.bold, c: this.colors.black },
            { t: 'Nozzle Set-Up\non Shell / Dish\n( RF pad setup\nas applicable)', f: this.fonts.bold, c: this.colors.red },
            { t: '• Tack Welder', f: this.fonts.bold, c: this.colors.red },
            { t: s5_cd.tackWelder || '' }
        ]);
        const s5SubRows = [
            ['• Cleaning of Nozzle & Weld Area', s5_cd.cleaning || 'OK / Not OK'],
            ['• Groove Angle', s5_cd.grooveAngle || ''],
            ['• Root face', s5_cd.rootFace || ''],
            ['• Root Gap', s5_cd.rootGap || ''],
            ['Projection from Reference line  to Flange face', s5_cd.projection || ''],
            ['PCD hole OFF center / ON center', s5_cd.pcdHole || 'OFF center / ON center']
        ];
        s5SubRows.forEach(([label, val]) => {
            y = this._gridRow(doc, x, y, [srW, charW, detW, valW + extW], rowH, pad, [
                { t: '' }, { t: '' },
                { t: label, f: this.fonts.bold, c: this.colors.red },
                { t: val, f: this.fonts.regular, c: this.colors.black }
            ]);
        });
        y = this._compactSig(doc, x, y, innerW, rowH, pad, s5_cd);

        // ===== CHAR 6: Inspection after full Welding =====
        y = this._checkPage(doc, y, 100, startX, pageW, pageH);
        const s6_cd = allStagesData.stage6 || {};
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW + extW], rowH, pad, [
            { t: '6', f: this.fonts.bold, c: this.colors.black },
            { t: 'Inspection after full\nWelding', f: this.fonts.bold, c: this.colors.red },
            { t: '• Visual Inspection', f: this.fonts.bold, c: this.colors.red },
            { t: s6_cd.visualInspection || 'OK / Not OK' }
        ]);
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW + extW], rowH, pad, [
            { t: '' }, { t: '' },
            { t: '• Welder No.', f: this.fonts.bold, c: this.colors.red },
            { t: s6_cd.welderNo || s6_cd.welderNumber || '' }
        ]);
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW + extW], rowH, pad, [
            { t: '' }, { t: '' },
            { t: '• Fillet size', f: this.fonts.bold, c: this.colors.red },
            { t: s6_cd.filletSize || '' }
        ]);
        y = this._compactSig(doc, x, y, innerW, rowH, pad, s6_cd);

        // ===== CHAR 7: R.F. Pad Pneumatic =====
        y = this._checkPage(doc, y, 80, startX, pageW, pageH);
        const s7_cd = allStagesData.stage7 || {};
        y = this._gridRow(doc, x, y, [srW, charW, detW, valW + extW], rowH, pad, [
            { t: '7', f: this.fonts.bold, c: this.colors.black },
            { t: 'R.F. Pad Pneumatic.\n(Applicable / Not Applicable)', f: this.fonts.bold, c: this.colors.red },
            { t: s7_cd.rfPadPneumatic || 'OK / Not OK', f: this.fonts.regular, c: this.colors.black },
            { t: '' }
        ]);
        y = this._compactSig(doc, x, y, innerW, rowH, pad, s7_cd);

        // Footer note
        y += 6;
        doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black)
            .text('EXHIBIT 10_3 GENERAL INSPECTION REPORT Rev.01', x, y);
    }

    // ==========================================
    // Helpers
    // ==========================================
    _gridRow(doc, x, y, widths, minH, pad, cells) {
        // Measure required height for each cell's text
        let maxTextH = 0;
        cells.forEach((c, i) => {
            if (c && c.t) {
                doc.font(c.f || this.fonts.regular).fontSize(c.fs || 8);
                const textH = doc.heightOfString(c.t, { width: widths[i] - pad * 2 });
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
                    .text(c.t, cx + pad, y + 3, { width: w - pad * 2 });
            }
            cx += w;
        });
        return y + h;
    }

    _compactSig(doc, x, y, width, rowH, pad, data) {
        const sigH = rowH - 2;
        const lW = width * 0.50;
        const vW = width * 0.35;
        const eW = width - lW - vW;

        // Dynamic data from extractStageData
        const prodName = data.productionEngineerName || '';
        const prodDate = data.submissionDate || '';
        const qcName = data.qcEngineerName || '';
        const qcDate = data.qcDate || '';
        const qcApproved = data.qcStatus === 'approved';

        // Production Engineer
        doc.rect(x, y, lW, sigH).stroke();
        doc.rect(x + lW, y, vW, sigH).stroke();
        doc.rect(x + lW + vW, y, eW, sigH).stroke();
        doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.red)
            .text('Engineer Production  Dated Signature', x + pad, y + 2, { width: lW - pad * 2 });
        doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black)
            .text(prodName && prodDate ? `${prodName} / ${prodDate}` : (prodName || prodDate || ''), x + lW + pad, y + 2, { width: vW - pad * 2 });
        y += sigH;

        // QC Engineer
        doc.rect(x, y, lW, sigH).stroke();
        doc.rect(x + lW, y, vW, sigH).stroke();
        doc.rect(x + lW + vW, y, eW, sigH).stroke();
        doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.red)
            .text('Engineer Shop QC Dated Signature', x + pad, y + 2, { width: lW - pad * 2 });
        const qcText = [qcName, qcDate, qcApproved ? 'Approve' : ''].filter(Boolean).join(' / ');
        doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black)
            .text(qcText || '', x + lW + pad, y + 2, { width: vW - pad * 2 });
        y += sigH;

        // TPIA
        doc.rect(x, y, lW, sigH).stroke();
        doc.rect(x + lW, y, vW, sigH).stroke();
        doc.rect(x + lW + vW, y, eW, sigH).stroke();
        doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.red)
            .text('CLIENT / AI /TPIA   Dated Signature', x + pad, y + 2, { width: lW - pad * 2 });
        doc.font(this.fonts.regular).fontSize(7).fillColor(this.colors.black)
            .text('', x + lW + pad, y + 2, { width: vW - pad * 2 });
        doc.text('Yes/No', x + lW + vW + pad, y + 2, { width: eW - pad * 2 });
        y += sigH;

        return y;
    }

    _checkPage(doc, y, needed, startX, pageW, pageH) {
        if (y + needed > startX + pageH - 10) {
            doc.addPage();
            doc.rect(startX, startX, pageW, pageH).strokeColor(this.colors.black).lineWidth(1.5).stroke();
            doc.lineWidth(0.5);
            return startX + 10;
        }
        return y;
    }
}

module.exports = new PDFGeneratorCD();
