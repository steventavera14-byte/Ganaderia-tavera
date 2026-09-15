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
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [fotoUrl, setFotoUrl] = useState("");
  const [pagos, setPagos] = useState<RegistroFlexible[]>([]);
  const [costos, setCostos] = useState<RegistroFlexible[]>([]);
  const [asignaciones, setAsignaciones] = useState<RegistroFlexible[]>([]);

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

    setTrabajador(persona as Trabajador);

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

    setPagos((resultados[1].data || []) as RegistroFlexible[]);
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
        const valor =
          item.monto ?? item.total ?? item.importe ?? item.valor ?? item.monto_pagado;
        return suma + (Number(valor) || 0);
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

        <SeccionHistorial
          titulo="Pagos"
          subtitulo="Historial de pagos registrados al trabajador."
          registros={pagos}
          monedaBase={trabajador.moneda}
          vacio="No hay pagos registrados."
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
}: {
  titulo: string;
  subtitulo: string;
  registros: RegistroFlexible[];
  monedaBase: string;
  vacio: string;
  esAsignacion?: boolean;
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
              (esAsignacion ? "Asignación" : "Registro");
            const valor =
              item.monto ??
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
