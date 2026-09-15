"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../../lib/supabase";

const FINCA_ID = "89057e73-c093-4a83-b63c-153b9a33ca3a";

type CentroCosto = {
  id: string;
  nombre: string;
  tipo: string;
  activo: boolean;
};

type Proveedor = {
  id: string;
  nombre: string;
  nit: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  rubro: string | null;
  activo: boolean;
  observaciones: string | null;
};

type Gasto = {
  id: string;
  fecha: string;
  descripcion: string;
  categoria: string;
  centro_costo_id: string | null;
  proveedor_id: string | null;
  monto: number;
  moneda: string;
  metodo_pago: string | null;
  numero_documento: string | null;
  observaciones: string | null;
  created_at: string;
};

type ReferenciaCosto = {
  id: string;
  nombre: string;
};

type AsignacionGasto = {
  id: string;
  gasto_id: string;
  tipo_asignacion: string;
  referencia_id: string | null;
  porcentaje: number;
  monto_asignado: number;
  observaciones: string | null;
};

const categorias = [
  ["ganado", "Ganado"],
  ["alimentacion", "Alimentación"],
  ["potreros", "Potreros"],
  ["maquinaria", "Maquinaria"],
  ["personal", "Personal"],
  ["sanidad", "Sanidad"],
  ["infraestructura", "Infraestructura"],
  ["administracion", "Administración"],
  ["combustible", "Combustible"],
  ["impuestos", "Impuestos"],
  ["servicios", "Servicios"],
  ["transporte", "Transporte"],
  ["feedlot", "Feedlot"],
  ["otro", "Otro"],
];

const hoyLocal = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const mesActual = () => hoyLocal().slice(0, 7);

const formatoNumero = (valor: number) =>
  new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);

const etiquetaCategoria = (valor: string) =>
  categorias.find(([id]) => id === valor)?.[1] ?? valor;

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [gastoEditandoId, setGastoEditandoId] = useState<string | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [esMovil, setEsMovil] = useState(false);

  const [mostrarProveedores, setMostrarProveedores] = useState(false);
  const [mostrarFormProveedor, setMostrarFormProveedor] = useState(false);
  const [proveedorEditandoId, setProveedorEditandoId] = useState<string | null>(null);
  const [guardandoProveedor, setGuardandoProveedor] = useState(false);
  const [cambiandoProveedorId, setCambiandoProveedorId] = useState<string | null>(null);
  const [provNombre, setProvNombre] = useState("");
  const [provNit, setProvNit] = useState("");
  const [provTelefono, setProvTelefono] = useState("");
  const [provEmail, setProvEmail] = useState("");
  const [provDireccion, setProvDireccion] = useState("");
  const [provRubro, setProvRubro] = useState("");
  const [provObservaciones, setProvObservaciones] = useState("");

  const [asignaciones, setAsignaciones] = useState<AsignacionGasto[]>([]);
  const [lotes, setLotes] = useState<ReferenciaCosto[]>([]);
  const [potreros, setPotreros] = useState<ReferenciaCosto[]>([]);
  const [maquinas, setMaquinas] = useState<ReferenciaCosto[]>([]);
  const [trabajadores, setTrabajadores] = useState<ReferenciaCosto[]>([]);
  const [gastoAsignando, setGastoAsignando] = useState<Gasto | null>(null);
  const [tipoAsignacion, setTipoAsignacion] = useState("general");
  const [referenciaAsignacionId, setReferenciaAsignacionId] = useState("");
  const [porcentajeAsignacion, setPorcentajeAsignacion] = useState("100");
  const [observacionAsignacion, setObservacionAsignacion] = useState("");
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);
  const [eliminandoAsignacionId, setEliminandoAsignacionId] = useState<string | null>(null);

  const [fecha, setFecha] = useState(hoyLocal());
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("ganado");
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState("BOB");
  const [centroCostoId, setCentroCostoId] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [filtroMes, setFiltroMes] = useState(mesActual());
  const [filtroMoneda, setFiltroMoneda] = useState("TODAS");
  const [filtroCategoria, setFiltroCategoria] = useState("TODAS");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const revisar = () => setEsMovil(window.innerWidth <= 820);
    revisar();
    window.addEventListener("resize", revisar);
    return () => window.removeEventListener("resize", revisar);
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    setError("");

    const [
      gastosRes,
      centrosRes,
      proveedoresRes,
      asignacionesRes,
      lotesRes,
      potrerosRes,
      maquinasRes,
      trabajadoresRes,
    ] = await Promise.all([
      supabase
        .from("gan_gastos")
        .select("*")
        .eq("finca_id", FINCA_ID)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("gan_centros_costos")
        .select("id,nombre,tipo,activo")
        .eq("finca_id", FINCA_ID)
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("gan_proveedores")
        .select("id,nombre,nit,telefono,email,direccion,rubro,activo,observaciones")
        .eq("finca_id", FINCA_ID)
        .order("nombre"),
      supabase
        .from("gan_gasto_asignaciones")
        .select("id,gasto_id,tipo_asignacion,referencia_id,porcentaje,monto_asignado,observaciones"),
      supabase
        .from("gan_lotes_ganado")
        .select("id,nombre")
        .eq("finca_id", FINCA_ID)
        .order("nombre"),
      supabase
        .from("gan_potreros")
        .select("id,nombre")
        .eq("finca_id", FINCA_ID)
        .order("nombre"),
      supabase
        .from("gan_maquinaria")
        .select("id,nombre")
        .eq("finca_id", FINCA_ID)
        .order("nombre"),
      supabase
        .from("gan_trabajadores")
        .select("id,nombre")
        .eq("finca_id", FINCA_ID)
        .order("nombre"),
    ]);

    const primerError =
      gastosRes.error ||
      centrosRes.error ||
      proveedoresRes.error ||
      asignacionesRes.error ||
      lotesRes.error ||
      potrerosRes.error ||
      maquinasRes.error ||
      trabajadoresRes.error;

    if (primerError) {
      setError(primerError.message || "No se pudieron cargar los datos.");
    } else {
      setGastos((gastosRes.data || []) as Gasto[]);
      setCentros((centrosRes.data || []) as CentroCosto[]);
      setProveedores((proveedoresRes.data || []) as Proveedor[]);
      setAsignaciones((asignacionesRes.data || []) as AsignacionGasto[]);
      setLotes((lotesRes.data || []) as ReferenciaCosto[]);
      setPotreros((potrerosRes.data || []) as ReferenciaCosto[]);
      setMaquinas((maquinasRes.data || []) as ReferenciaCosto[]);
      setTrabajadores((trabajadoresRes.data || []) as ReferenciaCosto[]);
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const limpiarFormulario = () => {
    setFecha(hoyLocal());
    setDescripcion("");
    setCategoria("ganado");
    setMonto("");
    setMoneda("BOB");
    setCentroCostoId("");
    setProveedorId("");
    setMetodoPago("");
    setNumeroDocumento("");
    setObservaciones("");
    setGastoEditandoId(null);
  };

  const cargarGastoParaEditar = (gasto: Gasto) => {
    setFecha(gasto.fecha);
    setDescripcion(gasto.descripcion);
    setCategoria(gasto.categoria);
    setMonto(String(gasto.monto));
    setMoneda(gasto.moneda);
    setCentroCostoId(gasto.centro_costo_id || "");
    setProveedorId(gasto.proveedor_id || "");
    setMetodoPago(gasto.metodo_pago || "");
    setNumeroDocumento(gasto.numero_documento || "");
    setObservaciones(gasto.observaciones || "");
    setGastoEditandoId(gasto.id);
    setMostrarFormulario(true);
    setMensaje("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const registrarGasto = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje("");
    setError("");

    const montoNumero = Number(monto);

    if (!descripcion.trim()) {
      setError("Escribe una descripción.");
      return;
    }

    if (monto === "" || Number.isNaN(montoNumero) || montoNumero < 0) {
      setError("Ingresa un monto válido.");
      return;
    }

    setGuardando(true);

    const parametrosComunes = {
      p_fecha: fecha,
      p_descripcion: descripcion.trim(),
      p_categoria: categoria,
      p_monto: montoNumero,
      p_moneda: moneda,
      p_centro_costo_id: centroCostoId || null,
      p_proveedor_id: proveedorId || null,
      p_metodo_pago: metodoPago.trim() || null,
      p_numero_documento: numeroDocumento.trim() || null,
      p_observaciones: observaciones.trim() || null,
    };

    const { error: rpcError } = gastoEditandoId
      ? await supabase.rpc("gan_editar_gasto", {
          p_gasto_id: gastoEditandoId,
          ...parametrosComunes,
        })
      : await supabase.rpc("gan_registrar_gasto", {
          p_finca_id: FINCA_ID,
          ...parametrosComunes,
        });

    if (rpcError) {
      setError(rpcError.message);
      setGuardando(false);
      return;
    }

    limpiarFormulario();
    setMostrarFormulario(false);
    setMensaje(gastoEditandoId ? "Gasto actualizado correctamente." : "Gasto registrado correctamente.");
    await cargarDatos();
    setGuardando(false);
  };

  const eliminarGasto = async (gasto: Gasto) => {
    const confirmar = window.confirm(
      `¿Eliminar el gasto "${gasto.descripcion}" por ${
        gasto.moneda === "BOB" ? "Bs" : "USD"
      } ${formatoNumero(Number(gasto.monto))}?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    setEliminandoId(gasto.id);
    setMensaje("");
    setError("");

    const { error: rpcError } = await supabase.rpc("gan_eliminar_gasto", {
      p_gasto_id: gasto.id,
    });

    if (rpcError) {
      setError(rpcError.message);
      setEliminandoId(null);
      return;
    }

    if (gastoEditandoId === gasto.id) {
      limpiarFormulario();
      setMostrarFormulario(false);
    }

    setMensaje("Gasto eliminado correctamente.");
    await cargarDatos();
    setEliminandoId(null);
  };

  const limpiarProveedor = () => {
    setProveedorEditandoId(null);
    setProvNombre("");
    setProvNit("");
    setProvTelefono("");
    setProvEmail("");
    setProvDireccion("");
    setProvRubro("");
    setProvObservaciones("");
  };

  const editarProveedor = (proveedor: Proveedor) => {
    setProveedorEditandoId(proveedor.id);
    setProvNombre(proveedor.nombre);
    setProvNit(proveedor.nit || "");
    setProvTelefono(proveedor.telefono || "");
    setProvEmail(proveedor.email || "");
    setProvDireccion(proveedor.direccion || "");
    setProvRubro(proveedor.rubro || "");
    setProvObservaciones(proveedor.observaciones || "");
    setMostrarFormProveedor(true);
    setMensaje("");
    setError("");
  };

  const guardarProveedor = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje("");
    setError("");

    if (!provNombre.trim()) {
      setError("El nombre del proveedor es obligatorio.");
      return;
    }

    setGuardandoProveedor(true);

    const datos = {
      p_nombre: provNombre.trim(),
      p_nit: provNit.trim() || null,
      p_telefono: provTelefono.trim() || null,
      p_email: provEmail.trim() || null,
      p_direccion: provDireccion.trim() || null,
      p_rubro: provRubro.trim() || null,
      p_observaciones: provObservaciones.trim() || null,
    };

    const { error: rpcError } = proveedorEditandoId
      ? await supabase.rpc("gan_editar_proveedor", {
          p_proveedor_id: proveedorEditandoId,
          ...datos,
        })
      : await supabase.rpc("gan_crear_proveedor", {
          p_finca_id: FINCA_ID,
          ...datos,
        });

    if (rpcError) {
      setError(rpcError.message);
      setGuardandoProveedor(false);
      return;
    }

    const eraEdicion = Boolean(proveedorEditandoId);
    limpiarProveedor();
    setMostrarFormProveedor(false);
    setMensaje(
      eraEdicion
        ? "Proveedor actualizado correctamente."
        : "Proveedor creado correctamente."
    );
    await cargarDatos();
    setGuardandoProveedor(false);
  };

  const cambiarEstadoProveedor = async (proveedor: Proveedor) => {
    const nuevoEstado = !proveedor.activo;
    const accion = nuevoEstado ? "activar" : "desactivar";

    if (
      !window.confirm(
        `¿Seguro que deseas ${accion} al proveedor "${proveedor.nombre}"?`
      )
    ) {
      return;
    }

    setCambiandoProveedorId(proveedor.id);
    setMensaje("");
    setError("");

    const { error: rpcError } = await supabase.rpc(
      "gan_cambiar_estado_proveedor",
      {
        p_proveedor_id: proveedor.id,
        p_activo: nuevoEstado,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      setCambiandoProveedorId(null);
      return;
    }

    if (!nuevoEstado && proveedorId === proveedor.id) {
      setProveedorId("");
    }

    setMensaje(
      nuevoEstado
        ? "Proveedor activado correctamente."
        : "Proveedor desactivado correctamente."
    );
    await cargarDatos();
    setCambiandoProveedorId(null);
  };

  const abrirAsignacion = (gasto: Gasto) => {
    const yaAsignado = asignaciones
      .filter((a) => a.gasto_id === gasto.id)
      .reduce((suma, a) => suma + Number(a.porcentaje), 0);
    const restante = Math.max(0, 100 - yaAsignado);

    setGastoAsignando(gasto);
    setTipoAsignacion("general");
    setReferenciaAsignacionId("");
    setPorcentajeAsignacion(
      restante > 0 ? String(Number(restante.toFixed(2))) : "0"
    );
    setObservacionAsignacion("");
    setMensaje("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const referenciasDisponibles = () => {
    if (tipoAsignacion === "lote") return lotes;
    if (tipoAsignacion === "potrero") return potreros;
    if (tipoAsignacion === "maquinaria") return maquinas;
    if (tipoAsignacion === "trabajador") return trabajadores;
    return [];
  };

  const nombreReferencia = (tipo: string, id: string | null) => {
    if (tipo === "general") return "General";
    if (!id) return "—";
    const fuente =
      tipo === "lote"
        ? lotes
        : tipo === "potrero"
        ? potreros
        : tipo === "maquinaria"
        ? maquinas
        : tipo === "trabajador"
        ? trabajadores
        : [];
    return fuente.find((item) => item.id === id)?.nombre || "—";
  };

  const guardarAsignacion = async (e: FormEvent) => {
    e.preventDefault();
    if (!gastoAsignando) return;

    const porcentaje = Number(porcentajeAsignacion);
    if (
      Number.isNaN(porcentaje) ||
      porcentaje <= 0 ||
      porcentaje > 100
    ) {
      setError("El porcentaje debe ser mayor a 0 y máximo 100.");
      return;
    }

    if (tipoAsignacion !== "general" && !referenciaAsignacionId) {
      setError("Selecciona el destino del gasto.");
      return;
    }

    const yaAsignado = asignaciones
      .filter((a) => a.gasto_id === gastoAsignando.id)
      .reduce((suma, a) => suma + Number(a.porcentaje), 0);

    if (yaAsignado + porcentaje > 100.0001) {
      setError(
        `Este gasto ya tiene ${formatoNumero(yaAsignado)}% asignado. El total no puede superar 100%.`
      );
      return;
    }

    setGuardandoAsignacion(true);
    setMensaje("");
    setError("");

    const { error: rpcError } = await supabase.rpc("gan_asignar_gasto", {
      p_gasto_id: gastoAsignando.id,
      p_tipo_asignacion: tipoAsignacion,
      p_referencia_id:
        tipoAsignacion === "general" ? null : referenciaAsignacionId,
      p_porcentaje: porcentaje,
      p_monto_asignado: null,
      p_observaciones: observacionAsignacion.trim() || null,
    });

    if (rpcError) {
      setError(rpcError.message);
      setGuardandoAsignacion(false);
      return;
    }

    setTipoAsignacion("general");
    setReferenciaAsignacionId("");
    setPorcentajeAsignacion("0");
    setObservacionAsignacion("");
    setMensaje("Asignación guardada correctamente.");
    await cargarDatos();
    setGuardandoAsignacion(false);
  };

  const eliminarAsignacion = async (asignacion: AsignacionGasto) => {
    if (!window.confirm("¿Eliminar esta asignación del gasto?")) return;

    setEliminandoAsignacionId(asignacion.id);
    setMensaje("");
    setError("");

    const { error: rpcError } = await supabase.rpc(
      "gan_eliminar_asignacion_gasto",
      { p_asignacion_id: asignacion.id }
    );

    if (rpcError) {
      setError(rpcError.message);
      setEliminandoAsignacionId(null);
      return;
    }

    setMensaje("Asignación eliminada correctamente.");
    await cargarDatos();
    setEliminandoAsignacionId(null);
  };

  const asignacionesDeGasto = (gastoId: string) =>
    asignaciones.filter((a) => a.gasto_id === gastoId);

  const porcentajeAsignadoDeGasto = (gastoId: string) =>
    asignacionesDeGasto(gastoId).reduce(
      (suma, asignacion) => suma + Number(asignacion.porcentaje),
      0
    );

  const gastoAsignadoAlCien = (gastoId: string) =>
    porcentajeAsignadoDeGasto(gastoId) >= 99.9999;

  const gastosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return gastos.filter((gasto) => {
      const cumpleMes = !filtroMes || gasto.fecha.startsWith(filtroMes);
      const cumpleMoneda =
        filtroMoneda === "TODAS" || gasto.moneda === filtroMoneda;
      const cumpleCategoria =
        filtroCategoria === "TODAS" || gasto.categoria === filtroCategoria;
      const cumpleBusqueda =
        !texto ||
        gasto.descripcion.toLowerCase().includes(texto) ||
        (gasto.numero_documento || "").toLowerCase().includes(texto);

      return cumpleMes && cumpleMoneda && cumpleCategoria && cumpleBusqueda;
    });
  }, [gastos, filtroMes, filtroMoneda, filtroCategoria, busqueda]);

  const totalBOB = useMemo(
    () =>
      gastosFiltrados
        .filter((g) => g.moneda === "BOB")
        .reduce((suma, g) => suma + Number(g.monto), 0),
    [gastosFiltrados]
  );

  const totalUSD = useMemo(
    () =>
      gastosFiltrados
        .filter((g) => g.moneda === "USD")
        .reduce((suma, g) => suma + Number(g.monto), 0),
    [gastosFiltrados]
  );

  const nombreCentro = (id: string | null) =>
    id ? centros.find((c) => c.id === id)?.nombre || "—" : "—";

  const nombreProveedor = (id: string | null) =>
    id ? proveedores.find((p) => p.id === id)?.nombre || "—" : "—";

  return (
    <div style={estilos.pagina}>
      <Sidebar />

      <main
        style={{
          ...estilos.main,
          marginLeft: esMovil ? 0 : 235,
          paddingTop: esMovil ? 92 : 30,
          paddingLeft: esMovil ? 16 : 30,
          paddingRight: esMovil ? 16 : 30,
        }}
      >
        <div style={estilos.encabezado}>
          <div>
            <div style={estilos.eyebrow}>CONTROL FINANCIERO</div>
            <h1 style={estilos.titulo}>Gastos</h1>
            <p style={estilos.subtitulo}>
              Registra y controla los egresos de Ganadería Tavera.
            </p>
          </div>

          <button
            type="button"
            style={estilos.botonPrincipal}
            onClick={() => {
              setMensaje("");
              setError("");
              if (mostrarFormulario) {
                limpiarFormulario();
                setMostrarFormulario(false);
              } else {
                limpiarFormulario();
                setMostrarFormulario(true);
              }
            }}
          >
            {mostrarFormulario ? "Cerrar" : "+ Registrar gasto"}
          </button>
        </div>

        {mensaje && <div style={estilos.exito}>{mensaje}</div>}
        {error && <div style={estilos.error}>{error}</div>}

        {mostrarFormulario && (
          <section style={estilos.panel}>
            <div style={estilos.panelTitulo}>{gastoEditandoId ? "Editar gasto" : "Nuevo gasto"}</div>

            <form onSubmit={registrarGasto}>
              <div style={estilos.formGrid}>
                <Campo label="Fecha">
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    style={estilos.input}
                    required
                  />
                </Campo>

                <Campo label="Descripción">
                  <input
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Ej. Compra de sal mineral"
                    style={estilos.input}
                    required
                  />
                </Campo>

                <Campo label="Categoría">
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    style={estilos.input}
                  >
                    {categorias.map(([valor, etiqueta]) => (
                      <option key={valor} value={valor}>
                        {etiqueta}
                      </option>
                    ))}
                  </select>
                </Campo>

                <Campo label="Centro de costo">
                  <select
                    value={centroCostoId}
                    onChange={(e) => setCentroCostoId(e.target.value)}
                    style={estilos.input}
                  >
                    <option value="">Sin asignar</option>
                    {centros.map((centro) => (
                      <option key={centro.id} value={centro.id}>
                        {centro.nombre}
                      </option>
                    ))}
                  </select>
                </Campo>

                <Campo label="Monto">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    style={estilos.input}
                    required
                  />
                </Campo>

                <Campo label="Moneda">
                  <select
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value)}
                    style={estilos.input}
                  >
                    <option value="BOB">Bs — Bolivianos</option>
                    <option value="USD">USD — Dólares</option>
                  </select>
                </Campo>

                <Campo label="Proveedor">
                  <select
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                    style={estilos.input}
                  >
                    <option value="">Sin proveedor</option>
                    {proveedores
                      .filter((proveedor) => proveedor.activo)
                      .map((proveedor) => (
                        <option key={proveedor.id} value={proveedor.id}>
                          {proveedor.nombre}
                        </option>
                      ))}
                  </select>
                </Campo>

                <Campo label="Método de pago">
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    style={estilos.input}
                  >
                    <option value="">Sin especificar</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="cheque">Cheque</option>
                    <option value="otro">Otro</option>
                  </select>
                </Campo>

                <Campo label="N.º documento / factura">
                  <input
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value)}
                    placeholder="Opcional"
                    style={estilos.input}
                  />
                </Campo>

                <Campo label="Observaciones">
                  <input
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Opcional"
                    style={estilos.input}
                  />
                </Campo>
              </div>

              <div style={estilos.accionesFormulario}>
                <button
                  type="button"
                  style={estilos.botonSecundario}
                  onClick={() => {
                    limpiarFormulario();
                    setMostrarFormulario(false);
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  style={{
                    ...estilos.botonPrincipal,
                    opacity: guardando ? 0.65 : 1,
                  }}
                >
                  {guardando ? "Guardando..." : gastoEditandoId ? "Guardar cambios" : "Guardar gasto"}
                </button>
              </div>
            </form>
          </section>
        )}

        {gastoAsignando && (
          <section style={estilos.panel}>
            <div style={estilos.panelCabecera}>
              <div>
                <div style={estilos.panelTitulo}>Asignar gasto</div>
                <div style={estilos.panelSubtitulo}>
                  {gastoAsignando.descripcion} —{" "}
                  {gastoAsignando.moneda === "BOB" ? "Bs" : "USD"}{" "}
                  {formatoNumero(Number(gastoAsignando.monto))}
                </div>
              </div>
              <button
                type="button"
                style={estilos.botonSecundario}
                onClick={() => setGastoAsignando(null)}
              >
                Cerrar
              </button>
            </div>

            {gastoAsignadoAlCien(gastoAsignando.id) ? (
              <div style={estilos.asignacionCompleta}>
                <div style={estilos.asignacionCompletaIcono}>✓</div>
                <div>
                  <div style={estilos.asignacionCompletaTitulo}>
                    Gasto asignado al 100%
                  </div>
                  <div style={estilos.asignacionCompletaTexto}>
                    La distribución de este gasto está completa.
                  </div>
                </div>
              </div>
            ) : (
            <form onSubmit={guardarAsignacion}>
              <div style={estilos.formGrid}>
                <Campo label="Destino">
                  <select
                    value={tipoAsignacion}
                    onChange={(e) => {
                      setTipoAsignacion(e.target.value);
                      setReferenciaAsignacionId("");
                    }}
                    style={estilos.input}
                  >
                    <option value="general">General</option>
                    <option value="lote">Lote</option>
                    <option value="potrero">Potrero</option>
                    <option value="maquinaria">Maquinaria</option>
                    <option value="trabajador">Trabajador</option>
                  </select>
                </Campo>

                {tipoAsignacion !== "general" && (
                  <Campo label="Seleccionar">
                    <select
                      value={referenciaAsignacionId}
                      onChange={(e) => setReferenciaAsignacionId(e.target.value)}
                      style={estilos.input}
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {referenciasDisponibles().map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </Campo>
                )}

                <Campo label="Porcentaje">
                  <input
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={porcentajeAsignacion}
                    onChange={(e) => setPorcentajeAsignacion(e.target.value)}
                    style={estilos.input}
                    required
                  />
                </Campo>

                <Campo label="Observaciones">
                  <input
                    value={observacionAsignacion}
                    onChange={(e) => setObservacionAsignacion(e.target.value)}
                    placeholder="Opcional"
                    style={estilos.input}
                  />
                </Campo>
              </div>

              <div style={estilos.accionesFormulario}>
                <button
                  type="submit"
                  disabled={guardandoAsignacion}
                  style={{
                    ...estilos.botonPrincipal,
                    opacity: guardandoAsignacion ? 0.65 : 1,
                  }}
                >
                  {guardandoAsignacion ? "Guardando..." : "Guardar asignación"}
                </button>
              </div>
            </form>
            )}

            <div style={estilos.asignacionesActuales}>
              <div style={estilos.label}>ASIGNACIONES ACTUALES</div>
              {asignacionesDeGasto(gastoAsignando.id).length === 0 ? (
                <div style={estilos.asignacionVacia}>
                  Este gasto todavía no tiene asignaciones.
                </div>
              ) : (
                asignacionesDeGasto(gastoAsignando.id).map((asignacion) => (
                  <div key={asignacion.id} style={estilos.asignacionFila}>
                    <div>
                      <strong style={{ color: "#173c28" }}>
                        {asignacion.tipo_asignacion === "general"
                          ? "General"
                          : `${asignacion.tipo_asignacion.charAt(0).toUpperCase()}${asignacion.tipo_asignacion.slice(1)}: ${nombreReferencia(
                              asignacion.tipo_asignacion,
                              asignacion.referencia_id
                            )}`}
                      </strong>
                      <div style={estilos.textoSuave}>
                        {formatoNumero(Number(asignacion.porcentaje))}% —{" "}
                        {gastoAsignando.moneda === "BOB" ? "Bs" : "USD"}{" "}
                        {formatoNumero(Number(asignacion.monto_asignado))}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={eliminandoAsignacionId === asignacion.id}
                      style={estilos.botonEliminar}
                      onClick={() => eliminarAsignacion(asignacion)}
                    >
                      {eliminandoAsignacionId === asignacion.id
                        ? "Eliminando..."
                        : "Quitar"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        <section style={estilos.tarjetasGrid}>
          <TarjetaResumen
            titulo="Total en bolivianos"
            valor={`Bs ${formatoNumero(totalBOB)}`}
            detalle="Según los filtros seleccionados"
          />
          <TarjetaResumen
            titulo="Total en dólares"
            valor={`USD ${formatoNumero(totalUSD)}`}
            detalle="Sin conversión automática"
          />
          <TarjetaResumen
            titulo="Registros"
            valor={String(gastosFiltrados.length)}
            detalle="Gastos encontrados"
          />
        </section>

        <section style={estilos.panel}>
          <div style={estilos.panelCabecera}>
            <div>
              <div style={estilos.panelTitulo}>Proveedores</div>
              <div style={estilos.panelSubtitulo}>
                Administra los proveedores utilizados en tus gastos y facturas.
              </div>
            </div>

            <div style={estilos.botonesProveedor}>
              <button
                type="button"
                style={estilos.botonSecundario}
                onClick={() => setMostrarProveedores((valor) => !valor)}
              >
                {mostrarProveedores ? "Ocultar proveedores" : "Ver proveedores"}
              </button>

              <button
                type="button"
                style={estilos.botonPrincipal}
                onClick={() => {
                  limpiarProveedor();
                  setMostrarProveedores(true);
                  setMostrarFormProveedor(true);
                  setMensaje("");
                  setError("");
                }}
              >
                + Nuevo proveedor
              </button>
            </div>
          </div>

          {mostrarFormProveedor && (
            <form onSubmit={guardarProveedor} style={estilos.formProveedor}>
              <div style={estilos.formGrid}>
                <Campo label="Nombre *">
                  <input
                    value={provNombre}
                    onChange={(e) => setProvNombre(e.target.value)}
                    placeholder="Ej. Veterinaria Central"
                    style={estilos.input}
                    required
                  />
                </Campo>

                <Campo label="NIT">
                  <input
                    value={provNit}
                    onChange={(e) => setProvNit(e.target.value)}
                    placeholder="Opcional"
                    style={estilos.input}
                  />
                </Campo>

                <Campo label="Teléfono">
                  <input
                    value={provTelefono}
                    onChange={(e) => setProvTelefono(e.target.value)}
                    placeholder="Opcional"
                    style={estilos.input}
                  />
                </Campo>

                <Campo label="Email">
                  <input
                    type="email"
                    value={provEmail}
                    onChange={(e) => setProvEmail(e.target.value)}
                    placeholder="Opcional"
                    style={estilos.input}
                  />
                </Campo>

                <Campo label="Rubro">
                  <input
                    value={provRubro}
                    onChange={(e) => setProvRubro(e.target.value)}
                    placeholder="Ej. Veterinaria, combustible, taller"
                    style={estilos.input}
                  />
                </Campo>

                <Campo label="Dirección">
                  <input
                    value={provDireccion}
                    onChange={(e) => setProvDireccion(e.target.value)}
                    placeholder="Opcional"
                    style={estilos.input}
                  />
                </Campo>

                <Campo label="Observaciones">
                  <input
                    value={provObservaciones}
                    onChange={(e) => setProvObservaciones(e.target.value)}
                    placeholder="Opcional"
                    style={estilos.input}
                  />
                </Campo>
              </div>

              <div style={estilos.accionesFormulario}>
                <button
                  type="button"
                  style={estilos.botonSecundario}
                  onClick={() => {
                    limpiarProveedor();
                    setMostrarFormProveedor(false);
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardandoProveedor}
                  style={{
                    ...estilos.botonPrincipal,
                    opacity: guardandoProveedor ? 0.65 : 1,
                  }}
                >
                  {guardandoProveedor
                    ? "Guardando..."
                    : proveedorEditandoId
                    ? "Guardar cambios"
                    : "Guardar proveedor"}
                </button>
              </div>
            </form>
          )}

          {mostrarProveedores && (
            <div style={estilos.proveedoresLista}>
              {proveedores.length === 0 ? (
                <div style={estilos.estadoVacio}>
                  Todavía no hay proveedores registrados.
                </div>
              ) : (
                proveedores.map((proveedor) => (
                  <div key={proveedor.id} style={estilos.proveedorCard}>
                    <div style={estilos.proveedorInfo}>
                      <div style={estilos.proveedorNombre}>
                        {proveedor.nombre}
                        <span
                          style={
                            proveedor.activo
                              ? estilos.estadoActivo
                              : estilos.estadoInactivo
                          }
                        >
                          {proveedor.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>

                      <div style={estilos.proveedorMeta}>
                        {proveedor.rubro && <span>{proveedor.rubro}</span>}
                        {proveedor.nit && <span>NIT: {proveedor.nit}</span>}
                        {proveedor.telefono && <span>Tel: {proveedor.telefono}</span>}
                        {proveedor.email && <span>{proveedor.email}</span>}
                      </div>
                    </div>

                    <div style={estilos.accionesProveedor}>
                      <button
                        type="button"
                        style={estilos.botonEditar}
                        onClick={() => editarProveedor(proveedor)}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        disabled={cambiandoProveedorId === proveedor.id}
                        style={
                          proveedor.activo
                            ? estilos.botonEliminar
                            : estilos.botonActivar
                        }
                        onClick={() => cambiarEstadoProveedor(proveedor)}
                      >
                        {cambiandoProveedorId === proveedor.id
                          ? "..."
                          : proveedor.activo
                          ? "Desactivar"
                          : "Activar"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        <section style={estilos.panel}>
          <div style={estilos.panelCabecera}>
            <div>
              <div style={estilos.panelTitulo}>Historial de gastos</div>
              <div style={estilos.panelSubtitulo}>
                Los totales de Bs y USD se mantienen separados.
              </div>
            </div>
          </div>

          <div style={estilos.filtros}>
            <Campo label="Mes">
              <input
                type="month"
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
                style={estilos.input}
              />
            </Campo>

            <Campo label="Moneda">
              <select
                value={filtroMoneda}
                onChange={(e) => setFiltroMoneda(e.target.value)}
                style={estilos.input}
              >
                <option value="TODAS">Todas</option>
                <option value="BOB">Bolivianos</option>
                <option value="USD">Dólares</option>
              </select>
            </Campo>

            <Campo label="Categoría">
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                style={estilos.input}
              >
                <option value="TODAS">Todas</option>
                {categorias.map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Buscar">
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Descripción o documento"
                style={estilos.input}
              />
            </Campo>
          </div>

          {cargando ? (
            <div style={estilos.estadoVacio}>Cargando gastos...</div>
          ) : gastosFiltrados.length === 0 ? (
            <div style={estilos.estadoVacio}>
              No hay gastos para los filtros seleccionados.
            </div>
          ) : esMovil ? (
            <div style={estilos.listaMovil}>
              {gastosFiltrados.map((gasto) => (
                <div key={gasto.id} style={estilos.gastoMovil}>
                  <div style={estilos.gastoMovilCabecera}>
                    <div>
                      <div style={estilos.descripcionFuerte}>
                        {gasto.descripcion}
                      </div>
                      <div style={estilos.textoSuave}>{gasto.fecha}</div>
                    </div>

                    <div style={estilos.montoFuerte}>
                      {gasto.moneda === "BOB" ? "Bs" : "USD"}{" "}
                      {formatoNumero(Number(gasto.monto))}
                    </div>
                  </div>

                  <div style={estilos.chips}>
                    <span style={estilos.chip}>
                      {etiquetaCategoria(gasto.categoria)}
                    </span>
                    {nombreCentro(gasto.centro_costo_id) !== "—" && (
                      <span style={estilos.chipClaro}>
                        {nombreCentro(gasto.centro_costo_id)}
                      </span>
                    )}
                  </div>

                  <div style={estilos.accionesFilaMovil}>
                    <button
                      type="button"
                      style={
                        gastoAsignadoAlCien(gasto.id)
                          ? estilos.botonAsignadoCompleto
                          : estilos.botonAsignar
                      }
                      onClick={() => abrirAsignacion(gasto)}
                    >
                      {gastoAsignadoAlCien(gasto.id) ? "✓ 100%" : "Asignar"}
                    </button>
                    <button
                      type="button"
                      style={estilos.botonEditar}
                      onClick={() => cargarGastoParaEditar(gasto)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={eliminandoId === gasto.id}
                      style={estilos.botonEliminar}
                      onClick={() => eliminarGasto(gasto)}
                    >
                      {eliminandoId === gasto.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>

                  <div style={estilos.detalleMovil}>
                    <span>Proveedor: {nombreProveedor(gasto.proveedor_id)}</span>
                    <span>Pago: {gasto.metodo_pago || "—"}</span>
                    <span>Documento: {gasto.numero_documento || "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={estilos.tablaContenedor}>
              <table style={estilos.tabla}>
                <thead>
                  <tr>
                    <th style={estilos.th}>Fecha</th>
                    <th style={estilos.th}>Descripción</th>
                    <th style={estilos.th}>Categoría</th>
                    <th style={estilos.th}>Centro</th>
                    <th style={estilos.th}>Proveedor</th>
                    <th style={estilos.th}>Pago</th>
                    <th style={estilos.th}>Asignación</th>
                    <th style={{ ...estilos.th, textAlign: "right" }}>Monto</th>
                    <th style={{ ...estilos.th, textAlign: "right" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {gastosFiltrados.map((gasto) => (
                    <tr key={gasto.id}>
                      <td style={estilos.td}>{gasto.fecha}</td>
                      <td style={estilos.td}>
                        <div style={estilos.descripcionFuerte}>
                          {gasto.descripcion}
                        </div>
                        {gasto.numero_documento && (
                          <div style={estilos.textoSuave}>
                            Doc. {gasto.numero_documento}
                          </div>
                        )}
                      </td>
                      <td style={estilos.td}>
                        {etiquetaCategoria(gasto.categoria)}
                      </td>
                      <td style={estilos.td}>
                        {nombreCentro(gasto.centro_costo_id)}
                      </td>
                      <td style={estilos.td}>
                        {nombreProveedor(gasto.proveedor_id)}
                      </td>
                      <td style={estilos.td}>{gasto.metodo_pago || "—"}</td>
                      <td style={estilos.td}>
                        {asignacionesDeGasto(gasto.id).length === 0
                          ? "—"
                          : asignacionesDeGasto(gasto.id)
                              .map(
                                (a) =>
                                  `${a.tipo_asignacion === "general" ? "General" : nombreReferencia(a.tipo_asignacion, a.referencia_id)} (${formatoNumero(Number(a.porcentaje))}%)`
                              )
                              .join(" · ")}
                      </td>
                      <td
                        style={{
                          ...estilos.td,
                          textAlign: "right",
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {gasto.moneda === "BOB" ? "Bs" : "USD"}{" "}
                        {formatoNumero(Number(gasto.monto))}
                      </td>
                      <td style={{ ...estilos.td, textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          type="button"
                          style={
                            gastoAsignadoAlCien(gasto.id)
                              ? estilos.botonAsignadoCompleto
                              : estilos.botonAsignar
                          }
                          onClick={() => abrirAsignacion(gasto)}
                        >
                          {gastoAsignadoAlCien(gasto.id) ? "✓ 100%" : "Asignar"}
                        </button>
                        <button
                          type="button"
                          style={{ ...estilos.botonEditar, marginLeft: "6px" }}
                          onClick={() => cargarGastoParaEditar(gasto)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={eliminandoId === gasto.id}
                          style={{ ...estilos.botonEliminar, marginLeft: "6px" }}
                          onClick={() => eliminarGasto(gasto)}
                        >
                          {eliminandoId === gasto.id ? "..." : "Eliminar"}
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
    </div>
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
    <label style={estilos.campo}>
      <span style={estilos.label}>{label}</span>
      {children}
    </label>
  );
}

function TarjetaResumen({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: string;
  detalle: string;
}) {
  return (
    <div style={estilos.tarjetaResumen}>
      <div style={estilos.tarjetaTitulo}>{titulo}</div>
      <div style={estilos.tarjetaValor}>{valor}</div>
      <div style={estilos.tarjetaDetalle}>{detalle}</div>
    </div>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  pagina: {
    minHeight: "100vh",
    background: "#f4f7f5",
    color: "#173327",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  main: {
    minHeight: "100vh",
    boxSizing: "border-box",
    paddingBottom: "50px",
  },
  encabezado: {
    maxWidth: "1280px",
    margin: "0 auto 24px",
    display: "flex",
    gap: "18px",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  eyebrow: {
    color: "#1b7542",
    fontSize: "11px",
    fontWeight: 900,
    letterSpacing: "1.4px",
    marginBottom: "7px",
  },
  titulo: {
    margin: 0,
    fontSize: "30px",
    lineHeight: 1.1,
    color: "#123824",
  },
  subtitulo: {
    margin: "7px 0 0",
    color: "#6b7e73",
    fontSize: "14px",
  },
  botonPrincipal: {
    border: "none",
    borderRadius: "10px",
    background: "#176b3a",
    color: "white",
    padding: "12px 17px",
    minHeight: "43px",
    fontWeight: 800,
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  botonSecundario: {
    border: "1px solid #d6e0da",
    borderRadius: "10px",
    background: "white",
    color: "#294638",
    padding: "11px 16px",
    minHeight: "43px",
    fontWeight: 750,
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  exito: {
    maxWidth: "1280px",
    margin: "0 auto 16px",
    background: "#eaf7ef",
    border: "1px solid #bfe3cc",
    color: "#176b3a",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "13px",
    fontWeight: 700,
  },
  error: {
    maxWidth: "1280px",
    margin: "0 auto 16px",
    background: "#fff1f1",
    border: "1px solid #efc3c3",
    color: "#9b2c2c",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "13px",
    fontWeight: 700,
  },
  panel: {
    maxWidth: "1280px",
    margin: "0 auto 22px",
    background: "white",
    border: "1px solid #e2e9e5",
    borderRadius: "15px",
    padding: "20px",
    boxSizing: "border-box",
    boxShadow: "0 5px 18px rgba(20,58,38,0.04)",
  },
  panelCabecera: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "center",
    marginBottom: "18px",
  },
  panelTitulo: {
    fontSize: "16px",
    fontWeight: 850,
    color: "#173c28",
    marginBottom: "4px",
  },
  panelSubtitulo: {
    fontSize: "12px",
    color: "#819087",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "15px",
    marginTop: "16px",
  },
  campo: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    minWidth: 0,
  },
  label: {
    fontSize: "11px",
    fontWeight: 800,
    color: "#53685c",
  },
  input: {
    width: "100%",
    minHeight: "42px",
    boxSizing: "border-box",
    border: "1px solid #d7e1db",
    borderRadius: "9px",
    background: "#fff",
    padding: "9px 11px",
    color: "#173327",
    fontSize: "13px",
    fontFamily: "inherit",
    outline: "none",
  },
  accionesFormulario: {
    marginTop: "18px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    flexWrap: "wrap",
  },
  tarjetasGrid: {
    maxWidth: "1280px",
    margin: "0 auto 22px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },
  tarjetaResumen: {
    background: "white",
    border: "1px solid #e2e9e5",
    borderRadius: "14px",
    padding: "18px",
    boxShadow: "0 4px 14px rgba(20,58,38,0.035)",
  },
  tarjetaTitulo: {
    color: "#718178",
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".5px",
  },
  tarjetaValor: {
    marginTop: "8px",
    fontSize: "24px",
    lineHeight: 1.1,
    fontWeight: 900,
    color: "#153d28",
  },
  tarjetaDetalle: {
    marginTop: "7px",
    fontSize: "11px",
    color: "#91a098",
  },
  filtros: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
    gap: "12px",
    marginBottom: "18px",
  },
  tablaContenedor: {
    overflowX: "auto",
    border: "1px solid #e6ece8",
    borderRadius: "11px",
  },
  tabla: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "1040px",
    fontSize: "12px",
  },
  th: {
    background: "#f6f9f7",
    color: "#64776c",
    textAlign: "left",
    padding: "11px 12px",
    borderBottom: "1px solid #e2e9e5",
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: ".45px",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #edf1ef",
    color: "#3b5145",
    verticalAlign: "top",
  },
  descripcionFuerte: {
    color: "#173c28",
    fontWeight: 800,
  },
  textoSuave: {
    marginTop: "3px",
    color: "#8a9991",
    fontSize: "10px",
  },
  estadoVacio: {
    padding: "36px 14px",
    textAlign: "center",
    color: "#84938b",
    fontSize: "13px",
    border: "1px dashed #dce5df",
    borderRadius: "11px",
    background: "#fafcfb",
  },
  listaMovil: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  gastoMovil: {
    border: "1px solid #e3eae6",
    borderRadius: "12px",
    padding: "14px",
    background: "#fff",
  },
  gastoMovilCabecera: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },
  montoFuerte: {
    fontWeight: 900,
    color: "#176b3a",
    whiteSpace: "nowrap",
    fontSize: "13px",
  },
  chips: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    marginTop: "11px",
  },
  chip: {
    borderRadius: "999px",
    background: "#eaf6ef",
    color: "#176b3a",
    padding: "5px 8px",
    fontSize: "10px",
    fontWeight: 800,
  },
  chipClaro: {
    borderRadius: "999px",
    background: "#f2f5f3",
    color: "#65766d",
    padding: "5px 8px",
    fontSize: "10px",
    fontWeight: 750,
  },
  accionesFilaMovil: {
    display: "flex",
    gap: "7px",
    marginTop: "11px",
  },
  botonAsignar: {
    border: "1px solid #b9d8c5",
    borderRadius: "7px",
    background: "#eaf6ef",
    color: "#176b3a",
    padding: "6px 9px",
    fontSize: "10px",
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  asignacionResumen: {
    marginTop: "9px",
    color: "#667a6e",
    fontSize: "10px",
    lineHeight: 1.45,
  },
  asignacionCompleta: {
    marginTop: "18px",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #bfe3cc",
    background: "#eaf7ef",
    color: "#176b3a",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  asignacionCompletaIcono: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "#176b3a",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: "18px",
    flexShrink: 0,
  },
  asignacionCompletaTitulo: {
    fontSize: "14px",
    fontWeight: 900,
  },
  asignacionCompletaTexto: {
    marginTop: "2px",
    fontSize: "11px",
    color: "#568068",
  },
  botonAsignadoCompleto: {
    border: "1px solid #bfe3cc",
    borderRadius: "8px",
    background: "#eaf7ef",
    color: "#176b3a",
    padding: "8px 10px",
    fontWeight: 850,
    fontSize: "11px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  asignacionesActuales: {
    marginTop: "18px",
    paddingTop: "15px",
    borderTop: "1px solid #edf1ef",
  },
  asignacionVacia: {
    marginTop: "8px",
    color: "#8a9991",
    fontSize: "11px",
  },
  asignacionFila: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginTop: "9px",
    padding: "10px 12px",
    border: "1px solid #e5ebe7",
    borderRadius: "9px",
    background: "#fafcfb",
    fontSize: "11px",
  },
  botonEditar: {
    border: "1px solid #cbdcd2",
    borderRadius: "7px",
    background: "#f4faf6",
    color: "#176b3a",
    padding: "6px 9px",
    fontSize: "10px",
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  botonEliminar: {
    border: "1px solid #efcccc",
    borderRadius: "7px",
    background: "#fff5f5",
    color: "#a83232",
    padding: "6px 9px",
    fontSize: "10px",
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  botonesProveedor: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  formProveedor: {
    marginTop: "14px",
    paddingTop: "4px",
    borderTop: "1px solid #edf1ef",
  },
  proveedoresLista: {
    display: "flex",
    flexDirection: "column",
    gap: "9px",
    marginTop: "14px",
  },
  proveedorCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
    border: "1px solid #e4ebe7",
    borderRadius: "11px",
    padding: "13px 14px",
    background: "#fafcfb",
  },
  proveedorInfo: {
    minWidth: 0,
    flex: "1 1 260px",
  },
  proveedorNombre: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    color: "#173c28",
    fontSize: "13px",
    fontWeight: 850,
  },
  proveedorMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "5px 12px",
    marginTop: "5px",
    color: "#7b8c82",
    fontSize: "10px",
  },
  estadoActivo: {
    background: "#e8f6ed",
    color: "#176b3a",
    borderRadius: "999px",
    padding: "3px 7px",
    fontSize: "9px",
    fontWeight: 800,
  },
  estadoInactivo: {
    background: "#f1f2f1",
    color: "#7d8882",
    borderRadius: "999px",
    padding: "3px 7px",
    fontSize: "9px",
    fontWeight: 800,
  },
  accionesProveedor: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
  },
  botonActivar: {
    border: "1px solid #bcdcc8",
    borderRadius: "7px",
    background: "#eef9f2",
    color: "#176b3a",
    padding: "6px 9px",
    fontSize: "10px",
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  detalleMovil: {
    marginTop: "11px",
    paddingTop: "10px",
    borderTop: "1px solid #edf1ef",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    color: "#718178",
    fontSize: "10px",
  },
};
