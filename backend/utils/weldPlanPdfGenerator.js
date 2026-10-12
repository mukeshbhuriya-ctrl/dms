const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class WeldPlanPdfGenerator {
    constructor() {
        this.colors = {
            black: '#000000',
            white: '#FFFFFF',
            grey: '#E2E8F0',
            headerBg: '#F1F5F9',
            zebraBg: '#F8FAFC',
            border: '#000000',
            accent: '#1D4ED8'
        };
        this.fonts = {
            regular: 'Helvetica',
            bold: 'Helvetica-Bold'
        };
    }

    formatText(text) {
        if (text === null || text === undefined || text === '') return '-';
        return String(text).trim();
    }

    formatBool(val) {
        if (val === null || val === undefined || val === '') return '-';
        if (val === true || val === 'true' || val === 'yes' || val === 'Y') return 'YES';
        if (val === false || val === 'false' || val === 'no' || val === 'N') return 'NO';
        return String(val).trim();
    }

    drawBox(doc, x, y, width, height, lineWidth = 0.5, fillColor = null) {
        doc.lineWidth(lineWidth).strokeColor(this.colors.border);
        if (fillColor) {
            doc.rect(x, y, width, height).fillAndStroke(fillColor, this.colors.border);
        } else {
            doc.rect(x, y, width, height).stroke();
        }
    }

    drawLine(doc, x1, y1, x2, y2, lineWidth = 0.5) {
        doc.lineWidth(lineWidth).strokeColor(this.colors.border).moveTo(x1, y1).lineTo(x2, y2).stroke();
    }

    getTableColumns(pageWidth) {
        return [
            { id: 'joint_no', label: 'Joint No', w: 38, align: 'center' },
            { id: 'joint_type', label: 'Joint\nType', w: 28, align: 'center' },
            { id: 'joint_description', label: 'Joint\nDescription', w: 75, align: 'left' },
            { id: 'base_metal_thickness_p1', label: 'Part 1', parent: 'Base-Metal Thickness mm', w: 42, align: 'center' },
            { id: 'base_metal_thickness_p2', label: 'Part 2', parent: 'Base-Metal Thickness mm', w: 42, align: 'center' },
            { id: 'base_metal_spec_p1', label: 'Part 1', parent: 'Base Metal Specification', w: 60, align: 'left' },
            { id: 'base_metal_spec_p2', label: 'Part 2', parent: 'Base Metal Specification', w: 60, align: 'left' },
            { id: 'consumable', label: 'Consumable', w: 48, align: 'center' },
            { id: 'wps_pqr_no', label: 'WPS No /\nPQR No', w: 72, align: 'center' },
            { id: 'process', label: 'Process', w: 45, align: 'center' },
            { id: 'impact_test', label: 'Impact\nTest', w: 42, align: 'center' },
            { id: 'back_chip_req', label: 'Back Chip\nReq.', w: 35, align: 'center' },
            { id: 'pwht', label: 'PWHT', w: 32, align: 'center' },
            { id: 'rt', label: 'RT', parent: 'NDT', w: 28, align: 'center' },
            { id: 'pt', label: 'PT', parent: 'NDT', w: 28, align: 'center' },
            { id: 'remarks', label: 'Remarks', w: pageWidth - 675, align: 'left' }
        ];
    }

    drawMainHeader(doc, startX, y, pageWidth, plan, companyInfo) {
        const headerH = 46;
        const logoBoxW = 180;
        const metaBoxW = 190;
        const titleBoxW = pageWidth - logoBoxW - metaBoxW;

        this.drawBox(doc, startX, y, pageWidth, headerH, 1);

        // 1. Logo Section
        const logoPath = path.resolve(__dirname, '..', 'assets', 'shreno-logo.png');
        let logoDrawn = false;
        if (fs.existsSync(logoPath)) {
            try {
                doc.image(logoPath, startX + 8, y + 6, {
                    fit: [logoBoxW - 16, headerH - 12],
                    align: 'center',
                    valign: 'center'
                });
                logoDrawn = true;
            } catch (e) {
                console.error('Failed to load primary logo in weldPlanPdfGenerator:', e);
            }
        }
        if (!logoDrawn) {
            const compName = companyInfo?.name || 'SHRENO ENGINEERING LIMITED';
            const compFontSize = compName.length > 32 ? 8 : (compName.length > 25 ? 9 : 10);
            doc.font(this.fonts.bold).fontSize(compFontSize).fillColor(this.colors.black)
                .text(compName, startX + 5, y + 16, { width: logoBoxW - 10, align: 'center' });
        }
        this.drawLine(doc, startX + logoBoxW, y, startX + logoBoxW, y + headerH, 1);

        // 2. Title Section
        const titleX = startX + logoBoxW;
        doc.font(this.fonts.bold).fontSize(14).fillColor(this.colors.black)
            .text('WELDING JOINT PLAN', titleX, y + 10, { width: titleBoxW, align: 'center' });
        doc.font(this.fonts.regular).fontSize(8).fillColor('#475569')
            .text('Standard Technical Joint Schedule', titleX, y + 27, { width: titleBoxW, align: 'center' });
        this.drawLine(doc, titleX + titleBoxW, y, titleX + titleBoxW, y + headerH, 1);

        // 3. Metadata Section (with intelligent font scaling to prevent overlapping)
        const metaX = titleX + titleBoxW;
        const metaInnerW = metaBoxW - 16;
        const labelW = 44;
        const valueW = metaInnerW - labelW;

        // Plan No
        const planNoText = this.formatText(plan.weld_plan_no);
        doc.font(this.fonts.bold).fontSize(7.5).fillColor(this.colors.black)
            .text('Plan No:', metaX + 8, y + 12, { width: labelW, align: 'left' });
        const planNoFontSize = planNoText.length > 28 ? 6 : (planNoText.length > 20 ? 6.5 : 7.5);
        doc.font(this.fonts.regular).fontSize(planNoFontSize).fillColor(this.colors.black)
            .text(planNoText, metaX + 8 + labelW, y + (planNoFontSize < 7.5 ? 13 : 12), {
                width: valueW,
                align: 'left',
                lineBreak: false,
                ellipsis: true
            });

        // Date
        const createdDate = plan.createdAt ? new Date(plan.createdAt).toLocaleDateString('en-GB') : '-';
        doc.font(this.fonts.bold).fontSize(7.5).fillColor(this.colors.black)
            .text('Date:', metaX + 8, y + 26, { width: labelW, align: 'left' });
        doc.font(this.fonts.regular).fontSize(7.5).fillColor(this.colors.black)
            .text(createdDate, metaX + 8 + labelW, y + 26, {
                width: valueW,
                align: 'left',
                lineBreak: false
            });

        return y + headerH;
    }

    drawInfoGrid(doc, startX, y, pageWidth, plan) {
        const job = plan.job || {};
        const clientName = plan.client_name || job.customer?.customer_name || '-';
        const equipmentName = plan.equipment_name || job.equipement_name || '-';
        const tagNumber = plan.tag_id || job.tag_number || null;
        const projectId = plan.project_id || job.project_id || null;

        let tagProjText = '-';
        if (tagNumber && tagNumber !== '-' && projectId && projectId !== '-') {
            tagProjText = `${tagNumber} / ${projectId}`;
        } else if (tagNumber && tagNumber !== '-') {
            tagProjText = String(tagNumber);
        } else if (projectId && projectId !== '-') {
            tagProjText = String(projectId);
        }

        const infoRows = [
            [
                { label: 'Job No (MSN):', val: this.formatText(job.job_number) },
                { label: 'Client / Customer:', val: this.formatText(clientName) },
                { label: 'Equipment Name:', val: this.formatText(equipmentName) }
            ],
            [
                { label: 'Shreno Drg No:', val: this.formatText(plan.shreno_drg_no) },
                { label: 'Customer Drg No:', val: this.formatText(plan.customer_drg_no) },
                { label: 'Tag ID / Project ID:', val: tagProjText }
            ]
        ];

        const colW = pageWidth / 3;
        const lblW = 85;
        const valW = colW - lblW - 10;

        let curY = y;

        infoRows.forEach((row) => {
            // Measure actual height of every column's value with line breaks
            let maxValH = 10;
            row.forEach(col => {
                doc.font(this.fonts.regular).fontSize(7.5);
                const h = doc.heightOfString(col.val, { width: valW, lineGap: 1 });
                if (h > maxValH) maxValH = h;
            });
            const rowH = Math.max(17, maxValH + 7);

            // Row bounding box and vertical column dividers
            this.drawBox(doc, startX, curY, pageWidth, rowH, 0.8);
            this.drawLine(doc, startX + colW, curY, startX + colW, curY + rowH, 0.5);
            this.drawLine(doc, startX + (2 * colW), curY, startX + (2 * colW), curY + rowH, 0.5);

            // Render label and wrapped value
            row.forEach((col, cIdx) => {
                const colStartX = startX + (cIdx * colW);

                // Label
                doc.font(this.fonts.bold).fontSize(7).fillColor(this.colors.black)
                    .text(col.label, colStartX + 5, curY + 4.5, { width: lblW, align: 'left' });

                // Value (multi-line enabled, completely placed within column boundary)
                doc.font(this.fonts.regular).fontSize(7.5).fillColor(this.colors.black)
                    .text(col.val, colStartX + lblW + 3, curY + 4, {
                        width: valW,
                        align: 'left',
                        lineBreak: true,
                        lineGap: 1
                    });
            });

            curY += rowH;
        });

        return curY;
    }

    drawTableHeader(doc, startX, y, pageWidth, cols, plan) {
        // Banner: Code of Construction (adaptable height if long)
        const codeText = this.formatText(plan.code_of_construction);
        doc.font(this.fonts.bold).fontSize(8);
        const codeH = doc.heightOfString(`CODE OF CONSTRUCTION: ${codeText}`, { width: pageWidth - 16, lineGap: 1 });
        const bannerH = Math.max(16, codeH + 6);

        this.drawBox(doc, startX, y, pageWidth, bannerH, 0.8, this.colors.headerBg);
        doc.font(this.fonts.bold).fontSize(8).fillColor(this.colors.black);
        doc.text('CODE OF CONSTRUCTION: ', startX + 8, y + 4, { continued: true, width: pageWidth - 16, lineGap: 1 })
            .font(this.fonts.bold).fillColor(this.colors.accent).text(codeText, { width: pageWidth - 16, lineGap: 1 });
        let curY = y + bannerH;

        // Multi-level Header (Row 1: 15pt, Row 2: 15pt = 30pt total)
        const headerTopH = 15;
        const headerSubH = 15;
        const totalHeaderH = headerTopH + headerSubH;

        this.drawBox(doc, startX, curY, pageWidth, totalHeaderH, 1, this.colors.headerBg);

        // Standalone columns spanning full header height
        let tx = startX;
        cols.forEach((col, i) => {
            if (!col.parent) {
                if (i < cols.length - 1) {
                    this.drawLine(doc, tx + col.w, curY, tx + col.w, curY + totalHeaderH, 0.5);
                }
                doc.font(this.fonts.bold).fontSize(6.5).fillColor(this.colors.black)
                    .text(col.label, tx + 1, curY + (totalHeaderH / 2) - 6, {
                        width: col.w - 2,
                        align: 'center',
                        lineGap: 1
                    });
            }
            tx += col.w;
        });

        // 1. Thickness group
        const thkStartX = startX + cols[0].w + cols[1].w + cols[2].w;
        const thkTotalW = cols[3].w + cols[4].w;
        this.drawLine(doc, thkStartX, curY + headerTopH, thkStartX + thkTotalW, curY + headerTopH, 0.5);
        this.drawLine(doc, thkStartX + cols[3].w, curY + headerTopH, thkStartX + cols[3].w, curY + totalHeaderH, 0.5);
        this.drawLine(doc, thkStartX + thkTotalW, curY, thkStartX + thkTotalW, curY + totalHeaderH, 0.5); // Divider to Spec group
        doc.font(this.fonts.bold).fontSize(6.5).fillColor(this.colors.black)
            .text('Base-Metal Thickness mm', thkStartX, curY + 4, { width: thkTotalW, align: 'center' });
        doc.text('Part 1', thkStartX, curY + headerTopH + 4, { width: cols[3].w, align: 'center' });
        doc.text('Part 2', thkStartX + cols[3].w, curY + headerTopH + 4, { width: cols[4].w, align: 'center' });

        // 2. Spec group
        const specStartX = thkStartX + thkTotalW;
        const specTotalW = cols[5].w + cols[6].w;
        this.drawLine(doc, specStartX, curY + headerTopH, specStartX + specTotalW, curY + headerTopH, 0.5);
        this.drawLine(doc, specStartX + cols[5].w, curY + headerTopH, specStartX + cols[5].w, curY + totalHeaderH, 0.5);
        this.drawLine(doc, specStartX + specTotalW, curY, specStartX + specTotalW, curY + totalHeaderH, 0.5); // Divider to Consumable
        doc.font(this.fonts.bold).fontSize(6.5).fillColor(this.colors.black)
            .text('Base Metal Specification', specStartX, curY + 4, { width: specTotalW, align: 'center' });
        doc.text('Part 1', specStartX, curY + headerTopH + 4, { width: cols[5].w, align: 'center' });
        doc.text('Part 2', specStartX + cols[5].w, curY + headerTopH + 4, { width: cols[6].w, align: 'center' });

        // 3. NDT group
        let ndtStartX = startX;
        for (let j = 0; j < 13; j++) ndtStartX += cols[j].w;
        const ndtTotalW = cols[13].w + cols[14].w;
        this.drawLine(doc, ndtStartX, curY + headerTopH, ndtStartX + ndtTotalW, curY + headerTopH, 0.5);
        this.drawLine(doc, ndtStartX + cols[13].w, curY + headerTopH, ndtStartX + cols[13].w, curY + totalHeaderH, 0.5);
        this.drawLine(doc, ndtStartX + ndtTotalW, curY, ndtStartX + ndtTotalW, curY + totalHeaderH, 0.5); // Divider to Remarks
        doc.font(this.fonts.bold).fontSize(6.5).fillColor(this.colors.black)
            .text('NDT', ndtStartX, curY + 4, { width: ndtTotalW, align: 'center' });
        doc.text('RT', ndtStartX, curY + headerTopH + 4, { width: cols[13].w, align: 'center' });
        doc.text('PT', ndtStartX + cols[13].w, curY + headerTopH + 4, { width: cols[14].w, align: 'center' });

        return curY + totalHeaderH;
    }

    generatePDF(plan, res, companyInfo) {
        const doc = new PDFDocument({
            margins: {
                top: 30,
                bottom: 25,
                left: 30,
                right: 30
            },
            size: 'A4',
            layout: 'landscape',
            bufferPages: true,
            autoFirstPage: true
        });

        doc.pipe(res);

        const startX = 30;
        const pageWidth = 841.89 - 60; // 781.89 pt
        const maxY = 595.28 - 35;     // 560.28 pt max Y before starting next page

        const cols = this.getTableColumns(pageWidth);

        let curY = 30;

        // Page 1 Header & Info Grid
        curY = this.drawMainHeader(doc, startX, curY, pageWidth, plan, companyInfo);
        curY += 6;
        curY = this.drawInfoGrid(doc, startX, curY, pageWidth, plan);
        curY += 6;
        curY = this.drawTableHeader(doc, startX, curY, pageWidth, cols, plan);

        const joints = plan.weld_joints || [];
        const minRowH = 16;
        const textPaddingY = 3.5;

        if (joints.length === 0) {
            const emptyRowH = 26;
            this.drawBox(doc, startX, curY, pageWidth, emptyRowH, 0.4);
            doc.font(this.fonts.regular).fontSize(8).fillColor('#64748B')
                .text('No weld joints recorded for this plan.', startX, curY + 9, {
                    width: pageWidth,
                    align: 'center'
                });
            curY += emptyRowH;
        } else {
            joints.forEach((joint, idx) => {
                // Pre-map text values for each column
                const cellValues = cols.map(col => {
                    let textVal = '-';
                    if (col.id === 'joint_no') textVal = joint.joint_no || '-';
                    else if (col.id === 'joint_type') textVal = joint.joint_type || '-';
                    else if (col.id === 'joint_description') textVal = joint.joint_description || joint.joint || '-';
                    else if (col.id === 'base_metal_thickness_p1') textVal = joint.base_metal_thickness_p1 || '-';
                    else if (col.id === 'base_metal_thickness_p2') textVal = joint.base_metal_thickness_p2 || '-';
                    else if (col.id === 'base_metal_spec_p1') textVal = joint.base_metal_spec_p1 || '-';
                    else if (col.id === 'base_metal_spec_p2') textVal = joint.base_metal_spec_p2 || '-';
                    else if (col.id === 'consumable') textVal = joint.consumable || '-';
                    else if (col.id === 'wps_pqr_no') textVal = joint.wps_pqr_no || joint.wpsNoPqrNo || '-';
                    else if (col.id === 'process') textVal = joint.process || '-';
                    else if (col.id === 'impact_test') textVal = this.formatBool(joint.impact_test || joint.impactTest);
                    else if (col.id === 'back_chip_req') textVal = this.formatBool(joint.back_chip_req);
                    else if (col.id === 'pwht') textVal = this.formatBool(joint.pwht);
                    else if (col.id === 'rt') textVal = this.formatBool(joint.rt);
                    else if (col.id === 'pt') textVal = this.formatBool(joint.pt);
                    else if (col.id === 'remarks') textVal = joint.remarks || '-';
                    return String(textVal).trim();
                });

                // Measure height of every cell to determine dynamically expanded row height
                let maxCellHeight = 8;
                cols.forEach((col, cIdx) => {
                    const textVal = cellValues[cIdx];
                    const isBold = col.id === 'joint_no' || col.id === 'joint_type';
                    const font = isBold ? this.fonts.bold : this.fonts.regular;
                    const align = col.align || 'left';
                    const paddingX = align === 'center' ? 2 : 4;
                    const cellWidth = col.w - (paddingX * 2);

                    doc.font(font).fontSize(6.5);
                    const textHeight = doc.heightOfString(textVal, {
                        width: cellWidth,
                        lineGap: 1
                    });

                    if (textHeight > maxCellHeight) {
                        maxCellHeight = textHeight;
                    }
                });

                // Row height with symmetric top and bottom breathing room
                const rowH = Math.max(minRowH, maxCellHeight + (textPaddingY * 2));

                // Page overflow check: start new page with clean main header and table headers
                if (curY + rowH > maxY) {
                    doc.addPage({
                        margins: { top: 30, bottom: 25, left: 30, right: 30 },
                        size: 'A4',
                        layout: 'landscape'
                    });
                    curY = 30;
                    curY = this.drawMainHeader(doc, startX, curY, pageWidth, plan, companyInfo);
                    curY += 6;
                    curY = this.drawTableHeader(doc, startX, curY, pageWidth, cols, plan);
                }

                // Alternating zebra striping
                const rowBg = idx % 2 === 1 ? this.colors.zebraBg : null;
                this.drawBox(doc, startX, curY, pageWidth, rowH, 0.4, rowBg);

                // Draw vertical divider lines and cell content
                let tx = startX;
                cols.forEach((col, cIdx) => {
                    if (cIdx < cols.length - 1) {
                        this.drawLine(doc, tx + col.w, curY, tx + col.w, curY + rowH, 0.4);
                    }

                    const textVal = cellValues[cIdx];
                    const isBold = col.id === 'joint_no' || col.id === 'joint_type';
                    const font = isBold ? this.fonts.bold : this.fonts.regular;
                    const align = col.align || 'left';
                    const paddingX = align === 'center' ? 2 : 4;
                    const cellWidth = col.w - (paddingX * 2);

                    doc.font(font).fontSize(6.5).fillColor(this.colors.black);

                    // Top-aligned with clean padding so line 1 of all cells across the row aligns horizontally
                    const textY = curY + textPaddingY;

                    doc.text(textVal, tx + paddingX, textY, {
                        width: cellWidth,
                        align: align,
                        lineBreak: true,
                        lineGap: 1
                    });

                    tx += col.w;
                });

                curY += rowH;
            });
        }

        // Page numbering (bypass bottom margin so PDFKit does not auto-create an accidental blank page)
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            const originalBottomMargin = doc.page.margins.bottom;
            doc.page.margins.bottom = 0;
            doc.font(this.fonts.regular).fontSize(7).fillColor('#64748B')
                .text(`Page ${i + 1} of ${range.count}`, startX, 595.28 - 18, {
                    width: pageWidth,
                    align: 'center',
                    lineBreak: false
                });
            doc.page.margins.bottom = originalBottomMargin;
        }

        doc.end();
    }
}

module.exports = new WeldPlanPdfGenerator();
