"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../../lib/supabase";

type Maquinaria = {
  id: string;
  finca_id: string;
  nombre: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  placa: string | null;
  numero_serie: string | null;
  tipo_medicion: "horas" | "km" | "ninguno";
  lectura_actual: number;
  estado: "activo" | "mantenimiento" | "fuera_servicio";
  fecha_compra: string | null;
  costo_compra: number | null;
  observaciones: string | null;
  created_at: string;
};

type Lectura = {
  id: string;
  maquinaria_id: string;
  fecha: string;
  lectura: number;
  observaciones: string | null;
  registrado_por: string | null;
  created_at: string;
};

type Combustible = {
  id: string;
  maquinaria_id: string;
  fecha: string;
  tipo_combustible: string;
  litros: number;
  precio_litro: number | null;
  lectura_maquina: number | null;
  proveedor: string | null;
  observaciones: string | null;
  registrado_por: string | null;
  created_at: string;
};

type Mantenimiento = {
  id: string;
  maquinaria_id: string;
  fecha: string;
  tipo: string;
  descripcion: string;
  lectura_servicio: number | null;
  costo_repuestos: number;
  costo_mano_obra: number;
  costo_otros: number;
  proveedor: string | null;
  observaciones: string | null;
  registrado_por: string | null;
  created_at: string;
};

type ServicioProgramado = {
  id: string;
  maquinaria_id: string;
  descripcion: string;
  proxima_fecha: string | null;
  proxima_lectura: number | null;
  completado: boolean;
  observaciones: string | null;
  created_at: string;
};

export default function FichaMaquinariaPage() {
  const router = useRouter();
  const params = useParams();

  const maquinaId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [maquina, setMaquina] = useState<Maquinaria | null>(null);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [combustibles, setCombustibles] = useState<Combustible[]>([]);
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [serviciosProgramados, setServiciosProgramados] = useState<ServicioProgramado[]>([]);

  const [mostrarLecturas, setMostrarLecturas] = useState(false);
  const [mostrarFormularioLectura, setMostrarFormularioLectura] =
    useState(false);

  const [mostrarCombustible, setMostrarCombustible] = useState(false);
  const [mostrarFormularioCombustible, setMostrarFormularioCombustible] =
    useState(false);

  const [mostrarMantenimientos, setMostrarMantenimientos] = useState(false);
  const [mostrarFormularioMantenimiento, setMostrarFormularioMantenimiento] =
    useState(false);

  const [mostrarServiciosProgramados, setMostrarServiciosProgramados] =
    useState(false);
  const [mostrarFormularioServicioProgramado, setMostrarFormularioServicioProgramado] =
    useState(false);

  const [guardandoLectura, setGuardandoLectura] = useState(false);
  const [guardandoCombustible, setGuardandoCombustible] = useState(false);
  const [guardandoMantenimiento, setGuardandoMantenimiento] = useState(false);
  const [guardandoServicioProgramado, setGuardandoServicioProgramado] = useState(false);

  const [fechaLectura, setFechaLectura] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [nuevaLectura, setNuevaLectura] = useState("");
  const [observacionLectura, setObservacionLectura] = useState("");

  const [fechaCombustible, setFechaCombustible] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [tipoCombustible, setTipoCombustible] = useState("diesel");
  const [litrosCombustible, setLitrosCombustible] = useState("");
  const [precioLitroCombustible, setPrecioLitroCombustible] = useState("");
  const [lecturaCombustible, setLecturaCombustible] = useState("");
  const [proveedorCombustible, setProveedorCombustible] = useState("");
  const [observacionCombustible, setObservacionCombustible] = useState("");

  const [fechaMantenimiento, setFechaMantenimiento] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [tipoMantenimiento, setTipoMantenimiento] = useState("preventivo");
  const [descripcionMantenimiento, setDescripcionMantenimiento] = useState("");
  const [lecturaMantenimiento, setLecturaMantenimiento] = useState("");
  const [costoRepuestos, setCostoRepuestos] = useState("");
  const [costoManoObra, setCostoManoObra] = useState("");
  const [costoOtros, setCostoOtros] = useState("");
  const [proveedorMantenimiento, setProveedorMantenimiento] = useState("");
  const [observacionMantenimiento, setObservacionMantenimiento] = useState("");

  const [descripcionServicioProgramado, setDescripcionServicioProgramado] = useState("");
  const [fechaServicioProgramado, setFechaServicioProgramado] = useState("");
  const [lecturaServicioProgramado, setLecturaServicioProgramado] = useState("");
  const [observacionServicioProgramado, setObservacionServicioProgramado] = useState("");

  useEffect(() => {
    if (maquinaId) {
      iniciar();
    }
  }, [maquinaId]);

  async function iniciar() {
    try {
      setCargando(true);
      setError("");

      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario || !user) {
        router.replace("/");
        return;
      }

      const { data: membresia, error: errorMembresia } =
        await supabase
          .from("gan_usuarios")
          .select("finca_id, activo")
          .eq("user_id", user.id)
          .eq("activo", true)
          .limit(1)
          .maybeSingle();

      if (errorMembresia) {
        throw errorMembresia;
      }

      if (!membresia?.finca_id) {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      await cargarMaquina(membresia.finca_id);
      await cargarLecturas();
      await cargarCombustibles();
      await cargarMantenimientos();
      await cargarServiciosProgramados();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || "No se pudo cargar la ficha de maquinaria."
      );
    } finally {
      setCargando(false);
    }
  }

  async function cargarMaquina(fincaId?: string) {
    if (!maquinaId) return;

    let consulta = supabase
      .from("gan_maquinaria")
      .select("*")
      .eq("id", maquinaId);

    if (fincaId) {
      consulta = consulta.eq("finca_id", fincaId);
    }

    const { data, error: errorMaquina } =
      await consulta.maybeSingle();

    if (errorMaquina) {
      throw errorMaquina;
    }

    if (!data) {
      setError("No se encontró esta maquinaria.");
      setMaquina(null);
      return;
    }

    setMaquina(data as Maquinaria);
  }

  async function cargarLecturas() {
    if (!maquinaId) return;

    const { data, error: errorLecturas } = await supabase
      .from("gan_maquinaria_lecturas")
      .select("*")
      .eq("maquinaria_id", maquinaId)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });

    if (errorLecturas) {
      throw errorLecturas;
    }

    setLecturas((data || []) as Lectura[]);
  }

  async function cargarCombustibles() {
    if (!maquinaId) return;

    const { data, error: errorCombustible } = await supabase
      .from("gan_combustible")
      .select("*")
      .eq("maquinaria_id", maquinaId)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });

    if (errorCombustible) {
      throw errorCombustible;
    }

    setCombustibles((data || []) as Combustible[]);
  }

  async function cargarMantenimientos() {
    if (!maquinaId) return;

    const { data, error: errorMantenimientos } = await supabase
      .from("gan_mantenimientos")
      .select("*")
      .eq("maquinaria_id", maquinaId)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });

    if (errorMantenimientos) throw errorMantenimientos;

    setMantenimientos((data || []) as Mantenimiento[]);
  }

  async function cargarServiciosProgramados() {
    if (!maquinaId) return;

    const { data, error: errorServicios } = await supabase
      .from("gan_mantenimiento_programado")
      .select("*")
      .eq("maquinaria_id", maquinaId)
      .order("completado", { ascending: true })
      .order("proxima_fecha", { ascending: true, nullsFirst: false })
      .order("proxima_lectura", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (errorServicios) throw errorServicios;

    setServiciosProgramados((data || []) as ServicioProgramado[]);
  }

  function abrirLecturas() {
    setMostrarLecturas(true);
    setMostrarFormularioLectura(false);
    setMensaje("");
    setError("");
  }

  function cerrarLecturas() {
    setMostrarLecturas(false);
    setMostrarFormularioLectura(false);
    setMensaje("");
    setError("");
  }

  function abrirNuevaLectura() {
    if (!maquina) return;

    setFechaLectura(new Date().toISOString().split("T")[0]);
    setNuevaLectura("");
    setObservacionLectura("");
    setError("");
    setMensaje("");
    setMostrarFormularioLectura(true);
  }

  async function registrarLectura(e: React.FormEvent) {
    e.preventDefault();

    if (!maquina || !maquinaId) return;

    const valor = Number(nuevaLectura);

    if (!fechaLectura) {
      setError("Selecciona la fecha de la lectura.");
      return;
    }

    if (!nuevaLectura.trim() || Number.isNaN(valor)) {
      setError("Ingresa una lectura válida.");
      return;
    }

    if (valor < Number(maquina.lectura_actual || 0)) {
      setError(
        `La nueva lectura no puede ser menor que ${Number(
          maquina.lectura_actual || 0
        ).toLocaleString("es-BO")} ${
          maquina.tipo_medicion === "horas" ? "h" : "km"
        }.`
      );
      return;
    }

    try {
      setGuardandoLectura(true);
      setError("");
      setMensaje("");

      const { error: errorRpc } = await supabase.rpc(
        "gan_registrar_lectura_maquinaria",
        {
          p_maquinaria_id: maquinaId,
          p_fecha: fechaLectura,
          p_lectura: valor,
          p_observaciones: observacionLectura.trim() || null,
        }
      );

      if (errorRpc) {
        throw errorRpc;
      }

      await cargarMaquina();
      await cargarLecturas();

      setNuevaLectura("");
      setObservacionLectura("");
      setMostrarFormularioLectura(false);

      setMensaje("Lectura registrada correctamente.");
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || "No se pudo registrar la lectura."
      );
    } finally {
      setGuardandoLectura(false);
    }
  }

  function abrirCombustible() {
    setMostrarCombustible(true);
    setMostrarFormularioCombustible(false);
    setMensaje("");
    setError("");
  }

  function cerrarCombustible() {
    setMostrarCombustible(false);
    setMostrarFormularioCombustible(false);
    setMensaje("");
    setError("");
  }

  function abrirNuevoCombustible() {
    if (!maquina) return;

    setFechaCombustible(new Date().toISOString().split("T")[0]);
    setTipoCombustible("diesel");
    setLitrosCombustible("");
    setPrecioLitroCombustible("");
    setLecturaCombustible(
      maquina.tipo_medicion === "ninguno"
        ? ""
        : String(maquina.lectura_actual || 0)
    );
    setProveedorCombustible("");
    setObservacionCombustible("");
    setError("");
    setMensaje("");
    setMostrarFormularioCombustible(true);
  }

  async function registrarCombustible(e: React.FormEvent) {
    e.preventDefault();

    if (!maquina || !maquinaId) return;

    const litros = Number(litrosCombustible);
    const precio =
      precioLitroCombustible.trim() === ""
        ? null
        : Number(precioLitroCombustible);
    const lectura =
      lecturaCombustible.trim() === ""
        ? null
        : Number(lecturaCombustible);

    if (!fechaCombustible) {
      setError("Selecciona la fecha de la carga.");
      return;
    }

    if (!tipoCombustible.trim()) {
      setError("Ingresa el tipo de combustible.");
      return;
    }

    if (!litrosCombustible.trim() || Number.isNaN(litros) || litros <= 0) {
      setError("Ingresa una cantidad de litros válida.");
      return;
    }

    if (precio !== null && (Number.isNaN(precio) || precio < 0)) {
      setError("Ingresa un precio por litro válido.");
      return;
    }

    if (lectura !== null && (Number.isNaN(lectura) || lectura < 0)) {
      setError("Ingresa una lectura de máquina válida.");
      return;
    }

    if (
      maquina.tipo_medicion !== "ninguno" &&
      lectura !== null &&
      lectura < Number(maquina.lectura_actual || 0)
    ) {
      setError(
        `La lectura de la máquina no puede ser menor que ${Number(
          maquina.lectura_actual || 0
        ).toLocaleString("es-BO")} ${unidadLectura()}.`
      );
      return;
    }

    try {
      setGuardandoCombustible(true);
      setError("");
      setMensaje("");

      const { error: errorRpc } = await supabase.rpc(
        "gan_registrar_combustible",
        {
          p_maquinaria_id: maquinaId,
          p_fecha: fechaCombustible,
          p_tipo_combustible: tipoCombustible.trim(),
          p_litros: litros,
          p_precio_litro: precio,
          p_lectura_maquina: lectura,
          p_proveedor: proveedorCombustible.trim() || null,
          p_observaciones: observacionCombustible.trim() || null,
        }
      );

      if (errorRpc) {
        throw errorRpc;
      }

      await cargarCombustibles();

      setLitrosCombustible("");
      setPrecioLitroCombustible("");
      setProveedorCombustible("");
      setObservacionCombustible("");
      setMostrarFormularioCombustible(false);

      setMensaje("Carga de combustible registrada correctamente.");
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || "No se pudo registrar la carga de combustible."
      );
    } finally {
      setGuardandoCombustible(false);
    }
  }

  function totalLitrosCombustible() {
    return combustibles.reduce(
      (total, carga) => total + Number(carga.litros || 0),
      0
    );
  }

  function totalCostoCombustible() {
    return combustibles.reduce((total, carga) => {
      if (carga.precio_litro === null || carga.precio_litro === undefined) {
        return total;
      }

      return (
        total +
        Number(carga.litros || 0) * Number(carga.precio_litro || 0)
      );
    }, 0);
  }

  function formatearNumero(valor: number, decimales = 2) {
    return Number(valor).toLocaleString("es-BO", {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    });
  }

  function etiquetaCombustible(tipo: string) {
    const valor = tipo.trim().toLowerCase();

    if (valor === "diesel") return "Diésel";
    if (valor === "gasolina") return "Gasolina";
    if (valor === "gnv") return "GNV";

    return tipo;
  }

  function abrirMantenimientos() {
    setMostrarMantenimientos(true);
    setMostrarFormularioMantenimiento(false);
    setMensaje("");
    setError("");
  }

  function cerrarMantenimientos() {
    setMostrarMantenimientos(false);
    setMostrarFormularioMantenimiento(false);
    setMensaje("");
    setError("");
  }

  function abrirNuevoMantenimiento() {
    if (!maquina) return;

    setFechaMantenimiento(new Date().toISOString().split("T")[0]);
    setTipoMantenimiento("preventivo");
    setDescripcionMantenimiento("");
    setLecturaMantenimiento(
      maquina.tipo_medicion === "ninguno" ? "" : String(maquina.lectura_actual || 0)
    );
    setCostoRepuestos("");
    setCostoManoObra("");
    setCostoOtros("");
    setProveedorMantenimiento("");
    setObservacionMantenimiento("");
    setError("");
    setMensaje("");
    setMostrarFormularioMantenimiento(true);
  }

  async function registrarMantenimiento(e: React.FormEvent) {
    e.preventDefault();
    if (!maquina || !maquinaId) return;

    const lectura = lecturaMantenimiento.trim() === "" ? null : Number(lecturaMantenimiento);
    const repuestos = costoRepuestos.trim() === "" ? 0 : Number(costoRepuestos);
    const manoObra = costoManoObra.trim() === "" ? 0 : Number(costoManoObra);
    const otros = costoOtros.trim() === "" ? 0 : Number(costoOtros);

    if (!fechaMantenimiento) return setError("Selecciona la fecha del mantenimiento.");
    if (!tipoMantenimiento.trim()) return setError("Selecciona el tipo de mantenimiento.");
    if (!descripcionMantenimiento.trim()) return setError("Ingresa la descripción del mantenimiento.");
    if (lectura !== null && (Number.isNaN(lectura) || lectura < 0))
      return setError("Ingresa una lectura válida.");
    if (
      maquina.tipo_medicion !== "ninguno" &&
      lectura !== null &&
      lectura < Number(maquina.lectura_actual || 0)
    )
      return setError(
        `La lectura de servicio no puede ser menor que ${Number(
          maquina.lectura_actual || 0
        ).toLocaleString("es-BO")} ${unidadLectura()}.`
      );
    if ([repuestos, manoObra, otros].some((v) => Number.isNaN(v) || v < 0))
      return setError("Los costos deben ser valores mayores o iguales a cero.");

    try {
      setGuardandoMantenimiento(true);
      setError("");
      setMensaje("");

      const { error: errorRpc } = await supabase.rpc("gan_registrar_mantenimiento", {
        p_maquinaria_id: maquinaId,
        p_fecha: fechaMantenimiento,
        p_tipo: tipoMantenimiento.trim(),
        p_descripcion: descripcionMantenimiento.trim(),
        p_lectura_servicio: lectura,
        p_costo_repuestos: repuestos,
        p_costo_mano_obra: manoObra,
        p_costo_otros: otros,
        p_proveedor: proveedorMantenimiento.trim() || null,
        p_observaciones: observacionMantenimiento.trim() || null,
      });

      if (errorRpc) throw errorRpc;

      await cargarMantenimientos();
      setMostrarFormularioMantenimiento(false);
      setMensaje("Mantenimiento registrado correctamente.");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "No se pudo registrar el mantenimiento.");
    } finally {
      setGuardandoMantenimiento(false);
    }
  }

  function costoMantenimiento(item: Mantenimiento) {
    return (
      Number(item.costo_repuestos || 0) +
      Number(item.costo_mano_obra || 0) +
      Number(item.costo_otros || 0)
    );
  }

  function totalCostoMantenimientos() {
    return mantenimientos.reduce((total, item) => total + costoMantenimiento(item), 0);
  }

  function etiquetaMantenimiento(tipo: string) {
    const etiquetas: Record<string, string> = {
      preventivo: "Preventivo",
      correctivo: "Correctivo",
      reparacion: "Reparación",
    };
    return etiquetas[tipo] || tipo;
  }

  function abrirServiciosProgramados() {
    setMostrarServiciosProgramados(true);
    setMostrarFormularioServicioProgramado(false);
    setMensaje("");
    setError("");
  }

  function cerrarServiciosProgramados() {
    setMostrarServiciosProgramados(false);
    setMostrarFormularioServicioProgramado(false);
    setMensaje("");
    setError("");
  }

  function abrirNuevoServicioProgramado() {
    setDescripcionServicioProgramado("");
    setFechaServicioProgramado("");
    setLecturaServicioProgramado("");
    setObservacionServicioProgramado("");
    setError("");
    setMensaje("");
    setMostrarFormularioServicioProgramado(true);
  }

  async function programarServicio(e: React.FormEvent) {
    e.preventDefault();
    if (!maquina || !maquinaId) return;

    const lectura =
      lecturaServicioProgramado.trim() === ""
        ? null
        : Number(lecturaServicioProgramado);

    if (!descripcionServicioProgramado.trim()) {
      setError("Ingresa la descripción del próximo servicio.");
      return;
    }

    if (!fechaServicioProgramado && lectura === null) {
      setError("Indica una fecha o una próxima lectura.");
      return;
    }

    if (lectura !== null && (Number.isNaN(lectura) || lectura < 0)) {
      setError("Ingresa una próxima lectura válida.");
      return;
    }

    if (
      maquina.tipo_medicion !== "ninguno" &&
      lectura !== null &&
      lectura <= Number(maquina.lectura_actual || 0)
    ) {
      setError(
        `La próxima lectura debe ser mayor que ${Number(
          maquina.lectura_actual || 0
        ).toLocaleString("es-BO")} ${unidadLectura()}.`
      );
      return;
    }

    try {
      setGuardandoServicioProgramado(true);
      setError("");
      setMensaje("");

      const { error: errorRpc } = await supabase.rpc(
        "gan_programar_mantenimiento",
        {
          p_maquinaria_id: maquinaId,
          p_descripcion: descripcionServicioProgramado.trim(),
          p_proxima_fecha: fechaServicioProgramado || null,
          p_proxima_lectura: lectura,
          p_observaciones: observacionServicioProgramado.trim() || null,
        }
      );

      if (errorRpc) throw errorRpc;

      await cargarServiciosProgramados();
      setMostrarFormularioServicioProgramado(false);
      setMensaje("Próximo servicio programado correctamente.");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "No se pudo programar el servicio.");
    } finally {
      setGuardandoServicioProgramado(false);
    }
  }

  function serviciosPendientes() {
    return serviciosProgramados.filter((item) => !item.completado);
  }

  function estadoServicio(item: ServicioProgramado) {
    if (item.completado) return "Completado";

    const ahora = new Date();
    const hoyLocal = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate()
    );

    let diasRestantes: number | null = null;

    if (item.proxima_fecha) {
      const [anio, mes, dia] = item.proxima_fecha.split("-").map(Number);
      const fechaServicio = new Date(anio, mes - 1, dia);
      diasRestantes = Math.ceil(
        (fechaServicio.getTime() - hoyLocal.getTime()) / 86400000
      );
    }

    let lecturaRestante: number | null = null;

    if (
      item.proxima_lectura !== null &&
      item.proxima_lectura !== undefined &&
      maquina !== null
    ) {
      lecturaRestante =
        Number(item.proxima_lectura) - Number(maquina.lectura_actual || 0);
    }

    const realizarAhora =
      (diasRestantes !== null && diasRestantes <= 0) ||
      (lecturaRestante !== null && lecturaRestante <= 0);

    if (realizarAhora) return "Realizar ahora";

    const proximo =
      (diasRestantes !== null && diasRestantes <= 10) ||
      (lecturaRestante !== null && lecturaRestante <= 20);

    if (proximo) return "Próximo";

    return "Pendiente";
  }

  function detalleAlertaServicio(item: ServicioProgramado) {
    if (item.completado) return "Servicio completado";

    const partes: string[] = [];

    if (item.proxima_fecha) {
      const ahora = new Date();
      const hoyLocal = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate()
      );
      const [anio, mes, dia] = item.proxima_fecha.split("-").map(Number);
      const fechaServicio = new Date(anio, mes - 1, dia);
      const dias = Math.ceil(
        (fechaServicio.getTime() - hoyLocal.getTime()) / 86400000
      );

      if (dias > 1) partes.push(`faltan ${dias} días`);
      else if (dias === 1) partes.push("falta 1 día");
      else if (dias === 0) partes.push("vence hoy");
      else if (dias === -1) partes.push("vencido hace 1 día");
      else partes.push(`vencido hace ${Math.abs(dias)} días`);
    }

    if (
      item.proxima_lectura !== null &&
      item.proxima_lectura !== undefined &&
      maquina !== null
    ) {
      const diferencia =
        Number(item.proxima_lectura) - Number(maquina.lectura_actual || 0);

      if (diferencia > 0) {
        partes.push(
          `faltan ${Number(diferencia).toLocaleString("es-BO")} ${unidadLectura()}`
        );
      } else if (diferencia === 0) {
        partes.push(`lectura alcanzada`);
      } else {
        partes.push(
          `superado por ${Math.abs(diferencia).toLocaleString("es-BO")} ${unidadLectura()}`
        );
      }
    }

    return partes.join(" · ");
  }

  function etiquetaEstado(estado: Maquinaria["estado"]) {
    if (estado === "activo") return "Activo";
    if (estado === "mantenimiento") return "Mantenimiento";
    return "Fuera de servicio";
  }

  function etiquetaTipo(tipo: string) {
    const tipos: Record<string, string> = {
      tractor: "Tractor",
      camioneta: "Camioneta",
      camion: "Camión",
      motocicleta: "Motocicleta",
      implemento: "Implemento",
      generador: "Generador",
      bomba: "Bomba",
      otro: "Otro",
    };

    return tipos[tipo] || tipo;
  }

  function iconoTipo(tipo: string) {
    if (tipo === "tractor") return "🚜";
    if (tipo === "camioneta" || tipo === "camion") return "🚙";
    if (tipo === "motocicleta") return "🏍️";
    return "⚙️";
  }

  function etiquetaLectura() {
    if (!maquina) return "Medición";

    if (maquina.tipo_medicion === "horas") {
      return "Horómetro actual";
    }

    if (maquina.tipo_medicion === "km") {
      return "Kilometraje actual";
    }

    return "Sin medición";
  }

  function unidadLectura() {
    if (!maquina) return "";

    if (maquina.tipo_medicion === "horas") return "h";
    if (maquina.tipo_medicion === "km") return "km";

    return "";
  }

  function valorLectura() {
    if (!maquina || maquina.tipo_medicion === "ninguno") {
      return "—";
    }

    return `${Number(
      maquina.lectura_actual || 0
    ).toLocaleString("es-BO")} ${unidadLectura()}`;
  }

  function formatearFecha(fecha: string | null) {
    if (!fecha) return "—";

    const partes = fecha.split("-");

    if (partes.length !== 3) return fecha;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  function formatearDinero(valor: number | null) {
    if (valor === null || valor === undefined) return "—";

    return `$ ${Number(valor).toLocaleString("es-BO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (cargando) {
    return (
      <>
        <Sidebar />

        <main className="pagina">
          <div className="cargando">
            Cargando ficha de maquinaria...
          </div>

          <style jsx>{estilos}</style>
        </main>
      </>
    );
  }

  return (
    <>
      <Sidebar />

      <main className="pagina">
        <button
          type="button"
          className="volver"
          onClick={() => router.push("/maquinaria")}
        >
          ← Volver a Maquinaria
        </button>

        {error && <div className="alerta error">{error}</div>}
        {mensaje && <div className="alerta exito">{mensaje}</div>}

        {maquina && (
          <>
            <section className="cabecera-ficha">
              <div className="identidad">
                <div className="icono-grande">
                  {iconoTipo(maquina.tipo)}
                </div>

                <div>
                  <div className="tipo">
                    {etiquetaTipo(maquina.tipo)}
                  </div>

                  <h1>{maquina.nombre}</h1>

                  <p>
                    {[maquina.marca, maquina.modelo]
                      .filter(Boolean)
                      .join(" ") || "Sin marca / modelo"}
                  </p>
                </div>
              </div>

              <span
                className={`estado estado-${maquina.estado}`}
              >
                {etiquetaEstado(maquina.estado)}
              </span>
            </section>

            <section className="resumen">
              <div className="tarjeta-resumen">
                <span>{etiquetaLectura()}</span>
                <strong>{valorLectura()}</strong>
                <small>Lectura registrada actualmente</small>
              </div>

              <div className="tarjeta-resumen">
                <span>Estado</span>
                <strong>{etiquetaEstado(maquina.estado)}</strong>
                <small>Situación operativa</small>
              </div>

              <div className="tarjeta-resumen">
                <span>Año</span>
                <strong>{maquina.anio || "—"}</strong>
                <small>Año del equipo</small>
              </div>

              <div className="tarjeta-resumen">
                <span>Costo de compra</span>
                <strong>{formatearDinero(maquina.costo_compra)}</strong>
                <small>Valor registrado</small>
              </div>
            </section>

            <section className="panel">
              <div className="titulo-panel">
                <div>
                  <div className="eyebrow">
                    INFORMACIÓN DEL EQUIPO
                  </div>

                  <h2>Datos generales</h2>
                </div>

                <button
                  type="button"
                  className="boton-editar"
                  onClick={() =>
                    router.push(`/maquinaria?editar=${maquina.id}`)
                  }
                >
                  Editar datos
                </button>
              </div>

              <div className="datos-grid">
                <Dato titulo="Nombre" valor={maquina.nombre} />

                <Dato
                  titulo="Tipo"
                  valor={etiquetaTipo(maquina.tipo)}
                />

                <Dato
                  titulo="Marca"
                  valor={maquina.marca || "—"}
                />

                <Dato
                  titulo="Modelo"
                  valor={maquina.modelo || "—"}
                />

                <Dato
                  titulo="Año"
                  valor={maquina.anio ? String(maquina.anio) : "—"}
                />

                <Dato
                  titulo="Placa"
                  valor={maquina.placa || "—"}
                />

                <Dato
                  titulo="N.º serie / chasis"
                  valor={maquina.numero_serie || "—"}
                />

                <Dato
                  titulo="Fecha de compra"
                  valor={formatearFecha(maquina.fecha_compra)}
                />

                <Dato
                  titulo="Control de uso"
                  valor={
                    maquina.tipo_medicion === "horas"
                      ? "Horómetro / horas"
                      : maquina.tipo_medicion === "km"
                      ? "Kilómetros"
                      : "Sin medición"
                  }
                />

                <Dato
                  titulo={etiquetaLectura()}
                  valor={valorLectura()}
                />

                <Dato
                  titulo="Estado"
                  valor={etiquetaEstado(maquina.estado)}
                />

                <Dato
                  titulo="Costo de compra"
                  valor={formatearDinero(maquina.costo_compra)}
                />
              </div>

              {maquina.observaciones && (
                <div className="observaciones">
                  <span>Observaciones</span>
                  <p>{maquina.observaciones}</p>
                </div>
              )}
            </section>

            {mostrarLecturas && (
              <section className="panel panel-lecturas">
                <div className="titulo-panel">
                  <div>
                    <div className="eyebrow">
                      CONTROL DE LECTURAS
                    </div>

                    <h2>
                      {maquina.tipo_medicion === "horas"
                        ? "Horómetro"
                        : "Kilometraje"}
                    </h2>

                    <p>
                      Historial de lecturas registradas para este
                      equipo.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="boton-cerrar"
                    onClick={cerrarLecturas}
                  >
                    ×
                  </button>
                </div>

                <div className="lectura-actual-box">
                  <div>
                    <span>Lectura actual</span>
                    <strong>{valorLectura()}</strong>
                  </div>

                  <button
                    type="button"
                    className="boton-principal"
                    onClick={abrirNuevaLectura}
                  >
                    + Registrar lectura
                  </button>
                </div>

                {mostrarFormularioLectura && (
                  <form
                    className="form-lectura"
                    onSubmit={registrarLectura}
                  >
                    <div className="form-lectura-grid">
                      <label>
                        <span>Fecha *</span>
                        <input
                          type="date"
                          value={fechaLectura}
                          onChange={(e) =>
                            setFechaLectura(e.target.value)
                          }
                          required
                        />
                      </label>

                      <label>
                        <span>
                          {maquina.tipo_medicion === "horas"
                            ? "Lectura del horómetro *"
                            : "Kilometraje *"}
                        </span>

                        <div className="input-unidad">
                          <input
                            type="number"
                            min={Number(
                              maquina.lectura_actual || 0
                            )}
                            step="0.01"
                            inputMode="decimal"
                            value={nuevaLectura}
                            onChange={(e) =>
                              setNuevaLectura(e.target.value)
                            }
                            placeholder={String(
                              maquina.lectura_actual || 0
                            )}
                            required
                          />

                          <span>{unidadLectura()}</span>
                        </div>
                      </label>

                      <label className="campo-completo">
                        <span>Observación</span>
                        <textarea
                          value={observacionLectura}
                          onChange={(e) =>
                            setObservacionLectura(e.target.value)
                          }
                          placeholder="Ej. Lectura tomada al finalizar la jornada."
                          rows={3}
                        />
                      </label>
                    </div>

                    <div className="acciones-form">
                      <button
                        type="button"
                        className="boton-secundario"
                        onClick={() =>
                          setMostrarFormularioLectura(false)
                        }
                        disabled={guardandoLectura}
                      >
                        Cancelar
                      </button>

                      <button
                        type="submit"
                        className="boton-principal"
                        disabled={guardandoLectura}
                      >
                        {guardandoLectura
                          ? "Guardando..."
                          : "Guardar lectura"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="historial-cabecera">
                  <h3>Historial de lecturas</h3>
                  <span>
                    {lecturas.length}{" "}
                    {lecturas.length === 1
                      ? "registro"
                      : "registros"}
                  </span>
                </div>

                {lecturas.length === 0 ? (
                  <div className="sin-lecturas">
                    <div>⏱️</div>
                    <strong>No hay lecturas registradas todavía</strong>
                    <p>
                      La lectura inicial del equipo es{" "}
                      <b>{valorLectura()}</b>.
                    </p>
                  </div>
                ) : (
                  <div className="tabla-contenedor">
                    <table>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Lectura</th>
                          <th>Observación</th>
                        </tr>
                      </thead>

                      <tbody>
                        {lecturas.map((lectura) => (
                          <tr key={lectura.id}>
                            <td data-label="Fecha">
                              {formatearFecha(lectura.fecha)}
                            </td>

                            <td data-label="Lectura">
                              <strong>
                                {Number(
                                  lectura.lectura
                                ).toLocaleString("es-BO")}{" "}
                                {unidadLectura()}
                              </strong>
                            </td>

                            <td data-label="Observación">
                              {lectura.observaciones || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {mostrarCombustible && (
              <section className="panel panel-combustible">
                <div className="titulo-panel">
                  <div>
                    <div className="eyebrow">CONTROL DE COMBUSTIBLE</div>
                    <h2>Combustible</h2>
                    <p>
                      Historial de cargas, litros, precios y costos de este
                      equipo.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="boton-cerrar"
                    onClick={cerrarCombustible}
                  >
                    ×
                  </button>
                </div>

                <div className="combustible-resumen">
                  <div>
                    <span>Total cargado</span>
                    <strong>
                      {formatearNumero(totalLitrosCombustible())} L
                    </strong>
                  </div>

                  <div>
                    <span>Costo registrado</span>
                    <strong>
                      {formatearDinero(totalCostoCombustible())}
                    </strong>
                  </div>

                  <div>
                    <span>Cargas</span>
                    <strong>{combustibles.length}</strong>
                  </div>

                  <button
                    type="button"
                    className="boton-principal"
                    onClick={abrirNuevoCombustible}
                  >
                    + Registrar carga
                  </button>
                </div>

                {mostrarFormularioCombustible && (
                  <form
                    className="form-combustible"
                    onSubmit={registrarCombustible}
                  >
                    <div className="form-combustible-grid">
                      <label>
                        <span>Fecha *</span>
                        <input
                          type="date"
                          value={fechaCombustible}
                          onChange={(e) =>
                            setFechaCombustible(e.target.value)
                          }
                          required
                        />
                      </label>

                      <label>
                        <span>Tipo de combustible *</span>
                        <input
                          type="text"
                          value={tipoCombustible}
                          onChange={(e) =>
                            setTipoCombustible(e.target.value)
                          }
                          placeholder="Ej. diesel"
                          required
                        />
                      </label>

                      <label>
                        <span>Litros *</span>
                        <div className="input-unidad">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            inputMode="decimal"
                            value={litrosCombustible}
                            onChange={(e) =>
                              setLitrosCombustible(e.target.value)
                            }
                            placeholder="0"
                            required
                          />
                          <span>L</span>
                        </div>
                      </label>

                      <label>
                        <span>Precio por litro</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={precioLitroCombustible}
                          onChange={(e) =>
                            setPrecioLitroCombustible(e.target.value)
                          }
                          placeholder="0.00"
                        />
                      </label>

                      {maquina.tipo_medicion !== "ninguno" && (
                        <label>
                          <span>
                            {maquina.tipo_medicion === "horas"
                              ? "Horómetro al cargar"
                              : "Kilometraje al cargar"}
                          </span>

                          <div className="input-unidad">
                            <input
                              type="number"
                              min={Number(maquina.lectura_actual || 0)}
                              step="0.01"
                              inputMode="decimal"
                              value={lecturaCombustible}
                              onChange={(e) =>
                                setLecturaCombustible(e.target.value)
                              }
                              placeholder={String(
                                maquina.lectura_actual || 0
                              )}
                            />
                            <span>{unidadLectura()}</span>
                          </div>
                        </label>
                      )}

                      <label>
                        <span>Proveedor</span>
                        <input
                          type="text"
                          value={proveedorCombustible}
                          onChange={(e) =>
                            setProveedorCombustible(e.target.value)
                          }
                          placeholder="Ej. Estación de servicio"
                        />
                      </label>

                      <label className="campo-completo">
                        <span>Observaciones</span>
                        <textarea
                          value={observacionCombustible}
                          onChange={(e) =>
                            setObservacionCombustible(e.target.value)
                          }
                          placeholder="Ej. Carga completa antes de iniciar trabajos."
                          rows={3}
                        />
                      </label>
                    </div>

                    <div className="acciones-form">
                      <button
                        type="button"
                        className="boton-secundario"
                        onClick={() =>
                          setMostrarFormularioCombustible(false)
                        }
                        disabled={guardandoCombustible}
                      >
                        Cancelar
                      </button>

                      <button
                        type="submit"
                        className="boton-principal"
                        disabled={guardandoCombustible}
                      >
                        {guardandoCombustible
                          ? "Guardando..."
                          : "Guardar carga"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="historial-cabecera">
                  <h3>Historial de combustible</h3>
                  <span>
                    {combustibles.length}{" "}
                    {combustibles.length === 1
                      ? "registro"
                      : "registros"}
                  </span>
                </div>

                {combustibles.length === 0 ? (
                  <div className="sin-lecturas">
                    <div>⛽</div>
                    <strong>
                      No hay cargas de combustible registradas todavía
                    </strong>
                    <p>
                      Registra la primera carga para comenzar el historial.
                    </p>
                  </div>
                ) : (
                  <div className="tabla-contenedor">
                    <table>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Combustible</th>
                          <th>Litros</th>
                          <th>Precio/L</th>
                          <th>Costo</th>
                          <th>Lectura</th>
                          <th>Proveedor</th>
                          <th>Observación</th>
                        </tr>
                      </thead>

                      <tbody>
                        {combustibles.map((carga) => {
                          const costo =
                            carga.precio_litro === null ||
                            carga.precio_litro === undefined
                              ? null
                              : Number(carga.litros) *
                                Number(carga.precio_litro);

                          return (
                            <tr key={carga.id}>
                              <td data-label="Fecha">
                                {formatearFecha(carga.fecha)}
                              </td>

                              <td data-label="Combustible">
                                {etiquetaCombustible(
                                  carga.tipo_combustible
                                )}
                              </td>

                              <td data-label="Litros">
                                <strong>
                                  {formatearNumero(
                                    Number(carga.litros)
                                  )}{" "}
                                  L
                                </strong>
                              </td>

                              <td data-label="Precio/L">
                                {carga.precio_litro === null ||
                                carga.precio_litro === undefined
                                  ? "—"
                                  : formatearDinero(
                                      Number(carga.precio_litro)
                                    )}
                              </td>

                              <td data-label="Costo">
                                {costo === null
                                  ? "—"
                                  : formatearDinero(costo)}
                              </td>

                              <td data-label="Lectura">
                                {carga.lectura_maquina === null ||
                                carga.lectura_maquina === undefined
                                  ? "—"
                                  : `${Number(
                                      carga.lectura_maquina
                                    ).toLocaleString("es-BO")} ${
                                      unidadLectura()
                                    }`}
                              </td>

                              <td data-label="Proveedor">
                                {carga.proveedor || "—"}
                              </td>

                              <td data-label="Observación">
                                {carga.observaciones || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {mostrarMantenimientos && (
              <section className="panel panel-mantenimiento">
                <div className="titulo-panel">
                  <div>
                    <div className="eyebrow">CONTROL DE MANTENIMIENTO</div>
                    <h2>Mantenimientos</h2>
                    <p>Servicios, reparaciones, proveedores y costos de este equipo.</p>
                  </div>
                  <button type="button" className="boton-cerrar" onClick={cerrarMantenimientos}>×</button>
                </div>

                <div className="mantenimiento-resumen">
                  <div><span>Servicios</span><strong>{mantenimientos.length}</strong></div>
                  <div><span>Costo acumulado</span><strong>{formatearDinero(totalCostoMantenimientos())}</strong></div>
                  <div>
                    <span>Último servicio</span>
                    <strong>{mantenimientos.length ? formatearFecha(mantenimientos[0].fecha) : "—"}</strong>
                  </div>
                  <button type="button" className="boton-principal" onClick={abrirNuevoMantenimiento}>
                    + Registrar mantenimiento
                  </button>
                </div>

                {mostrarFormularioMantenimiento && (
                  <form className="form-mantenimiento" onSubmit={registrarMantenimiento}>
                    <div className="form-mantenimiento-grid">
                      <label>
                        <span>Fecha *</span>
                        <input type="date" value={fechaMantenimiento}
                          onChange={(e) => setFechaMantenimiento(e.target.value)} required />
                      </label>

                      <label>
                        <span>Tipo *</span>
                        <select value={tipoMantenimiento}
                          onChange={(e) => setTipoMantenimiento(e.target.value)}>
                          <option value="preventivo">Preventivo</option>
                          <option value="correctivo">Correctivo</option>
                          <option value="reparacion">Reparación</option>
                        </select>
                      </label>

                      <label className="campo-completo">
                        <span>Descripción *</span>
                        <input type="text" value={descripcionMantenimiento}
                          onChange={(e) => setDescripcionMantenimiento(e.target.value)}
                          placeholder="Ej. Cambio de aceite y filtros" required />
                      </label>

                      {maquina.tipo_medicion !== "ninguno" && (
                        <label>
                          <span>{maquina.tipo_medicion === "horas" ? "Horómetro del servicio" : "Kilometraje del servicio"}</span>
                          <div className="input-unidad">
                            <input type="number" min={Number(maquina.lectura_actual || 0)} step="0.01"
                              inputMode="decimal" value={lecturaMantenimiento}
                              onChange={(e) => setLecturaMantenimiento(e.target.value)} />
                            <span>{unidadLectura()}</span>
                          </div>
                        </label>
                      )}

                      <label>
                        <span>Costo repuestos</span>
                        <input type="number" min="0" step="0.01" inputMode="decimal"
                          value={costoRepuestos} onChange={(e) => setCostoRepuestos(e.target.value)}
                          placeholder="0.00" />
                      </label>

                      <label>
                        <span>Mano de obra</span>
                        <input type="number" min="0" step="0.01" inputMode="decimal"
                          value={costoManoObra} onChange={(e) => setCostoManoObra(e.target.value)}
                          placeholder="0.00" />
                      </label>

                      <label>
                        <span>Otros costos</span>
                        <input type="number" min="0" step="0.01" inputMode="decimal"
                          value={costoOtros} onChange={(e) => setCostoOtros(e.target.value)}
                          placeholder="0.00" />
                      </label>

                      <label>
                        <span>Proveedor / taller</span>
                        <input type="text" value={proveedorMantenimiento}
                          onChange={(e) => setProveedorMantenimiento(e.target.value)}
                          placeholder="Ej. Taller agrícola" />
                      </label>

                      <label className="campo-completo">
                        <span>Observaciones</span>
                        <textarea value={observacionMantenimiento}
                          onChange={(e) => setObservacionMantenimiento(e.target.value)}
                          rows={3} placeholder="Detalles adicionales del servicio." />
                      </label>
                    </div>

                    <div className="acciones-form">
                      <button type="button" className="boton-secundario"
                        onClick={() => setMostrarFormularioMantenimiento(false)}
                        disabled={guardandoMantenimiento}>Cancelar</button>
                      <button type="submit" className="boton-principal" disabled={guardandoMantenimiento}>
                        {guardandoMantenimiento ? "Guardando..." : "Guardar mantenimiento"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="historial-cabecera">
                  <h3>Historial de mantenimientos</h3>
                  <span>{mantenimientos.length} {mantenimientos.length === 1 ? "registro" : "registros"}</span>
                </div>

                {mantenimientos.length === 0 ? (
                  <div className="sin-lecturas">
                    <div>🔧</div>
                    <strong>No hay mantenimientos registrados todavía</strong>
                    <p>Registra el primer servicio para comenzar el historial.</p>
                  </div>
                ) : (
                  <div className="tabla-contenedor">
                    <table>
                      <thead>
                        <tr>
                          <th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Lectura</th>
                          <th>Repuestos</th><th>Mano de obra</th><th>Otros</th>
                          <th>Total</th><th>Proveedor</th><th>Observación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mantenimientos.map((item) => (
                          <tr key={item.id}>
                            <td data-label="Fecha">{formatearFecha(item.fecha)}</td>
                            <td data-label="Tipo">{etiquetaMantenimiento(item.tipo)}</td>
                            <td data-label="Descripción"><strong>{item.descripcion}</strong></td>
                            <td data-label="Lectura">
                              {item.lectura_servicio === null || item.lectura_servicio === undefined
                                ? "—"
                                : `${Number(item.lectura_servicio).toLocaleString("es-BO")} ${unidadLectura()}`}
                            </td>
                            <td data-label="Repuestos">{formatearDinero(Number(item.costo_repuestos || 0))}</td>
                            <td data-label="Mano de obra">{formatearDinero(Number(item.costo_mano_obra || 0))}</td>
                            <td data-label="Otros">{formatearDinero(Number(item.costo_otros || 0))}</td>
                            <td data-label="Total"><strong>{formatearDinero(costoMantenimiento(item))}</strong></td>
                            <td data-label="Proveedor">{item.proveedor || "—"}</td>
                            <td data-label="Observación">{item.observaciones || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {mostrarServiciosProgramados && (
              <section className="panel panel-servicios">
                <div className="titulo-panel">
                  <div>
                    <div className="eyebrow">MANTENIMIENTO PROGRAMADO</div>
                    <h2>Próximos servicios</h2>
                    <p>Programa mantenimientos por fecha, horómetro o kilometraje.</p>
                  </div>
                  <button
                    type="button"
                    className="boton-cerrar"
                    onClick={cerrarServiciosProgramados}
                  >
                    ×
                  </button>
                </div>

                <div className="servicios-resumen">
                  <div>
                    <span>Pendientes</span>
                    <strong>{serviciosPendientes().length}</strong>
                  </div>
                  <div>
                    <span>Programados</span>
                    <strong>{serviciosProgramados.length}</strong>
                  </div>
                  <div>
                    <span>Lectura actual</span>
                    <strong>{valorLectura()}</strong>
                  </div>
                  <button
                    type="button"
                    className="boton-principal"
                    onClick={abrirNuevoServicioProgramado}
                  >
                    + Programar servicio
                  </button>
                </div>

                {mostrarFormularioServicioProgramado && (
                  <form
                    className="form-servicio"
                    onSubmit={programarServicio}
                  >
                    <div className="form-servicio-grid">
                      <label className="campo-completo">
                        <span>Descripción *</span>
                        <input
                          type="text"
                          value={descripcionServicioProgramado}
                          onChange={(e) =>
                            setDescripcionServicioProgramado(e.target.value)
                          }
                          placeholder="Ej. Cambio de aceite y filtros"
                          required
                        />
                      </label>

                      <label>
                        <span>Próxima fecha</span>
                        <input
                          type="date"
                          value={fechaServicioProgramado}
                          onChange={(e) =>
                            setFechaServicioProgramado(e.target.value)
                          }
                        />
                      </label>

                      {maquina.tipo_medicion !== "ninguno" && (
                        <label>
                          <span>
                            {maquina.tipo_medicion === "horas"
                              ? "Próximo horómetro"
                              : "Próximo kilometraje"}
                          </span>
                          <div className="input-unidad">
                            <input
                              type="number"
                              min={Number(maquina.lectura_actual || 0) + 0.01}
                              step="0.01"
                              inputMode="decimal"
                              value={lecturaServicioProgramado}
                              onChange={(e) =>
                                setLecturaServicioProgramado(e.target.value)
                              }
                              placeholder={`Mayor a ${Number(
                                maquina.lectura_actual || 0
                              ).toLocaleString("es-BO")}`}
                            />
                            <span>{unidadLectura()}</span>
                          </div>
                        </label>
                      )}

                      <label className="campo-completo">
                        <span>Observaciones</span>
                        <textarea
                          value={observacionServicioProgramado}
                          onChange={(e) =>
                            setObservacionServicioProgramado(e.target.value)
                          }
                          rows={3}
                          placeholder="Ej. Revisar también filtros y niveles."
                        />
                      </label>
                    </div>

                    <div className="nota-programacion">
                      Debes indicar al menos una fecha o una próxima lectura.
                    </div>

                    <div className="acciones-form">
                      <button
                        type="button"
                        className="boton-secundario"
                        onClick={() =>
                          setMostrarFormularioServicioProgramado(false)
                        }
                        disabled={guardandoServicioProgramado}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="boton-principal"
                        disabled={guardandoServicioProgramado}
                      >
                        {guardandoServicioProgramado
                          ? "Guardando..."
                          : "Guardar programación"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="historial-cabecera">
                  <h3>Servicios programados</h3>
                  <span>
                    {serviciosProgramados.length}{" "}
                    {serviciosProgramados.length === 1
                      ? "registro"
                      : "registros"}
                  </span>
                </div>

                {serviciosProgramados.length === 0 ? (
                  <div className="sin-lecturas">
                    <div>📅</div>
                    <strong>No hay servicios programados todavía</strong>
                    <p>
                      Programa el próximo mantenimiento por fecha o lectura.
                    </p>
                  </div>
                ) : (
                  <div className="tabla-contenedor">
                    <table>
                      <thead>
                        <tr>
                          <th>Servicio</th>
                          <th>Fecha</th>
                          <th>Lectura</th>
                          <th>Estado</th>
                          <th>Observación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {serviciosProgramados.map((item) => (
                          <tr key={item.id}>
                            <td data-label="Servicio">
                              <strong>{item.descripcion}</strong>
                            </td>
                            <td data-label="Fecha">
                              {formatearFecha(item.proxima_fecha)}
                            </td>
                            <td data-label="Lectura">
                              {item.proxima_lectura === null ||
                              item.proxima_lectura === undefined
                                ? "—"
                                : `${Number(
                                    item.proxima_lectura
                                  ).toLocaleString("es-BO")} ${unidadLectura()}`}
                            </td>
                            <td data-label="Estado">
                              <div className="estado-servicio-contenedor">
                                <span
                                  className={`estado-servicio ${
                                    estadoServicio(item) === "Pendiente"
                                      ? "estado-servicio-pendiente"
                                      : estadoServicio(item) === "Próximo"
                                      ? "estado-servicio-proximo"
                                      : estadoServicio(item) === "Completado"
                                      ? "estado-servicio-completado"
                                      : "estado-servicio-vencido"
                                  }`}
                                >
                                  {estadoServicio(item) === "Próximo" && "⚠️ "}
                                  {estadoServicio(item) === "Realizar ahora" && "🔴 "}
                                  {estadoServicio(item)}
                                </span>
                                {!item.completado && (
                                  <small className="detalle-alerta">
                                    {detalleAlertaServicio(item)}
                                  </small>
                                )}
                              </div>
                            </td>
                            <td data-label="Observación">
                              {item.observaciones || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            <section className="panel">
              <div className="titulo-panel">
                <div>
                  <div className="eyebrow">
                    CONTROL OPERATIVO
                  </div>

                  <h2>Gestión de la máquina</h2>

                  <p>
                    Desde aquí llevaremos el historial completo de este
                    equipo.
                  </p>
                </div>
              </div>

              <div className="modulos-grid">
                <button
                  type="button"
                  className="modulo modulo-activo"
                  onClick={abrirLecturas}
                  disabled={maquina.tipo_medicion === "ninguno"}
                >
                  <div className="modulo-icono">⏱️</div>

                  <div className="modulo-texto">
                    <strong>Horómetro / lecturas</strong>

                    <p>
                      {maquina.tipo_medicion === "ninguno"
                        ? "Este equipo no utiliza control por horas o kilómetros."
                        : `Actual: ${valorLectura()} · ${lecturas.length} ${
                            lecturas.length === 1
                              ? "registro"
                              : "registros"
                          }`}
                    </p>
                  </div>

                  {maquina.tipo_medicion !== "ninguno" && (
                    <span className="disponible">Abrir →</span>
                  )}
                </button>

                <button
                  type="button"
                  className="modulo modulo-activo"
                  onClick={abrirCombustible}
                >
                  <div className="modulo-icono">⛽</div>

                  <div className="modulo-texto">
                    <strong>Combustible</strong>
                    <p>
                      {combustibles.length === 0
                        ? "Cargas, litros, precios y consumo."
                        : `${formatearNumero(
                            totalLitrosCombustible()
                          )} L · ${combustibles.length} ${
                            combustibles.length === 1
                              ? "registro"
                              : "registros"
                          }`}
                    </p>
                  </div>

                  <span className="disponible">Abrir →</span>
                </button>

                <button
                  type="button"
                  className="modulo modulo-activo"
                  onClick={abrirMantenimientos}
                >
                  <div className="modulo-icono">🔧</div>
                  <div className="modulo-texto">
                    <strong>Mantenimientos</strong>
                    <p>
                      {mantenimientos.length === 0
                        ? "Servicios, reparaciones y costos."
                        : `${mantenimientos.length} ${
                            mantenimientos.length === 1 ? "servicio" : "servicios"
                          } · ${formatearDinero(totalCostoMantenimientos())}`}
                    </p>
                  </div>
                  <span className="disponible">Abrir →</span>
                </button>

                <button
                  type="button"
                  className="modulo modulo-activo"
                  onClick={abrirServiciosProgramados}
                >
                  <div className="modulo-icono">📅</div>
                  <div className="modulo-texto">
                    <strong>Próximos servicios</strong>
                    <p>
                      {serviciosPendientes().length === 0
                        ? "Mantenimiento programado por fecha o lectura."
                        : `${serviciosPendientes().length} ${
                            serviciosPendientes().length === 1
                              ? "servicio pendiente"
                              : "servicios pendientes"
                          }`}
                    </p>
                  </div>
                  <span className="disponible">Abrir →</span>
                </button>

                <Modulo
                  icono="🚜"
                  titulo="Uso / trabajos"
                  descripcion="Actividad, potrero, operador y horas trabajadas."
                />

                <Modulo
                  icono="$"
                  titulo="Costos"
                  descripcion="Resumen de combustible y mantenimiento."
                />
              </div>
            </section>
          </>
        )}

        <style jsx>{estilos}</style>
      </main>
    </>
  );
}

function Dato({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="dato">
      <span>{titulo}</span>
      <strong>{valor}</strong>

      <style jsx>{`
        .dato {
          background: #f7f9f7;
          border-radius: 11px;
          padding: 14px;
          min-width: 0;
        }

        span {
          display: block;
          color: #7a867e;
          font-size: 11px;
          margin-bottom: 5px;
        }

        strong {
          display: block;
          color: #28382d;
          font-size: 14px;
          overflow-wrap: anywhere;
        }
      `}</style>
    </div>
  );
}

function Modulo({
  icono,
  titulo,
  descripcion,
}: {
  icono: string;
  titulo: string;
  descripcion: string;
}) {
  return (
    <div className="modulo-estatico">
      <div className="modulo-icono-estatico">{icono}</div>

      <div>
        <strong>{titulo}</strong>
        <p>{descripcion}</p>
      </div>

      <span className="proximamente">Próximamente</span>

      <style jsx>{`
        .modulo-estatico {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          min-height: 88px;
          padding: 16px;
          border: 1px solid #e0e7e1;
          border-radius: 13px;
          background: white;
          box-sizing: border-box;
        }

        .modulo-icono-estatico {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #eef5f0;
          font-size: 20px;
        }

        strong {
          display: block;
          padding-right: 72px;
          color: #20452e;
          font-size: 14px;
        }

        p {
          margin: 5px 0 0;
          color: #758078;
          font-size: 12px;
          line-height: 1.4;
        }

        .proximamente {
          position: absolute;
          top: 14px;
          right: 14px;
          padding: 4px 7px;
          border-radius: 999px;
          background: #f2f5f2;
          color: #7a867e;
          font-size: 9px;
          font-weight: 700;
        }

        @media (max-width: 500px) {
          strong {
            padding-right: 0;
            padding-top: 20px;
          }

          .proximamente {
            left: 70px;
            right: auto;
          }
        }
      `}</style>
    </div>
  );
}

const estilos = `
  .pagina {
    margin-left: 235px;
    min-height: 100vh;
    background: #f4f7f4;
    padding: 34px;
    color: #17251c;
  }

  .volver {
    border: none;
    background: transparent;
    color: #2b6940;
    font-size: 13px;
    font-weight: 750;
    cursor: pointer;
    padding: 0;
    margin-bottom: 20px;
  }

  .cabecera-ficha {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: 24px;
    margin-bottom: 20px;
    background: white;
    border: 1px solid #e0e7e1;
    border-radius: 16px;
    box-shadow: 0 3px 14px rgba(20, 50, 29, 0.04);
  }

  .identidad {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
  }

  .icono-grande {
    width: 64px;
    height: 64px;
    flex: 0 0 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    background: #eef5f0;
    font-size: 34px;
  }

  .tipo {
    color: #718078;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 10px;
    font-weight: 800;
  }

  h1 {
    margin: 4px 0;
    color: #173d27;
    font-size: 30px;
    line-height: 1.1;
    overflow-wrap: anywhere;
  }

  .identidad p {
    margin: 0;
    color: #748078;
    font-size: 14px;
  }

  .estado {
    flex-shrink: 0;
    border-radius: 999px;
    padding: 7px 11px;
    font-size: 11px;
    font-weight: 800;
  }

  .estado-activo {
    background: #eaf7ee;
    color: #24713d;
  }

  .estado-mantenimiento {
    background: #fff5dd;
    color: #946813;
  }

  .estado-fuera_servicio {
    background: #f3eeee;
    color: #7d4a4a;
  }

  .resumen {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 15px;
    margin-bottom: 20px;
  }

  .tarjeta-resumen {
    background: white;
    border: 1px solid #e1e8e2;
    border-radius: 15px;
    padding: 18px;
    box-shadow: 0 3px 12px rgba(22, 50, 30, 0.04);
  }

  .tarjeta-resumen span {
    display: block;
    color: #6b786e;
    font-size: 12px;
    font-weight: 650;
  }

  .tarjeta-resumen strong {
    display: block;
    margin: 8px 0 4px;
    color: #173d27;
    font-size: 21px;
    line-height: 1.15;
    overflow-wrap: anywhere;
  }

  .tarjeta-resumen small {
    color: #8b958d;
    font-size: 11px;
  }

  .panel {
    background: white;
    border: 1px solid #e0e7e1;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 3px 14px rgba(20, 50, 29, 0.04);
  }

  .panel-lecturas {
    border-top: 4px solid #2d7545;
  }

  .panel-combustible {
    border-top: 4px solid #2d7545;
  }

  .panel-mantenimiento {
    border-top: 4px solid #2d7545;
  }

  .panel-servicios {
    border-top: 4px solid #2d7545;
  }

  .titulo-panel {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 20px;
  }

  .eyebrow {
    margin-bottom: 6px;
    color: #67816d;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.2px;
  }

  .titulo-panel h2 {
    margin: 0;
    color: #173d27;
    font-size: 20px;
  }

  .titulo-panel p {
    margin: 7px 0 0;
    color: #748078;
    font-size: 13px;
  }

  .boton-editar,
  .boton-secundario {
    flex-shrink: 0;
    border: 1px solid #cbd8ce;
    background: white;
    color: #24613a;
    border-radius: 9px;
    padding: 9px 13px;
    font-size: 12px;
    font-weight: 750;
    cursor: pointer;
  }

  .boton-cerrar {
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    border-radius: 50%;
    border: 1px solid #d9e1da;
    background: white;
    color: #526157;
    font-size: 23px;
    line-height: 1;
    cursor: pointer;
  }

  .boton-principal {
    border: none;
    background: #1f6b3a;
    color: white;
    padding: 11px 16px;
    border-radius: 9px;
    font-weight: 750;
    font-size: 12px;
    cursor: pointer;
    min-height: 40px;
  }

  .boton-principal:disabled,
  .boton-secundario:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .datos-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .observaciones {
    margin-top: 15px;
    padding: 14px;
    background: #fafbfa;
    border-radius: 11px;
  }

  .observaciones span {
    display: block;
    color: #6e7b72;
    font-size: 11px;
    font-weight: 750;
  }

  .observaciones p {
    margin: 6px 0 0;
    color: #59675e;
    font-size: 13px;
    line-height: 1.5;
  }

  .modulos-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .modulo {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-height: 88px;
    padding: 16px;
    border: 1px solid #d8e4da;
    border-radius: 13px;
    background: white;
    box-sizing: border-box;
    width: 100%;
    text-align: left;
    font-family: inherit;
  }

  .modulo-activo {
    cursor: pointer;
  }

  .modulo-activo:hover {
    background: #f7fbf8;
    border-color: #b9d1bf;
  }

  .modulo-activo:disabled {
    cursor: default;
    opacity: 0.65;
  }

  .modulo-icono {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
    background: #eaf4ed;
    font-size: 20px;
  }

  .modulo-texto {
    min-width: 0;
  }

  .modulo-texto strong {
    display: block;
    padding-right: 60px;
    color: #20452e;
    font-size: 14px;
  }

  .modulo-texto p {
    margin: 5px 0 0;
    color: #758078;
    font-size: 12px;
    line-height: 1.4;
  }

  .disponible {
    position: absolute;
    top: 14px;
    right: 14px;
    color: #2b6940;
    font-size: 10px;
    font-weight: 800;
  }

  .lectura-actual-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    background: #f4f8f5;
    border: 1px solid #e0e9e2;
    border-radius: 13px;
    padding: 17px;
    margin-bottom: 17px;
  }

  .lectura-actual-box span {
    display: block;
    color: #738078;
    font-size: 11px;
  }

  .lectura-actual-box strong {
    display: block;
    color: #173d27;
    font-size: 25px;
    margin-top: 4px;
  }

  .combustible-resumen {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
    align-items: center;
    gap: 12px;
    background: #f4f8f5;
    border: 1px solid #e0e9e2;
    border-radius: 13px;
    padding: 17px;
    margin-bottom: 17px;
  }

  .combustible-resumen > div {
    min-width: 0;
  }

  .combustible-resumen span {
    display: block;
    color: #738078;
    font-size: 11px;
  }

  .combustible-resumen strong {
    display: block;
    color: #173d27;
    font-size: 20px;
    margin-top: 4px;
    overflow-wrap: anywhere;
  }

  .form-combustible {
    border: 1px solid #dce6de;
    background: #fbfcfb;
    border-radius: 13px;
    padding: 17px;
    margin-bottom: 20px;
  }

  .form-combustible-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .form-combustible label {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .form-combustible label > span {
    color: #405046;
    font-size: 12px;
    font-weight: 700;
  }

  .form-combustible input,
  .form-combustible textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #ccd6ce;
    border-radius: 9px;
    background: white;
    color: #1e2e23;
    padding: 10px 11px;
    font-size: 14px;
    font-family: inherit;
    outline: none;
  }

  .form-combustible input {
    min-height: 42px;
  }

  .form-combustible textarea {
    resize: vertical;
  }

  .form-combustible input:focus,
  .form-combustible textarea:focus {
    border-color: #3c8656;
    box-shadow: 0 0 0 3px rgba(60, 134, 86, 0.09);
  }

  .mantenimiento-resumen {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
    align-items: center;
    gap: 12px;
    background: #f4f8f5;
    border: 1px solid #e0e9e2;
    border-radius: 13px;
    padding: 17px;
    margin-bottom: 17px;
  }

  .mantenimiento-resumen span {
    display: block;
    color: #738078;
    font-size: 11px;
  }

  .mantenimiento-resumen strong {
    display: block;
    color: #173d27;
    font-size: 20px;
    margin-top: 4px;
    overflow-wrap: anywhere;
  }

  .form-mantenimiento {
    border: 1px solid #dce6de;
    background: #fbfcfb;
    border-radius: 13px;
    padding: 17px;
    margin-bottom: 20px;
  }

  .form-mantenimiento-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .form-mantenimiento label {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .form-mantenimiento label > span {
    color: #405046;
    font-size: 12px;
    font-weight: 700;
  }

  .form-mantenimiento input,
  .form-mantenimiento select,
  .form-mantenimiento textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #ccd6ce;
    border-radius: 9px;
    background: white;
    color: #1e2e23;
    padding: 10px 11px;
    font-size: 14px;
    font-family: inherit;
    outline: none;
  }

  .form-mantenimiento input,
  .form-mantenimiento select {
    min-height: 42px;
  }

  .form-mantenimiento textarea {
    resize: vertical;
  }

  .form-mantenimiento input:focus,
  .form-mantenimiento select:focus,
  .form-mantenimiento textarea:focus {
    border-color: #3c8656;
    box-shadow: 0 0 0 3px rgba(60, 134, 86, 0.09);
  }

  .servicios-resumen {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
    align-items: center;
    gap: 12px;
    background: #f4f8f5;
    border: 1px solid #e0e9e2;
    border-radius: 13px;
    padding: 17px;
    margin-bottom: 17px;
  }

  .servicios-resumen span {
    display: block;
    color: #738078;
    font-size: 11px;
  }

  .servicios-resumen strong {
    display: block;
    color: #173d27;
    font-size: 20px;
    margin-top: 4px;
    overflow-wrap: anywhere;
  }

  .form-servicio {
    border: 1px solid #dce6de;
    background: #fbfcfb;
    border-radius: 13px;
    padding: 17px;
    margin-bottom: 20px;
  }

  .form-servicio-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .form-servicio label {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .form-servicio label > span {
    color: #405046;
    font-size: 12px;
    font-weight: 700;
  }

  .form-servicio input,
  .form-servicio textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #ccd6ce;
    border-radius: 9px;
    background: white;
    color: #1e2e23;
    padding: 10px 11px;
    font-size: 14px;
    font-family: inherit;
    outline: none;
  }

  .form-servicio input {
    min-height: 42px;
  }

  .form-servicio textarea {
    resize: vertical;
  }

  .form-servicio input:focus,
  .form-servicio textarea:focus {
    border-color: #3c8656;
    box-shadow: 0 0 0 3px rgba(60, 134, 86, 0.09);
  }

  .nota-programacion {
    margin-top: 12px;
    color: #758078;
    font-size: 11px;
  }

  .estado-servicio {
    display: inline-block;
    border-radius: 999px;
    padding: 5px 8px;
    font-size: 10px;
    font-weight: 800;
    white-space: nowrap;
  }

  .estado-servicio-contenedor {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .detalle-alerta {
    color: #758078;
    font-size: 10px;
    line-height: 1.35;
  }

  .estado-servicio-pendiente {
    background: #edf5ef;
    color: #2d6b41;
  }

  .estado-servicio-proximo {
    background: #fff5dd;
    color: #946813;
  }

  .estado-servicio-vencido {
    background: #fbe9e9;
    color: #9a3e3e;
  }

  .estado-servicio-completado {
    background: #eaf7ee;
    color: #24713d;
  }

  .form-lectura {
    border: 1px solid #dce6de;
    background: #fbfcfb;
    border-radius: 13px;
    padding: 17px;
    margin-bottom: 20px;
  }

  .form-lectura-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .form-lectura label {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .form-lectura label > span {
    color: #405046;
    font-size: 12px;
    font-weight: 700;
  }

  .form-lectura input,
  .form-lectura textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #ccd6ce;
    border-radius: 9px;
    background: white;
    color: #1e2e23;
    padding: 10px 11px;
    font-size: 14px;
    font-family: inherit;
    outline: none;
  }

  .form-lectura input {
    min-height: 42px;
  }

  .form-lectura textarea {
    resize: vertical;
  }

  .form-lectura input:focus,
  .form-lectura textarea:focus {
    border-color: #3c8656;
    box-shadow: 0 0 0 3px rgba(60, 134, 86, 0.09);
  }

  .campo-completo {
    grid-column: 1 / -1;
  }

  .input-unidad {
    display: flex;
    align-items: center;
    position: relative;
  }

  .input-unidad input {
    padding-right: 50px;
  }

  .input-unidad > span {
    position: absolute;
    right: 12px;
    color: #66746b;
    font-size: 12px;
    font-weight: 800;
  }

  .acciones-form {
    display: flex;
    justify-content: flex-end;
    gap: 9px;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #e8ede9;
  }

  .historial-cabecera {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 22px 0 11px;
  }

  .historial-cabecera h3 {
    margin: 0;
    color: #294333;
    font-size: 15px;
  }

  .historial-cabecera span {
    background: #eef4ef;
    color: #52705c;
    border-radius: 999px;
    padding: 5px 8px;
    font-size: 10px;
    font-weight: 750;
  }

  .sin-lecturas {
    text-align: center;
    padding: 30px 15px;
    border: 1px dashed #d8e2da;
    border-radius: 12px;
    color: #758078;
  }

  .sin-lecturas > div {
    font-size: 30px;
    margin-bottom: 7px;
  }

  .sin-lecturas strong {
    display: block;
    color: #405448;
    font-size: 13px;
  }

  .sin-lecturas p {
    margin: 6px 0 0;
    font-size: 12px;
  }

  .tabla-contenedor {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }

  th {
    text-align: left;
    color: #6f7c73;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 10px;
    border-bottom: 1px solid #dfe6e0;
  }

  td {
    padding: 12px 10px;
    border-bottom: 1px solid #edf1ed;
    color: #526058;
    vertical-align: top;
  }

  td strong {
    color: #244d32;
  }

  .alerta {
    padding: 13px 15px;
    border-radius: 10px;
    margin-bottom: 18px;
    font-size: 14px;
    font-weight: 650;
  }

  .alerta.error {
    background: #fff0f0;
    color: #9c2929;
    border: 1px solid #f2cccc;
  }

  .alerta.exito {
    background: #edf8f0;
    color: #24633a;
    border: 1px solid #cfe7d5;
  }

  .cargando {
    padding: 50px;
    text-align: center;
    color: #647168;
  }

  @media (max-width: 1100px) {
    .resumen {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .datos-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .modulos-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 820px) {
    .pagina {
      margin-left: 0;
      padding: 88px 14px 28px;
    }

    .volver {
      margin-bottom: 14px;
    }

    .cabecera-ficha {
      align-items: flex-start;
      padding: 17px;
      border-radius: 13px;
    }

    .icono-grande {
      width: 52px;
      height: 52px;
      flex-basis: 52px;
      border-radius: 13px;
      font-size: 27px;
    }

    h1 {
      font-size: 23px;
    }

    .identidad p {
      font-size: 12px;
    }

    .estado {
      font-size: 9px;
      padding: 6px 8px;
    }

    .resumen {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }

    .tarjeta-resumen {
      padding: 14px 12px;
      border-radius: 12px;
    }

    .tarjeta-resumen span {
      font-size: 10px;
    }

    .tarjeta-resumen strong {
      font-size: 18px;
    }

    .tarjeta-resumen small {
      display: block;
      font-size: 9px;
      line-height: 1.3;
    }

    .panel {
      padding: 16px;
      border-radius: 13px;
      margin-bottom: 16px;
    }

    .titulo-panel {
      margin-bottom: 16px;
    }

    .titulo-panel h2 {
      font-size: 17px;
    }

    .titulo-panel p {
      font-size: 11px;
    }

    .datos-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .modulos-grid {
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .boton-editar {
      font-size: 11px;
      padding: 8px 10px;
    }

    .lectura-actual-box {
      padding: 14px;
    }

    .lectura-actual-box strong {
      font-size: 21px;
    }

    .combustible-resumen {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .combustible-resumen .boton-principal,
    .mantenimiento-resumen .boton-principal,
    .servicios-resumen .boton-principal {
      grid-column: 1 / -1;
      width: 100%;
    }

    .mantenimiento-resumen,
    .servicios-resumen {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 600px) {
    .form-lectura-grid,
    .form-combustible-grid,
    .form-mantenimiento-grid,
    .form-servicio-grid {
      grid-template-columns: 1fr;
    }

    .combustible-resumen,
    .mantenimiento-resumen,
    .servicios-resumen {
      grid-template-columns: 1fr;
    }

    .combustible-resumen .boton-principal,
    .mantenimiento-resumen .boton-principal,
    .servicios-resumen .boton-principal {
      grid-column: auto;
    }

    .campo-completo {
      grid-column: auto;
    }

    .lectura-actual-box {
      display: block;
    }

    .lectura-actual-box .boton-principal {
      width: 100%;
      margin-top: 13px;
    }

    .acciones-form {
      display: grid;
      grid-template-columns: 1fr;
    }

    .acciones-form button {
      width: 100%;
      min-height: 42px;
    }

    .acciones-form .boton-principal {
      grid-row: 1;
    }

    table,
    thead,
    tbody,
    tr,
    th,
    td {
      display: block;
      width: 100%;
      box-sizing: border-box;
    }

    thead {
      display: none;
    }

    tr {
      border: 1px solid #e0e7e1;
      border-radius: 10px;
      padding: 10px;
      margin-bottom: 9px;
      background: #fafbfa;
    }

    td {
      display: grid;
      grid-template-columns: 90px 1fr;
      gap: 8px;
      padding: 5px 0;
      border: none;
    }

    td::before {
      content: attr(data-label);
      color: #7a867e;
      font-size: 10px;
      font-weight: 700;
    }
  }

  @media (max-width: 430px) {
    .cabecera-ficha {
      position: relative;
      padding-bottom: 46px;
    }

    .estado {
      position: absolute;
      left: 85px;
      bottom: 15px;
    }

    .datos-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .titulo-panel {
      flex-wrap: wrap;
    }

    .boton-editar {
      width: 100%;
    }

    .modulo-texto strong {
      padding-right: 0;
      padding-top: 19px;
    }

    .disponible {
      left: 70px;
      right: auto;
    }
  }
`;
