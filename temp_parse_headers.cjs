const fs = require('fs');
const html = fs.readFileSync('src/components/InyeccionWeb/Whatsapp.html', 'utf8');

// The active chat header is the second <header> on the page typically, or inside a specific main container.
// Let's find all headers and check if they contain 'Adanmiviejo'
const headers = html.split('<header').slice(1).map(h => '<header' + h.split('</header>')[0] + '</header>');

headers.forEach((h, i) => {
    if (h.includes('Adanmiviejo')) {
        console.log(`--- HEADER ${i} MATCHES ---`);
        console.log(h.replace(/\s+/g, ' '));
    }
});
