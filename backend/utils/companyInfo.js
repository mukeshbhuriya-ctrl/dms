const prisma = require('#prisma');
const path = require('path');
const fs = require('fs');

const { UPLOAD_DIR } = require('./upload');

/**
 * Utility to fetch company information for PDF branding
 * @param {string} company_id - The ID of the company
 * @returns {Promise<Object|null>} Company name and local logo path
 */
async function getCompanyInfo(company_id) {
    try {
        if (!company_id) return null;

        const company = await prisma.company.findUnique({
            where: { id: company_id }
        });

        if (!company) return null;

        let localLogoPath = null;
        if (company.logo_url) {
            try {
                // Handle both absolute URLs and bare filenames
                const filename = path.basename(company.logo_url);
                const potentialPath = path.join(UPLOAD_DIR, filename);
                
                if (fs.existsSync(potentialPath)) {
                    localLogoPath = potentialPath;
                }
            } catch (e) {
                console.warn('Could not resolve local logo path from URL:', company.logo_url);
            }
        }

        return {
            name: company.name,
            logoPath: localLogoPath,
            logoUrl: company.logo_url
        };
    } catch (error) {
        console.error('Error fetching company info:', error);
        return null;
    }
}

module.exports = { getCompanyInfo };
