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

export default function SanidadPage() {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [mensaje, setMensaje] = useState("");
  const [fincaId, setFincaId] = useState("");

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [eventos, setEventos] =
    useState<EventoSanitario[]>([]);

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

  const iniciar = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    const { data: usuario, error: errorUsuario } =
      await supabase
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
      setMensaje(
        `Error al cargar lotes: ${error.message}`
      );
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
      setMensaje(
        `Error al cargar sanidad: ${error.message}`
      );
      return;
    }

    setEventos(
      (data || []) as unknown as EventoSanitario[]
    );
  };

  const seleccionarLote = (loteId: string) => {
    const lote = lotes.find(
      (item) => item.id === loteId
    );

    setForm((anterior) => ({
      ...anterior,
      lote_id: loteId,
      cantidad_animales: lote
        ? String(lote.cantidad_total)
        : "",
    }));
  };

  const guardarEvento = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    setMensaje("");

    if (!form.lote_id) {
      setMensaje("Debes seleccionar un lote.");
      return;
    }

    if (!form.tipo_evento) {
      setMensaje(
        "Debes seleccionar el tipo de evento sanitario."
      );
      return;
    }

    const cantidad = Number(
      form.cantidad_animales
    );

    if (!cantidad || cantidad <= 0) {
      setMensaje(
        "La cantidad de animales debe ser mayor a cero."
      );
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
        diagnostico:
          form.diagnostico.trim() || null,
        descripcion:
          form.descripcion.trim() || null,
        veterinario:
          form.veterinario.trim() || null,
        observaciones:
          form.observaciones.trim() || null,
        registrado_por: user.id,
      });

    if (error) {
      setMensaje(
        `Error al registrar evento: ${error.message}`
      );
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

    setMensaje(
      "Evento sanitario registrado correctamente."
    );

    await cargarEventos(fincaId);

    setGuardando(false);
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString(
      "es-BO",
      {
        timeZone: "UTC",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
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

      <section style={estilos.contenido}>
        <header style={estilos.header}>
          <div>
            <h1 style={estilos.titulo}>
              Sanidad
            </h1>

            <p style={estilos.subtitulo}>
              Control sanitario del ganado
            </p>
          </div>

          <button
            style={estilos.botonPrincipal}
            onClick={() => {
              setMensaje("");
              setMostrarFormulario(
                !mostrarFormulario
              );
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
              background:
                mensaje.includes("correctamente")
                  ? "#edf8f0"
                  : "#fff1f1",
              color:
                mensaje.includes("correctamente")
                  ? "#176b3a"
                  : "#b42318",
            }}
          >
            {mensaje}
          </div>
        )}

        <div style={estilos.resumenGrid}>
          <Tarjeta
            titulo="Eventos sanitarios"
            valor={String(eventos.length)}
            detalle="Registros realizados"
          />

          <Tarjeta
            titulo="Lotes activos"
            valor={String(lotes.length)}
            detalle="Bajo control sanitario"
          />

          <Tarjeta
            titulo="Último evento"
            valor={
              eventos.length > 0
                ? formatearFecha(eventos[0].fecha)
                : "—"
            }
            detalle="Último registro sanitario"
          />
        </div>

        {mostrarFormulario && (
          <form
            onSubmit={guardarEvento}
            style={estilos.formulario}
          >
            <h2 style={estilos.formTitulo}>
              Registrar evento sanitario
            </h2>

            <div style={estilos.formGrid}>
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
                  style={estilos.input}
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
                    seleccionarLote(
                      e.target.value
                    )
                  }
                  style={estilos.input}
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
                      tipo_evento:
                        e.target.value,
                    })
                  }
                  style={estilos.input}
                  required
                >
                  <option value="">
                    Seleccionar
                  </option>

                  <option value="Vacunación">
                    Vacunación
                  </option>

                  <option value="Desparasitación">
                    Desparasitación
                  </option>

                  <option value="Tratamiento">
                    Tratamiento
                  </option>

                  <option value="Vitaminas">
                    Vitaminas
                  </option>

                  <option value="Revisión veterinaria">
                    Revisión veterinaria
                  </option>

                  <option value="Curación">
                    Curación
                  </option>

                  <option value="Otro">
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
                      cantidad_animales:
                        e.target.value,
                    })
                  }
                  style={estilos.input}
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
                      veterinario:
                        e.target.value,
                    })
                  }
                  placeholder="Nombre del responsable"
                  style={estilos.input}
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
                      diagnostico:
                        e.target.value,
                    })
                  }
                  placeholder="Si corresponde"
                  style={estilos.input}
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
                    descripcion:
                      e.target.value,
                  })
                }
                placeholder="Ej. Vacuna aplicada, procedimiento realizado..."
                style={estilos.input}
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
                    observaciones:
                      e.target.value,
                  })
                }
                placeholder="Información adicional..."
                style={{
                  ...estilos.input,
                  minHeight: "90px",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={estilos.formBotones}>
              <button
                type="button"
                style={estilos.botonSecundario}
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
          <div style={estilos.tablaHeader}>
            <h2 style={estilos.tablaTitulo}>
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
                Registra la primera actividad
                sanitaria del ganado.
              </span>
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
                        {formatearFecha(
                          evento.fecha
                        )}
                      </td>

                      <td style={estilos.td}>
                        <strong>
                          {evento.gan_lotes_ganado
                            ?.nombre || "—"}
                        </strong>
                      </td>

                      <td style={estilos.td}>
                        <span
                          style={estilos.tipo}
                        >
                          {evento.tipo_evento}
                        </span>
                      </td>

                      <td style={estilos.td}>
                        {evento.cantidad_animales ??
                          "—"}
                      </td>

                      <td style={estilos.td}>
                        {evento.diagnostico ||
                          "—"}
                      </td>

                      <td style={estilos.td}>
                        {evento.descripcion ||
                          "—"}
                      </td>

                      <td style={estilos.td}>
                        {evento.veterinario ||
                          "—"}
                      </td>

                      <td style={estilos.td}>
                        {evento.observaciones ||
                          "—"}
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
}: {
  titulo: string;
  valor: string;
  detalle: string;
}) {
  return (
    <div style={estilos.tarjeta}>
      <span style={estilos.tarjetaTitulo}>
        {titulo}
      </span>

      <strong style={estilos.tarjetaValor}>
        {valor}
      </strong>

      <span style={estilos.tarjetaDetalle}>
        {detalle}
      </span>
    </div>
  );
}

const estilos: Record<
  string,
  React.CSSProperties
> = {
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
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "25px",
  },

  titulo: {
    margin: 0,
    fontSize: "28px",
    color: "#143e28",
  },

  subtitulo: {
    margin: "7px 0 0",
    color: "#718078",
    fontSize: "14px",
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

  mensaje: {
    padding: "12px 15px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontSize: "13px",
  },

  resumenGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: "18px",
    marginBottom: "22px",
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

  tarjetaTitulo: {
    color: "#718078",
    fontSize: "13px",
    fontWeight: 600,
  },

  tarjetaValor: {
    color: "#176b3a",
    fontSize: "27px",
  },

  tarjetaDetalle: {
    color: "#98a39c",
    fontSize: "12px",
  },

  formulario: {
    background: "white",
    border: "1px solid #e0e8e2",
    borderRadius: "15px",
    padding: "24px",
    marginBottom: "22px",
  },

  formTitulo: {
    margin: "0 0 20px",
    color: "#244b34",
    fontSize: "18px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: "17px",
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

  formBotones: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "22px",
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

  tablaTitulo: {
    margin: 0,
    fontSize: "17px",
    color: "#244b34",
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
  },
};
