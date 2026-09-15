"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Sidebar from "../components/Sidebar";

type Lote = {
  id: string;
  nombre: string;
  cantidad_total: number;
};

type EventoSanitario = {
  id: string;
  lote_id: string | null;
  fecha: string;
  tipo_evento: string;
  cantidad_animales: number | null;
  diagnostico: string | null;
  descripcion: string | null;
  veterinario: string | null;
  observaciones: string | null;
  gan_lotes_ganado?: {
    nombre: string;
  } | null;
};

const nombresTipos: Record<string, string> = {
  vacunacion: "Vacunación",
  desparasitacion: "Desparasitación",
  tratamiento: "Tratamiento",
  enfermedad: "Enfermedad",
  prevencion: "Prevención",
  vitaminizacion: "Vitaminización",
  revision: "Revisión veterinaria",
  otro: "Otro",
};

export default function SanidadPage() {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [esMovil, setEsMovil] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [fincaId, setFincaId] = useState("");

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [eventos, setEventos] = useState<EventoSanitario[]>([]);

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split("T")[0],
    lote_id: "",
    tipo_evento: "",
    cantidad_animales: "",
    diagnostico: "",
    descripcion: "",
    veterinario: "",
    observaciones: "",
  });

  useEffect(() => {
    iniciar();
  }, []);

  useEffect(() => {
    const actualizar = () => {
      setEsMovil(window.innerWidth <= 820);
    };

    actualizar();

    window.addEventListener("resize", actualizar);

    return () => {
      window.removeEventListener("resize", actualizar);
    };
  }, []);

  const iniciar = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    const { data: usuario, error: errorUsuario } = await supabase
      .from("gan_usuarios")
      .select("finca_id")
      .eq("user_id", user.id)
      .eq("activo", true)
      .maybeSingle();

    if (errorUsuario || !usuario) {
      await supabase.auth.signOut();
      window.location.href = "/";
      return;
    }

    setFincaId(usuario.finca_id);

    await Promise.all([
      cargarLotes(usuario.finca_id),
      cargarEventos(usuario.finca_id),
    ]);

    setLoading(false);
  };

  const cargarLotes = async (idFinca: string) => {
    const { data, error } = await supabase
      .from("gan_lotes_ganado")
      .select("id, nombre, cantidad_total")
      .eq("finca_id", idFinca)
      .in("estado", ["activo", "feedlot"])
      .order("nombre");

    if (error) {
      setMensaje(`Error al cargar lotes: ${error.message}`);
      return;
    }

    setLotes((data || []) as Lote[]);
  };

  const cargarEventos = async (idFinca: string) => {
    const { data, error } = await supabase
      .from("gan_eventos_sanitarios")
      .select(`
        id,
        lote_id,
        fecha,
        tipo_evento,
        cantidad_animales,
        diagnostico,
        descripcion,
        veterinario,
        observaciones,
        gan_lotes_ganado (
          nombre
        )
      `)
      .eq("finca_id", idFinca)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setMensaje(`Error al cargar sanidad: ${error.message}`);
      return;
    }

    setEventos((data || []) as unknown as EventoSanitario[]);
  };

  const seleccionarLote = (loteId: string) => {
    const lote = lotes.find((item) => item.id === loteId);

    setForm((anterior) => ({
      ...anterior,
      lote_id: loteId,
      cantidad_animales: lote ? String(lote.cantidad_total) : "",
    }));
  };

  const guardarEvento = async (e: React.FormEvent) => {
    e.preventDefault();

    setMensaje("");

    if (!form.lote_id) {
      setMensaje("Debes seleccionar un lote.");
      return;
    }

    if (!form.tipo_evento) {
      setMensaje("Debes seleccionar el tipo de evento sanitario.");
      return;
    }

    const cantidad = Number(form.cantidad_animales);

    if (!cantidad || cantidad <= 0) {
      setMensaje("La cantidad de animales debe ser mayor a cero.");
      return;
    }

    const loteSeleccionado = lotes.find(
      (lote) => lote.id === form.lote_id
    );

    if (
      loteSeleccionado &&
      cantidad > loteSeleccionado.cantidad_total
    ) {
      setMensaje(
        `El lote tiene ${loteSeleccionado.cantidad_total} animales. No puedes registrar ${cantidad}.`
      );
      return;
    }

    setGuardando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    const { error } = await supabase
      .from("gan_eventos_sanitarios")
      .insert({
        finca_id: fincaId,
        lote_id: form.lote_id,
        fecha: form.fecha,
        tipo_evento: form.tipo_evento,
        cantidad_animales: cantidad,
        diagnostico: form.diagnostico.trim() || null,
        descripcion: form.descripcion.trim() || null,
        veterinario: form.veterinario.trim() || null,
        observaciones: form.observaciones.trim() || null,
        registrado_por: user.id,
      });

    if (error) {
      setMensaje(`Error al registrar evento: ${error.message}`);
      setGuardando(false);
      return;
    }

    setForm({
      fecha: new Date().toISOString().split("T")[0],
      lote_id: "",
      tipo_evento: "",
      cantidad_animales: "",
      diagnostico: "",
      descripcion: "",
      veterinario: "",
      observaciones: "",
    });

    setMostrarFormulario(false);

    setMensaje("Evento sanitario registrado correctamente.");

    await cargarEventos(fincaId);

    setGuardando(false);
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-BO", {
      timeZone: "UTC",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <main style={estilos.cargando}>
        Cargando sanidad...
      </main>
    );
  }

  return (
    <main style={estilos.pagina}>
      <Sidebar />

      <section
        style={{
          ...estilos.contenido,
          ...(esMovil ? estilos.contenidoMovil : {}),
        }}
      >
        <header
          style={{
            ...estilos.header,
            ...(esMovil ? estilos.headerMovil : {}),
          }}
        >
          <div>
            <h1
              style={{
                ...estilos.titulo,
                ...(esMovil ? estilos.tituloMovil : {}),
              }}
            >
              Sanidad
            </h1>

            <p
              style={{
                ...estilos.subtitulo,
                ...(esMovil ? estilos.subtituloMovil : {}),
              }}
            >
              Control sanitario del ganado
            </p>
          </div>

          <button
            style={{
              ...estilos.botonPrincipal,
              ...(esMovil ? estilos.botonPrincipalMovil : {}),
            }}
            onClick={() => {
              setMensaje("");
              setMostrarFormulario(!mostrarFormulario);
            }}
          >
            {mostrarFormulario
              ? "Cancelar"
              : "+ Registrar evento"}
          </button>
        </header>

        {mensaje && (
          <div
            style={{
              ...estilos.mensaje,
              background: mensaje.includes("correctamente")
                ? "#edf8f0"
                : "#fff1f1",
              color: mensaje.includes("correctamente")
                ? "#176b3a"
                : "#b42318",
            }}
          >
            {mensaje}
          </div>
        )}

        <div
          style={{
            ...estilos.resumenGrid,
            ...(esMovil ? estilos.resumenGridMovil : {}),
          }}
        >
          <Tarjeta
            titulo="Eventos sanitarios"
            valor={String(eventos.length)}
            detalle="Registros realizados"
            esMovil={esMovil}
          />

          <Tarjeta
            titulo="Lotes activos"
            valor={String(lotes.length)}
            detalle="Bajo control sanitario"
            esMovil={esMovil}
          />

          <Tarjeta
            titulo="Último evento"
            valor={
              eventos.length > 0
                ? formatearFecha(eventos[0].fecha)
                : "—"
            }
            detalle="Último registro sanitario"
            esMovil={esMovil}
          />
        </div>

        {mostrarFormulario && (
          <form
            onSubmit={guardarEvento}
            style={{
              ...estilos.formulario,
              ...(esMovil ? estilos.formularioMovil : {}),
            }}
          >
            <h2
              style={{
                ...estilos.formTitulo,
                ...(esMovil ? estilos.formTituloMovil : {}),
              }}
            >
              Registrar evento sanitario
            </h2>

            <div
              style={{
                ...estilos.formGrid,
                ...(esMovil ? estilos.formGridMovil : {}),
              }}
            >
              <div>
                <label style={estilos.label}>
                  Fecha *
                </label>

                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fecha: e.target.value,
                    })
                  }
                  style={{
                    ...estilos.input,
                    ...(esMovil ? estilos.inputMovil : {}),
                  }}
                  required
                />
              </div>

              <div>
                <label style={estilos.label}>
                  Lote *
                </label>

                <select
                  value={form.lote_id}
                  onChange={(e) =>
                    seleccionarLote(e.target.value)
                  }
                  style={{
                    ...estilos.input,
                    ...(esMovil ? estilos.inputMovil : {}),
                  }}
                  required
                >
                  <option value="">
                    Seleccionar lote
                  </option>

                  {lotes.map((lote) => (
                    <option
                      key={lote.id}
                      value={lote.id}
                    >
                      {lote.nombre} —{" "}
                      {lote.cantidad_total} animales
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={estilos.label}>
                  Tipo de evento *
                </label>

                <select
                  value={form.tipo_evento}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tipo_evento: e.target.value,
                    })
                  }
                  style={{
                    ...estilos.input,
                    ...(esMovil ? estilos.inputMovil : {}),
                  }}
                  required
                >
                  <option value="">
                    Seleccionar
                  </option>

                  <option value="vacunacion">
                    Vacunación
                  </option>

                  <option value="desparasitacion">
                    Desparasitación
                  </option>

                  <option value="tratamiento">
                    Tratamiento
                  </option>

                  <option value="enfermedad">
                    Enfermedad
                  </option>

                  <option value="prevencion">
                    Prevención
                  </option>

                  <option value="vitaminizacion">
                    Vitaminización
                  </option>

                  <option value="revision">
                    Revisión veterinaria
                  </option>

                  <option value="otro">
                    Otro
                  </option>
                </select>
              </div>

              <div>
                <label style={estilos.label}>
                  Cantidad de animales *
                </label>

                <input
                  type="number"
                  min="1"
                  value={form.cantidad_animales}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cantidad_animales: e.target.value,
                    })
                  }
                  style={{
                    ...estilos.input,
                    ...(esMovil ? estilos.inputMovil : {}),
                  }}
                  required
                />
              </div>

              <div>
                <label style={estilos.label}>
                  Veterinario / responsable
                </label>

                <input
                  type="text"
                  value={form.veterinario}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      veterinario: e.target.value,
                    })
                  }
                  placeholder="Nombre del responsable"
                  style={{
                    ...estilos.input,
                    ...(esMovil ? estilos.inputMovil : {}),
                  }}
                />
              </div>

              <div>
                <label style={estilos.label}>
                  Diagnóstico
                </label>

                <input
                  type="text"
                  value={form.diagnostico}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      diagnostico: e.target.value,
                    })
                  }
                  placeholder="Si corresponde"
                  style={{
                    ...estilos.input,
                    ...(esMovil ? estilos.inputMovil : {}),
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: "18px" }}>
              <label style={estilos.label}>
                Descripción
              </label>

              <input
                type="text"
                value={form.descripcion}
                onChange={(e) =>
                  setForm({
                    ...form,
                    descripcion: e.target.value,
                  })
                }
                placeholder="Ej. Vacuna aplicada, procedimiento realizado..."
                style={{
                  ...estilos.input,
                  ...(esMovil ? estilos.inputMovil : {}),
                }}
              />
            </div>

            <div style={{ marginTop: "18px" }}>
              <label style={estilos.label}>
                Observaciones
              </label>

              <textarea
                value={form.observaciones}
                onChange={(e) =>
                  setForm({
                    ...form,
                    observaciones: e.target.value,
                  })
                }
                placeholder="Información adicional..."
                style={{
                  ...estilos.input,
                  ...(esMovil ? estilos.inputMovil : {}),
                  minHeight: esMovil ? "115px" : "90px",
                  resize: "vertical",
                }}
              />
            </div>

            <div
              style={{
                ...estilos.formBotones,
                ...(esMovil ? estilos.formBotonesMovil : {}),
              }}
            >
              <button
                type="button"
                style={{
                  ...estilos.botonSecundario,
                  ...(esMovil ? estilos.botonFormularioMovil : {}),
                }}
                onClick={() =>
                  setMostrarFormulario(false)
                }
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                style={{
                  ...estilos.botonPrincipal,
                  ...(esMovil ? estilos.botonFormularioMovil : {}),
                  opacity: guardando ? 0.7 : 1,
                }}
              >
                {guardando
                  ? "Guardando..."
                  : "Guardar evento"}
              </button>
            </div>
          </form>
        )}

        <div style={estilos.tablaPanel}>
          <div
            style={{
              ...estilos.tablaHeader,
              ...(esMovil ? estilos.tablaHeaderMovil : {}),
            }}
          >
            <h2
              style={{
                ...estilos.tablaTitulo,
                ...(esMovil ? estilos.tablaTituloMovil : {}),
              }}
            >
              Historial sanitario
            </h2>

            <span style={estilos.tablaSubtitulo}>
              {eventos.length} registro
              {eventos.length === 1 ? "" : "s"}
            </span>
          </div>

          {eventos.length === 0 ? (
            <div style={estilos.vacio}>
              <div style={{ fontSize: "38px" }}>
                ♥
              </div>

              <strong>
                No hay eventos sanitarios
              </strong>

              <span>
                Registra la primera actividad sanitaria del ganado.
              </span>
            </div>
          ) : esMovil ? (
            <div style={estilos.listaMovil}>
              {eventos.map((evento) => (
                <div
                  key={evento.id}
                  style={estilos.eventoCardMovil}
                >
                  <div style={estilos.eventoCardHeader}>
                    <div>
                      <span style={estilos.etiquetaSuperior}>
                        EVENTO SANITARIO
                      </span>

                      <h3 style={estilos.eventoLote}>
                        {evento.gan_lotes_ganado?.nombre || "—"}
                      </h3>

                      <span style={estilos.eventoFecha}>
                        {formatearFecha(evento.fecha)}
                      </span>
                    </div>

                    <span style={estilos.tipoMovil}>
                      {nombresTipos[evento.tipo_evento] ||
                        evento.tipo_evento}
                    </span>
                  </div>

                  <div style={estilos.separador} />

                  <div style={estilos.cantidadMovil}>
                    <span style={estilos.datoLabel}>
                      Animales
                    </span>

                    <strong style={estilos.cantidadValor}>
                      {evento.cantidad_animales ?? "—"}
                    </strong>

                    <span style={estilos.cantidadDetalle}>
                      animales registrados
                    </span>
                  </div>

                  <div style={estilos.detallesGridMovil}>
                    <DatoMovil
                      titulo="Veterinario / responsable"
                      valor={evento.veterinario || "—"}
                    />

                    <DatoMovil
                      titulo="Diagnóstico"
                      valor={evento.diagnostico || "—"}
                    />
                  </div>

                  <div style={estilos.detalleCompletoMovil}>
                    <span style={estilos.datoLabel}>
                      Descripción
                    </span>

                    <strong style={estilos.datoValor}>
                      {evento.descripcion || "—"}
                    </strong>
                  </div>

                  <div style={estilos.detalleCompletoMovil}>
                    <span style={estilos.datoLabel}>
                      Observaciones
                    </span>

                    <strong style={estilos.datoValor}>
                      {evento.observaciones || "—"}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={estilos.tabla}>
                <thead>
                  <tr>
                    <th style={estilos.th}>
                      Fecha
                    </th>

                    <th style={estilos.th}>
                      Lote
                    </th>

                    <th style={estilos.th}>
                      Tipo
                    </th>

                    <th style={estilos.th}>
                      Animales
                    </th>

                    <th style={estilos.th}>
                      Diagnóstico
                    </th>

                    <th style={estilos.th}>
                      Descripción
                    </th>

                    <th style={estilos.th}>
                      Veterinario
                    </th>

                    <th style={estilos.th}>
                      Observaciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {eventos.map((evento) => (
                    <tr key={evento.id}>
                      <td style={estilos.td}>
                        {formatearFecha(evento.fecha)}
                      </td>

                      <td style={estilos.td}>
                        <strong>
                          {evento.gan_lotes_ganado?.nombre || "—"}
                        </strong>
                      </td>

                      <td style={estilos.td}>
                        <span style={estilos.tipo}>
                          {nombresTipos[evento.tipo_evento] ||
                            evento.tipo_evento}
                        </span>
                      </td>

                      <td style={estilos.td}>
                        {evento.cantidad_animales ?? "—"}
                      </td>

                      <td style={estilos.td}>
                        {evento.diagnostico || "—"}
                      </td>

                      <td style={estilos.td}>
                        {evento.descripcion || "—"}
                      </td>

                      <td style={estilos.td}>
                        {evento.veterinario || "—"}
                      </td>

                      <td style={estilos.td}>
                        {evento.observaciones || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Tarjeta({
  titulo,
  valor,
  detalle,
  esMovil,
}: {
  titulo: string;
  valor: string;
  detalle: string;
  esMovil: boolean;
}) {
  return (
    <div
      style={{
        ...estilos.tarjeta,
        ...(esMovil ? estilos.tarjetaMovil : {}),
      }}
    >
      <span
        style={{
          ...estilos.tarjetaTitulo,
          ...(esMovil ? estilos.tarjetaTituloMovil : {}),
        }}
      >
        {titulo}
      </span>

      <strong
        style={{
          ...estilos.tarjetaValor,
          ...(esMovil ? estilos.tarjetaValorMovil : {}),
        }}
      >
        {valor}
      </strong>

      <span
        style={{
          ...estilos.tarjetaDetalle,
          ...(esMovil ? estilos.tarjetaDetalleMovil : {}),
        }}
      >
        {detalle}
      </span>
    </div>
  );
}

function DatoMovil({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div>
      <span style={estilos.datoLabel}>
        {titulo}
      </span>

      <strong style={estilos.datoValor}>
        {valor}
      </strong>
    </div>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  pagina: {
    minHeight: "100vh",
    background: "#f4f7f3",
    fontFamily: "Arial, sans-serif",
    color: "#20352a",
  },

  cargando: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f4f7f3",
    fontFamily: "Arial, sans-serif",
    color: "#176b3a",
    fontWeight: 700,
  },

  contenido: {
    marginLeft: "235px",
    padding: "32px",
    boxSizing: "border-box",
  },

  contenidoMovil: {
    marginLeft: 0,
    width: "100%",
    maxWidth: "100vw",
    padding: "84px 14px 28px",
    overflowX: "hidden",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "25px",
  },

  headerMovil: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: "16px",
    marginBottom: "20px",
  },

  titulo: {
    margin: 0,
    fontSize: "28px",
    color: "#143e28",
  },

  tituloMovil: {
    fontSize: "25px",
  },

  subtitulo: {
    margin: "7px 0 0",
    color: "#718078",
    fontSize: "14px",
  },

  subtituloMovil: {
    fontSize: "14px",
    lineHeight: 1.45,
  },

  botonPrincipal: {
    background: "#176b3a",
    border: "none",
    borderRadius: "10px",
    color: "white",
    padding: "12px 18px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },

  botonPrincipalMovil: {
    width: "100%",
    minHeight: "48px",
    fontSize: "15px",
    borderRadius: "11px",
  },

  botonSecundario: {
    background: "white",
    border: "1px solid #d7dfd9",
    borderRadius: "10px",
    color: "#53675b",
    padding: "12px 18px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },

  botonFormularioMovil: {
    width: "100%",
    minHeight: "48px",
    fontSize: "14px",
  },

  mensaje: {
    padding: "12px 15px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontSize: "13px",
  },

  resumenGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "18px",
    marginBottom: "22px",
  },

  resumenGridMovil: {
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "8px",
    marginBottom: "18px",
  },

  tarjeta: {
    background: "white",
    border: "1px solid #e0e8e2",
    borderRadius: "14px",
    padding: "19px",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  tarjetaMovil: {
    padding: "13px 10px",
    minWidth: 0,
    minHeight: "112px",
  },

  tarjetaTitulo: {
    color: "#718078",
    fontSize: "13px",
    fontWeight: 600,
  },

  tarjetaTituloMovil: {
    fontSize: "11px",
    lineHeight: 1.25,
  },

  tarjetaValor: {
    color: "#176b3a",
    fontSize: "27px",
  },

  tarjetaValorMovil: {
    fontSize: "22px",
    lineHeight: 1.15,
    wordBreak: "break-word",
  },

  tarjetaDetalle: {
    color: "#98a39c",
    fontSize: "12px",
  },

  tarjetaDetalleMovil: {
    fontSize: "10px",
    lineHeight: 1.3,
  },

  formulario: {
    background: "white",
    border: "1px solid #e0e8e2",
    borderRadius: "15px",
    padding: "24px",
    marginBottom: "22px",
  },

  formularioMovil: {
    padding: "16px",
    borderRadius: "14px",
    marginBottom: "18px",
  },

  formTitulo: {
    margin: "0 0 20px",
    color: "#244b34",
    fontSize: "18px",
  },

  formTituloMovil: {
    fontSize: "20px",
    marginBottom: "20px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "17px",
  },

  formGridMovil: {
    gridTemplateColumns: "1fr",
    gap: "16px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    color: "#43594b",
    fontSize: "13px",
    fontWeight: 600,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d7dfd9",
    borderRadius: "9px",
    padding: "11px 12px",
    fontSize: "14px",
    outline: "none",
    background: "white",
  },

  inputMovil: {
    minHeight: "46px",
    fontSize: "16px",
  },

  formBotones: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "22px",
  },

  formBotonesMovil: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },

  tablaPanel: {
    background: "white",
    border: "1px solid #e0e8e2",
    borderRadius: "15px",
    overflow: "hidden",
  },

  tablaHeader: {
    padding: "20px 22px",
    borderBottom: "1px solid #edf1ee",
  },

  tablaHeaderMovil: {
    padding: "17px 16px",
  },

  tablaTitulo: {
    margin: 0,
    fontSize: "17px",
    color: "#244b34",
  },

  tablaTituloMovil: {
    fontSize: "20px",
  },

  tablaSubtitulo: {
    display: "block",
    marginTop: "5px",
    color: "#94a198",
    fontSize: "12px",
  },

  tabla: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },

  th: {
    textAlign: "left",
    padding: "13px 16px",
    background: "#f7faf7",
    color: "#66776c",
    fontWeight: 700,
    borderBottom: "1px solid #edf1ee",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "14px 16px",
    borderBottom: "1px solid #edf1ee",
    color: "#45594c",
  },

  tipo: {
    display: "inline-block",
    background: "#eaf6ee",
    color: "#176b3a",
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  vacio: {
    minHeight: "260px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    color: "#829087",
    fontSize: "13px",
    textAlign: "center",
    padding: "20px",
  },

  listaMovil: {
    padding: "12px",
  },

  eventoCardMovil: {
    border: "1px solid #dce6df",
    borderRadius: "13px",
    padding: "14px",
    background: "#ffffff",
  },

  eventoCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
  },

  etiquetaSuperior: {
    display: "block",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "1.2px",
    color: "#91a097",
    marginBottom: "5px",
  },

  eventoLote: {
    margin: 0,
    color: "#164a2e",
    fontSize: "19px",
  },

  eventoFecha: {
    display: "block",
    marginTop: "5px",
    color: "#89978f",
    fontSize: "12px",
  },

  tipoMovil: {
    display: "inline-block",
    background: "#eaf6ee",
    color: "#176b3a",
    padding: "7px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 700,
    textAlign: "center",
    maxWidth: "46%",
  },

  separador: {
    height: "1px",
    background: "#edf1ee",
    margin: "14px 0",
  },

  cantidadMovil: {
    background: "#f5f8f6",
    borderRadius: "10px",
    padding: "13px",
    marginBottom: "14px",
  },

  cantidadValor: {
    display: "block",
    marginTop: "5px",
    color: "#176b3a",
    fontSize: "26px",
  },

  cantidadDetalle: {
    display: "block",
    marginTop: "2px",
    color: "#98a39c",
    fontSize: "11px",
  },

  detallesGridMovil: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
    paddingBottom: "14px",
    borderBottom: "1px solid #edf1ee",
  },

  detalleCompletoMovil: {
    paddingTop: "13px",
  },

  datoLabel: {
    display: "block",
    color: "#89978f",
    fontSize: "11px",
    marginBottom: "5px",
  },

  datoValor: {
    display: "block",
    color: "#344d3d",
    fontSize: "13px",
    lineHeight: 1.4,
    overflowWrap: "anywhere",
  },
};
