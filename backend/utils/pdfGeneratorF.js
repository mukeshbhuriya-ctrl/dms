const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGeneratorF {
    constructor() {
        this.colors = {
            red: '#FF0000',
            black: '#000000',
            darkBlue: '#000080',
            white: '#FFFFFF'
        };
        this.fonts = {
            regular: 'Helvetica',
            bold: 'Helvetica-Bold'
        };
    }

    // ==========================================
    // SHARED LAYOUT METHODS (Match A/B/C/D)
    // ==========================================

    drawLogo(doc, x, y, width, height) {
        const paths = [
            path.join(__dirname, '../../frontend/public/lego_logo.png'),
            path.join(process.cwd(), 'frontend', 'public', 'lego_logo.png'),
            path.join(__dirname, '../public/lego_logo.png')
        ];

        for (const p of paths) {
            if (fs.existsSync(p)) {
                const imgW = 80;
                const imgH = 40;
                const ix = x + (width - imgW) / 2;
                const iy = y + (height - imgH) / 2;
                doc.image(p, ix, iy, { width: imgW, height: imgH });
                break;
            }
        }
    }

    drawHeader(doc, x, y, width, data, titleText) {
        const headerH = 70;
        doc.lineWidth(0.5).strokeColor(this.colors.black);

        // Logo Box (Left)
        const logoW = 160;
        doc.rect(x, y, logoW, headerH).stroke();
        this.drawLogo(doc, x, y, logoW, headerH);

        // Title Box (Right)
        const titleBoxW = width - logoW;
        const titleRowH = 45;
        const reportRowH = 25;

        doc.rect(x + logoW, y, titleBoxW, titleRowH).stroke();
        doc.rect(x + logoW, y + titleRowH, titleBoxW, reportRowH).stroke();

        // Title Text
        doc.font(this.fonts.bold).fontSize(14).fillColor(this.colors.red)
            .text(titleText, x + logoW, y + 18, { width: titleBoxW, align: 'center' });

        // Report No
        const reportY = y + titleRowH + 8;
        doc.fontSize(10);

        const labelText = "Report No : ";
        const labelW = doc.widthOfString(labelText);
        const valText = data.reportNo || '-';
        const fullTextW = labelW + doc.widthOfString(valText);
        const startTextX = x + logoW + (titleBoxW - fullTextW) / 2;

        doc.fillColor(this.colors.red).font(this.fonts.bold).text(labelText, startTextX, reportY, { continued: true });
        doc.fillColor(this.colors.black).font(this.fonts.regular).text(valText);

        return y + headerH + 5;
    }

    drawInfoGrid(doc, x, y, width, data) {
        const rowH = 22;
        const col1W = width * 0.15;
        const col2W = width * 0.35;
        const col3W = width * 0.15;
        const col4W = width * 0.35;

        const rows = [
            { l1: 'MSN:', v1: data.msn, l2: 'TAG NO.:', v2: data.tagNo },
            { l1: 'CLIENT:', v1: data.client, l2: 'EQUIPMENT:', v2: data.equipment },
            { l1: 'Projects ID', v1: data.projectsId, l2: 'Linde DRG No:', v2: data.lindeDrgNo },
            { l1: 'P.O. NO.:', v1: data.poNo, l2: 'DRG. NO.:', v2: data.drgNo },
            { l1: 'CODE:', v1: data.code, l2: 'INSP. AGENCY:', v2: data.inspAgency },
        ];

        let curY = y;
        doc.fontSize(9);

        rows.forEach(row => {
            doc.rect(x, curY, col1W, rowH).stroke();
            doc.rect(x + col1W, curY, col2W, rowH).stroke();
            doc.rect(x + col1W + col2W, curY, col3W, rowH).stroke();
            doc.rect(x + col1W + col2W + col3W, curY, col4W, rowH).stroke();

            const textY = curY + 7;
            const pad = 4;

            doc.font(this.fonts.bold).fillColor(this.colors.red);
            doc.text(row.l1, x + pad, textY, { width: col1W - pad * 2 });
            doc.text(row.l2, x + col1W + col2W + pad, textY, { width: col3W - pad * 2 });

            doc.font(this.fonts.regular).fillColor(this.colors.black);
            doc.text(row.v1, x + col1W + pad, textY, { width: col2W - pad * 2 });
            doc.text(row.v2, x + col1W + col2W + col3W + pad, textY, { width: col4W - pad * 2 });

            curY += rowH;
        });

        return curY + 5;
    }

    drawFooter(doc, x, y, width, data, title) {
        const headerH = 20;
        doc.rect(x, y, width, headerH).stroke();
        doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.red)
            .text(title, x, y + 5, { width: width, align: 'center' });

        let curY = y + headerH;
        const rowH = 20;
        const colW = width / 3;

        doc.rect(x, curY, width, rowH * 4).stroke();
        doc.moveTo(x + colW, curY).lineTo(x + colW, curY + rowH * 4).stroke();
        doc.moveTo(x + 2 * colW, curY).lineTo(x + 2 * colW, curY + rowH * 4).stroke();
        for (let i = 1; i < 4; i++) {
            doc.moveTo(x, curY + i * rowH).lineTo(x + width, curY + i * rowH).stroke();
        }

        const isNdtStage = ['stage3', 'stage4'].includes(data.stageKey || ''); // Adjusted for F stages
        const secondTitle = isNdtStage ? 'NDT Engineer' : 'QC Engineer';

        const titles = ['Production Engineer', secondTitle, 'AI / CLIENT / TPIA'];
        const names = [data.productionEngineerName, data.qcEngineerName, data.aiName];
        const dates = [data.submissionDate, data.qcDate, data.aiDate];
        const qcSign = (data.qcStatus === 'approved' || data.qcStatus === 'submitted') ? 'Approve' : '';
        const signs = ['', qcSign, data.aiSign];

        const pad = 4;
        const tY = 6;
        doc.fontSize(9);

        doc.font(this.fonts.bold).fillColor(this.colors.red);
        doc.text(titles[0], x + pad, curY + tY, { width: colW - pad * 2, align: 'left' });
        doc.text(titles[1], x + colW + pad, curY + tY, { width: colW - pad * 2, align: 'left' });
        doc.text(titles[2], x + 2 * colW + pad, curY + tY, { width: colW - pad * 2, align: 'left' });

        doc.font(this.fonts.bold).fillColor(this.colors.black);
        doc.text(names[0] || '', x + pad, curY + rowH + tY);
        doc.text(names[1] || '', x + colW + pad, curY + rowH + tY);
        doc.text(names[2] || '', x + 2 * colW + pad, curY + rowH + tY);

        doc.text(dates[0] || '', x + pad, curY + 2 * rowH + tY);
        doc.text(dates[1] || '', x + colW + pad, curY + 2 * rowH + tY);
        doc.text(dates[2] || '', x + 2 * colW + pad, curY + 2 * rowH + tY);

        doc.text(signs[1] || '', x + colW + pad, curY + 3 * rowH + tY);
        doc.text(signs[2] || '', x + 2 * colW + pad, curY + 3 * rowH + tY);
    }

    drawSubStage(doc, data, drawContentFn) {
        const startX = 25;
        const startY = 25;
        const pageW = doc.page.width - 50;
        const pageH = doc.page.height - 50;

        doc.rect(startX, startY, pageW, pageH).strokeColor(this.colors.black).lineWidth(1.5).stroke();

        const innerW = pageW - 10;
        const innerX = startX + 5;
        let currentY = startY + 5;

        const title = data.title || 'WELDING JOINT REPORT';
        currentY = this.drawHeader(doc, innerX, currentY, innerW, data, title);
        currentY = this.drawInfoGrid(doc, innerX, currentY, innerW, data);

        const footerH = 130;
        const footerStartY = (startY + pageH) - footerH - 5;

        if (drawContentFn) {
            drawContentFn(doc, innerX, currentY, innerW, data, footerStartY);
        }

        const footerTitle = ['stage1'].includes(data.stageKey) ? 'Material Identification by' :
            ['stage2'].includes(data.stageKey) ? 'Visual Inspection by' :
                'Set Up Inspection by';
        this.drawFooter(doc, innerX, footerStartY, innerW, data, footerTitle);
    }

    // ==========================================
    // SPECIFIC STAGE IMPLEMENTATIONS for F
    // ==========================================

    drawStage1(doc, data) {
        data.title = 'MATERIAL IDENTIFICATION REPORT';
        this.drawSubStage(doc, data, (doc, x, y, width, data, bottomY) => {
            let curY = y + 20;
            const rowH = 30;
            const colW = width / 2;

            doc.rect(x, curY, width, rowH).stroke();
            doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.red);
            doc.text('Material Identification Marks:', x + 5, curY + 10);
            doc.text('Tack Welder Name:', x + colW + 5, curY + 10);
            doc.moveTo(x + colW, curY).lineTo(x + colW, curY + rowH * 2).stroke();
            curY += rowH;

            doc.rect(x, curY, width, rowH).stroke();
            doc.font(this.fonts.regular).fillColor(this.colors.black);
            doc.text(data.materialIdMarks || '-', x + 5, curY + 10);
            doc.text(data.tackWelder || '-', x + colW + 5, curY + 10);
        });
    }

    drawStage2(doc, data) {
        data.title = 'WELD VISUAL REPORT';
        this.drawSubStage(doc, data, (doc, x, y, width, data, bottomY) => {
            let curY = y + 20;
            const rowH = 30;
            const colW = width / 2;

            doc.rect(x, curY, width, rowH).stroke();
            doc.font(this.fonts.bold).fontSize(9).fillColor(this.colors.red);
            doc.text('Welder Number:', x + 5, curY + 10);
            doc.text('Welding Process:', x + colW + 5, curY + 10);
            doc.moveTo(x + colW, curY).lineTo(x + colW, curY + rowH * 2).stroke();
            curY += rowH;

            doc.rect(x, curY, width, rowH).stroke();
            doc.font(this.fonts.regular).fillColor(this.colors.black);
            doc.text(data.welderNumber || '-', x + 5, curY + 10);
            doc.text(data.weldingProcess || '-', x + colW + 5, curY + 10);
        });
    }

    drawStage3(doc, data) {
        data.title = 'PWHT & RADIOGRAPHY REPORT';
        this.drawSubStage(doc, data, (doc, x, y, width, data, bottomY) => {
            let curY = y + 20;
            const headerH = 25;
            const rowH = 30;
            const colW = width / 3;

            // PWHT
            doc.rect(x, curY, width, headerH).stroke();
            doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.red)
                .text('PWHT (Required / Not required)', x, curY + 8, { width: width, align: 'center' });
            curY += headerH;

            doc.rect(x, curY, colW, rowH).stroke();
            doc.rect(x + colW, curY, colW, rowH).stroke();
            doc.rect(x + 2 * colW, curY, colW, rowH).stroke();
            let tY = curY + 10;

            doc.font(this.fonts.bold).fillColor(this.colors.red).fontSize(10).text('PWHT', x + 5, tY);
            doc.text('YES / No', x + colW + 5, tY);
            doc.font(this.fonts.bold).fillColor(this.colors.black)
                .text((data.pwht) ? 'YES' : 'NO', x + 2 * colW + 5, tY);

            // RT - Only in Stage 3 for F
            curY += rowH + 15;
            doc.rect(x, curY, width, headerH).stroke();
            doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.red)
                .text('Radiography Testing Requirement (After PWHT)', x, curY + 8, { width: width, align: 'center' });
            curY += headerH;

            doc.rect(x, curY, colW, rowH).stroke();
            doc.rect(x + colW, curY, colW, rowH).stroke();
            doc.rect(x + 2 * colW, curY, colW, rowH).stroke();
            tY = curY + 10;

            doc.font(this.fonts.bold).fillColor(this.colors.red).fontSize(10).text('Radiography Testing', x + 5, tY);
            doc.text('YES / No', x + colW + 5, tY);
            doc.font(this.fonts.bold).fillColor(this.colors.black)
                .text((data.pwht) ? 'YES' : 'NO', x + 2 * colW + 5, tY); // Using PWHT status as proxy, similar to C/D
        });
    }

    drawStage4(doc, data) {
        data.title = 'PWHT & LIQUID PENETRANT REPORT';
        this.drawSubStage(doc, data, (doc, x, y, width, data, bottomY) => {
            let curY = y + 20;
            const headerH = 25;
            const rowH = 30;
            const colW = width / 3;

            // PWHT
            doc.rect(x, curY, width, headerH).stroke();
            doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.red)
                .text('PWHT (Required / Not required)', x, curY + 8, { width: width, align: 'center' });
            curY += headerH;

            doc.rect(x, curY, colW, rowH).stroke();
            doc.rect(x + colW, curY, colW, rowH).stroke();
            doc.rect(x + 2 * colW, curY, colW, rowH).stroke();
            let tY = curY + 10;

            doc.font(this.fonts.bold).fillColor(this.colors.red).fontSize(10).text('PWHT', x + 5, tY);
            doc.text('YES / No', x + colW + 5, tY);
            doc.font(this.fonts.bold).fillColor(this.colors.black)
                .text((data.pwht) ? 'YES' : 'NO', x + 2 * colW + 5, tY);

            // PT - Only in Stage 4 for F
            curY += rowH + 15;
            doc.rect(x, curY, width, headerH).stroke();
            doc.font(this.fonts.bold).fontSize(11).fillColor(this.colors.red)
                .text('Liquid Penetrant Testing (Required / Not required) - After PWHT', x, curY + 8, { width: width, align: 'center' });
            curY += headerH;

            doc.rect(x, curY, colW, rowH).stroke();
            doc.rect(x + colW, curY, colW, rowH).stroke();
            doc.rect(x + 2 * colW, curY, colW, rowH).stroke();
            tY = curY + 10;

            doc.font(this.fonts.bold).fillColor(this.colors.red).fontSize(10).text('Liquid Penetrant Testing', x + 5, tY);
            doc.text('YES / No', x + colW + 5, tY);
            doc.font(this.fonts.bold).fillColor(this.colors.black)
                .text((data.pwht) ? 'YES' : 'NO', x + 2 * colW + 5, tY);
        });
    }

    generateReport(allStagesData, res) {
        const doc = new PDFDocument({ margin: 20, size: 'A4', bufferPages: true });
        doc.pipe(res);

        const stageOrder = ['stage1', 'stage2', 'stage3', 'stage4'];
        let isFirstPage = true;

        stageOrder.forEach(key => {
            // Note: Controller might not strictly enforce existing keys, so check if allStagesData has it
            // Or just iterate 1 to 4
            if (!allStagesData[key]) return;
            const data = allStagesData[key];
            const stageNum = parseInt(key.replace('stage', ''));

            if (!isFirstPage) doc.addPage();
            isFirstPage = false;

            switch (stageNum) {
                case 1: this.drawStage1(doc, data); break;
                case 2: this.drawStage2(doc, data); break;
                case 3: this.drawStage3(doc, data); break;
                case 4: this.drawStage4(doc, data); break;
                default:
                    doc.text(`Stage ${stageNum} not implemented`, 50, 50);
            }
        });

        doc.end();
    }
}

module.exports = new PDFGeneratorF();
