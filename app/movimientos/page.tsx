"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Sidebar from "../components/Sidebar";

type Potrero = {
  id: string;
  nombre: string;
};

type Lote = {
  id: string;
  nombre: string;
  cantidad_total: number;
  potrero_id: string | null;
};

type Movimiento = {
  id: string;
  lote_id: string;
  potrero_origen_id: string | null;
  potrero_destino_id: string | null;
  fecha: string;
  cantidad_animales: number;
  motivo: string | null;
  observaciones: string | null;
  gan_lotes_ganado?: {
    nombre: string;
  } | null;
};

export default function MovimientosPage() {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [esMovil, setEsMovil] = useState(false);

  const [fincaId, setFincaId] = useState("");
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [potreros, setPotreros] = useState<Potrero[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split("T")[0],
    lote_id: "",
    potrero_origen_id: "",
    potrero_destino_id: "",
    cantidad_animales: "",
    motivo: "",
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
      cargarPotreros(usuario.finca_id),
      cargarMovimientos(usuario.finca_id),
    ]);

    setLoading(false);
  };

  const cargarLotes = async (idFinca: string) => {
    const { data, error } = await supabase
      .from("gan_lotes_ganado")
      .select("id, nombre, cantidad_total, potrero_id")
      .eq("finca_id", idFinca)
      .in("estado", ["activo", "feedlot"])
      .order("nombre");

    if (error) {
      setMensaje(`Error al cargar lotes: ${error.message}`);
      return;
    }

    setLotes((data || []) as Lote[]);
  };

  const cargarPotreros = async (idFinca: string) => {
    const { data, error } = await supabase
      .from("gan_potreros")
      .select("id, nombre")
      .eq("finca_id", idFinca)
      .order("nombre");

    if (error) {
      setMensaje(`Error al cargar potreros: ${error.message}`);
      return;
    }

    setPotreros((data || []) as Potrero[]);
  };

  const cargarMovimientos = async (idFinca: string) => {
    const { data, error } = await supabase
      .from("gan_lote_movimientos")
      .select(`
        id,
        lote_id,
        potrero_origen_id,
        potrero_destino_id,
        fecha,
        cantidad_animales,
        motivo,
        observaciones,
        gan_lotes_ganado!inner (
          nombre,
          finca_id
        )
      `)
      .eq("gan_lotes_ganado.finca_id", idFinca)
      .order("fecha", { ascending: false });

    if (error) {
      setMensaje(`Error al cargar movimientos: ${error.message}`);
      return;
    }

    setMovimientos((data || []) as unknown as Movimiento[]);
  };

  const seleccionarLote = (loteId: string) => {
    const lote = lotes.find((item) => item.id === loteId);

    setForm((anterior) => ({
      ...anterior,
      lote_id: loteId,
      potrero_origen_id: lote?.potrero_id || "",
      cantidad_animales: lote ? String(lote.cantidad_total) : "",
      potrero_destino_id: "",
    }));
  };

  const nombrePotrero = (potreroId: string | null) => {
    if (!potreroId) return "Sin potrero";

    return (
      potreros.find((potrero) => potrero.id === potreroId)?.nombre ||
      "Potrero no disponible"
    );
  };

  const guardarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    const lote = lotes.find((item) => item.id === form.lote_id);

    if (!lote) {
      setMensaje("Debes seleccionar un lote.");
      return;
    }

    if (!form.potrero_destino_id) {
      setMensaje("Debes seleccionar el potrero de destino.");
      return;
    }

    if (form.potrero_destino_id === form.potrero_origen_id) {
      setMensaje(
        "El potrero de destino debe ser diferente al potrero actual."
      );
      return;
    }

    const cantidad = Number(lote.cantidad_total);

    if (cantidad <= 0) {
      setMensaje("El lote no tiene animales para mover.");
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

    const { error: errorMovimiento } = await supabase
      .from("gan_lote_movimientos")
      .insert({
        lote_id: lote.id,
        potrero_origen_id: lote.potrero_id || null,
        potrero_destino_id: form.potrero_destino_id,
        fecha: form.fecha,
        cantidad_animales: cantidad,
        motivo: form.motivo.trim() || null,
        observaciones: form.observaciones.trim() || null,
        registrado_por: user.id,
      });

    if (errorMovimiento) {
      setMensaje(
        `Error al registrar movimiento: ${errorMovimiento.message}`
      );
      setGuardando(false);
      return;
    }

    const { error: errorLote } = await supabase
      .from("gan_lotes_ganado")
      .update({
        potrero_id: form.potrero_destino_id,
      })
      .eq("id", lote.id);

    if (errorLote) {
      setMensaje(
        `El movimiento se registró, pero no se pudo actualizar el lote: ${errorLote.message}`
      );
      setGuardando(false);
      return;
    }

    setForm({
      fecha: new Date().toISOString().split("T")[0],
      lote_id: "",
      potrero_origen_id: "",
      potrero_destino_id: "",
      cantidad_animales: "",
      motivo: "",
      observaciones: "",
    });

    setMostrarFormulario(false);
    setMensaje("Movimiento registrado correctamente.");

    await Promise.all([
      cargarLotes(fincaId),
      cargarMovimientos(fincaId),
    ]);

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
        Cargando movimientos...
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
              Movimientos
            </h1>

            <p
              style={{
                ...estilos.subtitulo,
                ...(esMovil ? estilos.subtituloMovil : {}),
              }}
            >
              Traslado de lotes entre potreros
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
              : "+ Registrar movimiento"}
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
            titulo="Movimientos"
            valor={String(movimientos.length)}
            detalle="Traslados registrados"
          />

          <Tarjeta
            titulo="Lotes activos"
            valor={String(lotes.length)}
            detalle="Disponibles para mover"
          />

          <Tarjeta
            titulo="Potreros"
            valor={String(potreros.length)}
            detalle="Potreros registrados"
          />
        </div>

        {mostrarFormulario && (
          <form
            onSubmit={guardarMovimiento}
            style={{
              ...estilos.formulario,
              ...(esMovil ? estilos.formularioMovil : {}),
            }}
          >
            <h2 style={estilos.formTitulo}>
              Registrar movimiento
            </h2>

            <div style={estilos.aviso}>
              Por ahora este módulo mueve el lote completo. Los
              movimientos parciales se habilitarán mediante división
              de lotes.
            </div>

            <div
              style={{
                ...estilos.formGrid,
                ...(esMovil ? estilos.formGridMovil : {}),
              }}
            >
              <div>
                <label style={estilos.label}>Fecha *</label>
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
                <label style={estilos.label}>Lote *</label>
                <select
                  value={form.lote_id}
                  onChange={(e) =>
                    seleccionarLote(e.target.value)
                  }
                  style={estilos.input}
                  required
                >
                  <option value="">Seleccionar lote</option>

                  {lotes.map((lote) => (
                    <option key={lote.id} value={lote.id}>
                      {lote.nombre} — {lote.cantidad_total} animales
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={estilos.label}>
                  Cantidad de animales
                </label>

                <input
                  type="number"
                  value={form.cantidad_animales}
                  disabled
                  style={{
                    ...estilos.input,
                    background: "#f3f6f4",
                  }}
                />
              </div>

              <div>
                <label style={estilos.label}>
                  Potrero actual
                </label>

                <input
                  type="text"
                  value={
                    form.lote_id
                      ? nombrePotrero(form.potrero_origen_id)
                      : ""
                  }
                  disabled
                  placeholder="Seleccione un lote"
                  style={{
                    ...estilos.input,
                    background: "#f3f6f4",
                  }}
                />
              </div>

              <div>
                <label style={estilos.label}>
                  Potrero destino *
                </label>

                <select
                  value={form.potrero_destino_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      potrero_destino_id: e.target.value,
                    })
                  }
                  style={estilos.input}
                  required
                >
                  <option value="">Seleccionar destino</option>

                  {potreros
                    .filter(
                      (potrero) =>
                        potrero.id !== form.potrero_origen_id
                    )
                    .map((potrero) => (
                      <option
                        key={potrero.id}
                        value={potrero.id}
                      >
                        {potrero.nombre}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={estilos.label}>Motivo</label>

                <select
                  value={form.motivo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      motivo: e.target.value,
                    })
                  }
                  style={estilos.input}
                >
                  <option value="">Seleccionar motivo</option>
                  <option value="Rotación de potrero">
                    Rotación de potrero
                  </option>
                  <option value="Disponibilidad de pasto">
                    Disponibilidad de pasto
                  </option>
                  <option value="Manejo sanitario">
                    Manejo sanitario
                  </option>
                  <option value="Ingreso a feedlot">
                    Ingreso a feedlot
                  </option>
                  <option value="Salida de feedlot">
                    Salida de feedlot
                  </option>
                  <option value="Manejo general">
                    Manejo general
                  </option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>
                        <div style={estilos.observaciones}>
              <label style={estilos.label}>Observaciones</label>

              <textarea
                value={form.observaciones}
                onChange={(e) =>
                  setForm({
                    ...form,
                    observaciones: e.target.value,
                  })
                }
                placeholder="Información adicional del movimiento..."
                style={estilos.textarea}
              />
            </div>

            <div
              style={{
                ...estilos.acciones,
                ...(esMovil ? estilos.accionesMovil : {}),
              }}
            >
              <button
                type="button"
                style={{
                  ...estilos.botonSecundario,
                  ...(esMovil ? estilos.botonAccionMovil : {}),
                }}
                onClick={() => {
                  setMostrarFormulario(false);
                  setMensaje("");
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                style={{
                  ...estilos.botonPrincipal,
                  ...(esMovil ? estilos.botonAccionMovil : {}),
                  opacity: guardando ? 0.65 : 1,
                }}
              >
                {guardando
                  ? "Guardando..."
                  : "Guardar movimiento"}
              </button>
            </div>
          </form>
        )}

        <section style={estilos.panel}>
          <div
            style={{
              ...estilos.panelHeader,
              ...(esMovil ? estilos.panelHeaderMovil : {}),
            }}
          >
            <div>
              <h2 style={estilos.panelTitulo}>
                Historial de movimientos
              </h2>

              <p style={estilos.panelSubtitulo}>
                {movimientos.length}{" "}
                {movimientos.length === 1
                  ? "registro"
                  : "registros"}
              </p>
            </div>
          </div>

          {movimientos.length === 0 ? (
            <div style={estilos.vacio}>
              No hay movimientos registrados.
            </div>
          ) : esMovil ? (
            <div style={estilos.listaMovil}>
              {movimientos.map((movimiento) => (
                <article
                  key={movimiento.id}
                  style={estilos.movimientoCard}
                >
                  <div style={estilos.movimientoTop}>
                    <div>
                      <span style={estilos.etiquetaCard}>
                        MOVIMIENTO
                      </span>

                      <h3 style={estilos.nombreLoteCard}>
                        {movimiento.gan_lotes_ganado?.nombre ||
                          "Lote"}
                      </h3>

                      <span style={estilos.fechaCard}>
                        {formatearFecha(movimiento.fecha)}
                      </span>
                    </div>

                    <div style={estilos.badgeAnimales}>
                      {movimiento.cantidad_animales} animales
                    </div>
                  </div>

                  <div style={estilos.rutaCard}>
                    <div style={estilos.potreroCard}>
                      <span style={estilos.datoLabel}>
                        Origen
                      </span>
                      <strong style={estilos.datoValor}>
                        {nombrePotrero(
                          movimiento.potrero_origen_id
                        )}
                      </strong>
                    </div>

                    <div style={estilos.flechaCard}>→</div>

                    <div style={estilos.potreroCard}>
                      <span style={estilos.datoLabel}>
                        Destino
                      </span>
                      <strong style={estilos.datoValor}>
                        {nombrePotrero(
                          movimiento.potrero_destino_id
                        )}
                      </strong>
                    </div>
                  </div>

                  <div style={estilos.detallesCard}>
                    <div>
                      <span style={estilos.datoLabel}>
                        Motivo
                      </span>
                      <strong style={estilos.datoValor}>
                        {movimiento.motivo || "Sin motivo"}
                      </strong>
                    </div>

                    <div>
                      <span style={estilos.datoLabel}>
                        Observaciones
                      </span>
                      <strong style={estilos.datoValor}>
                        {movimiento.observaciones ||
                          "Sin observaciones"}
                      </strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div style={estilos.tablaContenedor}>
              <table style={estilos.tabla}>
                <thead>
                  <tr>
                    <th style={estilos.th}>Fecha</th>
                    <th style={estilos.th}>Lote</th>
                    <th style={estilos.th}>Origen</th>
                    <th style={estilos.th}>Destino</th>
                    <th style={estilos.th}>Cantidad</th>
                    <th style={estilos.th}>Motivo</th>
                    <th style={estilos.th}>Observaciones</th>
                  </tr>
                </thead>

                <tbody>
                  {movimientos.map((movimiento) => (
                    <tr key={movimiento.id}>
                      <td style={estilos.td}>
                        {formatearFecha(movimiento.fecha)}
                      </td>

                      <td style={estilos.tdFuerte}>
                        {movimiento.gan_lotes_ganado?.nombre ||
                          "Lote"}
                      </td>

                      <td style={estilos.td}>
                        {nombrePotrero(
                          movimiento.potrero_origen_id
                        )}
                      </td>

                      <td style={estilos.td}>
                        {nombrePotrero(
                          movimiento.potrero_destino_id
                        )}
                      </td>

                      <td style={estilos.td}>
                        {movimiento.cantidad_animales}
                      </td>

                      <td style={estilos.td}>
                        {movimiento.motivo || "—"}
                      </td>

                      <td style={estilos.td}>
                        {movimiento.observaciones || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
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
      <span style={estilos.tarjetaTitulo}>{titulo}</span>
      <strong style={estilos.tarjetaValor}>{valor}</strong>
      <span style={estilos.tarjetaDetalle}>{detalle}</span>
    </div>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  pagina: {
    minHeight: "100vh",
    background: "#f5f8f5",
  },

  cargando: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f8f5",
    color: "#176b3a",
    fontWeight: 700,
    fontFamily: "Arial, sans-serif",
  },

  contenido: {
    marginLeft: "235px",
    minHeight: "100vh",
    padding: "32px",
    boxSizing: "border-box",
    color: "#173d29",
    fontFamily: "Arial, sans-serif",
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "24px",
  },

  headerMovil: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: "14px",
    marginBottom: "18px",
  },

  titulo: {
    margin: 0,
    fontSize: "38px",
    lineHeight: 1.1,
    color: "#174c2e",
    fontWeight: 800,
  },

  tituloMovil: {
    fontSize: "25px",
  },

  subtitulo: {
    margin: "9px 0 0",
    color: "#74867a",
    fontSize: "17px",
  },

  subtituloMovil: {
    marginTop: "6px",
    fontSize: "13px",
    lineHeight: 1.4,
  },

  botonPrincipal: {
    border: "none",
    borderRadius: "10px",
    background: "#18763e",
    color: "#ffffff",
    padding: "13px 20px",
    minHeight: "46px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    boxSizing: "border-box",
  },

  botonPrincipalMovil: {
    width: "100%",
  },

  mensaje: {
    borderRadius: "10px",
    padding: "12px 14px",
    marginBottom: "18px",
    fontSize: "13px",
    fontWeight: 600,
  },

  resumenGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "16px",
    marginBottom: "22px",
  },

  resumenGridMovil: {
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "8px",
    marginBottom: "16px",
  },

  tarjeta: {
    background: "#ffffff",
    border: "1px solid #dce6df",
    borderRadius: "14px",
    padding: "20px",
    minWidth: 0,
    boxSizing: "border-box",
    boxShadow: "0 1px 2px rgba(20, 70, 40, 0.03)",
  },

  tarjetaTitulo: {
    display: "block",
    color: "#66786c",
    fontSize: "13px",
    fontWeight: 700,
    marginBottom: "8px",
  },

  tarjetaValor: {
    display: "block",
    color: "#16733b",
    fontSize: "34px",
    lineHeight: 1.05,
    marginBottom: "8px",
  },

  tarjetaDetalle: {
    display: "block",
    color: "#95a299",
    fontSize: "12px",
    lineHeight: 1.35,
  },

  formulario: {
    background: "#ffffff",
    border: "1px solid #dce6df",
    borderRadius: "14px",
    padding: "24px",
    marginBottom: "22px",
    boxSizing: "border-box",
  },

  formularioMovil: {
    padding: "16px",
    borderRadius: "12px",
    marginBottom: "16px",
  },

  formTitulo: {
    margin: "0 0 18px",
    color: "#174c2e",
    fontSize: "22px",
    fontWeight: 800,
  },

  aviso: {
    background: "#eef7f0",
    border: "1px solid #d6eadc",
    borderRadius: "10px",
    color: "#466452",
    padding: "12px 14px",
    marginBottom: "18px",
    fontSize: "12px",
    lineHeight: 1.45,
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "18px",
  },

  formGridMovil: {
    gridTemplateColumns: "1fr",
    gap: "14px",
  },

  label: {
    display: "block",
    color: "#405a49",
    fontSize: "13px",
    fontWeight: 700,
    marginBottom: "7px",
  },

  input: {
    width: "100%",
    minHeight: "46px",
    border: "1px solid #cfddd3",
    borderRadius: "9px",
    background: "#ffffff",
    color: "#213c2b",
    padding: "10px 12px",
    fontSize: "16px",
    boxSizing: "border-box",
    outline: "none",
  },

  observaciones: {
    marginTop: "18px",
  },

  textarea: {
    width: "100%",
    minHeight: "105px",
    resize: "vertical",
    border: "1px solid #cfddd3",
    borderRadius: "9px",
    background: "#ffffff",
    color: "#213c2b",
    padding: "12px",
    fontSize: "16px",
    lineHeight: 1.45,
    boxSizing: "border-box",
    outline: "none",
  },

  acciones: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "20px",
  },

  accionesMovil: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "9px",
  },

  botonAccionMovil: {
    width: "100%",
    paddingLeft: "7px",
    paddingRight: "7px",
  },

  botonSecundario: {
    border: "1px solid #cfddd3",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#506659",
    padding: "13px 20px",
    minHeight: "46px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    boxSizing: "border-box",
  },

  panel: {
    background: "#ffffff",
    border: "1px solid #dce6df",
    borderRadius: "14px",
    overflow: "hidden",
  },

  panelHeader: {
    padding: "22px 24px",
    borderBottom: "1px solid #e5ece7",
  },

  panelHeaderMovil: {
    padding: "16px",
  },

  panelTitulo: {
    margin: 0,
    color: "#174c2e",
    fontSize: "22px",
    fontWeight: 800,
  },

  panelSubtitulo: {
    margin: "7px 0 0",
    color: "#92a097",
    fontSize: "13px",
  },

  vacio: {
    padding: "30px 24px",
    color: "#849188",
    textAlign: "center",
    fontSize: "13px",
  },

  tablaContenedor: {
    width: "100%",
    overflowX: "auto",
  },

  tabla: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "900px",
  },

  th: {
    textAlign: "left",
    padding: "14px 16px",
    background: "#f6f9f7",
    color: "#627469",
    fontSize: "12px",
    fontWeight: 700,
    borderBottom: "1px solid #e3ebe5",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "16px",
    color: "#405649",
    fontSize: "13px",
    borderBottom: "1px solid #edf1ee",
    verticalAlign: "top",
  },

  tdFuerte: {
    padding: "16px",
    color: "#314b3b",
    fontSize: "13px",
    fontWeight: 700,
    borderBottom: "1px solid #edf1ee",
    verticalAlign: "top",
  },

  listaMovil: {
    padding: "12px",
  },

  movimientoCard: {
    background: "#ffffff",
    border: "1px solid #dce6df",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "10px",
    boxSizing: "border-box",
  },

  movimientoTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
    paddingBottom: "13px",
    borderBottom: "1px solid #edf1ee",
  },

  etiquetaCard: {
    display: "block",
    color: "#94a198",
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "1px",
    marginBottom: "4px",
  },

  nombreLoteCard: {
    margin: 0,
    color: "#174c2e",
    fontSize: "18px",
    fontWeight: 800,
  },

  fechaCard: {
    display: "block",
    marginTop: "5px",
    color: "#89978e",
    fontSize: "11px",
  },

  badgeAnimales: {
    display: "inline-block",
    background: "#eaf6ee",
    color: "#176b3a",
    borderRadius: "20px",
    padding: "6px 10px",
    fontSize: "10px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  rutaCard: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
    gap: "8px",
    alignItems: "center",
    marginTop: "14px",
  },

  potreroCard: {
    background: "#f6faf7",
    borderRadius: "9px",
    padding: "12px",
    minWidth: 0,
  },

  flechaCard: {
    color: "#178044",
    fontSize: "22px",
    fontWeight: 800,
    textAlign: "center",
  },

  datoLabel: {
    display: "block",
    color: "#8a9890",
    fontSize: "10px",
    marginBottom: "5px",
  },

  datoValor: {
    display: "block",
    color: "#35483b",
    fontSize: "12px",
    lineHeight: 1.4,
    fontWeight: 700,
    overflowWrap: "anywhere",
  },

  detallesCard: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "14px",
    paddingTop: "14px",
    borderTop: "1px solid #edf1ee",
  },
};
