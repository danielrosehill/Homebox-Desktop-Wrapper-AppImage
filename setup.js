#!/usr/bin/env node
const readline = require('readline');
const fs = require('fs/promises');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setup() {
    console.log('\n=== Homebox Desktop Wrapper Setup ===\n');

    try {
        // Ask about Cloudflare Access
        const useCloudflare = (await question('Are you using Cloudflare Access? (y/N): ')).toLowerCase() === 'y';

        // Get Homebox URL
        const homeboxUrl = await question('\nEnter your Homebox URL (e.g., https://homebox.example.com): ');
        if (!homeboxUrl) {
            throw new Error('Homebox URL is required');
        }

        // Prepare environment variables
        let envContent = `# Homebox Instance URL\nHOMEBOX_URL=${homeboxUrl}\n`;

        // Get Cloudflare credentials if needed
        if (useCloudflare) {
            console.log('\nPlease provide your Cloudflare Access credentials:');
            const clientId = await question('Client ID: ');
            const clientSecret = await question('Client Secret: ');

            if (!clientId || !clientSecret) {
                throw new Error('Both Client ID and Client Secret are required for Cloudflare Access');
            }

            envContent += `\n# Cloudflare Access Credentials\nCF_ACCESS_CLIENT_ID=${clientId}\nCF_ACCESS_CLIENT_SECRET=${clientSecret}\n`;
        }

        // Write .env file
        await fs.writeFile(path.join(__dirname, '.env'), envContent);

        // Update index.js to use the appropriate version
        const indexContent = `require('dotenv').config();

${useCloudflare 
    ? '// Using Cloudflare Access version\nrequire(\'./main.js\');\n// For non-Cloudflare version, comment above and uncomment below\n// require(\'./main-no-cloudflare.js\');'
    : '// Using non-Cloudflare version\nrequire(\'./main-no-cloudflare.js\');\n// For Cloudflare Access version, comment above and uncomment below\n// require(\'./main.js\');'
}`;

        await fs.writeFile(path.join(__dirname, 'index.js'), indexContent);

        console.log('\n✅ Setup completed successfully!');
        console.log(`\nConfiguration saved to .env file with the following settings:`);
        console.log(`• Homebox URL: ${homeboxUrl}`);
        if (useCloudflare) {
            console.log('• Cloudflare Access: Enabled');
        } else {
            console.log('• Cloudflare Access: Disabled');
        }

        console.log('\nYou can now run the application with:');
        console.log('npm install    # Install dependencies');
        console.log('npm start      # Start the application\n');

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        console.log('Please try again.\n');
    } finally {
        rl.close();
    }
}

setup();
