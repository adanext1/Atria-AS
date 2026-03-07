const fs = require('fs');
const html = fs.readFileSync('src/components/InyeccionWeb/Whatsapp.html', 'utf8');

const regex = /<span[^>]*title=[\"']([^\"']*)[\"'][^>]*>/gi;
let m;
let titles = [];
while ((m = regex.exec(html)) !== null) {
    if (m[1].length > 0) titles.push(m[1]);
}
console.log('Unique titles:', [...new Set(titles)].slice(0, 30));
