const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/firmas', express.static(path.join(__dirname, 'firmas')));

if (!fs.existsSync('./firmas')) fs.mkdirSync('./firmas');

const DB_FILE = path.join(__dirname, 'db.json');

function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            usuarios: [
                { cedula: "0750299778", nombres: "Dustin Salinas", password: "dustin123", rol: "Admin" }
            ],
            registros: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 4));
        return initialData;
    }
    try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        console.error("Error leyendo db.json:", e);
        return { usuarios: [], registros: [] };
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 4));
}

// --- LOGIN Y USUARIOS ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    const usuario = db.usuarios.find(u => u.cedula === username && u.password === password);
    if (usuario) {
        res.json({ cedula: usuario.cedula, nombres: usuario.nombres, rol: usuario.rol });
    } else {
        res.status(401).json({ error: "Credenciales incorrectas" });
    }
});

app.get('/api/admin/usuarios', (req, res) => {
    const db = readDB();
    res.json(db.usuarios);
});

app.post('/api/admin/usuarios', (req, res) => {
    const { cedula, nombres, password, rol } = req.body;
    const db = readDB();
    const existe = db.usuarios.some(u => u.cedula === cedula);
    if (existe) return res.status(400).json({ error: "El usuario ya existe." });
    db.usuarios.push({ cedula, nombres, password, rol });
    writeDB(db);
    res.sendStatus(201);
});

app.put('/api/admin/usuarios/:cedula', (req, res) => {
    const { cedula } = req.params;
    const { nombres, password, rol, cedula: nuevaCedula } = req.body;
    const db = readDB();
    const index = db.usuarios.findIndex(u => u.cedula === cedula);
    if (index === -1) return res.status(404).json({ error: "Usuario no encontrado." });

    if (nuevaCedula && nuevaCedula !== cedula) {
        const existe = db.usuarios.some(u => u.cedula === nuevaCedula);
        if (existe) return res.status(400).json({ error: "La nueva cédula ya está en uso." });
        db.usuarios[index].cedula = nuevaCedula;
    }

    if (nombres) db.usuarios[index].nombres = nombres;
    if (rol) db.usuarios[index].rol = rol;
    if (password && password.trim() !== '') db.usuarios[index].password = password;

    writeDB(db);
    res.json(db.usuarios[index]);
});

app.delete('/api/admin/usuarios/:cedula', (req, res) => {
    const { cedula } = req.params;
    const db = readDB();
    db.usuarios = db.usuarios.filter(u => u.cedula !== cedula);
    writeDB(db);
    res.sendStatus(200);
});

// --- REGISTROS DE ACCESO (ahora acepta fecha/hora manuales) ---
app.get('/api/registros', (req, res) => {
    const db = readDB();
    const ordenados = [...db.registros].sort((a, b) => a.id - b.id);
    res.json(ordenados);
});

app.post('/api/registros', (req, res) => {
    const { categoria, movimiento, cedula, nombres, placa, color, destino, razon, firma, fecha: fechaManual, hora: horaManual } = req.body;
    const db = readDB();

    // Fecha: usar la enviada o generar automáticamente
    let fecha;
    if (fechaManual && /^\d{4}-\d{2}-\d{2}$/.test(fechaManual)) {
        fecha = fechaManual;
    } else {
        const fechaObj = new Date();
        const offset = fechaObj.getTimezoneOffset();
        const localDate = new Date(fechaObj.getTime() - (offset * 60 * 1000));
        fecha = localDate.toISOString().split('T')[0];
    }

    // Hora: usar la enviada o generar automáticamente
    let hora;
    if (horaManual && /^\d{2}:\d{2}$/.test(horaManual)) {
        // Convertir a formato 12h con AM/PM para mantener consistencia con el historial
        const [hh, mm] = horaManual.split(':');
        let horas = parseInt(hh);
        const ampm = horas >= 12 ? 'PM' : 'AM';
        horas = horas % 12;
        horas = horas ? horas : 12;
        hora = `${String(horas).padStart(2, '0')}:${mm} ${ampm}`;
    } else {
        const fechaObj = new Date();
        let horas = fechaObj.getHours();
        const minutos = String(fechaObj.getMinutes()).padStart(2, '0');
        const ampm = horas >= 12 ? 'PM' : 'AM';
        horas = horas % 12;
        horas = horas ? horas : 12;
        hora = `${String(horas).padStart(2, '0')}:${minutos} ${ampm}`;
    }

    let nombreArchivoFirma = null;
    if (firma && typeof firma === 'string' && firma.startsWith('data:image/')) {
        nombreArchivoFirma = `firma_${Date.now()}_${cedula}.png`;
        const base64Data = firma.replace(/^data:image\/\w+;base64,/, "");
        fs.writeFileSync(path.join(__dirname, 'firmas', nombreArchivoFirma), base64Data, 'base64');
    }

    const maxId = db.registros.reduce((max, reg) => reg.id > max ? reg.id : max, 0);
    const nuevoId = maxId + 1;

    const nuevoRegistro = {
        id: nuevoId,
        fecha,
        hora,
        categoria,
        movimiento,
        cedula,
        nombres,
        placa: categoria === 'Peaton' ? 'NA' : placa,
        color: categoria === 'Volqueta' ? (color || 'NA') : 'NA',
        destino,
        razon,
        firma: nombreArchivoFirma
    };

    db.registros.push(nuevoRegistro);
    writeDB(db);
    res.sendStatus(201);
});

app.put('/api/registros/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const db = readDB();
    const index = db.registros.findIndex(r => r.id === id);
    if (index === -1) return res.status(404).json({ error: "Registro no encontrado." });

    const { categoria, movimiento, cedula, nombres, placa, color, destino, razon } = req.body;
    const reg = db.registros[index];

    reg.categoria = categoria || reg.categoria;
    reg.movimiento = movimiento || reg.movimiento;
    reg.cedula = cedula || reg.cedula;
    reg.nombres = nombres || reg.nombres;
    reg.destino = destino || reg.destino;
    reg.razon = razon || reg.razon;

    if (categoria) {
        reg.placa = (categoria === 'Peaton') ? 'NA' : (placa || 'NA');
        reg.color = (categoria === 'Volqueta') ? (color || 'NA') : 'NA';
    } else {
        if (placa !== undefined) reg.placa = (reg.categoria === 'Peaton') ? 'NA' : placa;
        if (color !== undefined) reg.color = (reg.categoria === 'Volqueta') ? (color || 'NA') : 'NA';
    }

    writeDB(db);
    res.json(reg);
});

app.delete('/api/registros/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const db = readDB();
    const registro = db.registros.find(r => r.id === id);
    if (registro) {
        if (registro.firma) {
            const pathFirma = path.join(__dirname, 'firmas', registro.firma);
            if (fs.existsSync(pathFirma)) {
                try { fs.unlinkSync(pathFirma); } catch (e) { console.error("No se pudo borrar firma:", e); }
            }
        }
        db.registros = db.registros.filter(r => r.id !== id);
        writeDB(db);
        res.sendStatus(200);
    } else {
        res.status(404).json({ error: "Registro no encontrado." });
    }
});

// --- ENDPOINT MODIFICADO: acepta 'fecha' como parámetro opcional ---
app.get('/api/autocompletar', (req, res) => {
    const { cedula, fecha } = req.query;
    const db = readDB();
    let registros = db.registros.filter(r => r.cedula === cedula);

    // Si se proporciona fecha, filtrar por ella
    if (fecha) {
        registros = registros.filter(r => r.fecha === fecha);
    }

    // Ordenar por id descendente y tomar el primero (más reciente)
    registros.sort((a, b) => b.id - a.id);
    const registroMatch = registros[0] || null;
    res.json(registroMatch);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=================================================`);
    console.log(`Servidor activo en el puerto ${PORT}`);
    console.log(`=================================================\n`);
});
