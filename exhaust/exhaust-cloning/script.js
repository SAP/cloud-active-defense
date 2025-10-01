const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: __dirname + '/.env' });

// Helper function to extract URLs from any text content
const extractUrls = (text) => {
    const urls = new Set();

    // Regex to capture URLs in various formats
    const urlRegex = /(?:href|src|url|action)\s*=\s*["']([^"']+)["']/g;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
        try {
            let resolvedUrl = match[1];

            // Skip absolute URLs (http:// or https://)
            if (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://')) {
                // Resolve relative URLs with baseUrl
                resolvedUrl = resolvedUrl.startsWith('/')
                    ? new URL(resolvedUrl, entryUrl).href
                    : `${entryUrl}/${resolvedUrl}`;
            }

            urls.add(resolvedUrl);
        } catch {
            // Ignore invalid URLs
        }
    }

    return Array.from(urls);
};

// Function to handle form submission using Puppeteer's built-in DOM manipulation


// const handleForms = async (page, baseUrl, dest) => {
//     const forms = await page.evaluate(() => {
//         return Array.from(document.querySelectorAll('form')).map(form => {
//             const action = form.getAttribute('action') || '';
//             const method = (form.getAttribute('method') || 'GET').toUpperCase();
//             const inputs = Array.from(form.querySelectorAll('input, textarea, select')).map(input => ({
//                 name: input.getAttribute('name'),
//                 value: input.getAttribute('value') || ''
//             }));
//             return { action, method, inputs };
//         });
//     });

//     for (const form of forms) {
//         const formUrl = new URL(form.action, baseUrl).href;
//         const formData = {};
//         form.inputs.forEach(input => {
//             if (input.name) {
//                 formData[input.name] = input.value;
//             }
//         });

//         try {
//             if (form.method === 'GET') {
//                 const queryParams = new URLSearchParams(formData).toString();
//                 const getUrl = `${formUrl}?${queryParams}`;
//                 console.log(`Submitting GET request to: ${getUrl}`);
//                 await clonePage(getUrl, dest); // Call clonePage for GET requests
//             } else if (form.method === 'POST') {
//                 console.log(`Submitting POST request to: ${formUrl}`);
//                 const postResponse = await page.evaluate(async (url, data) => {
//                     const response = await fetch(url, {
//                         method: 'POST',
//                         headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//                         body: new URLSearchParams(data).toString(),
//                     });
//                     return {
//                         url: response.url,
//                         status: response.status,
//                         text: await response.text()
//                     };
//                 }, formUrl, formData);

//                 console.log(`POST Response from ${postResponse.url}:`, postResponse);

//                 // Write POST request data and response to a file
//                 const postFilePath = path.join(dest, 'post.html');
//                 fs.writeFileSync(postFilePath, postResponse.text, 'utf8');

//                 // Optionally, you can call clonePage with the response URL if needed
//                 // await clonePage(postResponse.url, dest);
//             }
//         } catch (error) {
//             console.error(`Failed to handle form submission for ${formUrl}:`, error);
//         }
//     }
// };

async function clonePage(url, dest, maxDepth = 2, currentDepth = 0) {
    // if (currentDepth > maxDepth) return;

    if (visitedPages.has(url)) return;
    visitedPages.add(url);

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.setDefaultTimeout(60000); // Set timeout to 60 seconds

    try {
        console.log(`Cloning: ${url}`);

        page.on('request', async request => {
            const requestUrl = request.url();
            // Skip already fetched assets and document requests
            
            if (visitedPages.has(requestUrl) || request.resourceType() === 'document' || request.resourceType() === 'websocket') {
                // if (fetchedAssets.has(requestUrl)) {
                request.continue();
                return;
            }
                
            visitedPages.add(requestUrl);

            try {
                const assetUrl = new URL(requestUrl);
                if (!assetUrl.pathname || assetUrl.pathname === '/') {
                    request.continue();
                    return;
                }
                if (requestUrl.startsWith(entryUrl)) {
                    const response = await fetch(requestUrl);
                    const buffer = await response.arrayBuffer();
                    const assetPath = path.join(dest, assetUrl.pathname);
                    
                    fs.mkdirSync(path.dirname(assetPath), { recursive: true });
                    fs.writeFileSync(assetPath, Buffer.from(buffer));
                    // console.log(`Fetched asset: ${requestUrl} -> ${assetPath}`);
                }
                    
                // If the asset is a text resource, extract URLs for further exploration
                // const contentType = response.headers.get('content-type');
                // if (contentType && (contentType.includes('text') || contentType.includes('application/javascript') || contentType.includes('application/json'))) {
                //     const textContent = Buffer.from(buffer).toString();
                //     const extractedUrls = extractUrls(textContent, requestUrl);
                //     for (const extractedUrl of extractedUrls) {
                    //         if (!visitedPages.has(extractedUrl) && extractedUrl.startsWith(url)) {
                        //             await clonePage(extractedUrl, dest, maxDepth, currentDepth + 1);
                //             visitedPages.add(extractedUrl);
                //         }
                //     }
                // }
                
            request.continue();
            } catch (error) {
                console.error(`Failed to fetch asset: ${requestUrl}`, error);
                request.abort();
            }
        });

        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const html = await page.evaluate(() => document.documentElement.outerHTML);
        const filePath = path.join(dest + getSecondPartOfUrl(url), 'index.html');

        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, html, 'utf8');

        const buttons = await page.$$('button'); // Select all <button> elements
        for (const button of buttons) {
            try {
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).then(async r => {
                        // await clonePage(await r.url(), dest, maxDepth, currentDepth + 1);
                    }).catch(() => {}),
                    button.click(), // Click the button
                ]);
            } catch (error) {
                console.error('Failed to click button:', error.message);
            }
        }
        

        // Handle forms in the HTML
        // await handleForms(page, url, dest);

        const extractedUrls = extractUrls(html);
        for (const extractedUrl of extractedUrls) {
            if (extractedUrl.startsWith(entryUrl)) {
                await clonePage(extractedUrl, dest, maxDepth, currentDepth + 1);
            }
        }
    } catch (error) {
        console.error(`Failed to clone ${url}:`, error);
    }

    await browser.close();
}

const getSecondPartOfUrl = (url) => {
    const pathIndex = url.indexOf('/', url.indexOf('//') + 2); // Find the first slash after 'http://' or 'https://'
    return pathIndex !== -1 ? url.slice(pathIndex) : '/'; // Return everything from the slash or '/' if none exists
};

const entryUrl = process.env.URL; // Replace with your target website
const dest = './clonedSite'; // Replace with your desired output directory

const visitedPages = new Set();

if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest);
}

clonePage(entryUrl, dest, 2).then(() => {
    console.log('Cloning completed!');
}).catch(error => {
    console.error('Error cloning site:', error);
});