(() => {
  const el = sel => document.querySelector(sel)
  const els = sel => Array.from(document.querySelectorAll(sel))
  const state = { editingId: null, apiBase: localStorage.getItem('API_BASE') || '' }

  const inputId = el('#id')
  const inputTitulo = el('#titulo')
  const inputPonente = el('#ponente')
  const inputFecha = el('#fecha')
  const inputDuracion = el('#duracionMinutos')
  const inputCapacidad = el('#capacidad')
  const inputUbicacion = el('#ubicacion')
  const inputEtiquetas = el('#etiquetas')
  const inputDescripcion = el('#descripcion')

  const lista = el('#lista')
  const buscar = el('#buscar')
  const form = el('#seminarioForm')
  const apiBaseInput = el('#apiBase')
  const saveApiBtn = el('#saveApi')

  function setApiBase(value) {
    state.apiBase = (value || '').replace(/\/$/, '')
    localStorage.setItem('API_BASE', state.apiBase)
    apiBaseInput.value = state.apiBase
  }

  function api(path = '', options = {}) {
    const base = state.apiBase
    if (!base) {
      Swal.fire({ icon:'warning', title:'Configura la API', text:'Ingresa la URL del backend y presiona Guardar URL.' })
      throw new Error('API base no configurada')
    }
    const url = base + '/api/seminarios' + path
    const headers = { 'Content-Type': 'application/json' }
    return fetch(url, { headers, ...options })
      .then(async res => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const message = data?.message || 'Error en la solicitud'
          throw new Error(message)
        }
        return data
      })
  }

  function resetForm() {
    state.editingId = null
    inputId.value = ''
    form.reset()
    inputDuracion.value = 60
    inputCapacidad.value = 50
    inputUbicacion.value = 'virtual'
    el('#btnGuardar').textContent = 'Guardar'
  }

  function fillForm(item) {
    state.editingId = item._id
    inputId.value = item._id
    inputTitulo.value = item.titulo || ''
    inputPonente.value = item.ponente || ''
    inputFecha.value = item.fecha ? new Date(item.fecha).toISOString().slice(0,10) : ''
    inputDuracion.value = item.duracionMinutos ?? 60
    inputCapacidad.value = item.capacidad ?? 50
    inputUbicacion.value = item.ubicacion || 'virtual'
    inputEtiquetas.value = (item.etiquetas || []).join(',')
    inputDescripcion.value = item.descripcion || ''
    el('#btnGuardar').textContent = 'Actualizar'
  }

  function itemTemplate(s) {
    const fecha = s.fecha ? new Date(s.fecha).toLocaleDateString() : '—'
    const tags = (s.etiquetas || []).map(t => `<span class="chip">#${t}</span>`).join('')
    return `
      <div class="item">
        <div>
          <h3>${s.titulo}</h3>
          <div class="muted">${fecha} • ${s.ponente || 'Sin ponente'} • ${s.ubicacion}</div>
          ${s.descripcion ? `<p>${s.descripcion}</p>` : ''}
          <div class="chips">${tags}</div>
        </div>
        <div class="row">
          <button data-id="${s._id}" class="edit">Editar</button>
          <button data-id="${s._id}" class="danger delete">Eliminar</button>
        </div>
      </div>
    `
  }

  async function cargarLista() {
    const q = buscar.value.trim()
    try {
      const data = await api(q ? `?q=${encodeURIComponent(q)}` : '')
      lista.innerHTML = data.map(itemTemplate).join('') || '<p class="muted">Sin resultados...</p>'
    } catch (err) {
      console.error(err)
      Swal.fire({ icon:'error', title:'Error al cargar', text: err.message })
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const payload = {
      titulo: inputTitulo.value.trim(),
      ponente: inputPonente.value.trim() || undefined,
      fecha: inputFecha.value ? new Date(inputFecha.value) : undefined,
      duracionMinutos: parseInt(inputDuracion.value || '60', 10),
      capacidad: parseInt(inputCapacidad.value || '50', 10),
      ubicacion: inputUbicacion.value,
      etiquetas: inputEtiquetas.value.split(',').map(x => x.trim()).filter(Boolean),
      descripcion: inputDescripcion.value.trim() || undefined
    }
    try {
      if (state.editingId) {
        await api('/' + state.editingId, { method:'PUT', body: JSON.stringify(payload) })
        Swal.fire({ icon:'success', title:'Actualizado', timer: 1500, showConfirmButton:false })
      } else {
        await api('', { method:'POST', body: JSON.stringify(payload) })
        Swal.fire({ icon:'success', title:'Creado', timer: 1500, showConfirmButton:false })
      }
      resetForm()
      await cargarLista()
    } catch (err) {
      console.error(err)
      Swal.fire({ icon:'error', title:'No se pudo guardar', text: err.message })
    }
  })

  el('#btnCancelar').addEventListener('click', resetForm)

  lista.addEventListener('click', async (e) => {
    const btn = e.target.closest('button')
    if (!btn) return
    const id = btn.getAttribute('data-id')
    if (btn.classList.contains('edit')) {
      try {
        const item = await api('/' + id)
        fillForm(item)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } catch (err) {
        Swal.fire({ icon:'error', title:'No se pudo cargar', text: err.message })
      }
    }
    if (btn.classList.contains('delete')) {
      const c = await Swal.fire({ icon:'warning', title:'¿Eliminar?', text:'Esta acción no se puede deshacer', showCancelButton:true, confirmButtonText:'Sí, eliminar', cancelButtonText:'Cancelar' })
      if (c.isConfirmed) {
        try {
          await api('/' + id, { method:'DELETE' })
          Swal.fire({ icon:'success', title:'Eliminado', timer: 1200, showConfirmButton:false })
          await cargarLista()
        } catch (err) {
          Swal.fire({ icon:'error', title:'No se pudo eliminar', text: err.message })
        }
      }
    }
  })

  buscar.addEventListener('input', () => { cargarLista() })

  saveApiBtn.addEventListener('click', () => {
    const val = apiBaseInput.value.trim()
    if (!val) return Swal.fire({ icon:'info', title:'Ingresa una URL' })
    setApiBase(val)
    Swal.fire({ icon:'success', title:'URL guardada', timer: 1200, showConfirmButton:false })
    cargarLista()
  })

  // Inicialización
  setApiBase(state.apiBase)
  cargarLista()
})()
