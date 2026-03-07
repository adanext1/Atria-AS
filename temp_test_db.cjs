const fs = require('fs');
const html = fs.readFileSync('src/components/InyeccionWeb/Whatsapp.html', 'utf8');

const tIdx = html.indexOf('title="Adanmiviejo"');
if (tIdx !== -1) {
    console.log("Parent HTML context:");
    console.log(html.substring(tIdx - 150, tIdx + 150));
}

let providers = "{}";
try {
    providers = fs.readFileSync(process.env.APPDATA + '/organizador-sat/providers.json', 'utf8');
    console.log("Found in providers:", providers.includes('Adanmiviejo'));
} catch (e) { }

let clients = "{}";
try {
    clients = fs.readFileSync(process.env.APPDATA + '/organizador-sat/clientes.json', 'utf8');
    console.log("Found in clients:", clients.includes('Adanmiviejo'));
} catch (e) { }
