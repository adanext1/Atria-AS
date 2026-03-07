const fs = require('fs');
const html = fs.readFileSync('src/components/InyeccionWeb/Whatsapp.html', 'utf8');

// Buscamos todas las ocurrencias y mostramos su contexto (hasta 300 caracteres antes y después)
let iter = html.matchAll(/Adanmiviejo/g);
for (const match of iter) {
    const index = match.index;
    console.log("=========================================");
    console.log(html.substring(index - 400, index + 300));
}
