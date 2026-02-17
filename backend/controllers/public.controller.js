const DccService = require('../services/dcc.service');

class PublicController {
    async downloadZip(req, res) {
        const transmissionId = req.params.id;
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secure Download</title>
    <style>
        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f2f5; margin: 0; }
        .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; }
        h2 { margin-top: 0; color: #333; }
        p { color: #666; margin-bottom: 20px; }
        input { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 16px; transition: background 0.3s; }
        button:hover { background: #0056b3; }
        .error { color: #dc3545; margin-bottom: 15px; font-size: 0.9em; padding: 10px; background: #f8d7da; border-radius: 4px; display: none; }
        .footer { margin-top: 20px; font-size: 0.8em; color: #aaa; }
    </style>
</head>
<body>
    <div class="card">
        <h2>Secure File Download</h2>
        <p>Please enter the password provided in your email to access the files.</p>
        
        <!-- Error message placeholder --> 
        <div id="error-msg" class="error">
            Invalid password or link expired. Please try again.
        </div>

        <form action="/api/files/verify" method="POST">
            <input type="hidden" name="transmissionId" value="${transmissionId}">
            <input type="password" name="password" placeholder="Enter Password" required autofocus>
            <button type="submit">Download Files</button>
        </form>
        
        <div class="footer">
            &copy; 2026 DMS Secure Transfer
        </div>
    </div>
    
    <script>
        // Simple error handling for query param (e.g. ?error=invalid)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('error')) {
            document.getElementById('error-msg').style.display = 'block';
        }
    </script>
</body>
</html>`;
        res.send(html);
    }

    async verifyZipPassword(req, res) {
        const { transmissionId, password } = req.body;

        try {
            const { isValid, filePath, fileName } = await DccService.verifyZipPassword(transmissionId, password);

            if (isValid && filePath) {
                res.download(filePath, fileName);
            } else {
                // Redirect back to the download page with error flag
                // We need to know the original download URL. Ideally constructing it from ID.
                // For now, redirect to previous page or reconstruct URL
                // Better UX: Show error on same page.
                res.redirect(`/api/files/download/${transmissionId}?error=invalid`);
            }
        } catch (error) {
            console.error('Verify ZIP error:', error);
            res.status(500).send('Server Error. Please try again later.');
        }
    }
}

module.exports = new PublicController();
