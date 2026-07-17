let signaturePad;
let activeTab = 'registro';
let currentUser = null;
let todosLosRegistros = [];
let firmaCargadaBase64 = null;

window.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initSignaturePad();
    // Inicializar fecha y hora actuales
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('fecha').value = `${yyyy}-${mm}-${dd}`;
    document.getElementById('hora').value = `${hh}:${min}`;
    const saved = localStorage.getItem('currentUser');
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
            mostrarApp();
        } catch (e) {
            localStorage.removeItem('currentUser');
        }
    }
});

function mostrarApp() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('appSection').classList.remove('hidden');
    document.getElementById('userInfo').classList.remove('hidden');
    document.getElementById('userNombres').textContent = currentUser.nombres;
    document.getElementById('userRol').textContent = currentUser.rol;
    if (currentUser.rol === 'Admin') {
        document.getElementById('tab-usuarios').classList.remove('hidden');
    } else {
        document.getElementById('tab-usuarios').classList.add('hidden');
    }
    switchTab('registro');
    lucide.createIcons();
}

/* ---- Utilidades ---- */
function mostrarNotificacion(mensaje) {
    const noti = document.getElementById('notificacion');
    const texto = document.getElementById('textoNotificacion');
    texto.textContent = mensaje;
    noti.classList.remove('hidden');
    setTimeout(() => { noti.classList.add('hidden'); }, 3000);
    lucide.createIcons();
}

function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
    } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
    }
    lucide.createIcons();
}

/* ---- Firma ---- */
function initSignaturePad() {
    const canvas = document.getElementById('signature-pad');
    signaturePad = new SignaturePad(canvas, {
        penColor: 'rgb(15, 23, 42)',
        backgroundColor: 'rgb(255, 255, 255)'
    });
    function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
        signaturePad.clear();
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
}

function clearSignature() {
    signaturePad.clear();
    firmaCargadaBase64 = null;
    document.getElementById('vistaFirmaSubida').classList.add('hidden');
    document.getElementById('vistaFirmaSubida').src = '';
    document.getElementById('subirFirmaInput').value = '';
}

function cargarFirmaDesdeImagen(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        firmaCargadaBase64 = e.target.result;
        const vista = document.getElementById('vistaFirmaSubida');
        vista.src = firmaCargadaBase64;
        vista.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

/* ---- Tabs ---- */
function switchTab(tabId) {
    activeTab = tabId;
    const tabs = ['registro', 'lista', 'usuarios'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        const pane = document.getElementById(`pane-${t}`);
        if (btn && pane) {
            if (t === tabId) {
                btn.className = "flex-1 py-3 px-4 rounded-lg text-sm font-semibold flex justify-center items-center gap-2 bg-blue-600 text-white transition-all shadow-md shadow-blue-100";
                pane.classList.remove('hidden');
            } else {
                btn.className = "flex-1 py-3 px-4 rounded-lg text-sm font-semibold flex justify-center items-center gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all";
                pane.classList.add('hidden');
            }
        }
    });
    if (tabId === 'lista') cargarRegistros();
    if (tabId === 'usuarios') cargarUsuarios();
}

function toggleCategoria() {
    const cat = document.getElementById('categoria').value;
    const divVehiculo = document.getElementById('seccionVehiculo');
    const contenedorColor = document.getElementById('contenedorColor');
    if (cat === 'Vehiculo' || cat === 'Volqueta') {
        divVehiculo.classList.remove('hidden');
        if (cat === 'Volqueta') {
            contenedorColor.classList.remove('hidden');
        } else {
            contenedorColor.classList.add('hidden');
            document.getElementById('color').value = '';
        }
    } else {
        divVehiculo.classList.add('hidden');
        contenedorColor.classList.add('hidden');
        document.getElementById('placa').value = '';
        document.getElementById('color').value = '';
    }
}

function toggleEditCategoria() {
    const cat = document.getElementById('editCategoria').value;
    const divVehiculo = document.getElementById('editSeccionVehiculo');
    const contenedorColor = document.getElementById('editContenedorColor');
    if (cat === 'Vehiculo' || cat === 'Volqueta') {
        divVehiculo.classList.remove('hidden');
        if (cat === 'Volqueta') {
            contenedorColor.classList.remove('hidden');
        } else {
            contenedorColor.classList.add('hidden');
            document.getElementById('editColor').value = '';
        }
    } else {
        divVehiculo.classList.add('hidden');
        contenedorColor.classList.add('hidden');
        document.getElementById('editPlaca').value = '';
        document.getElementById('editColor').value = '';
    }
}

/* ---- Autocompletar cédula (carga firma anterior) ---- */
async function detectarCedulaCompleta() {
    const cedulaInput = document.getElementById('cedula');
    const loading = document.getElementById('loadingCedula');
    const cedula = cedulaInput.value.trim();
    if (cedula.length === 10) {
        loading.classList.remove('hidden');
        try {
            const res = await fetch(`/api/autocompletar?cedula=${cedula}`);
            const data = await res.json();
            if (data) {
                document.getElementById('nombres').value = data.nombres;
                document.getElementById('categoria').value = data.categoria;
                toggleCategoria();
                if (data.categoria === 'Vehiculo' || data.categoria === 'Volqueta') {
                    document.getElementById('placa').value = data.placa;
                    if (data.categoria === 'Volqueta') {
                        document.getElementById('color').value = data.color;
                    }
                }
                document.getElementById('destino').value = data.destino;
                document.getElementById('razon').value = data.razon;

                if (data.firma) {
                    try {
                        const resFirma = await fetch(`/firmas/${data.firma}`);
                        const blob = await resFirma.blob();
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            firmaCargadaBase64 = reader.result;
                            const vista = document.getElementById('vistaFirmaSubida');
                            vista.src = firmaCargadaBase64;
                            vista.classList.remove('hidden');
                            signaturePad.clear();
                        };
                        reader.readAsDataURL(blob);
                    } catch (e) {
                        console.error('No se pudo cargar la firma anterior', e);
                    }
                } else {
                    clearSignature();
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            loading.classList.add('hidden');
        }
    }
}

/* ---- Login ---- */
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (response.ok) {
            const data = await response.json();
            currentUser = data;
            localStorage.setItem('currentUser', JSON.stringify(data));
            mostrarApp();
        } else {
            alert('Credenciales incorrectas');
        }
    } catch (err) {
        console.error(err);
        alert('Error de conexión.');
    }
});

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    document.getElementById('appSection').classList.add('hidden');
    document.getElementById('userInfo').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('loginForm').reset();
}

/* ---- Guardar Registro (ahora envía fecha y hora manuales) ---- */
document.getElementById('registroForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    let firmaFinal = null;
    if (!signaturePad.isEmpty()) {
        firmaFinal = signaturePad.toDataURL();
    } else if (firmaCargadaBase64) {
        firmaFinal = firmaCargadaBase64;
    }

    const fechaVal = document.getElementById('fecha').value;
    const horaVal = document.getElementById('hora').value;

    const body = {
        categoria: document.getElementById('categoria').value,
        movimiento: document.getElementById('movimiento').value,
        cedula: document.getElementById('cedula').value,
        nombres: document.getElementById('nombres').value,
        placa: document.getElementById('placa').value,
        color: document.getElementById('color').value,
        destino: document.getElementById('destino').value,
        razon: document.getElementById('razon').value,
        firma: firmaFinal,
        fecha: fechaVal || null,
        hora: horaVal || null
    };

    try {
        const response = await fetch('/api/registros', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (response.ok) {
            mostrarNotificacion('Registro guardado exitosamente');
            document.getElementById('registroForm').reset();
            clearSignature();
            toggleCategoria();
            // Restablecer fecha y hora actuales
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const hh = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            document.getElementById('fecha').value = `${yyyy}-${mm}-${dd}`;
            document.getElementById('hora').value = `${hh}:${min}`;
            switchTab('lista');
        } else {
            alert('Error guardando registro.');
        }
    } catch (err) {
        console.error(err);
        alert('No se pudo guardar el registro.');
    }
});

/* ---- Historial y Filtros ---- */
async function cargarRegistros() {
    try {
        const res = await fetch('/api/registros');
        todosLosRegistros = await res.json();
        aplicarFiltros();
    } catch (e) {
        console.error(e);
    }
}

function aplicarFiltros() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    let desde = document.getElementById('fechaDesde').value;
    let hasta = document.getElementById('fechaHasta').value;

    if (!desde && !hasta) {
        const hoy = new Date();
        const yyyy = hoy.getFullYear();
        const mm = String(hoy.getMonth() + 1).padStart(2, '0');
        const dd = String(hoy.getDate()).padStart(2, '0');
        desde = `${yyyy}-${mm}-${dd}`;
        hasta = desde;
    }

    const filtrados = todosLosRegistros.filter(r => {
        const coincideTexto = !query ||
            r.nombres.toLowerCase().includes(query) ||
            r.cedula.toLowerCase().includes(query) ||
            (r.placa && r.placa.toLowerCase().includes(query));
        let coincideFecha = true;
        if (desde && r.fecha < desde) coincideFecha = false;
        if (hasta && r.fecha > hasta) coincideFecha = false;
        return coincideTexto && coincideFecha;
    });
    renderRegistros(filtrados);
}

function renderRegistros(registros) {
    const tbody = document.getElementById('tablaRegistros');
    tbody.innerHTML = '';

    registros.forEach((reg, index) => {
        let badgeCat = '';
        if (reg.categoria === 'Peaton') {
            badgeCat = '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-100">Peatón</span>';
        } else if (reg.categoria === 'Vehiculo') {
            badgeCat = '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">Vehículo</span>';
        } else if (reg.categoria === 'Volqueta') {
            badgeCat = '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">Volqueta</span>';
        }

        const badgeMov = reg.movimiento === 'Entrada'
            ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-100">Entrada</span>'
            : '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">Salida</span>';

        const botonEditar = currentUser && currentUser.rol === 'Admin'
            ? `<button onclick="abrirEditarRegistro(${reg.id})" class="p-1 text-blue-500 hover:bg-blue-50 rounded transition" title="Editar"><i data-lucide="pencil" class="w-4 h-4"></i></button>`
            : '';
        const botonEliminar = currentUser && currentUser.rol === 'Admin'
            ? `<button onclick="eliminarRegistro(${reg.id})" class="p-1 hover:bg-red-50 text-red-500 rounded transition" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`
            : '';

        let placaColorHTML = '—';
        if (reg.categoria === 'Vehiculo') {
            placaColorHTML = `<span class="font-semibold text-slate-800">${reg.placa}</span><br><span class="text-xs text-slate-400">Color: NA</span>`;
        } else if (reg.categoria === 'Volqueta') {
            placaColorHTML = `<span class="font-semibold text-slate-800">${reg.placa}</span><br><span class="text-xs font-medium text-slate-600">Color: ${reg.color || 'NA'}</span>`;
        }

        const tr = document.createElement('tr');
        tr.className = (index % 2 === 0) ? 'bg-white hover:bg-slate-50 transition-colors' : 'bg-slate-50 hover:bg-slate-100 transition-colors';
        tr.innerHTML = `
            <td class="px-4 py-3 font-semibold text-slate-400">${reg.id}</td>
            <td class="px-4 py-3">
                <div class="font-medium text-slate-800">${reg.fecha}</div>
                <div class="text-xs text-slate-400">${reg.hora}</div>
            </td>
            <td class="px-4 py-3">${badgeCat}</td>
            <td class="px-4 py-3">${badgeMov}</td>
            <td class="px-4 py-3">
                <div class="font-bold text-slate-800">${reg.nombres}</div>
                <div class="text-xs text-slate-400">CI: ${reg.cedula}</div>
            </td>
            <td class="px-4 py-3 text-slate-700">${placaColorHTML}</td>
            <td class="px-4 py-3 text-slate-700">
                <div class="font-medium">${reg.destino}</div>
                <div class="text-xs text-slate-400 italic">"${reg.razon}"</div>
            </td>
            <td class="px-4 py-3">
                ${reg.firma ? `<button onclick="verFirma('${reg.firma}')" class="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition"><i data-lucide="eye" class="w-3.5 h-3.5"></i> Ver</button>` : '—'}
            </td>
            <td class="px-4 py-3 text-center">
                <div class="flex justify-center items-center space-x-1">${botonEditar}${botonEliminar}</div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

/* ---- Editar Registro ---- */
function abrirEditarRegistro(id) {
    const registro = todosLosRegistros.find(r => r.id === id);
    if (!registro) return;

    document.getElementById('editRegistroId').value = id;
    document.getElementById('editCategoria').value = registro.categoria;
    document.getElementById('editMovimiento').value = registro.movimiento;
    document.getElementById('editCedula').value = registro.cedula;
    document.getElementById('editNombresReg').value = registro.nombres;
    document.getElementById('editPlaca').value = registro.placa === 'NA' ? '' : registro.placa;
    document.getElementById('editColor').value = registro.color === 'NA' ? '' : registro.color;
    document.getElementById('editDestino').value = registro.destino;
    document.getElementById('editRazon').value = registro.razon;
    toggleEditCategoria();
    document.getElementById('modalEditarRegistro').classList.remove('hidden');
}

function cerrarModalEditarRegistro() {
    document.getElementById('modalEditarRegistro').classList.add('hidden');
}

async function guardarEdicionRegistro() {
    const id = document.getElementById('editRegistroId').value;
    const body = {
        categoria: document.getElementById('editCategoria').value,
        movimiento: document.getElementById('editMovimiento').value,
        cedula: document.getElementById('editCedula').value,
        nombres: document.getElementById('editNombresReg').value,
        placa: document.getElementById('editPlaca').value,
        color: document.getElementById('editColor').value,
        destino: document.getElementById('editDestino').value,
        razon: document.getElementById('editRazon').value
    };
    try {
        const response = await fetch(`/api/registros/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (response.ok) {
            mostrarNotificacion('Registro actualizado correctamente');
            cerrarModalEditarRegistro();
            cargarRegistros();
        } else {
            const err = await response.json();
            alert(err.error || 'Error al actualizar.');
        }
    } catch (err) {
        console.error(err);
        alert('Error de conexión.');
    }
}

async function eliminarRegistro(id) {
    if (!confirm('¿Seguro de eliminar permanentemente este registro?')) return;
    try {
        const res = await fetch(`/api/registros/${id}`, { method: 'DELETE' });
        if (res.ok) cargarRegistros();
    } catch (e) { console.error(e); }
}

function verFirma(nombreArchivo) {
    const img = document.getElementById('imgFirmaModal');
    img.src = `/firmas/${nombreArchivo}`;
    document.getElementById('modalFirma').classList.remove('hidden');
}

function cerrarModal() {
    document.getElementById('modalFirma').classList.add('hidden');
}

/* ---- Generar PDF (CORREGIDO) ---- */
async function generarPDF() {
    if (!currentUser) return;

    const tbody = document.getElementById('tablaRegistros');
    const trs = tbody.querySelectorAll('tr');
    if (trs.length === 0) {
        alert('No hay registros para exportar.');
        return;
    }

    const filas = [];
    for (const tr of trs) {
        const celdas = tr.querySelectorAll('td');
        if (celdas.length < 9) continue;

        const id = celdas[0].innerText.trim();
        const fechaHoraTexto = celdas[1].innerText.trim().replace(/\n/g, ' ');
        const movimiento = celdas[3].innerText.trim();
        const identidadDivs = celdas[4].querySelectorAll('div');
        const nombreCompleto = identidadDivs[0] ? identidadDivs[0].innerText.trim() : '';
        const cedulaTexto = identidadDivs[1] ? identidadDivs[1].innerText.replace('CI: ','').trim() : '';
        const placaSpan = celdas[5].querySelector('.font-semibold');
        const placa = placaSpan ? placaSpan.innerText.trim() : '—';
        const destinoDiv = celdas[6].querySelector('.font-medium');
        const destino = destinoDiv ? destinoDiv.innerText.trim() : '';
        const razonDiv = celdas[6].querySelector('.italic');
        const razon = razonDiv ? razonDiv.innerText.replace(/"/g, '').trim() : '';
        const btnFirma = celdas[7].querySelector('button');
        let firmaArchivo = null;
        if (btnFirma && btnFirma.getAttribute('onclick')) {
            const match = btnFirma.getAttribute('onclick').match(/verFirma\('(.+?)'\)/);
            if (match) firmaArchivo = match[1];
        }

        filas.push({ id, fechaHora: fechaHoraTexto, movimiento, nombreCompleto, cedula: cedulaTexto, placa, destino, razon, firmaArchivo });
    }

    const firmasImg = {};
    for (const fila of filas) {
        if (fila.firmaArchivo && !firmasImg[fila.firmaArchivo]) {
            try {
                const res = await fetch(`/firmas/${fila.firmaArchivo}`);
                const blob = await res.blob();
                const dataUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
                firmasImg[fila.firmaArchivo] = dataUrl;
            } catch (e) {
                firmasImg[fila.firmaArchivo] = null;
            }
        }
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Registro de Accesos - Mina', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Registrado por: ${currentUser.nombres}`, 14, 34);

    const headers = ['ID', 'Fecha/Hora', 'Movimiento', 'Nombre y Apellidos', 'Cédula', 'Placa Vehículo', 'Destino', 'Razón Ingreso/Salida', 'Firma'];

    const body = filas.map(f => [
        f.id, f.fechaHora, f.movimiento, f.nombreCompleto, f.cedula, f.placa, f.destino, f.razon,
        f.firmaArchivo ? ' ' : 'No Firma'
    ]);

    doc.autoTable({
        startY: 42,
        head: [headers],
        body: body,
        styles: {
            fontSize: 7,
            cellPadding: 1.5,
            overflow: 'linebreak',
            lineWidth: 0.1,
            lineColor: [200, 200, 200],
            fillColor: [255, 255, 255]
        },
        headStyles: {
            fillColor: [37, 99, 235],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 24 },
            2: { cellWidth: 18 },
            3: { cellWidth: 28 },
            4: { cellWidth: 20 },
            5: { cellWidth: 22 },
            6: { cellWidth: 22 },
            7: { cellWidth: 24 },
            8: { cellWidth: 22 }
        },
        didDrawCell: function(data) {
            if (data.row.section !== 'body') return;
            if (data.column.index === 8) {
                const filaIndex = data.row.index;
                const firmaArchivo = filas[filaIndex] ? filas[filaIndex].firmaArchivo : null;
                if (firmaArchivo && firmasImg[firmaArchivo]) {
                    const cell = data.cell;
                    const x = cell.x + 1;
                    const y = cell.y + 1;
                    const w = cell.width - 2;
                    const h = cell.height - 2;
                    try {
                        doc.addImage(firmasImg[firmaArchivo], 'PNG', x, y, w, h);
                    } catch (e) { /* fallback */ }
                }
            }
        }
    });

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const filename = `${yyyy}${mm}${dd}_${hh}${min}${ss}_Reporte.pdf`;
    doc.save(filename);
}

/* ---- Gestión de Usuarios ---- */
async function cargarUsuarios() {
    try {
        const res = await fetch('/api/admin/usuarios');
        const users = await res.json();
        const tbody = document.getElementById('tablaUsuarios');
        tbody.innerHTML = '';

        users.forEach((u, index) => {
            const tr = document.createElement('tr');
            tr.className = (index % 2 === 0) ? 'bg-white hover:bg-slate-50' : 'bg-slate-50 hover:bg-slate-100';
            const botonEliminar = `<button onclick="${u.cedula === '0750299778' ? 'eliminarUsuarioPrincipal()' : `eliminarUsuario('${u.cedula}')`}" class="p-1 text-red-500 hover:bg-red-50 rounded transition" title="Eliminar"><i data-lucide="user-x" class="w-4 h-4"></i></button>`;
            tr.innerHTML = `
                <td class="px-4 py-3 text-slate-700 font-medium">${u.cedula}</td>
                <td class="px-4 py-3 text-slate-800 font-bold">${u.nombres}</td>
                <td class="px-4 py-3"><span class="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-700">${u.rol}</span></td>
                <td class="px-4 py-3 text-center">
                    <div class="flex justify-center items-center gap-2">
                        <button onclick="abrirEditarUsuario('${u.cedula}', '${u.nombres.replace(/'/g, "\\'")}', '${u.rol}')" class="p-1 text-blue-500 hover:bg-blue-50 rounded transition" title="Editar">
                            <i data-lucide="pencil" class="w-4 h-4"></i>
                        </button>
                        ${botonEliminar}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
        lucide.createIcons();
    } catch (e) { console.error(e); }
}

function eliminarUsuarioPrincipal() {
    alert('No se puede eliminar el usuario principal del sistema.');
}

function abrirEditarUsuario(cedula, nombres, rol) {
    document.getElementById('editCedulaOriginal').value = cedula;
    document.getElementById('editCedulaNueva').value = cedula;
    document.getElementById('editNombres').value = nombres;
    document.getElementById('editPassword').value = '';
    document.getElementById('editRol').value = rol;
    document.getElementById('modalEditarUsuario').classList.remove('hidden');
}

function cerrarModalEditar() {
    document.getElementById('modalEditarUsuario').classList.add('hidden');
}

async function guardarEdicionUsuario() {
    const cedulaOriginal = document.getElementById('editCedulaOriginal').value;
    const cedulaNueva = document.getElementById('editCedulaNueva').value.trim();
    const nombres = document.getElementById('editNombres').value.trim();
    const password = document.getElementById('editPassword').value;
    const rol = document.getElementById('editRol').value;

    if (!cedulaNueva) {
        alert('La cédula no puede estar vacía.');
        return;
    }

    const body = { nombres, rol, cedula: cedulaNueva };
    if (password.trim() !== '') body.password = password;

    try {
        const res = await fetch(`/api/admin/usuarios/${cedulaOriginal}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (res.ok) {
            mostrarNotificacion('Usuario actualizado correctamente');
            cerrarModalEditar();
            cargarUsuarios();
            if (currentUser && currentUser.cedula === cedulaOriginal) {
                currentUser.cedula = cedulaNueva;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
        } else {
            const err = await res.json();
            alert(err.error || 'Error al actualizar.');
        }
    } catch (e) { console.error(e); }
}

document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
        cedula: document.getElementById('uCedula').value,
        nombres: document.getElementById('uNombres').value,
        password: document.getElementById('uPassword').value,
        rol: document.getElementById('uRol').value
    };
    try {
        const res = await fetch('/api/admin/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (res.ok) {
            mostrarNotificacion('Usuario registrado correctamente');
            document.getElementById('userForm').reset();
            cargarUsuarios();
        } else {
            const err = await res.json();
            alert(err.error || 'No se pudo crear.');
        }
    } catch (e) { console.error(e); }
});

async function eliminarUsuario(cedula) {
    if (!confirm('¿Desea dar de baja a este usuario?')) return;
    try {
        const res = await fetch(`/api/admin/usuarios/${cedula}`, { method: 'DELETE' });
        if (res.ok) cargarUsuarios();
    } catch (e) { console.error(e); }
}
