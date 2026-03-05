// Enable module aliases for CommonJS (#api, #utils, etc.)
require('module-alias/register');
// Enable tsx for TypeScript support
require('tsx/cjs');

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('./utils/cors');
const { setupAdmin } = require('./utils/startup/steup_admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Site Admin Routes
const siteAdminAuthRoutes = require('#routes/siteadmin/auth.routes.js');
const siteAdminCompanyRoutes = require('#routes/siteadmin/company.routes.js');
app.use('/api/siteadmin/auth', siteAdminAuthRoutes);
app.use('/api/siteadmin/company', siteAdminCompanyRoutes);

// User Routes
const userAuthRoutes = require('#routes/users/auth.routes.js');
app.use('/api/users/auth', userAuthRoutes);


const dccRoutes = require('#routes/dcc/dcc.routes.js');
app.use('/api/dcc', dccRoutes);

const departmentRoutes = require('#routes/department.routes.js');
app.use('/api/departments', departmentRoutes);

const commonRoutes = require('./routes/common/common.routes.js');
app.use('/api/common', commonRoutes);

const userRoutes = require('#routes/users/user.routes.js');
app.use('/api/users', userRoutes);

const wpjRoutes = require('#routes/wpj/wpj.routes.js');
app.use('/api/wpj', wpjRoutes);

const mhcRoutes = require('#routes/mhc/mhc.routes.js');
app.use('/api/mhc', mhcRoutes);

const inspectionReportRoutes = require('./routes/hydro/inspection_report.routes.js');
app.use('/api/inspection-report', inspectionReportRoutes);

const qapRoutes = require('./routes/qap/qap.routes.js');
app.use('/api/qap', qapRoutes);

const hydroTestRoutes = require('./routes/hydro/hydro_test.routes.js');
app.use('/api/hydro-test', hydroTestRoutes);

const publicRoutes = require('./routes/public.routes.js');
app.use('/api/secure', publicRoutes);

const dcrRoutes = require('#routes/dcr/dcr.routes.js');
app.use('/api/dcr', dcrRoutes);

const approvalRoutes = require('#routes/dcr/approval.routes.js');
app.use('/api/dcr/approval', approvalRoutes);

const rfqRoutes = require('#routes/rfq/rfq.routes.js');
app.use('/api/rfq', rfqRoutes);

const ncrRoutes = require('#routes/ncr/ncr.routes.js');
app.use('/api/ncr', ncrRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize server
async function startServer() {
  try {
    // Setup admin on startup
    await setupAdmin();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
