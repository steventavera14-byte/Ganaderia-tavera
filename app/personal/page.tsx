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
      .select(
        `
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
        `
      )
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
      setError(
        `Error al cargar documentos: ${errorArchivos.message}`
      );
      return;
    }

    setArchivos((data || []) as ArchivoTrabajador[]);
  };

  const totalActivos = useMemo(
    () =>
      trabajadores.filter(
        (trabajador) => trabajador.estado === "activo"
      ).length,
    [trabajadores]
  );

  const totalVacaciones = useMemo(
    () =>
      trabajadores.filter(
        (trabajador) => trabajador.estado === "vacaciones"
      ).length,
    [trabajadores]
  );

  const totalLicencia = useMemo(
    () =>
      trabajadores.filter(
        (trabajador) => trabajador.estado === "licencia"
      ).length,
    [trabajadores]
  );

  const abrirNuevo = () => {
    setFormulario(formularioInicial);
    setEditandoId(null);
    setArchivos([]);
    setTipoArchivo("foto");
    setDescripcionArchivo("");
    setArchivoSeleccionado(null);
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
    setDescripcionArchivo("");
    setError("");
  };

  const cambiarCampo = (
    campo: keyof Formulario,
    valor: string
  ) => {
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
        setError(
          `Error al actualizar trabajador: ${errorGuardar.message}`
        );
        setGuardando(false);
        return;
      }

      setMensaje("Trabajador actualizado correctamente.");

      await cargarTrabajadores(fincaId);
      setGuardando(false);
      return;
    }

    const { error: errorGuardar } = await supabase
      .from("gan_trabajadores")
      .insert(datos);

    if (errorGuardar) {
      setError(
        `Error al registrar trabajador: ${errorGuardar.message}`
      );
      setGuardando(false);
      return;
    }

    setMensaje("Trabajador registrado correctamente.");

    await cargarTrabajadores(fincaId);

    setMostrarFormulario(false);
    setEditandoId(null);
    setFormulario(formularioInicial);
    setGuardando(false);
  };

  const subirDocumento = async () => {
    setError("");
    setMensaje("");

    if (!editandoId) {
      setError(
        "Primero debes guardar al trabajador antes de agregar documentos."
      );
      return;
    }

    if (!archivoSeleccionado) {
      setError("Selecciona un archivo.");
      return;
    }

    if (archivoSeleccionado.size > 10 * 1024 * 1024) {
      setError("El archivo no puede superar los 10 MB.");
      return;
    }

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!tiposPermitidos.includes(archivoSeleccionado.type)) {
      setError(
        "Solo se permiten imágenes JPG, PNG, WEBP o documentos PDF."
      );
      return;
    }

    setSubiendoArchivo(true);

    const extension =
      archivoSeleccionado.name.split(".").pop()?.toLowerCase() || "archivo";

    const nombreSeguro = `${tipoArchivo}-${Date.now()}.${extension}`;

    const rutaStorage =
      `${fincaId}/${editandoId}/${nombreSeguro}`;

    const { error: errorStorage } = await supabase.storage
      .from("gan-personal")
      .upload(rutaStorage, archivoSeleccionado, {
        cacheControl: "3600",
        upsert: false,
        contentType: archivoSeleccionado.type,
      });

    if (errorStorage) {
      setError(
        `Error al subir el archivo: ${errorStorage.message}`
      );
      setSubiendoArchivo(false);
      return;
    }

    const { error: errorRegistro } = await supabase
      .from("gan_trabajador_archivos")
      .insert({
        finca_id: fincaId,
        trabajador_id: editandoId,
        tipo: tipoArchivo,
        nombre_archivo: archivoSeleccionado.name,
        ruta_storage: rutaStorage,
        mime_type: archivoSeleccionado.type,
        tamano_bytes: archivoSeleccionado.size,
        descripcion: descripcionArchivo.trim() || null,
        registrado_por: usuarioId,
      });

    if (errorRegistro) {
      await supabase.storage
        .from("gan-personal")
        .remove([rutaStorage]);

      setError(
        `Error al registrar el documento: ${errorRegistro.message}`
      );
      setSubiendoArchivo(false);
      return;
    }

    setArchivoSeleccionado(null);
    setDescripcionArchivo("");
    setTipoArchivo("foto");

    const input = document.getElementById(
      "archivo-personal"
    ) as HTMLInputElement | null;

    if (input) {
      input.value = "";
    }

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

  const eliminarDocumento = async (
    archivo: ArchivoTrabajador
  ) => {
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
      setError(
        `No se pudo eliminar el archivo: ${errorStorage.message}`
      );
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
    [trabajador.nombre, trabajador.apellido]
      .filter(Boolean)
      .join(" ");

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

    return `${moneda || "BOB"} ${Number(valor).toLocaleString(
      "es-BO",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
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

  const etiquetaTipoArchivo = (tipo: string) => {
    return (
      tiposArchivo.find((item) => item.valor === tipo)?.texto ||
      tipo
    );
  };

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
        <main style={estilos.main}>
          <div style={estilos.cargando}>Cargando personal...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Sidebar />

      <main style={estilos.main}>
        <div style={estilos.encabezado}>
          <div>
            <h1 style={estilos.titulo}>Personal</h1>
            <p style={estilos.subtitulo}>
              Gestión de trabajadores de la finca
            </p>
          </div>

          {!mostrarFormulario ? (
            <button
              onClick={abrirNuevo}
              style={estilos.botonPrincipal}
            >
              + Registrar trabajador
            </button>
          ) : (
            <button
              onClick={cancelarFormulario}
              style={estilos.botonSecundario}
            >
              Cerrar ficha
            </button>
          )}
        </div>

        {error && (
          <div style={estilos.alertaError}>{error}</div>
        )}

        {mensaje && (
          <div style={estilos.alertaExito}>{mensaje}</div>
        )}

        <section style={estilos.tarjetas}>
          <div style={estilos.tarjeta}>
            <span style={estilos.tarjetaLabel}>
              Personal activo
            </span>
            <strong style={estilos.tarjetaNumero}>
              {totalActivos}
            </strong>
            <span style={estilos.tarjetaTexto}>
              Trabajadores activos
            </span>
          </div>

          <div style={estilos.tarjeta}>
            <span style={estilos.tarjetaLabel}>Vacaciones</span>
            <strong style={estilos.tarjetaNumero}>
              {totalVacaciones}
            </strong>
            <span style={estilos.tarjetaTexto}>
              Personal de vacaciones
            </span>
          </div>

          <div style={estilos.tarjeta}>
            <span style={estilos.tarjetaLabel}>Licencias</span>
            <strong style={estilos.tarjetaNumero}>
              {totalLicencia}
            </strong>
            <span style={estilos.tarjetaTexto}>
              Personal con licencia
            </span>
          </div>
        </section>

        {mostrarFormulario && (
          <>
            <section style={estilos.panel}>
              <div style={estilos.panelTituloContenedor}>
                <div>
                  <h2 style={estilos.panelTitulo}>
                    {editandoId
                      ? "Ficha del trabajador"
                      : "Registrar trabajador"}
                  </h2>

                  <p style={estilos.panelSubtitulo}>
                    {editandoId
                      ? "Puedes modificar esta información cuando lo necesites."
                      : "Completa la información del nuevo trabajador."}
                  </p>
                </div>
              </div>

              <div style={estilos.formGrid}>
                <Campo label="Nombre *">
                  <input
                    value={formulario.nombre}
                    onChange={(e) =>
                      cambiarCampo("nombre", e.target.value)
                    }
                    style={estilos.input}
                    placeholder="Nombre"
                  />
                </Campo>

                <Campo label="Apellido">
                  <input
                    value={formulario.apellido}
                    onChange={(e) =>
                      cambiarCampo("apellido", e.target.value)
                    }
                    style={estilos.input}
                    placeholder="Apellido"
                  />
                </Campo>

                <Campo label="Documento / CI">
                  <input
                    value={formulario.documento}
                    onChange={(e) =>
                      cambiarCampo("documento", e.target.value)
                    }
                    style={estilos.input}
                    placeholder="Número de documento"
                  />
                </Campo>

                <Campo label="Teléfono">
                  <input
                    value={formulario.telefono}
                    onChange={(e) =>
                      cambiarCampo("telefono", e.target.value)
                    }
                    style={estilos.input}
                    placeholder="Teléfono"
                  />
                </Campo>

                <Campo label="Cargo / función">
                  <input
                    value={formulario.cargo}
                    onChange={(e) =>
                      cambiarCampo("cargo", e.target.value)
                    }
                    style={estilos.input}
                    placeholder="Ej. Encargado, tractorista..."
                  />
                </Campo>

                <Campo label="Estado">
                  <select
                    value={formulario.estado}
                    onChange={(e) =>
                      cambiarCampo("estado", e.target.value)
                    }
                    style={estilos.input}
                  >
                    <option value="activo">Activo</option>
                    <option value="vacaciones">
                      Vacaciones
                    </option>
                    <option value="licencia">Licencia</option>
                    <option value="retirado">Retirado</option>
                  </select>
                </Campo>

                <Campo label="Fecha de ingreso">
                  <input
                    type="date"
                    value={formulario.fecha_ingreso}
                    onChange={(e) =>
                      cambiarCampo(
                        "fecha_ingreso",
                        e.target.value
                      )
                    }
                    style={estilos.input}
                  />
                </Campo>

                <Campo label="Fecha de salida">
                  <input
                    type="date"
                    value={formulario.fecha_salida}
                    onChange={(e) =>
                      cambiarCampo(
                        "fecha_salida",
                        e.target.value
                      )
                    }
                    style={estilos.input}
                  />
                </Campo>

                <Campo label="Tipo de pago">
                  <select
                    value={formulario.tipo_pago}
                    onChange={(e) =>
                      cambiarCampo("tipo_pago", e.target.value)
                    }
                    style={estilos.input}
                  >
                    <option value="diario">Diario</option>
                    <option value="semanal">Semanal</option>
                    <option value="quincenal">
                      Quincenal
                    </option>
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
                      cambiarCampo(
                        "salario_base",
                        e.target.value
                      )
                    }
                    style={estilos.input}
                    placeholder="0.00"
                  />
                </Campo>

                <Campo label="Moneda">
                  <select
                    value={formulario.moneda}
                    onChange={(e) =>
                      cambiarCampo("moneda", e.target.value)
                    }
                    style={estilos.input}
                  >
                    <option value="BOB">
                      BOB - Bolivianos
                    </option>
                    <option value="USD">
                      USD - Dólares
                    </option>
                  </select>
                </Campo>
              </div>

              <div style={estilos.campoCompleto}>
                <label style={estilos.label}>
                  Observaciones
                </label>

                <textarea
                  value={formulario.observaciones}
                  onChange={(e) =>
                    cambiarCampo(
                      "observaciones",
                      e.target.value
                    )
                  }
                  style={estilos.textarea}
                  placeholder="Información adicional del trabajador..."
                />
              </div>

              <div style={estilos.accionesFormulario}>
                <button
                  onClick={cancelarFormulario}
                  style={estilos.botonSecundario}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  onClick={guardarTrabajador}
                  style={estilos.botonPrincipal}
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

            {editandoId && (
              <section style={estilos.panel}>
                <div style={estilos.panelTituloContenedor}>
                  <div>
                    <h2 style={estilos.panelTitulo}>
                      Documentos del trabajador
                    </h2>

                    <p style={estilos.panelSubtitulo}>
                      Foto, CI, licencia, contrato, certificados
                      y otros documentos.
                    </p>
                  </div>

                  <div style={estilos.privado}>
                    🔒 Archivos privados
                  </div>
                </div>

                <div style={estilos.documentosFormulario}>
                  <Campo label="Tipo de documento">
                    <select
                      value={tipoArchivo}
                      onChange={(e) =>
                        setTipoArchivo(e.target.value)
                      }
                      style={estilos.input}
                    >
                      {tiposArchivo.map((tipo) => (
                        <option
                          key={tipo.valor}
                          value={tipo.valor}
                        >
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
                        setArchivoSeleccionado(
                          e.target.files?.[0] || null
                        )
                      }
                      style={estilos.inputArchivo}
                    />
                  </Campo>

                  <Campo label="Descripción">
                    <input
                      value={descripcionArchivo}
                      onChange={(e) =>
                        setDescripcionArchivo(e.target.value)
                      }
                      style={estilos.input}
                      placeholder="Opcional"
                    />
                  </Campo>

                  <div style={estilos.subirContenedor}>
                    <button
                      onClick={subirDocumento}
                      style={estilos.botonPrincipal}
                      disabled={subiendoArchivo}
                    >
                      {subiendoArchivo
                        ? "Subiendo..."
                        : "+ Agregar documento"}
                    </button>
                  </div>
                </div>

                <div style={estilos.notaArchivo}>
                  Formatos permitidos: JPG, PNG, WEBP y PDF.
                  Máximo 10 MB por archivo.
                </div>

                {archivos.length === 0 ? (
                  <div style={estilos.vacioDocumentos}>
                    <div style={estilos.vacioIcono}>📁</div>
                    <strong>
                      No hay documentos registrados
                    </strong>
                    <span>
                      Agrega la foto, CI u otro documento del
                      trabajador.
                    </span>
                  </div>
                ) : (
                  <div style={estilos.tablaContenedor}>
                    <table style={estilos.tabla}>
                      <thead>
                        <tr>
                          <th style={estilos.th}>Tipo</th>
                          <th style={estilos.th}>Archivo</th>
                          <th style={estilos.th}>Descripción</th>
                          <th style={estilos.th}>Tamaño</th>
                          <th style={estilos.th}>Fecha</th>
                          <th style={estilos.th}></th>
                        </tr>
                      </thead>

                      <tbody>
                        {archivos.map((archivo) => (
                          <tr key={archivo.id}>
                            <td style={estilos.td}>
                              <strong>
                                {etiquetaTipoArchivo(
                                  archivo.tipo
                                )}
                              </strong>
                            </td>

                            <td style={estilos.td}>
                              {archivo.nombre_archivo}
                            </td>

                            <td style={estilos.td}>
                              {archivo.descripcion || "—"}
                            </td>

                            <td style={estilos.td}>
                              {mostrarTamano(
                                archivo.tamano_bytes
                              )}
                            </td>

                            <td style={estilos.td}>
                              {new Date(
                                archivo.created_at
                              ).toLocaleDateString("es-BO")}
                            </td>

                            <td style={estilos.td}>
                              <div style={estilos.accionesArchivo}>
                                <button
                                  onClick={() =>
                                    abrirDocumento(archivo)
                                  }
                                  style={estilos.botonVer}
                                >
                                  Ver
                                </button>

                                <button
                                  onClick={() =>
                                    eliminarDocumento(archivo)
                                  }
                                  style={estilos.botonEliminar}
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
                )}
              </section>
            )}
          </>
        )}

        <section style={estilos.panel}>
          <div style={estilos.panelTituloContenedor}>
            <div>
              <h2 style={estilos.panelTitulo}>
                Personal registrado
              </h2>

              <p style={estilos.panelSubtitulo}>
                {trabajadores.length}{" "}
                {trabajadores.length === 1
                  ? "trabajador"
                  : "trabajadores"}
              </p>
            </div>
          </div>

          {trabajadores.length === 0 ? (
            <div style={estilos.vacio}>
              <div style={estilos.vacioIcono}>👥</div>
              <strong>No hay personal registrado</strong>
              <span>
                Registra el primer trabajador de la finca.
              </span>
            </div>
          ) : (
            <div style={estilos.tablaContenedor}>
              <table style={estilos.tabla}>
                <thead>
                  <tr>
                    <th style={estilos.th}>Trabajador</th>
                    <th style={estilos.th}>Documento</th>
                    <th style={estilos.th}>Cargo</th>
                    <th style={estilos.th}>Teléfono</th>
                    <th style={estilos.th}>Ingreso</th>
                    <th style={estilos.th}>Estado</th>
                    <th style={estilos.th}>Pago</th>
                    <th style={estilos.th}>Salario</th>
                    <th style={estilos.th}></th>
                  </tr>
                </thead>

                <tbody>
                  {trabajadores.map((trabajador) => (
                    <tr key={trabajador.id}>
                      <td style={estilos.td}>
                        <div style={estilos.trabajadorCelda}>
                          <div style={estilos.avatar}>
                            {trabajador.nombre
                              ?.charAt(0)
                              .toUpperCase()}
                          </div>

                          <strong>
                            {nombreCompleto(trabajador)}
                          </strong>
                        </div>
                      </td>

                      <td style={estilos.td}>
                        {trabajador.documento || "—"}
                      </td>

                      <td style={estilos.td}>
                        {trabajador.cargo || "—"}
                      </td>

                      <td style={estilos.td}>
                        {trabajador.telefono || "—"}
                      </td>

                      <td style={estilos.td}>
                        {mostrarFecha(
                          trabajador.fecha_ingreso
                        )}
                      </td>

                      <td style={estilos.td}>
                        <span
                          style={{
                            ...estilos.estado,
                            ...(trabajador.estado === "activo"
                              ? estilos.estadoActivo
                              : trabajador.estado ===
                                "retirado"
                              ? estilos.estadoRetirado
                              : estilos.estadoTemporal),
                          }}
                        >
                          {etiquetaEstado(
                            trabajador.estado
                          )}
                        </span>
                      </td>

                      <td style={estilos.td}>
                        {etiquetaPago(
                          trabajador.tipo_pago
                        )}
                      </td>

                      <td style={estilos.td}>
                        {mostrarDinero(
                          trabajador.salario_base,
                          trabajador.moneda
                        )}
                      </td>

                      <td style={estilos.td}>
                        <button
                          onClick={() =>
                            abrirEditar(trabajador)
                          }
                          style={estilos.botonEditar}
                        >
                          Editar / Ficha
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
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
    <div style={estilos.campo}>
      <label style={estilos.label}>{label}</label>
      {children}
    </div>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  main: {
    marginLeft: "235px",
    minHeight: "100vh",
    background: "#f5f8f5",
    padding: "32px",
    boxSizing: "border-box",
    color: "#173d29",
  },

  cargando: {
    padding: "40px",
    fontSize: "15px",
  },

  encabezado: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "24px",
  },

  titulo: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 800,
    color: "#174c2e",
  },

  subtitulo: {
    margin: "6px 0 0",
    color: "#708077",
    fontSize: "14px",
  },

  alertaError: {
    padding: "12px 14px",
    background: "#fdecec",
    color: "#b42318",
    borderRadius: "9px",
    marginBottom: "18px",
    fontSize: "13px",
  },

  alertaExito: {
    padding: "12px 14px",
    background: "#eaf7ee",
    color: "#176b3a",
    borderRadius: "9px",
    marginBottom: "18px",
    fontSize: "13px",
  },

  tarjetas: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "18px",
    marginBottom: "22px",
  },

  tarjeta: {
    background: "white",
    border: "1px solid #dce5df",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  tarjetaLabel: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#66786d",
  },

  tarjetaNumero: {
    fontSize: "27px",
    color: "#16713c",
  },

  tarjetaTexto: {
    fontSize: "12px",
    color: "#8a9890",
  },

  panel: {
    background: "white",
    border: "1px solid #dce5df",
    borderRadius: "14px",
    marginBottom: "22px",
    overflow: "hidden",
  },

  panelTituloContenedor: {
    padding: "20px 22px",
    borderBottom: "1px solid #e6ece8",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
  },

  panelTitulo: {
    margin: 0,
    fontSize: "17px",
    color: "#174c2e",
  },

  panelSubtitulo: {
    margin: "5px 0 0",
    fontSize: "12px",
    color: "#8a9890",
  },

  formGrid: {
    padding: "22px 22px 0",
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "18px",
  },

  campo: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  campoCompleto: {
    padding: "18px 22px 0",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  label: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#425a4b",
  },

  input: {
    width: "100%",
    height: "42px",
    border: "1px solid #d3ddd6",
    borderRadius: "8px",
    padding: "0 11px",
    boxSizing: "border-box",
    background: "white",
    fontSize: "13px",
    color: "#1d2c23",
    outline: "none",
  },

  inputArchivo: {
    width: "100%",
    minHeight: "42px",
    border: "1px solid #d3ddd6",
    borderRadius: "8px",
    padding: "8px",
    boxSizing: "border-box",
    background: "white",
    fontSize: "12px",
  },

  textarea: {
    width: "100%",
    minHeight: "85px",
    resize: "vertical",
    border: "1px solid #d3ddd6",
    borderRadius: "8px",
    padding: "11px",
    boxSizing: "border-box",
    fontFamily: "inherit",
    fontSize: "13px",
    outline: "none",
  },

  accionesFormulario: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    padding: "20px 22px",
  },

  botonPrincipal: {
    border: "none",
    borderRadius: "9px",
    background: "#176b3a",
    color: "white",
    padding: "11px 17px",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
  },

  botonSecundario: {
    border: "1px solid #d4ddd7",
    borderRadius: "9px",
    background: "white",
    color: "#53665a",
    padding: "10px 16px",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },

  documentosFormulario: {
    padding: "22px 22px 10px",
    display: "grid",
    gridTemplateColumns:
      "minmax(180px, 0.8fr) minmax(260px, 1.3fr) minmax(220px, 1fr) auto",
    gap: "15px",
    alignItems: "end",
  },

  subirContenedor: {
    display: "flex",
    alignItems: "flex-end",
  },

  notaArchivo: {
    padding: "0 22px 18px",
    fontSize: "11px",
    color: "#8a9890",
  },

  privado: {
    background: "#edf6f0",
    color: "#176b3a",
    padding: "7px 10px",
    borderRadius: "8px",
    fontSize: "11px",
    fontWeight: 700,
  },

  tablaContenedor: {
    overflowX: "auto",
  },

  tabla: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
  },

  th: {
    textAlign: "left",
    padding: "13px 14px",
    background: "#f7faf8",
    color: "#607267",
    fontWeight: 700,
    borderBottom: "1px solid #e4ebe6",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "14px",
    borderBottom: "1px solid #edf1ee",
    color: "#35483b",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },

  trabajadorCelda: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  avatar: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "#e7f3eb",
    color: "#176b3a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },

  estado: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 700,
  },

  estadoActivo: {
    background: "#e6f5eb",
    color: "#16713c",
  },

  estadoTemporal: {
    background: "#fff4d8",
    color: "#8a6212",
  },

  estadoRetirado: {
    background: "#f0f1f0",
    color: "#68736c",
  },

  botonEditar: {
    border: "1px solid #cddbd2",
    background: "white",
    color: "#176b3a",
    borderRadius: "7px",
    padding: "7px 11px",
    fontWeight: 700,
    fontSize: "11px",
    cursor: "pointer",
  },

  accionesArchivo: {
    display: "flex",
    gap: "7px",
  },

  botonVer: {
    border: "1px solid #bfd6c7",
    background: "#edf7f0",
    color: "#176b3a",
    borderRadius: "7px",
    padding: "6px 10px",
    fontWeight: 700,
    fontSize: "11px",
    cursor: "pointer",
  },

  botonEliminar: {
    border: "1px solid #f0caca",
    background: "#fff5f5",
    color: "#b42318",
    borderRadius: "7px",
    padding: "6px 10px",
    fontWeight: 700,
    fontSize: "11px",
    cursor: "pointer",
  },

  vacio: {
    minHeight: "240px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "8px",
    color: "#819087",
    fontSize: "13px",
  },

  vacioDocumentos: {
    minHeight: "150px",
    borderTop: "1px solid #edf1ee",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "7px",
    color: "#819087",
    fontSize: "12px",
  },

  vacioIcono: {
    fontSize: "30px",
  },
};
