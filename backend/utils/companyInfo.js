const prisma = require('#prisma');
const path = require('path');
const fs = require('fs');

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
            // logo_url is usually stored as a full URL: http://.../uploads/filename
            // For backend PDF generation, we need the local file system path.
            try {
                const urlParts = company.logo_url.split('/');
                const filename = urlParts[urlParts.length - 1];
                const potentialPath = path.join(process.cwd(), 'uploads', filename);
                
                if (fs.existsSync(potentialPath)) {
                    localLogoPath = potentialPath;
                } else {
                    // Try alternative path if process.cwd() is different
                    const altPath = path.join(__dirname, '../uploads', filename);
                    if (fs.existsSync(altPath)) {
                        localLogoPath = altPath;
                    }
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
