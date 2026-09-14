"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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
  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);
  const [mensaje, setMensaje] = useState("");

  const [fincaId, setFincaId] = useState("");
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [potreros, setPotreros] = useState<Potrero[]>([]);
  const [movimientos, setMovimientos] =
    useState<Movimiento[]>([]);

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
      cargarPotreros(usuario.finca_id),
      cargarMovimientos(usuario.finca_id),
    ]);

    setLoading(false);
  };

  const cargarLotes = async (idFinca: string) => {
    const { data, error } = await supabase
      .from("gan_lotes_ganado")
      .select(
        "id, nombre, cantidad_total, potrero_id"
      )
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

  const cargarPotreros = async (idFinca: string) => {
    const { data, error } = await supabase
      .from("gan_potreros")
      .select("id, nombre")
      .eq("finca_id", idFinca)
      .order("nombre");

    if (error) {
      setMensaje(
        `Error al cargar potreros: ${error.message}`
      );
      return;
    }

    setPotreros((data || []) as Potrero[]);
  };

  const cargarMovimientos = async (
    idFinca: string
  ) => {
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
      .eq(
        "gan_lotes_ganado.finca_id",
        idFinca
      )
      .order("fecha", { ascending: false });

    if (error) {
      setMensaje(
        `Error al cargar movimientos: ${error.message}`
      );
      return;
    }

    setMovimientos(
      (data || []) as unknown as Movimiento[]
    );
  };

  const seleccionarLote = (loteId: string) => {
    const lote = lotes.find(
      (item) => item.id === loteId
    );

    setForm((anterior) => ({
      ...anterior,
      lote_id: loteId,
      potrero_origen_id:
        lote?.potrero_id || "",
      cantidad_animales: lote
        ? String(lote.cantidad_total)
        : "",
      potrero_destino_id: "",
    }));
  };

  const nombrePotrero = (
    potreroId: string | null
  ) => {
    if (!potreroId) return "Sin potrero";

    return (
      potreros.find(
        (potrero) => potrero.id === potreroId
      )?.nombre || "Potrero no disponible"
    );
  };

  const guardarMovimiento = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    setMensaje("");

    const lote = lotes.find(
      (item) => item.id === form.lote_id
    );

    if (!lote) {
      setMensaje("Debes seleccionar un lote.");
      return;
    }

    if (!form.potrero_destino_id) {
      setMensaje(
        "Debes seleccionar el potrero de destino."
      );
      return;
    }

    if (
      form.potrero_destino_id ===
      form.potrero_origen_id
    ) {
      setMensaje(
        "El potrero de destino debe ser diferente al potrero actual."
      );
      return;
    }

    /*
      Por ahora solo permitimos movimientos
      del lote completo.
    */
    const cantidad = Number(
      lote.cantidad_total
    );

    if (cantidad <= 0) {
      setMensaje(
        "El lote no tiene animales para mover."
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

    /*
      PASO 1:
      Registrar el movimiento histórico.
    */
    const { error: errorMovimiento } =
      await supabase
        .from("gan_lote_movimientos")
        .insert({
          lote_id: lote.id,
          potrero_origen_id:
            lote.potrero_id || null,
          potrero_destino_id:
            form.potrero_destino_id,
          fecha: form.fecha,
          cantidad_animales: cantidad,
          motivo:
            form.motivo.trim() || null,
          observaciones:
            form.observaciones.trim() || null,
          registrado_por: user.id,
        });

    if (errorMovimiento) {
      setMensaje(
        `Error al registrar movimiento: ${errorMovimiento.message}`
      );
      setGuardando(false);
      return;
    }

    /*
      PASO 2:
      Actualizar el potrero actual del lote.
    */
    const { error: errorLote } =
      await supabase
        .from("gan_lotes_ganado")
        .update({
          potrero_id:
            form.potrero_destino_id,
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
      fecha:
        new Date().toISOString().split("T")[0],
      lote_id: "",
      potrero_origen_id: "",
      potrero_destino_id: "",
      cantidad_animales: "",
      motivo: "",
      observaciones: "",
    });

    setMostrarFormulario(false);

    setMensaje(
      "Movimiento registrado correctamente."
    );

    await Promise.all([
      cargarLotes(fincaId),
      cargarMovimientos(fincaId),
    ]);

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
        Cargando movimientos...
      </main>
    );
  }

  return (
    <main style={estilos.pagina}>
      <aside style={estilos.sidebar}>
        <div style={estilos.logo}>
          <div style={estilos.logoIcono}>
            🐂
          </div>

          <div>
            <strong>Ganadería</strong>
            <br />
            <strong>Tavera</strong>
          </div>
        </div>

        <MenuItem
          texto="Dashboard"
          icono="▦"
          ruta="/dashboard"
        />

        <MenuItem
          texto="Ganado"
          icono="🐄"
        />

        <MenuItem
          texto="Lotes"
          icono="▣"
          ruta="/lotes"
        />

        <MenuItem
          texto="Potreros"
          icono="🌱"
          ruta="/potreros"
        />

        <MenuItem
          texto="Nacimientos"
          icono="🐮"
          ruta="/nacimientos"
        />

        <MenuItem
          texto="Pesajes"
          icono="⚖"
          ruta="/pesajes"
        />

        <MenuItem
          texto="Movimientos"
          icono="↔"
          activo
        />

        <MenuItem
          texto="Sanidad"
          icono="♥"
        />

        <MenuItem
          texto="Feedlot"
          icono="🌾"
        />

        <MenuItem
          texto="Maquinaria"
          icono="🚜"
        />

        <MenuItem
          texto="Personal"
          icono="👥"
        />

        <MenuItem
          texto="Gastos"
          icono="$"
        />

        <MenuItem
          texto="Reportes"
          icono="▤"
        />
      </aside>

      <section style={estilos.contenido}>
        <header style={estilos.header}>
          <div>
            <h1 style={estilos.titulo}>
              Movimientos
            </h1>

            <p style={estilos.subtitulo}>
              Traslado de lotes entre potreros
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
              : "+ Registrar movimiento"}
          </button>
        </header>

        {mensaje && (
          <div
            style={{
              ...estilos.mensaje,
              background:
                mensaje.includes(
                  "correctamente"
                )
                  ? "#edf8f0"
                  : "#fff1f1",
              color:
                mensaje.includes(
                  "correctamente"
                )
                  ? "#176b3a"
                  : "#b42318",
            }}
          >
            {mensaje}
          </div>
        )}

        <div style={estilos.resumenGrid}>
          <Tarjeta
            titulo="Movimientos"
            valor={String(
              movimientos.length
            )}
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
            style={estilos.formulario}
          >
            <h2 style={estilos.formTitulo}>
              Registrar movimiento
            </h2>

            <div style={estilos.aviso}>
              Por ahora este módulo mueve el
              lote completo. Los movimientos
              parciales se habilitarán mediante
              división de lotes.
            </div>

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
                      {lote.cantidad_total}{" "}
                      animales
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
                  value={
                    form.cantidad_animales
                  }
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
                      ? nombrePotrero(
                          form.potrero_origen_id
                        )
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
                  value={
                    form.potrero_destino_id
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      potrero_destino_id:
                        e.target.value,
                    })
                  }
                  style={estilos.input}
                  required
                >
                  <option value="">
                    Seleccionar destino
                  </option>

                  {potreros
                    .filter(
                      (potrero) =>
                        potrero.id !==
                        form.potrero_origen_id
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
                <label style={estilos.label}>
                  Motivo
                </label>

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
                  <option value="">
                    Seleccionar motivo
                  </option>

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

                  <option value="Otro">
                    Otro
                  </option>
                </select>
              </div>
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
                placeholder="Información adicional del traslado..."
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
                style={
                  estilos.botonSecundario
                }
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
                  opacity: guardando
                    ? 0.7
                    : 1,
                }}
              >
                {guardando
                  ? "Guardando..."
                  : "Guardar movimiento"}
              </button>
            </div>
          </form>
        )}

        <div style={estilos.tablaPanel}>
          <div style={estilos.tablaHeader}>
            <h2 style={estilos.tablaTitulo}>
              Historial de movimientos
            </h2>

            <span
              style={estilos.tablaSubtitulo}
            >
              {movimientos.length} registro
              {movimientos.length === 1
                ? ""
                : "s"}
            </span>
          </div>

          {movimientos.length === 0 ? (
            <div style={estilos.vacio}>
              <div
                style={{ fontSize: "38px" }}
              >
                ↔
              </div>

              <strong>
                No hay movimientos registrados
              </strong>

              <span>
                Registra el primer traslado de
                ganado entre potreros.
              </span>
            </div>
          ) : (
            <div
              style={{ overflowX: "auto" }}
            >
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
                      Animales
                    </th>

                    <th style={estilos.th}>
                      Origen
                    </th>

                    <th style={estilos.th}>
                      Destino
                    </th>

                    <th style={estilos.th}>
                      Motivo
                    </th>

                    <th style={estilos.th}>
                      Observaciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {movimientos.map(
                    (movimiento) => (
                      <tr
                        key={movimiento.id}
                      >
                        <td
                          style={estilos.td}
                        >
                          {formatearFecha(
                            movimiento.fecha
                          )}
                        </td>

                        <td
                          style={estilos.td}
                        >
                          <strong>
                            {movimiento
                              .gan_lotes_ganado
                              ?.nombre || "—"}
                          </strong>
                        </td>

                        <td
                          style={estilos.td}
                        >
                          {
                            movimiento.cantidad_animales
                          }
                        </td>

                        <td
                          style={estilos.td}
                        >
                          {nombrePotrero(
                            movimiento.potrero_origen_id
                          )}
                        </td>

                        <td
                          style={estilos.td}
                        >
                          <strong
                            style={{
                              color:
                                "#176b3a",
                            }}
                          >
                            {nombrePotrero(
                              movimiento.potrero_destino_id
                            )}
                          </strong>
                        </td>

                        <td
                          style={estilos.td}
                        >
                          {movimiento.motivo ||
                            "—"}
                        </td>

                        <td
                          style={estilos.td}
                        >
                          {movimiento.observaciones ||
                            "—"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function MenuItem({
  texto,
  icono,
  ruta,
  activo = false,
}: {
  texto: string;
  icono: string;
  ruta?: string;
  activo?: boolean;
}) {
  return (
    <div
      onClick={() => {
        if (ruta) {
          window.location.href = ruta;
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "11px 12px",
        marginBottom: "5px",
        borderRadius: "9px",
        background: activo
          ? "rgba(255,255,255,0.14)"
          : "transparent",
        cursor: ruta
          ? "pointer"
          : "default",
        fontSize: "14px",
        fontWeight: activo ? 700 : 500,
      }}
    >
      <span
        style={{
          width: "22px",
          textAlign: "center",
        }}
      >
        {icono}
      </span>

      {texto}
    </div>
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
      <span
        style={estilos.tarjetaTitulo}
      >
        {titulo}
      </span>

      <strong
        style={estilos.tarjetaValor}
      >
        {valor}
      </strong>

      <span
        style={estilos.tarjetaDetalle}
      >
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

  sidebar: {
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    width: "235px",
    background: "#103f28",
    color: "white",
    padding: "26px 18px",
    boxSizing: "border-box",
    overflowY: "auto",
  },

  logo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "32px",
    paddingLeft: "8px",
  },

  logoIcono: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "#1b7542",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
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
    margin: "0 0 14px",
    color: "#244b34",
    fontSize: "18px",
  },

  aviso: {
    background: "#f4f8f5",
    border: "1px solid #dce8df",
    borderRadius: "9px",
    padding: "11px 13px",
    marginBottom: "20px",
    color: "#63766a",
    fontSize: "12px",
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
  },

  td: {
    padding: "14px 16px",
    borderBottom: "1px solid #edf1ee",
    color: "#45594c",
  },

  vacio: {
    minHeight: "250px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    color: "#829087",
    fontSize: "13px",
  },
};
