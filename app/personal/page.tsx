"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../components/Sidebar";

type Trabajador = {
  id: string;
  finca_id: string;
  nombre: string;
  apellido: string | null;
  documento: string | null;
  telefono: string | null;
  cargo: string | null;
  fecha_ingreso: string | null;
  fecha_salida: string | null;
  estado: string;
  tipo_pago: string;
  salario_base: number;
  moneda: string;
  observaciones: string | null;
  created_at: string;
};

type DocumentoPendiente = {
  id: string;
  tipo: string;
  archivo: File;
  descripcion: string;
};

type ArchivoTrabajador = {
  id: string;
  finca_id: string;
  trabajador_id: string;
  tipo: string;
  nombre_archivo: string;
  ruta_storage: string;
  mime_type: string | null;
  tamano_bytes: number | null;
  descripcion: string | null;
  registrado_por: string | null;
  created_at: string;
};

type Formulario = {
  nombre: string;
  apellido: string;
  documento: string;
  telefono: string;
  cargo: string;
  fecha_ingreso: string;
  fecha_salida: string;
  estado: string;
  tipo_pago: string;
  salario_base: string;
  moneda: string;
  observaciones: string;
};

const formularioInicial: Formulario = {
  nombre: "",
  apellido: "",
  documento: "",
  telefono: "",
  cargo: "",
  fecha_ingreso: "",
  fecha_salida: "",
  estado: "activo",
  tipo_pago: "mensual",
  salario_base: "0",
  moneda: "BOB",
  observaciones: "",
};

const tiposArchivo = [
  { valor: "foto", texto: "Foto del trabajador" },
  { valor: "ci_anverso", texto: "CI - Anverso" },
  { valor: "ci_reverso", texto: "CI - Reverso" },
  { valor: "licencia", texto: "Licencia" },
  { valor: "contrato", texto: "Contrato" },
  { valor: "certificado", texto: "Certificado" },
  { valor: "otro", texto: "Otro documento" },
];

export default function PersonalPage() {
  const router = useRouter();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

  const [fincaId, setFincaId] = useState("");
  const [usuarioId, setUsuarioId] = useState("");

  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [archivos, setArchivos] = useState<ArchivoTrabajador[]>([]);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [formulario, setFormulario] =
    useState<Formulario>(formularioInicial);

  const [tipoArchivo, setTipoArchivo] = useState("foto");
  const [descripcionArchivo, setDescripcionArchivo] = useState("");
  const [archivoSeleccionado, setArchivoSeleccionado] =
    useState<File | null>(null);
  const [documentosPendientes, setDocumentosPendientes] = useState<
    DocumentoPendiente[]
  >([]);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    iniciar();
  }, []);

  const iniciar = async () => {
    setCargando(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/");
      return;
    }

    const { data: usuario, error: errorUsuario } = await supabase
      .from("gan_usuarios")
      .select("finca_id, activo")
      .eq("user_id", user.id)
      .eq("activo", true)
      .maybeSingle();

    if (errorUsuario || !usuario) {
      await supabase.auth.signOut();
      router.replace("/");
      return;
    }

    setUsuarioId(user.id);
    setFincaId(usuario.finca_id);

    await cargarTrabajadores(usuario.finca_id);

    setCargando(false);
  };

  const cargarTrabajadores = async (idFinca: string) => {
    const { data, error: errorCarga } = await supabase
      .from("gan_trabajadores")
      .select(`
        id,
        finca_id,
        nombre,
        apellido,
        documento,
        telefono,
        cargo,
        fecha_ingreso,
        fecha_salida,
        estado,
        tipo_pago,
        salario_base,
        moneda,
        observaciones,
        created_at
      `)
      .eq("finca_id", idFinca)
      .order("nombre", { ascending: true });

    if (errorCarga) {
      setError(`Error al cargar personal: ${errorCarga.message}`);
      return;
    }

    setTrabajadores((data || []) as Trabajador[]);
  };

  const cargarArchivos = async (trabajadorId: string) => {
    const { data, error: errorArchivos } = await supabase
      .from("gan_trabajador_archivos")
      .select("*")
      .eq("trabajador_id", trabajadorId)
      .order("created_at", { ascending: false });

    if (errorArchivos) {
      setError(`Error al cargar documentos: ${errorArchivos.message}`);
      return;
    }

    setArchivos((data || []) as ArchivoTrabajador[]);
  };

  const totalActivos = useMemo(
    () => trabajadores.filter((t) => t.estado === "activo").length,
    [trabajadores]
  );

  const totalVacaciones = useMemo(
    () => trabajadores.filter((t) => t.estado === "vacaciones").length,
    [trabajadores]
  );

  const totalLicencia = useMemo(
    () => trabajadores.filter((t) => t.estado === "licencia").length,
    [trabajadores]
  );

  const abrirNuevo = () => {
    setFormulario(formularioInicial);
    setEditandoId(null);
    setArchivos([]);
    setTipoArchivo("foto");
    setDescripcionArchivo("");
    setArchivoSeleccionado(null);
    setDocumentosPendientes([]);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);
  };

  const abrirEditar = async (trabajador: Trabajador) => {
    setFormulario({
      nombre: trabajador.nombre || "",
      apellido: trabajador.apellido || "",
      documento: trabajador.documento || "",
      telefono: trabajador.telefono || "",
      cargo: trabajador.cargo || "",
      fecha_ingreso: trabajador.fecha_ingreso || "",
      fecha_salida: trabajador.fecha_salida || "",
      estado: trabajador.estado || "activo",
      tipo_pago: trabajador.tipo_pago || "mensual",
      salario_base: String(trabajador.salario_base ?? 0),
      moneda: trabajador.moneda || "BOB",
      observaciones: trabajador.observaciones || "",
    });

    setEditandoId(trabajador.id);
    setTipoArchivo("foto");
    setDescripcionArchivo("");
    setArchivoSeleccionado(null);
    setDocumentosPendientes([]);
    setError("");
    setMensaje("");
    setMostrarFormulario(true);

    await cargarArchivos(trabajador.id);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const cancelarFormulario = () => {
    setMostrarFormulario(false);
    setEditandoId(null);
    setFormulario(formularioInicial);
    setArchivos([]);
    setArchivoSeleccionado(null);
    setDocumentosPendientes([]);
    setDescripcionArchivo("");
    setError("");
  };

  const cambiarCampo = (campo: keyof Formulario, valor: string) => {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  };

  const guardarTrabajador = async () => {
    setError("");
    setMensaje("");

    if (!formulario.nombre.trim()) {
      setError("El nombre del trabajador es obligatorio.");
      return;
    }

    if (!fincaId) {
      setError("No se encontró la finca.");
      return;
    }

    const salario = Number(formulario.salario_base || 0);

    if (Number.isNaN(salario) || salario < 0) {
      setError("El salario debe ser un número igual o mayor a 0.");
      return;
    }

    setGuardando(true);

    const datos = {
      finca_id: fincaId,
      nombre: formulario.nombre.trim(),
      apellido: formulario.apellido.trim() || null,
      documento: formulario.documento.trim() || null,
      telefono: formulario.telefono.trim() || null,
      cargo: formulario.cargo.trim() || null,
      fecha_ingreso: formulario.fecha_ingreso || null,
      fecha_salida: formulario.fecha_salida || null,
      estado: formulario.estado,
      tipo_pago: formulario.tipo_pago,
      salario_base: salario,
      moneda: formulario.moneda.trim() || "BOB",
      observaciones: formulario.observaciones.trim() || null,
    };

    if (editandoId) {
      const { error: errorGuardar } = await supabase
        .from("gan_trabajadores")
        .update(datos)
        .eq("id", editandoId)
        .eq("finca_id", fincaId);

      if (errorGuardar) {
        setError(`Error al actualizar trabajador: ${errorGuardar.message}`);
        setGuardando(false);
        return;
      }

      setMensaje("Trabajador actualizado correctamente.");
      await cargarTrabajadores(fincaId);
      setGuardando(false);
      return;
    }

    const { data: trabajadorCreado, error: errorGuardar } = await supabase
      .from("gan_trabajadores")
      .insert(datos)
      .select("id")
      .single();

    if (errorGuardar || !trabajadorCreado) {
      setError(
        `Error al registrar trabajador: ${
          errorGuardar?.message || "No se pudo obtener el trabajador creado."
        }`
      );
      setGuardando(false);
      return;
    }

    let errorDocumentos = "";

    for (const documento of documentosPendientes) {
      const resultado = await subirArchivoParaTrabajador(
        trabajadorCreado.id,
        documento.tipo,
        documento.archivo,
        documento.descripcion
      );

      if (!resultado.ok) {
        errorDocumentos = resultado.error || "Error al subir un documento.";
        break;
      }
    }

    await cargarTrabajadores(fincaId);

    if (errorDocumentos) {
      setEditandoId(trabajadorCreado.id);
      setDocumentosPendientes([]);
      await cargarArchivos(trabajadorCreado.id);
      setError(
        `El trabajador fue registrado, pero hubo un problema con un documento: ${errorDocumentos}`
      );
      setGuardando(false);
      return;
    }

    setMensaje("Trabajador y documentos registrados correctamente.");
    setMostrarFormulario(false);
    setEditandoId(null);
    setFormulario(formularioInicial);
    setDocumentosPendientes([]);
    setGuardando(false);
  };

  const validarArchivo = (archivo: File) => {
    if (archivo.size > 10 * 1024 * 1024) {
      return "El archivo no puede superar los 10 MB.";
    }

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!tiposPermitidos.includes(archivo.type)) {
      return "Solo se permiten imágenes JPG, PNG, WEBP o documentos PDF.";
    }

    return "";
  };

  const limpiarSelectorArchivo = () => {
    setArchivoSeleccionado(null);
    setDescripcionArchivo("");
    setTipoArchivo("foto");

    const input = document.getElementById(
      "archivo-personal"
    ) as HTMLInputElement | null;

    if (input) input.value = "";
  };

  const subirArchivoParaTrabajador = async (
    trabajadorId: string,
    tipo: string,
    archivo: File,
    descripcion: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const errorValidacion = validarArchivo(archivo);

    if (errorValidacion) {
      return { ok: false, error: errorValidacion };
    }

    const extension = archivo.name.split(".").pop()?.toLowerCase() || "archivo";
    const nombreSeguro = `${tipo}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}.${extension}`;
    const rutaStorage = `${fincaId}/${trabajadorId}/${nombreSeguro}`;

    const { error: errorStorage } = await supabase.storage
      .from("gan-personal")
      .upload(rutaStorage, archivo, {
        cacheControl: "3600",
        upsert: false,
        contentType: archivo.type,
      });

    if (errorStorage) {
      return { ok: false, error: errorStorage.message };
    }

    const { error: errorRegistro } = await supabase
      .from("gan_trabajador_archivos")
      .insert({
        finca_id: fincaId,
        trabajador_id: trabajadorId,
        tipo,
        nombre_archivo: archivo.name,
        ruta_storage: rutaStorage,
        mime_type: archivo.type,
        tamano_bytes: archivo.size,
        descripcion: descripcion.trim() || null,
        registrado_por: usuarioId,
      });

    if (errorRegistro) {
      await supabase.storage.from("gan-personal").remove([rutaStorage]);
      return { ok: false, error: errorRegistro.message };
    }

    return { ok: true };
  };

  const agregarDocumentoPendiente = () => {
    setError("");
    setMensaje("");

    if (!archivoSeleccionado) {
      setError("Selecciona un archivo.");
      return;
    }

    const errorValidacion = validarArchivo(archivoSeleccionado);

    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    setDocumentosPendientes((anteriores) => [
      ...anteriores,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tipo: tipoArchivo,
        archivo: archivoSeleccionado,
        descripcion: descripcionArchivo.trim(),
      },
    ]);

    limpiarSelectorArchivo();
    setMensaje(
      "Documento preparado. Se subirá cuando guardes al trabajador."
    );
  };

  const eliminarDocumentoPendiente = (id: string) => {
    setDocumentosPendientes((anteriores) =>
      anteriores.filter((documento) => documento.id !== id)
    );
  };

  const subirDocumento = async () => {
    setError("");
    setMensaje("");

    if (!editandoId) {
      agregarDocumentoPendiente();
      return;
    }

    if (!archivoSeleccionado) {
      setError("Selecciona un archivo.");
      return;
    }

    setSubiendoArchivo(true);

    const resultado = await subirArchivoParaTrabajador(
      editandoId,
      tipoArchivo,
      archivoSeleccionado,
      descripcionArchivo
    );

    if (!resultado.ok) {
      setError(`Error al subir el archivo: ${resultado.error}`);
      setSubiendoArchivo(false);
      return;
    }

    limpiarSelectorArchivo();
    await cargarArchivos(editandoId);
    setMensaje("Documento agregado correctamente.");
    setSubiendoArchivo(false);
  };

  const abrirDocumento = async (archivo: ArchivoTrabajador) => {
    setError("");

    const { data, error: errorUrl } = await supabase.storage
      .from("gan-personal")
      .createSignedUrl(archivo.ruta_storage, 60);

    if (errorUrl || !data?.signedUrl) {
      setError(
        `No se pudo abrir el documento: ${
          errorUrl?.message || "Error desconocido"
        }`
      );
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const eliminarDocumento = async (archivo: ArchivoTrabajador) => {
    const confirmar = window.confirm(
      `¿Eliminar "${archivo.nombre_archivo}"?`
    );

    if (!confirmar) return;

    setError("");
    setMensaje("");

    const { error: errorStorage } = await supabase.storage
      .from("gan-personal")
      .remove([archivo.ruta_storage]);

    if (errorStorage) {
      setError(`No se pudo eliminar el archivo: ${errorStorage.message}`);
      return;
    }

    const { error: errorRegistro } = await supabase
      .from("gan_trabajador_archivos")
      .delete()
      .eq("id", archivo.id)
      .eq("finca_id", fincaId);

    if (errorRegistro) {
      setError(
        `El archivo fue eliminado del almacenamiento, pero hubo un error al eliminar su registro: ${errorRegistro.message}`
      );
      return;
    }

    if (editandoId) {
      await cargarArchivos(editandoId);
    }

    setMensaje("Documento eliminado correctamente.");
  };

  const nombreCompleto = (trabajador: Trabajador) =>
    [trabajador.nombre, trabajador.apellido].filter(Boolean).join(" ");

  const mostrarFecha = (fecha: string | null) => {
    if (!fecha) return "—";

    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
  };

  const mostrarDinero = (
    valor: number | null,
    moneda: string | null
  ) => {
    if (valor === null) return "—";

    return `${moneda || "BOB"} ${Number(valor).toLocaleString("es-BO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const etiquetaEstado = (estado: string) => {
    switch (estado) {
      case "activo":
        return "Activo";
      case "vacaciones":
        return "Vacaciones";
      case "licencia":
        return "Licencia";
      case "retirado":
        return "Retirado";
      default:
        return estado;
    }
  };

  const etiquetaPago = (tipo: string | null) => {
    switch (tipo) {
      case "diario":
        return "Diario";
      case "semanal":
        return "Semanal";
      case "quincenal":
        return "Quincenal";
      case "mensual":
        return "Mensual";
      case "otro":
        return "Otro";
      default:
        return "—";
    }
  };

  const etiquetaTipoArchivo = (tipo: string) =>
    tiposArchivo.find((item) => item.valor === tipo)?.texto || tipo;

  const mostrarTamano = (bytes: number | null) => {
    if (!bytes) return "—";

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (cargando) {
    return (
      <>
        <Sidebar />
        <main className="personal-main">
          <div className="cargando">Cargando personal...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Sidebar />

      <main className="personal-main">
        <div className="encabezado">
          <div>
            <h1>Personal</h1>
            <p>Gestión de trabajadores de la finca</p>
          </div>

          {!mostrarFormulario ? (
            <button onClick={abrirNuevo} className="btn-principal">
              + Registrar trabajador
            </button>
          ) : (
            <button onClick={cancelarFormulario} className="btn-secundario">
              Cerrar ficha
            </button>
          )}
        </div>

        {error && <div className="alerta error">{error}</div>}
        {mensaje && <div className="alerta exito">{mensaje}</div>}

        <section className="resumen">
          <div className="tarjeta-resumen">
            <span>Personal activo</span>
            <strong>{totalActivos}</strong>
            <small>Trabajadores activos</small>
          </div>

          <div className="tarjeta-resumen">
            <span>Vacaciones</span>
            <strong>{totalVacaciones}</strong>
            <small>Personal de vacaciones</small>
          </div>

          <div className="tarjeta-resumen">
            <span>Licencias</span>
            <strong>{totalLicencia}</strong>
            <small>Personal con licencia</small>
          </div>
        </section>

        {mostrarFormulario && (
          <>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>
                    {editandoId
                      ? "Ficha del trabajador"
                      : "Registrar trabajador"}
                  </h2>

                  <p>
                    {editandoId
                      ? "Puedes modificar esta información cuando lo necesites."
                      : "Completa la información del nuevo trabajador."}
                  </p>
                </div>
              </div>

              <div className="form-grid">
                <Campo label="Nombre *">
                  <input
                    value={formulario.nombre}
                    onChange={(e) =>
                      cambiarCampo("nombre", e.target.value)
                    }
                    placeholder="Nombre"
                  />
                </Campo>

                <Campo label="Apellido">
                  <input
                    value={formulario.apellido}
                    onChange={(e) =>
                      cambiarCampo("apellido", e.target.value)
                    }
                    placeholder="Apellido"
                  />
                </Campo>

                <Campo label="Documento / CI">
                  <input
                    value={formulario.documento}
                    onChange={(e) =>
                      cambiarCampo("documento", e.target.value)
                    }
                    placeholder="Número de documento"
                  />
                </Campo>

                <Campo label="Teléfono">
                  <input
                    value={formulario.telefono}
                    onChange={(e) =>
                      cambiarCampo("telefono", e.target.value)
                    }
                    placeholder="Teléfono"
                  />
                </Campo>

                <Campo label="Cargo / función">
                  <input
                    value={formulario.cargo}
                    onChange={(e) =>
                      cambiarCampo("cargo", e.target.value)
                    }
                    placeholder="Ej. Encargado, tractorista..."
                  />
                </Campo>

                <Campo label="Estado">
                  <select
                    value={formulario.estado}
                    onChange={(e) =>
                      cambiarCampo("estado", e.target.value)
                    }
                  >
                    <option value="activo">Activo</option>
                    <option value="vacaciones">Vacaciones</option>
                    <option value="licencia">Licencia</option>
                    <option value="retirado">Retirado</option>
                  </select>
                </Campo>

                <Campo label="Fecha de ingreso">
                  <input
                    type="date"
                    value={formulario.fecha_ingreso}
                    onChange={(e) =>
                      cambiarCampo("fecha_ingreso", e.target.value)
                    }
                  />
                </Campo>

                <Campo label="Fecha de salida">
                  <input
                    type="date"
                    value={formulario.fecha_salida}
                    onChange={(e) =>
                      cambiarCampo("fecha_salida", e.target.value)
                    }
                  />
                </Campo>

                <Campo label="Tipo de pago">
                  <select
                    value={formulario.tipo_pago}
                    onChange={(e) =>
                      cambiarCampo("tipo_pago", e.target.value)
                    }
                  >
                    <option value="diario">Diario</option>
                    <option value="semanal">Semanal</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                    <option value="otro">Otro</option>
                  </select>
                </Campo>

                <Campo label="Salario base">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formulario.salario_base}
                    onChange={(e) =>
                      cambiarCampo("salario_base", e.target.value)
                    }
                    placeholder="0.00"
                  />
                </Campo>

                <Campo label="Moneda">
                  <select
                    value={formulario.moneda}
                    onChange={(e) =>
                      cambiarCampo("moneda", e.target.value)
                    }
                  >
                    <option value="BOB">BOB - Bolivianos</option>
                    <option value="USD">USD - Dólares</option>
                  </select>
                </Campo>
              </div>

              <div className="campo-completo">
                <label>Observaciones</label>
                <textarea
                  value={formulario.observaciones}
                  onChange={(e) =>
                    cambiarCampo("observaciones", e.target.value)
                  }
                  placeholder="Información adicional del trabajador..."
                />
              </div>

              <div className="acciones-form">
                <button
                  onClick={cancelarFormulario}
                  className="btn-secundario"
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  onClick={guardarTrabajador}
                  className="btn-principal"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : editandoId
                    ? "Guardar cambios"
                    : "Guardar trabajador"}
                </button>
              </div>
            </section>

            <section className="panel">
                <div className="panel-header documentos-header">
                  <div>
                    <h2>Documentos del trabajador</h2>
                    <p>
                      {editandoId
                        ? "Foto, CI, licencia, contrato, certificados y otros documentos."
                        : "Agrega la foto, CI y otros documentos antes de guardar al trabajador."}
                    </p>
                  </div>

                  <div className="privado">🔒 Archivos privados</div>
                </div>

                <div className="documentos-form">
                  <Campo label="Tipo de documento">
                    <select
                      value={tipoArchivo}
                      onChange={(e) => setTipoArchivo(e.target.value)}
                    >
                      {tiposArchivo.map((tipo) => (
                        <option key={tipo.valor} value={tipo.valor}>
                          {tipo.texto}
                        </option>
                      ))}
                    </select>
                  </Campo>

                  <Campo label="Seleccionar archivo">
                    <input
                      id="archivo-personal"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) =>
                        setArchivoSeleccionado(e.target.files?.[0] || null)
                      }
                      className="archivo-input"
                    />
                  </Campo>

                  <Campo label="Descripción">
                    <input
                      value={descripcionArchivo}
                      onChange={(e) =>
                        setDescripcionArchivo(e.target.value)
                      }
                      placeholder="Opcional"
                    />
                  </Campo>

                  <div className="subir-contenedor">
                    <button
                      onClick={
                        editandoId ? subirDocumento : agregarDocumentoPendiente
                      }
                      className="btn-principal"
                      disabled={subiendoArchivo}
                    >
                      {subiendoArchivo
                        ? "Subiendo..."
                        : editandoId
                        ? "+ Agregar documento"
                        : "+ Preparar documento"}
                    </button>
                  </div>
                </div>

                <div className="nota-archivo">
                  Formatos permitidos: JPG, PNG, WEBP y PDF. Máximo 10 MB
                  por archivo.
                </div>

                {!editandoId ? (
                  documentosPendientes.length === 0 ? (
                    <div className="vacio-documentos">
                      <div className="vacio-icono">📁</div>
                      <strong>No hay documentos preparados</strong>
                      <span>
                        Puedes agregar foto, CI anverso, CI reverso u otros
                        documentos antes de guardar al trabajador.
                      </span>
                    </div>
                  ) : (
                    <div className="documentos-pendientes">
                      {documentosPendientes.map((documento) => (
                        <div key={documento.id} className="documento-card">
                          <div className="documento-top">
                            <div>
                              <strong>
                                {etiquetaTipoArchivo(documento.tipo)}
                              </strong>
                              <span>{documento.archivo.name}</span>
                            </div>

                            <span className="documento-tamano">
                              {mostrarTamano(documento.archivo.size)}
                            </span>
                          </div>

                          {documento.descripcion && (
                            <p>{documento.descripcion}</p>
                          )}

                          <div className="documento-botones documento-botones-unico">
                            <button
                              onClick={() =>
                                eliminarDocumentoPendiente(documento.id)
                              }
                              className="btn-eliminar"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : archivos.length === 0 ? (
                  <div className="vacio-documentos">
                    <div className="vacio-icono">📁</div>
                    <strong>No hay documentos registrados</strong>
                    <span>
                      Agrega la foto, CI u otro documento del trabajador.
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="documentos-desktop">
                      <div className="tabla-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Tipo</th>
                              <th>Archivo</th>
                              <th>Descripción</th>
                              <th>Tamaño</th>
                              <th>Fecha</th>
                              <th></th>
                            </tr>
                          </thead>

                          <tbody>
                            {archivos.map((archivo) => (
                              <tr key={archivo.id}>
                                <td>
                                  <strong>
                                    {etiquetaTipoArchivo(archivo.tipo)}
                                  </strong>
                                </td>
                                <td>{archivo.nombre_archivo}</td>
                                <td>{archivo.descripcion || "—"}</td>
                                <td>{mostrarTamano(archivo.tamano_bytes)}</td>
                                <td>
                                  {new Date(
                                    archivo.created_at
                                  ).toLocaleDateString("es-BO")}
                                </td>
                                <td>
                                  <div className="acciones-archivo">
                                    <button
                                      onClick={() => abrirDocumento(archivo)}
                                      className="btn-ver"
                                    >
                                      Ver
                                    </button>
                                    <button
                                      onClick={() => eliminarDocumento(archivo)}
                                      className="btn-eliminar"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="documentos-mobile">
                      {archivos.map((archivo) => (
                        <div key={archivo.id} className="documento-card">
                          <div className="documento-top">
                            <div>
                              <strong>
                                {etiquetaTipoArchivo(archivo.tipo)}
                              </strong>
                              <span>{archivo.nombre_archivo}</span>
                            </div>

                            <span className="documento-tamano">
                              {mostrarTamano(archivo.tamano_bytes)}
                            </span>
                          </div>

                          {archivo.descripcion && <p>{archivo.descripcion}</p>}

                          <small>
                            {new Date(archivo.created_at).toLocaleDateString(
                              "es-BO"
                            )}
                          </small>

                          <div className="documento-botones">
                            <button
                              onClick={() => abrirDocumento(archivo)}
                              className="btn-ver"
                            >
                              Ver
                            </button>
                            <button
                              onClick={() => eliminarDocumento(archivo)}
                              className="btn-eliminar"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
          </>
        )}

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Personal registrado</h2>
              <p>
                {trabajadores.length}{" "}
                {trabajadores.length === 1
                  ? "trabajador"
                  : "trabajadores"}
              </p>
            </div>
          </div>

          {trabajadores.length === 0 ? (
            <div className="vacio">
              <div className="vacio-icono">👥</div>
              <strong>No hay personal registrado</strong>
              <span>Registra el primer trabajador de la finca.</span>
            </div>
          ) : (
            <>
              <div className="personal-desktop">
                <div className="tabla-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Trabajador</th>
                        <th>Documento</th>
                        <th>Cargo</th>
                        <th>Teléfono</th>
                        <th>Ingreso</th>
                        <th>Estado</th>
                        <th>Pago</th>
                        <th>Salario</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {trabajadores.map((trabajador) => (
                        <tr key={trabajador.id}>
                          <td>
                            <div className="trabajador-celda">
                              <div className="avatar">
                                {trabajador.nombre
                                  ?.charAt(0)
                                  .toUpperCase()}
                              </div>
                              <strong>
                                {nombreCompleto(trabajador)}
                              </strong>
                            </div>
                          </td>

                          <td>{trabajador.documento || "—"}</td>
                          <td>{trabajador.cargo || "—"}</td>
                          <td>{trabajador.telefono || "—"}</td>
                          <td>
                            {mostrarFecha(trabajador.fecha_ingreso)}
                          </td>

                          <td>
                            <span
                              className={`estado ${
                                trabajador.estado === "activo"
                                  ? "estado-activo"
                                  : trabajador.estado === "retirado"
                                  ? "estado-retirado"
                                  : "estado-temporal"
                              }`}
                            >
                              {etiquetaEstado(trabajador.estado)}
                            </span>
                          </td>

                          <td>
                            {etiquetaPago(trabajador.tipo_pago)}
                          </td>

                          <td>
                            {mostrarDinero(
                              trabajador.salario_base,
                              trabajador.moneda
                            )}
                          </td>

                          <td>
                            <div className="acciones-trabajador">
                              <button
                                onClick={() =>
                                  router.push(`/personal/${trabajador.id}`)
                                }
                                className="btn-kardex"
                              >
                                Ver Kardex
                              </button>
                              <button
                                onClick={() =>
                                  abrirEditar(trabajador)
                                }
                                className="btn-editar"
                              >
                                Editar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="personal-mobile">
                {trabajadores.map((trabajador) => (
                  <div
                    key={trabajador.id}
                    className="trabajador-card"
                  >
                    <div className="trabajador-card-top">
                      <div className="trabajador-identidad">
                        <div className="avatar avatar-mobile">
                          {trabajador.nombre
                            ?.charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {nombreCompleto(trabajador)}
                          </strong>
                          <span>{trabajador.cargo || "Sin cargo"}</span>
                        </div>
                      </div>

                      <span
                        className={`estado ${
                          trabajador.estado === "activo"
                            ? "estado-activo"
                            : trabajador.estado === "retirado"
                            ? "estado-retirado"
                            : "estado-temporal"
                        }`}
                      >
                        {etiquetaEstado(trabajador.estado)}
                      </span>
                    </div>

                    <div className="trabajador-datos">
                      <div>
                        <span>Documento</span>
                        <strong>
                          {trabajador.documento || "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Teléfono</span>
                        <strong>
                          {trabajador.telefono || "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Ingreso</span>
                        <strong>
                          {mostrarFecha(trabajador.fecha_ingreso)}
                        </strong>
                      </div>

                      <div>
                        <span>Tipo de pago</span>
                        <strong>
                          {etiquetaPago(trabajador.tipo_pago)}
                        </strong>
                      </div>
                    </div>

                    <div className="salario-mobile">
                      <span>Salario</span>
                      <strong>
                        {mostrarDinero(
                          trabajador.salario_base,
                          trabajador.moneda
                        )}
                      </strong>
                    </div>

                    <div className="acciones-trabajador acciones-trabajador-mobile">
                      <button
                        onClick={() =>
                          router.push(`/personal/${trabajador.id}`)
                        }
                        className="btn-kardex btn-kardex-mobile"
                      >
                        Ver Kardex
                      </button>
                      <button
                        onClick={() => abrirEditar(trabajador)}
                        className="btn-editar btn-editar-mobile"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
            <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f5f8f5;
        }

        .personal-main {
          margin-left: 235px;
          min-height: 100vh;
          background: #f5f8f5;
          padding: 32px;
          color: #173d29;
          overflow-x: hidden;
        }

        .cargando {
          padding: 40px;
          font-size: 15px;
        }

        .encabezado {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .encabezado h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          color: #174c2e;
        }

        .encabezado p {
          margin: 6px 0 0;
          color: #708077;
          font-size: 14px;
        }

        .alerta {
          padding: 12px 14px;
          border-radius: 9px;
          margin-bottom: 18px;
          font-size: 13px;
        }

        .alerta.error {
          background: #fdecec;
          color: #b42318;
        }

        .alerta.exito {
          background: #eaf7ee;
          color: #176b3a;
        }

        .resumen {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 22px;
        }

        .tarjeta-resumen {
          background: white;
          border: 1px solid #dce5df;
          border-radius: 14px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
        }

        .tarjeta-resumen > span {
          font-size: 13px;
          font-weight: 700;
          color: #66786d;
        }

        .tarjeta-resumen > strong {
          font-size: 27px;
          color: #16713c;
        }

        .tarjeta-resumen > small {
          font-size: 12px;
          color: #8a9890;
        }

        .panel {
          background: white;
          border: 1px solid #dce5df;
          border-radius: 14px;
          margin-bottom: 22px;
          overflow: hidden;
          min-width: 0;
        }

        .panel-header {
          padding: 20px 22px;
          border-bottom: 1px solid #e6ece8;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .panel-header h2 {
          margin: 0;
          font-size: 17px;
          color: #174c2e;
        }

        .panel-header p {
          margin: 5px 0 0;
          font-size: 12px;
          color: #8a9890;
        }

        .form-grid {
          padding: 22px 22px 0;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .campo {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
        }

        .campo label,
        .campo-completo label {
          font-size: 12px;
          font-weight: 700;
          color: #425a4b;
        }

        .campo input,
        .campo select {
          width: 100%;
          height: 42px;
          border: 1px solid #d3ddd6;
          border-radius: 8px;
          padding: 0 11px;
          background: white;
          font-size: 13px;
          color: #1d2c23;
          outline: none;
          min-width: 0;
        }

        .campo input:focus,
        .campo select:focus,
        .campo-completo textarea:focus {
          border-color: #6da982;
          box-shadow: 0 0 0 2px rgba(23, 107, 58, 0.08);
        }

        .campo .archivo-input {
          height: auto;
          min-height: 42px;
          padding: 8px;
          font-size: 12px;
        }

        .campo-completo {
          padding: 18px 22px 0;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .campo-completo textarea {
          width: 100%;
          min-height: 85px;
          resize: vertical;
          border: 1px solid #d3ddd6;
          border-radius: 8px;
          padding: 11px;
          font-family: inherit;
          font-size: 13px;
          outline: none;
        }

        .acciones-form {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 20px 22px;
        }

        .btn-principal {
          border: none;
          border-radius: 9px;
          background: #176b3a;
          color: white;
          padding: 11px 17px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
        }

        .btn-principal:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .btn-secundario {
          border: 1px solid #d4ddd7;
          border-radius: 9px;
          background: white;
          color: #53665a;
          padding: 10px 16px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
        }

        .documentos-form {
          padding: 22px 22px 10px;
          display: grid;
          grid-template-columns:
            minmax(180px, 0.8fr)
            minmax(220px, 1.3fr)
            minmax(180px, 1fr)
            auto;
          gap: 15px;
          align-items: end;
        }

        .subir-contenedor {
          display: flex;
          align-items: flex-end;
        }

        .nota-archivo {
          padding: 0 22px 18px;
          font-size: 11px;
          color: #8a9890;
        }

        .privado {
          background: #edf6f0;
          color: #176b3a;
          padding: 7px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .tabla-wrap {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        th {
          text-align: left;
          padding: 13px 14px;
          background: #f7faf8;
          color: #607267;
          font-weight: 700;
          border-bottom: 1px solid #e4ebe6;
          white-space: nowrap;
        }

        td {
          padding: 14px;
          border-bottom: 1px solid #edf1ee;
          color: #35483b;
          vertical-align: middle;
          white-space: nowrap;
        }

        .trabajador-celda {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar {
          width: 34px;
          height: 34px;
          min-width: 34px;
          border-radius: 50%;
          background: #e7f3eb;
          color: #176b3a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }

        .estado {
          display: inline-block;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .estado-activo {
          background: #e6f5eb;
          color: #16713c;
        }

        .estado-temporal {
          background: #fff4d8;
          color: #8a6212;
        }

        .estado-retirado {
          background: #f0f1f0;
          color: #68736c;
        }

        .acciones-trabajador {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .btn-kardex {
          border: 1px solid #176b3a;
          background: #176b3a;
          color: white;
          border-radius: 7px;
          padding: 7px 11px;
          font-weight: 700;
          font-size: 11px;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
        }

        .btn-editar {
          border: 1px solid #cddbd2;
          background: white;
          color: #176b3a;
          border-radius: 7px;
          padding: 7px 11px;
          font-weight: 700;
          font-size: 11px;
          cursor: pointer;
          font-family: inherit;
        }

        .acciones-archivo {
          display: flex;
          gap: 7px;
        }

        .btn-ver {
          border: 1px solid #bfd6c7;
          background: #edf7f0;
          color: #176b3a;
          border-radius: 7px;
          padding: 6px 10px;
          font-weight: 700;
          font-size: 11px;
          cursor: pointer;
          font-family: inherit;
        }

        .btn-eliminar {
          border: 1px solid #f0caca;
          background: #fff5f5;
          color: #b42318;
          border-radius: 7px;
          padding: 6px 10px;
          font-weight: 700;
          font-size: 11px;
          cursor: pointer;
          font-family: inherit;
        }

        .vacio,
        .vacio-documentos {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 8px;
          color: #819087;
          font-size: 13px;
          text-align: center;
          padding: 25px;
        }

        .vacio {
          min-height: 240px;
        }

        .vacio-documentos {
          min-height: 150px;
          border-top: 1px solid #edf1ee;
          font-size: 12px;
        }

        .vacio-icono {
          font-size: 30px;
        }

        .personal-mobile,
        .documentos-mobile {
          display: none;
        }

        .documentos-pendientes {
          padding: 12px 22px 22px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          border-top: 1px solid #edf1ee;
        }

        .documento-botones-unico {
          grid-template-columns: 1fr;
        }

        /* ===========================
           TABLET
        =========================== */

        @media (max-width: 1100px) and (min-width: 821px) {
          .personal-main {
            padding: 24px;
          }

          .form-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .documentos-form {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .subir-contenedor .btn-principal {
            width: 100%;
          }
        }

        /* ===========================
           CELULAR
        =========================== */

        @media (max-width: 820px) {
          html,
          body {
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
          }

          .personal-main {
            margin-left: 0;
            width: 100%;
            max-width: 100%;
            min-height: 100vh;
            padding: 84px 14px 28px;
            overflow-x: hidden;
          }

          .cargando {
            padding: 25px 4px;
          }

          .encabezado {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
            margin-bottom: 18px;
          }

          .encabezado h1 {
            font-size: 25px;
          }

          .encabezado p {
            font-size: 13px;
          }

          .encabezado .btn-principal,
          .encabezado .btn-secundario {
            width: 100%;
            min-height: 44px;
          }

          .resumen {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
            margin-bottom: 16px;
          }

          .tarjeta-resumen {
            padding: 13px 10px;
            border-radius: 12px;
            gap: 5px;
          }

          .tarjeta-resumen > span {
            font-size: 10px;
            line-height: 1.25;
          }

          .tarjeta-resumen > strong {
            font-size: 23px;
          }

          .tarjeta-resumen > small {
            display: none;
          }

          .panel {
            border-radius: 12px;
            margin-bottom: 16px;
          }

          .panel-header {
            padding: 16px;
            align-items: flex-start;
          }

          .panel-header h2 {
            font-size: 16px;
          }

          .panel-header p {
            font-size: 11px;
            line-height: 1.45;
          }

          .documentos-header {
            flex-direction: column;
          }

          .privado {
            align-self: flex-start;
          }

          .form-grid {
            padding: 16px 16px 0;
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .campo-completo {
            padding: 14px 16px 0;
          }

          .campo input,
          .campo select {
            height: 46px;
            font-size: 16px;
          }

          .campo .archivo-input {
            min-height: 46px;
            height: auto;
            font-size: 13px;
          }

          .campo-completo textarea {
            min-height: 100px;
            font-size: 16px;
          }

          .acciones-form {
            padding: 18px 16px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 9px;
          }

          .acciones-form button {
            min-height: 44px;
            padding-left: 8px;
            padding-right: 8px;
          }

          .documentos-form {
            padding: 16px 16px 10px;
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .subir-contenedor {
            width: 100%;
          }

          .subir-contenedor .btn-principal {
            width: 100%;
            min-height: 44px;
          }

          .nota-archivo {
            padding: 0 16px 16px;
            line-height: 1.5;
          }

          /* En celular reemplazamos tablas por tarjetas */

          .personal-desktop,
          .documentos-desktop {
            display: none;
          }

          .personal-mobile,
          .documentos-mobile {
            display: block;
          }

          .personal-mobile {
            padding: 12px;
          }

          .acciones-trabajador-mobile {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-top: 12px;
          }

          .btn-kardex-mobile,
          .btn-editar-mobile {
            width: 100%;
            min-height: 42px;
          }

          .acciones-trabajador-mobile .btn-editar-mobile {
            margin-top: 0;
          }

          .trabajador-card {
            background: #ffffff;
            border: 1px solid #e0e8e2;
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 10px;
            min-width: 0;
          }

          .trabajador-card:last-child {
            margin-bottom: 0;
          }

          .trabajador-card-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 10px;
            padding-bottom: 13px;
            border-bottom: 1px solid #edf1ee;
          }

          .trabajador-identidad {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
          }

          .trabajador-identidad > div:last-child {
            min-width: 0;
          }

          .trabajador-identidad strong {
            display: block;
            color: #173d29;
            font-size: 14px;
            overflow-wrap: anywhere;
          }

          .trabajador-identidad span {
            display: block;
            color: #849188;
            font-size: 11px;
            margin-top: 3px;
            overflow-wrap: anywhere;
          }

          .avatar-mobile {
            width: 40px;
            height: 40px;
            min-width: 40px;
            font-size: 15px;
          }

          .trabajador-datos {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 13px 10px;
            padding: 14px 0;
          }

          .trabajador-datos > div {
            min-width: 0;
          }

          .trabajador-datos span,
          .salario-mobile span {
            display: block;
            color: #8a9890;
            font-size: 10px;
            margin-bottom: 4px;
          }

          .trabajador-datos strong {
            display: block;
            color: #35483b;
            font-size: 12px;
            overflow-wrap: anywhere;
          }

          .salario-mobile {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            background: #f6faf7;
            border-radius: 8px;
            padding: 10px 12px;
            margin-bottom: 12px;
          }

          .salario-mobile span {
            margin: 0;
          }

          .salario-mobile strong {
            color: #176b3a;
            font-size: 13px;
          }

          .btn-editar-mobile {
            width: 100%;
            min-height: 42px;
            font-size: 12px;
          }

          .documentos-mobile {
            padding: 12px;
            border-top: 1px solid #edf1ee;
          }

          .documentos-pendientes {
            padding: 12px;
            grid-template-columns: 1fr;
          }

          .documento-card {
            border: 1px solid #e0e8e2;
            border-radius: 11px;
            padding: 13px;
            margin-bottom: 10px;
            min-width: 0;
          }

          .documento-card:last-child {
            margin-bottom: 0;
          }

          .documento-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 10px;
          }

          .documento-top > div {
            min-width: 0;
          }

          .documento-top strong {
            display: block;
            color: #174c2e;
            font-size: 12px;
          }

          .documento-top span:not(.documento-tamano) {
            display: block;
            margin-top: 4px;
            color: #66786d;
            font-size: 11px;
            overflow-wrap: anywhere;
            word-break: break-word;
          }

          .documento-tamano {
            background: #f3f6f4;
            border-radius: 7px;
            padding: 5px 7px;
            color: #66786d;
            font-size: 10px;
            white-space: nowrap;
          }

          .documento-card p {
            margin: 10px 0 5px;
            color: #53665a;
            font-size: 11px;
            overflow-wrap: anywhere;
          }

          .documento-card small {
            color: #929e96;
            font-size: 10px;
          }

          .documento-botones {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-top: 12px;
          }

          .documento-botones button {
            min-height: 40px;
          }
        }

        @media (max-width: 380px) {
          .personal-main {
            padding-left: 10px;
            padding-right: 10px;
          }

          .resumen {
            gap: 6px;
          }

          .tarjeta-resumen {
            padding: 12px 7px;
          }

          .tarjeta-resumen > span {
            font-size: 9px;
          }

          .tarjeta-resumen > strong {
            font-size: 21px;
          }
        }
      `}</style>
    </>
  );
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="campo">
      <label>{label}</label>
      {children}
    </div>
  );
}
