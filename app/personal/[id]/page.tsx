"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Sidebar from "../../components/Sidebar";

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

type Archivo = {
  id: string;
  tipo: string;
  nombre_archivo: string;
  ruta_storage: string;
  mime_type: string | null;
  tamano_bytes: number | null;
  descripcion: string | null;
  created_at: string;
};

type RegistroFlexible = {
  id: string;
  [key: string]: unknown;
};

const moneda = (valor: unknown, codigo?: unknown) => {
  const n = Number(valor ?? 0);
  return `${String(codigo || "BOB")} ${n.toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const fecha = (valor: unknown) => {
  if (!valor) return "—";
  const s = String(valor);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [a, m, d] = s.split("-");
    return `${d}/${m}/${a}`;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("es-BO");
};

const texto = (valor: unknown) =>
  valor === null || valor === undefined || valor === "" ? "—" : String(valor);

const etiquetaEstado = (estado: string) => {
  const mapa: Record<string, string> = {
    activo: "Activo",
    vacaciones: "Vacaciones",
    licencia: "Licencia",
    retirado: "Retirado",
  };
  return mapa[estado] || estado;
};

const etiquetaPago = (tipo: string) => {
  const mapa: Record<string, string> = {
    diario: "Diario",
    semanal: "Semanal",
    quincenal: "Quincenal",
    mensual: "Mensual",
    otro: "Otro",
  };
  return mapa[tipo] || tipo;
};

const etiquetaArchivo = (tipo: string) => {
  const mapa: Record<string, string> = {
    foto: "Foto del trabajador",
    ci_anverso: "CI - Anverso",
    ci_reverso: "CI - Reverso",
    licencia: "Licencia",
    contrato: "Contrato",
    certificado: "Certificado",
    otro: "Otro documento",
  };
  return mapa[tipo] || tipo;
};

export default function KardexTrabajadorPage() {
  const router = useRouter();
  const params = useParams();
  const trabajadorId = String(params?.id || "");

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null);
  const [fincaId, setFincaId] = useState("");
  const [usuarioId, setUsuarioId] = useState("");
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [fotoUrl, setFotoUrl] = useState("");
  const [pagos, setPagos] = useState<RegistroFlexible[]>([]);
  const [costos, setCostos] = useState<RegistroFlexible[]>([]);
  const [asignaciones, setAsignaciones] = useState<RegistroFlexible[]>([]);
  const [mostrarPago, setMostrarPago] = useState(false);
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [pagoEditandoId, setPagoEditandoId] = useState<string | null>(null);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [comprobantesPago, setComprobantesPago] = useState<Record<string, RegistroFlexible[]>>({});
  const [mensaje, setMensaje] = useState("");
  const [pago, setPago] = useState({
    fecha_pago: new Date().toISOString().slice(0, 10),
    periodo_desde: "",
    periodo_hasta: "",
    salario: "",
    bonos: "0",
    horas_extra: "0",
    descuentos: "0",
    otros: "0",
    moneda: "BOB",
    metodo_pago: "",
    observaciones: "",
  });

  useEffect(() => {
    if (trabajadorId) iniciar();
  }, [trabajadorId]);

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

    const { data: membresia, error: errorMembresia } = await supabase
      .from("gan_usuarios")
      .select("finca_id, activo")
      .eq("user_id", user.id)
      .eq("activo", true)
      .maybeSingle();

    if (errorMembresia || !membresia) {
      router.replace("/");
      return;
    }

    setUsuarioId(user.id);
    setFincaId(membresia.finca_id);

    const { data: persona, error: errorPersona } = await supabase
      .from("gan_trabajadores")
      .select("*")
      .eq("id", trabajadorId)
      .eq("finca_id", membresia.finca_id)
      .maybeSingle();

    if (errorPersona || !persona) {
      setError(
        errorPersona
          ? `No se pudo cargar el trabajador: ${errorPersona.message}`
          : "Trabajador no encontrado."
      );
      setCargando(false);
      return;
    }

    const trabajadorCargado = persona as Trabajador;
    setTrabajador(trabajadorCargado);
    setPago((anterior) => ({
      ...anterior,
      salario: String(trabajadorCargado.salario_base ?? 0),
      moneda: trabajadorCargado.moneda || "BOB",
    }));

    const resultados = await Promise.all([
      supabase
        .from("gan_trabajador_archivos")
        .select("*")
        .eq("trabajador_id", trabajadorId)
        .order("created_at", { ascending: false }),
      supabase
        .from("gan_pagos_personal")
        .select("*")
        .eq("trabajador_id", trabajadorId)
        .order("created_at", { ascending: false }),
      supabase
        .from("gan_costos_personal")
        .select("*")
        .eq("trabajador_id", trabajadorId)
        .order("created_at", { ascending: false }),
      supabase
        .from("gan_asignaciones_personal")
        .select("*")
        .eq("trabajador_id", trabajadorId)
        .order("created_at", { ascending: false }),
    ]);

    const archivosCargados = (resultados[0].data || []) as Archivo[];
    setArchivos(archivosCargados);

    const fotoTrabajador = archivosCargados.find(
      (archivo) => archivo.tipo === "foto"
    );

    if (fotoTrabajador) {
      const { data: fotoFirmada } = await supabase.storage
        .from("gan-personal")
        .createSignedUrl(fotoTrabajador.ruta_storage, 3600);

      setFotoUrl(fotoFirmada?.signedUrl || "");
    } else {
      setFotoUrl("");
    }

    const pagosCargados = (resultados[1].data || []) as RegistroFlexible[];
    setPagos(pagosCargados);

    if (pagosCargados.length > 0) {
      const idsPagos = pagosCargados.map((item) => String(item.id));
      const { data: archivosPago } = await supabase
        .from("gan_pago_personal_archivos")
        .select("*")
        .in("pago_id", idsPagos)
        .order("created_at", { ascending: false });

      const agrupados: Record<string, RegistroFlexible[]> = {};
      for (const archivo of (archivosPago || []) as RegistroFlexible[]) {
        const pagoId = String(archivo.pago_id);
        if (!agrupados[pagoId]) agrupados[pagoId] = [];
        agrupados[pagoId].push(archivo);
      }
      setComprobantesPago(agrupados);
    } else {
      setComprobantesPago({});
    }

    setCostos((resultados[2].data || []) as RegistroFlexible[]);
    setAsignaciones((resultados[3].data || []) as RegistroFlexible[]);

    const primerError = resultados.find((r) => r.error)?.error;
    if (primerError) {
      setError(
        `La ficha cargó, pero una sección del historial no pudo leerse: ${primerError.message}`
      );
    }

    setCargando(false);
  };

  const nombreCompleto = useMemo(() => {
    if (!trabajador) return "";
    return [trabajador.nombre, trabajador.apellido].filter(Boolean).join(" ");
  }, [trabajador]);

  const totalPagos = useMemo(
    () =>
      pagos.reduce((suma, item) => {
        const neto =
          Number(item.salario ?? 0) +
          Number(item.bonos ?? 0) +
          Number(item.horas_extra ?? 0) +
          Number(item.otros ?? 0) -
          Number(item.descuentos ?? 0);
        return suma + neto;
      }, 0),
    [pagos]
  );

  const totalCostos = useMemo(
    () =>
      costos.reduce((suma, item) => {
        const valor = item.monto ?? item.total ?? item.importe ?? item.valor ?? item.costo;
        return suma + (Number(valor) || 0);
      }, 0),
    [costos]
  );

  const guardarPago = async () => {
    if (!trabajador) return;

    setError("");
    setMensaje("");

    const salario = Number(pago.salario || 0);
    const bonos = Number(pago.bonos || 0);
    const horasExtra = Number(pago.horas_extra || 0);
    const descuentos = Number(pago.descuentos || 0);
    const otros = Number(pago.otros || 0);

    if (!pago.fecha_pago) {
      setError("La fecha de pago es obligatoria.");
      return;
    }

    if ([salario, bonos, horasExtra, descuentos, otros].some((n) => Number.isNaN(n) || n < 0)) {
      setError("Los importes deben ser números iguales o mayores a 0.");
      return;
    }

    setGuardandoPago(true);

    let pagoId = pagoEditandoId || "";
    let errorPago: { message: string } | null = null;

    if (pagoEditandoId) {
      const resultado = await supabase.rpc("gan_editar_pago_personal", {
        p_pago_id: pagoEditandoId,
        p_fecha_pago: pago.fecha_pago,
        p_periodo_desde: pago.periodo_desde || null,
        p_periodo_hasta: pago.periodo_hasta || null,
        p_salario: salario,
        p_bonos: bonos,
        p_horas_extra: horasExtra,
        p_descuentos: descuentos,
        p_otros: otros,
        p_moneda: pago.moneda,
        p_metodo_pago: pago.metodo_pago.trim() || null,
        p_observaciones: pago.observaciones.trim() || null,
      });
      errorPago = resultado.error;
    } else {
      const resultado = await supabase.rpc("gan_registrar_pago_personal", {
        p_trabajador_id: trabajador.id,
        p_fecha_pago: pago.fecha_pago,
        p_periodo_desde: pago.periodo_desde || null,
        p_periodo_hasta: pago.periodo_hasta || null,
        p_salario: salario,
        p_bonos: bonos,
        p_horas_extra: horasExtra,
        p_descuentos: descuentos,
        p_otros: otros,
        p_moneda: pago.moneda,
        p_metodo_pago: pago.metodo_pago.trim() || null,
        p_observaciones: pago.observaciones.trim() || null,
      });
      errorPago = resultado.error;
      pagoId = resultado.data ? String(resultado.data) : "";
    }

    if (errorPago || !pagoId) {
      setError(
        `No se pudo ${pagoEditandoId ? "editar" : "registrar"} el pago: ${
          errorPago?.message || "No se obtuvo el ID del pago."
        }`
      );
      setGuardandoPago(false);
      return;
    }

    let errorComprobante = "";

    if (comprobante) {
      const permitidos = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!permitidos.includes(comprobante.type)) {
        setError("El pago fue registrado, pero el comprobante no se subió: formato no permitido.");
        setGuardandoPago(false);
        return;
      }
      if (comprobante.size > 10 * 1024 * 1024) {
        setError("El pago fue registrado, pero el comprobante no se subió: supera los 10 MB.");
        setGuardandoPago(false);
        return;
      }

      const extension = comprobante.name.split(".").pop()?.toLowerCase() || "archivo";
      const nombreSeguro = `comprobante-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${extension}`;
      const ruta = `${fincaId}/${trabajador.id}/${pagoId}/${nombreSeguro}`;

      const { error: errorStorage } = await supabase.storage
        .from("gan-pagos-personal")
        .upload(ruta, comprobante, {
          cacheControl: "3600",
          upsert: false,
          contentType: comprobante.type,
        });

      if (errorStorage) {
        errorComprobante = errorStorage.message;
      } else {
        const { error: errorRegistroArchivo } = await supabase
          .from("gan_pago_personal_archivos")
          .insert({
            pago_id: pagoId,
            finca_id: fincaId,
            nombre_archivo: comprobante.name,
            ruta_storage: ruta,
            mime_type: comprobante.type,
            tamano_bytes: comprobante.size,
            registrado_por: usuarioId,
          });

        if (errorRegistroArchivo) {
          await supabase.storage.from("gan-pagos-personal").remove([ruta]);
          errorComprobante = errorRegistroArchivo.message;
        }
      }
    }

    const { data: pagosActualizados, error: errorRecarga } = await supabase
      .from("gan_pagos_personal")
      .select("*")
      .eq("trabajador_id", trabajador.id)
      .order("created_at", { ascending: false });

    if (errorRecarga) {
      setError(`El pago fue registrado, pero no se pudo actualizar el historial: ${errorRecarga.message}`);
    } else {
      const nuevosPagos = (pagosActualizados || []) as RegistroFlexible[];
      setPagos(nuevosPagos);

      const idsPagos = nuevosPagos.map((item) => String(item.id));
      if (idsPagos.length > 0) {
        const { data: archivosPago } = await supabase
          .from("gan_pago_personal_archivos")
          .select("*")
          .in("pago_id", idsPagos)
          .order("created_at", { ascending: false });

        const agrupados: Record<string, RegistroFlexible[]> = {};
        for (const archivo of (archivosPago || []) as RegistroFlexible[]) {
          const pagoId = String(archivo.pago_id);
          if (!agrupados[pagoId]) agrupados[pagoId] = [];
          agrupados[pagoId].push(archivo);
        }
        setComprobantesPago(agrupados);
      }

      if (errorComprobante) {
        setError(`El pago fue registrado, pero hubo un problema con el comprobante: ${errorComprobante}`);
      } else {
        setMensaje(
          pagoEditandoId
            ? comprobante
              ? "Pago editado y nuevo comprobante agregado correctamente."
              : "Pago editado correctamente."
            : comprobante
              ? "Pago y comprobante registrados correctamente."
              : "Pago registrado correctamente."
        );
      }
    }

    setPago({
      fecha_pago: new Date().toISOString().slice(0, 10),
      periodo_desde: "",
      periodo_hasta: "",
      salario: String(trabajador.salario_base ?? 0),
      bonos: "0",
      horas_extra: "0",
      descuentos: "0",
      otros: "0",
      moneda: trabajador.moneda || "BOB",
      metodo_pago: "",
      observaciones: "",
    });
    setPagoEditandoId(null);
    setComprobante(null);
    const inputComprobante = document.getElementById("comprobante-pago") as HTMLInputElement | null;
    if (inputComprobante) inputComprobante.value = "";
    setMostrarPago(false);
    setGuardandoPago(false);
  };

  const editarPago = (item: RegistroFlexible) => {
    setError("");
    setMensaje("");
    setPagoEditandoId(String(item.id));
    setPago({
      fecha_pago: String(item.fecha_pago || "").slice(0, 10),
      periodo_desde: item.periodo_desde ? String(item.periodo_desde).slice(0, 10) : "",
      periodo_hasta: item.periodo_hasta ? String(item.periodo_hasta).slice(0, 10) : "",
      salario: String(item.salario ?? 0),
      bonos: String(item.bonos ?? 0),
      horas_extra: String(item.horas_extra ?? 0),
      descuentos: String(item.descuentos ?? 0),
      otros: String(item.otros ?? 0),
      moneda: String(item.moneda || "BOB"),
      metodo_pago: String(item.metodo_pago || ""),
      observaciones: String(item.observaciones || ""),
    });
    setComprobante(null);
    setMostrarPago(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelarEdicionPago = () => {
    if (!trabajador) return;
    setPagoEditandoId(null);
    setComprobante(null);
    setPago({
      fecha_pago: new Date().toISOString().slice(0, 10),
      periodo_desde: "",
      periodo_hasta: "",
      salario: String(trabajador.salario_base ?? 0),
      bonos: "0",
      horas_extra: "0",
      descuentos: "0",
      otros: "0",
      moneda: trabajador.moneda || "BOB",
      metodo_pago: "",
      observaciones: "",
    });
    setMostrarPago(false);
  };

  const eliminarPago = async (item: RegistroFlexible) => {
    const confirmado = window.confirm(
      "¿Eliminar este pago? También se eliminarán sus comprobantes bancarios. Esta acción no se puede deshacer."
    );
    if (!confirmado) return;

    setError("");
    setMensaje("");

    const pagoId = String(item.id);
    const archivos = comprobantesPago[pagoId] || [];
    const rutas = archivos
      .map((archivo) => String(archivo.ruta_storage || ""))
      .filter(Boolean);

    if (rutas.length > 0) {
      const { error: errorStorage } = await supabase.storage
        .from("gan-pagos-personal")
        .remove(rutas);

      if (errorStorage) {
        setError(`No se eliminó el pago porque no se pudo borrar su comprobante: ${errorStorage.message}`);
        return;
      }
    }

    const { error: errorEliminar } = await supabase.rpc(
      "gan_eliminar_pago_personal",
      { p_pago_id: pagoId }
    );

    if (errorEliminar) {
      setError(`No se pudo eliminar el pago: ${errorEliminar.message}`);
      return;
    }

    setPagos((actuales) => actuales.filter((p) => String(p.id) !== pagoId));
    setComprobantesPago((actuales) => {
      const copia = { ...actuales };
      delete copia[pagoId];
      return copia;
    });
    setMensaje("Pago eliminado correctamente.");
  };

  const abrirComprobantePago = async (archivo: RegistroFlexible) => {
    setError("");
    const ruta = String(archivo.ruta_storage || "");
    const { data, error: errorUrl } = await supabase.storage
      .from("gan-pagos-personal")
      .createSignedUrl(ruta, 60);

    if (errorUrl || !data?.signedUrl) {
      setError(`No se pudo abrir el comprobante: ${errorUrl?.message || "Error desconocido"}`);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const abrirDocumento = async (archivo: Archivo) => {
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

  if (cargando) {
    return (
      <>
        <Sidebar />
        <main className="kardex-main">
          <div className="cargando">Cargando Kardex...</div>
          <Estilos />
        </main>
      </>
    );
  }

  if (!trabajador) {
    return (
      <>
        <Sidebar />
        <main className="kardex-main">
          <button className="volver" onClick={() => router.push("/personal")}>
            ← Volver a Personal
          </button>
          <div className="alerta error">{error || "Trabajador no encontrado."}</div>
          <Estilos />
        </main>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="kardex-main">
        <div className="barra-superior">
          <button className="volver" onClick={() => router.push("/personal")}>
            ← Volver a Personal
          </button>
          <button
            className="editar"
            onClick={() => router.push(`/personal?editar=${trabajador.id}`)}
          >
            Editar trabajador
          </button>
        </div>

        {error && <div className="alerta error">{error}</div>}
        {mensaje && <div className="alerta exito">{mensaje}</div>}

        <section className="cabecera-kardex">
          <div className="avatar-grande">
            {fotoUrl ? (
              <img
                src={fotoUrl}
                alt={`Foto de ${nombreCompleto}`}
                className="foto-trabajador"
              />
            ) : (
              trabajador.nombre?.charAt(0).toUpperCase()
            )}
          </div>
          <div className="identidad">
            <span className="sobrelinea">KARDEX DEL TRABAJADOR</span>
            <h1>{nombreCompleto}</h1>
            <div className="identidad-meta">
              <span>{trabajador.cargo || "Sin cargo registrado"}</span>
              <span
                className={`estado ${
                  trabajador.estado === "activo"
                    ? "activo"
                    : trabajador.estado === "retirado"
                    ? "retirado"
                    : "temporal"
                }`}
              >
                {etiquetaEstado(trabajador.estado)}
              </span>
            </div>
          </div>
        </section>

        <section className="resumen">
          <Tarjeta titulo="Fecha de ingreso" valor={fecha(trabajador.fecha_ingreso)} />
          <Tarjeta titulo="Tipo de pago" valor={etiquetaPago(trabajador.tipo_pago)} />
          <Tarjeta
            titulo="Salario base"
            valor={moneda(trabajador.salario_base, trabajador.moneda)}
          />
          <Tarjeta titulo="Documentos" valor={String(archivos.length)} />
        </section>

        <section className="grid-principal">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Datos personales y laborales</h2>
                <p>Información principal registrada del trabajador.</p>
              </div>
            </div>
            <div className="datos-grid">
              <Dato label="Nombre completo" valor={nombreCompleto} />
              <Dato label="Documento / CI" valor={texto(trabajador.documento)} />
              <Dato label="Teléfono" valor={texto(trabajador.telefono)} />
              <Dato label="Cargo / función" valor={texto(trabajador.cargo)} />
              <Dato label="Fecha de ingreso" valor={fecha(trabajador.fecha_ingreso)} />
              <Dato label="Fecha de salida" valor={fecha(trabajador.fecha_salida)} />
              <Dato label="Estado" valor={etiquetaEstado(trabajador.estado)} />
              <Dato label="Tipo de pago" valor={etiquetaPago(trabajador.tipo_pago)} />
              <Dato
                label="Salario base"
                valor={moneda(trabajador.salario_base, trabajador.moneda)}
              />
            </div>
            <div className="observaciones">
              <span>Observaciones</span>
              <p>{trabajador.observaciones || "Sin observaciones registradas."}</p>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Resumen económico</h2>
                <p>Movimientos registrados para este trabajador.</p>
              </div>
            </div>
            <div className="economico">
              <div>
                <span>Pagos registrados</span>
                <strong>{pagos.length}</strong>
              </div>
              <div>
                <span>Total pagos*</span>
                <strong>{moneda(totalPagos, trabajador.moneda)}</strong>
              </div>
              <div>
                <span>Costos registrados</span>
                <strong>{costos.length}</strong>
              </div>
              <div>
                <span>Total costos*</span>
                <strong>{moneda(totalCostos, trabajador.moneda)}</strong>
              </div>
            </div>
            <small className="nota">
              * El total usa los importes registrados en cada historial. No convierte
              monedas.
            </small>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{pagoEditandoId ? "Editar pago" : "Registrar pago"}</h2>
              <p>Sueldo, bonos, horas extra, descuentos y otros conceptos.</p>
            </div>
            <button
              className={mostrarPago ? "btn-secundario" : "btn-pago"}
              onClick={() => {
                setMostrarPago((valor) => !valor);
                setError("");
                setMensaje("");
              }}
            >
              {mostrarPago ? "Cerrar" : "+ Registrar pago"}
            </button>
          </div>

          {mostrarPago && (
            <div className="pago-form">
              <CampoPago label="Fecha de pago">
                <input
                  type="date"
                  value={pago.fecha_pago}
                  onChange={(e) => setPago({ ...pago, fecha_pago: e.target.value })}
                />
              </CampoPago>
              <CampoPago label="Período desde">
                <input
                  type="date"
                  value={pago.periodo_desde}
                  onChange={(e) => setPago({ ...pago, periodo_desde: e.target.value })}
                />
              </CampoPago>
              <CampoPago label="Período hasta">
                <input
                  type="date"
                  value={pago.periodo_hasta}
                  onChange={(e) => setPago({ ...pago, periodo_hasta: e.target.value })}
                />
              </CampoPago>
              <CampoPago label="Salario">
                <input
                  type="number" min="0" step="0.01"
                  value={pago.salario}
                  onChange={(e) => setPago({ ...pago, salario: e.target.value })}
                />
              </CampoPago>
              <CampoPago label="Bonos">
                <input
                  type="number" min="0" step="0.01"
                  value={pago.bonos}
                  onChange={(e) => setPago({ ...pago, bonos: e.target.value })}
                />
              </CampoPago>
              <CampoPago label="Horas extra">
                <input
                  type="number" min="0" step="0.01"
                  value={pago.horas_extra}
                  onChange={(e) => setPago({ ...pago, horas_extra: e.target.value })}
                />
              </CampoPago>
              <CampoPago label="Descuentos">
                <input
                  type="number" min="0" step="0.01"
                  value={pago.descuentos}
                  onChange={(e) => setPago({ ...pago, descuentos: e.target.value })}
                />
              </CampoPago>
              <CampoPago label="Otros">
                <input
                  type="number" min="0" step="0.01"
                  value={pago.otros}
                  onChange={(e) => setPago({ ...pago, otros: e.target.value })}
                />
              </CampoPago>
              <CampoPago label="Moneda">
                <select
                  value={pago.moneda}
                  onChange={(e) => setPago({ ...pago, moneda: e.target.value })}
                >
                  <option value="BOB">BOB - Bolivianos</option>
                  <option value="USD">USD - Dólares</option>
                </select>
              </CampoPago>
              <CampoPago label="Método de pago">
                <select
                  value={pago.metodo_pago}
                  onChange={(e) => setPago({ ...pago, metodo_pago: e.target.value })}
                >
                  <option value="">Seleccionar</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                  <option value="otro">Otro</option>
                </select>
              </CampoPago>

              <CampoPago
                label={
                  pagoEditandoId && comprobantesPago[pagoEditandoId]?.length
                    ? "Nuevo comprobante (opcional)"
                    : "Comprobante bancario"
                }
              >
                <input
                  id="comprobante-pago"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setComprobante(e.target.files?.[0] || null)}
                  className="archivo-pago"
                />
              </CampoPago>

              <div className="campo-pago campo-pago-observaciones">
                <label>Observaciones</label>
                <textarea
                  value={pago.observaciones}
                  onChange={(e) => setPago({ ...pago, observaciones: e.target.value })}
                  placeholder="Opcional"
                />
              </div>

              <div className="pago-neto">
                <span>Pago neto</span>
                <strong>
                  {moneda(
                    Number(pago.salario || 0) +
                      Number(pago.bonos || 0) +
                      Number(pago.horas_extra || 0) +
                      Number(pago.otros || 0) -
                      Number(pago.descuentos || 0),
                    pago.moneda
                  )}
                </strong>
              </div>

              <div className="acciones-pago">
                <button
                  className="btn-secundario"
                  onClick={pagoEditandoId ? cancelarEdicionPago : () => setMostrarPago(false)}
                  disabled={guardandoPago}
                >
                  Cancelar
                </button>
                <button
                  className="btn-pago"
                  onClick={guardarPago}
                  disabled={guardandoPago}
                >
                  {guardandoPago
                    ? "Guardando..."
                    : pagoEditandoId
                      ? "Guardar cambios"
                      : "Guardar pago"}
                </button>
              </div>
            </div>
          )}
        </section>

        <SeccionHistorial
          titulo="Pagos"
          subtitulo="Historial de pagos registrados al trabajador."
          registros={pagos}
          monedaBase={trabajador.moneda}
          vacio="No hay pagos registrados."
          comprobantes={comprobantesPago}
          onVerComprobante={abrirComprobantePago}
          onEditarPago={editarPago}
          onEliminarPago={eliminarPago}
        />

        <SeccionHistorial
          titulo="Costos de personal"
          subtitulo="Costos adicionales asociados al trabajador."
          registros={costos}
          monedaBase={trabajador.moneda}
          vacio="No hay costos adicionales registrados."
        />

        <SeccionHistorial
          titulo="Asignaciones y trabajos"
          subtitulo="Actividades y asignaciones registradas."
          registros={asignaciones}
          monedaBase={trabajador.moneda}
          vacio="No hay asignaciones registradas."
          esAsignacion
        />

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Documentos</h2>
              <p>Archivos privados del trabajador.</p>
            </div>
            <span className="privado">🔒 Privados</span>
          </div>

          {archivos.length === 0 ? (
            <Vacio texto="No hay documentos registrados." />
          ) : (
            <div className="documentos">
              {archivos.map((archivo) => (
                <div className="documento" key={archivo.id}>
                  <div>
                    <strong>{etiquetaArchivo(archivo.tipo)}</strong>
                    <span>{archivo.nombre_archivo}</span>
                    {archivo.descripcion && <small>{archivo.descripcion}</small>}
                  </div>
                  <div className="documento-derecha">
                    <small>{fecha(archivo.created_at)}</small>
                    <button onClick={() => abrirDocumento(archivo)}>Ver</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Estilos />
    </>
  );
}

function CampoPago({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="campo-pago">
      <label>{label}</label>
      {children}
    </div>
  );
}

function Tarjeta({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="tarjeta">
      <span>{titulo}</span>
      <strong>{valor}</strong>
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="dato">
      <span>{label}</span>
      <strong>{valor}</strong>
    </div>
  );
}

function Vacio({ texto: contenido }: { texto: string }) {
  return <div className="vacio">{contenido}</div>;
}

function SeccionHistorial({
  titulo,
  subtitulo,
  registros,
  monedaBase,
  vacio,
  esAsignacion = false,
  comprobantes,
  onVerComprobante,
  onEditarPago,
  onEliminarPago,
}: {
  titulo: string;
  subtitulo: string;
  registros: RegistroFlexible[];
  monedaBase: string;
  vacio: string;
  esAsignacion?: boolean;
  comprobantes?: Record<string, RegistroFlexible[]>;
  onVerComprobante?: (archivo: RegistroFlexible) => void;
  onEditarPago?: (item: RegistroFlexible) => void;
  onEliminarPago?: (item: RegistroFlexible) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{titulo}</h2>
          <p>{subtitulo}</p>
        </div>
        <span className="contador">{registros.length}</span>
      </div>

      {registros.length === 0 ? (
        <Vacio texto={vacio} />
      ) : (
        <div className="historial">
          {registros.map((item) => {
            const f =
              item.fecha ??
              item.fecha_pago ??
              item.fecha_inicio ??
              item.created_at;
            const concepto =
              item.concepto ??
              item.descripcion ??
              item.tipo ??
              item.actividad ??
              item.funcion ??
              item.tarea ??
              (item.salario !== undefined ? "Pago de personal" : esAsignacion ? "Asignación" : "Registro");
            const esPagoPersonal =
              item.salario !== undefined ||
              item.bonos !== undefined ||
              item.horas_extra !== undefined ||
              item.descuentos !== undefined ||
              item.otros !== undefined;
            const valor = esPagoPersonal
              ? Number(item.salario ?? 0) +
                Number(item.bonos ?? 0) +
                Number(item.horas_extra ?? 0) +
                Number(item.otros ?? 0) -
                Number(item.descuentos ?? 0)
              : item.monto ??
                item.total ??
                item.importe ??
                item.valor ??
                item.costo ??
                item.monto_pagado;
            const mon = item.moneda ?? monedaBase;
            const estado = item.estado;

            return (
              <div className="historial-item" key={item.id}>
                <div>
                  <strong>{texto(concepto)}</strong>
                  <span>{fecha(f)}</span>
                  {item.observaciones ? (
                    <small>{texto(item.observaciones)}</small>
                  ) : null}
                </div>
                <div className="historial-derecha">
                  {valor !== undefined && valor !== null ? (
                    <strong>{moneda(valor, mon)}</strong>
                  ) : null}
                  {estado ? <span>{texto(estado)}</span> : null}
                  {comprobantes?.[String(item.id)]?.length ? (
                    <button
                      className="btn-comprobante"
                      onClick={() =>
                        onVerComprobante?.(comprobantes[String(item.id)][0])
                      }
                    >
                      Ver comprobante
                    </button>
                  ) : null}
                  {esPagoPersonal && onEditarPago ? (
                    <button className="btn-editar-pago" onClick={() => onEditarPago(item)}>
                      Editar
                    </button>
                  ) : null}
                  {esPagoPersonal && onEliminarPago ? (
                    <button className="btn-eliminar-pago" onClick={() => onEliminarPago(item)}>
                      Eliminar
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Estilos() {
  return (
    <style jsx global>{`
      * { box-sizing: border-box; }
      body { margin: 0; background: #f5f8f5; }
      .kardex-main {
        margin-left: 235px;
        min-height: 100vh;
        padding: 32px;
        background: #f5f8f5;
        color: #173d29;
      }
      .cargando { padding: 40px 0; }
      .barra-superior {
        display: flex; justify-content: space-between; gap: 12px;
        align-items: center; margin-bottom: 20px;
      }
      .volver, .editar {
        border-radius: 9px; padding: 10px 14px; font-weight: 700;
        font-size: 12px; cursor: pointer; font-family: inherit;
      }
      .volver { border: 1px solid #d4ddd7; background: white; color: #53665a; }
      .editar { border: 0; background: #176b3a; color: white; }
      .alerta { padding: 12px 14px; border-radius: 9px; margin-bottom: 18px; font-size: 13px; }
      .alerta.error { background: #fdecec; color: #b42318; }
      .alerta.exito { background: #eaf7ee; color: #176b3a; }
      .btn-pago {
        border: 0; background: #176b3a; color: white; border-radius: 8px;
        padding: 9px 13px; font-weight: 700; font-size: 11px; cursor: pointer;
        font-family: inherit;
      }
      .btn-pago:disabled { opacity: .6; cursor: default; }
      .btn-secundario {
        border: 1px solid #d4ddd7; background: white; color: #53665a;
        border-radius: 8px; padding: 9px 13px; font-weight: 700;
        font-size: 11px; cursor: pointer; font-family: inherit;
      }
      .pago-form {
        padding: 20px; display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px;
      }
      .campo-pago { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
      .campo-pago label {
        font-size: 10px; font-weight: 800; color: #66786d; text-transform: uppercase;
      }
      .campo-pago input, .campo-pago select, .campo-pago textarea {
        width: 100%; border: 1px solid #d3ddd6; border-radius: 8px;
        background: white; color: #1d2c23; font-family: inherit; outline: none;
      }
      .campo-pago input, .campo-pago select { height: 42px; padding: 0 10px; }
      .campo-pago input.archivo-pago { height: auto; min-height: 42px; padding: 8px; font-size: 11px; }
      .campo-pago textarea { min-height: 80px; padding: 10px; resize: vertical; }
      .btn-comprobante {
        border: 1px solid #bfd6c7; background: #edf7f0; color: #176b3a;
        border-radius: 7px; padding: 6px 9px; font-size: 10px;
        font-weight: 800; cursor: pointer; font-family: inherit; white-space: nowrap;
      }
      .btn-editar-pago, .btn-eliminar-pago {
        border-radius: 7px; padding: 6px 9px; font-size: 10px;
        font-weight: 800; cursor: pointer; font-family: inherit; white-space: nowrap;
      }
      .btn-editar-pago {
        border: 1px solid #c9d2d8; background: #f5f7f8; color: #34454f;
      }
      .btn-eliminar-pago {
        border: 1px solid #efc7c7; background: #fff4f4; color: #a62b2b;
      }
      .campo-pago-observaciones { grid-column: span 3; }
      .pago-neto {
        background: #edf7f0; border-radius: 9px; padding: 12px 14px;
        display: flex; flex-direction: column; justify-content: center; gap: 5px;
      }
      .pago-neto span { font-size: 10px; color: #66786d; font-weight: 800; text-transform: uppercase; }
      .pago-neto strong { font-size: 18px; color: #176b3a; }
      .acciones-pago {
        grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 9px;
        padding-top: 4px;
      }
      .cabecera-kardex {
        background: white; border: 1px solid #dce5df; border-radius: 16px;
        padding: 24px; display: flex; align-items: center; gap: 18px;
        margin-bottom: 18px;
      }
      .avatar-grande {
        width: 68px; height: 68px; min-width: 68px; border-radius: 50%;
        background: #e7f3eb; color: #176b3a; display: flex; align-items: center;
        justify-content: center; font-size: 28px; font-weight: 800;
      }
      .foto-trabajador {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
        border-radius: 50%;
      }
      .sobrelinea { font-size: 10px; letter-spacing: .12em; color: #7b8d82; font-weight: 800; }
      .identidad h1 { margin: 5px 0 7px; font-size: 27px; color: #174c2e; }
      .identidad-meta { display: flex; align-items: center; gap: 10px; color: #6f7f76; font-size: 13px; }
      .estado { padding: 5px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; }
      .estado.activo { background: #e6f5eb; color: #16713c; }
      .estado.temporal { background: #fff4d8; color: #8a6212; }
      .estado.retirado { background: #f0f1f0; color: #68736c; }
      .resumen {
        display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px; margin-bottom: 18px;
      }
      .tarjeta {
        background: white; border: 1px solid #dce5df; border-radius: 13px;
        padding: 17px; display: flex; flex-direction: column; gap: 7px;
      }
      .tarjeta span { font-size: 11px; color: #75867c; font-weight: 700; }
      .tarjeta strong { font-size: 17px; color: #176b3a; }
      .grid-principal {
        display: grid; grid-template-columns: 1.45fr .75fr; gap: 18px;
      }
      .panel {
        background: white; border: 1px solid #dce5df; border-radius: 14px;
        margin-bottom: 18px; overflow: hidden; min-width: 0;
      }
      .panel-header {
        padding: 18px 20px; border-bottom: 1px solid #e6ece8;
        display: flex; justify-content: space-between; align-items: center; gap: 12px;
      }
      .panel-header h2 { margin: 0; font-size: 16px; color: #174c2e; }
      .panel-header p { margin: 4px 0 0; font-size: 11px; color: #8a9890; }
      .datos-grid {
        display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0; padding: 4px 20px 10px;
      }
      .dato { padding: 14px 10px 14px 0; display: flex; flex-direction: column; gap: 5px; }
      .dato span { color: #829087; font-size: 10px; font-weight: 700; text-transform: uppercase; }
      .dato strong { color: #33493b; font-size: 13px; }
      .observaciones { margin: 0 20px 20px; padding: 14px; background: #f7faf8; border-radius: 9px; }
      .observaciones span { font-size: 10px; font-weight: 800; color: #75867c; text-transform: uppercase; }
      .observaciones p { margin: 7px 0 0; font-size: 12px; color: #425a4b; line-height: 1.5; }
      .economico { display: grid; grid-template-columns: 1fr 1fr; padding: 10px 20px; }
      .economico div { padding: 13px 8px 13px 0; display: flex; flex-direction: column; gap: 5px; }
      .economico span { font-size: 10px; color: #829087; font-weight: 700; }
      .economico strong { font-size: 15px; color: #176b3a; }
      .nota { display: block; padding: 0 20px 18px; color: #9aa69f; line-height: 1.4; }
      .contador, .privado {
        background: #edf6f0; color: #176b3a; border-radius: 8px;
        padding: 6px 9px; font-size: 10px; font-weight: 800;
      }
      .historial, .documentos { padding: 0 20px; }
      .historial-item, .documento {
        display: flex; justify-content: space-between; align-items: center;
        gap: 18px; padding: 14px 0; border-bottom: 1px solid #edf1ee;
      }
      .historial-item:last-child, .documento:last-child { border-bottom: 0; }
      .historial-item > div:first-child, .documento > div:first-child {
        display: flex; flex-direction: column; gap: 4px; min-width: 0;
      }
      .historial-item strong, .documento strong { font-size: 12px; color: #33493b; }
      .historial-item span, .documento span { font-size: 11px; color: #75867c; }
      .historial-item small, .documento small { font-size: 10px; color: #98a39d; }
      .historial-derecha, .documento-derecha {
        display: flex; flex-direction: column; align-items: flex-end; gap: 5px;
        text-align: right; flex-shrink: 0;
      }
      .documento-derecha button {
        border: 1px solid #bfd6c7; background: #edf7f0; color: #176b3a;
        border-radius: 7px; padding: 6px 10px; font-weight: 700; cursor: pointer;
      }
      .vacio { padding: 28px 20px; text-align: center; color: #8a9890; font-size: 12px; }

      @media (max-width: 1100px) and (min-width: 821px) {
        .kardex-main { padding: 24px; }
        .grid-principal { grid-template-columns: 1fr; }
        .datos-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .pago-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .campo-pago-observaciones { grid-column: span 1; }
      }

      @media (max-width: 820px) {
        html, body { width: 100%; max-width: 100%; overflow-x: hidden; }
        .kardex-main {
          margin-left: 0; width: 100%; max-width: 100%;
          padding: 84px 14px 28px; overflow-x: hidden;
        }
        .barra-superior { align-items: stretch; }
        .volver, .editar { min-height: 42px; }
        .cabecera-kardex { padding: 17px; align-items: flex-start; }
        .avatar-grande { width: 54px; height: 54px; min-width: 54px; font-size: 22px; }
        .identidad h1 { font-size: 21px; }
        .identidad-meta { flex-wrap: wrap; }
        .resumen { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .tarjeta { padding: 13px; }
        .tarjeta strong { font-size: 14px; overflow-wrap: anywhere; }
        .grid-principal { grid-template-columns: 1fr; gap: 0; }
        .panel { border-radius: 12px; margin-bottom: 14px; }
        .panel-header { padding: 15px; align-items: flex-start; }
        .datos-grid { grid-template-columns: 1fr 1fr; padding: 3px 15px 8px; }
        .dato { padding: 12px 8px 12px 0; }
        .observaciones { margin: 0 15px 15px; }
        .economico { padding: 8px 15px; }
        .nota { padding: 0 15px 15px; }
        .historial, .documentos { padding: 0 15px; }
        .historial-item, .documento { align-items: flex-start; }
        .pago-form { padding: 15px; grid-template-columns: 1fr; }
        .campo-pago-observaciones { grid-column: span 1; }
        .campo-pago input, .campo-pago select { height: 46px; font-size: 16px; }
        .campo-pago textarea { font-size: 16px; }
        .acciones-pago { display: grid; grid-template-columns: 1fr 1fr; }
        .acciones-pago button { min-height: 44px; }
      }

      @media (max-width: 430px) {
        .barra-superior { display: grid; grid-template-columns: 1fr 1fr; }
        .barra-superior button { padding-left: 7px; padding-right: 7px; }
        .cabecera-kardex { gap: 12px; }
        .datos-grid { grid-template-columns: 1fr; }
        .economico { grid-template-columns: 1fr 1fr; }
      }
    `}</style>
  );
}
