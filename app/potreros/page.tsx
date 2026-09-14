"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Potrero = {
  id: string;
  nombre: string;
  hectareas: number | null;
  estado: string;
  observaciones: string | null;
  created_at: string;
};

export default function PotrerosPage() {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [fincaId, setFincaId] = useState("");
  const [potreros, setPotreros] = useState<Potrero[]>([]);

  const [form, setForm] = useState({
    nombre: "",
    hectareas: "",
    estado: "disponible",
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

    const { data: usuario, error: errorUsuario } = await supabase
      .from("gan_usuarios")
      .select("finca_id, nombre, rol")
      .eq("user_id", user.id)
      .eq("activo", true)
      .maybeSingle();

    if (errorUsuario || !usuario) {
      await supabase.auth.signOut();
      window.location.href = "/";
      return;
    }

    setFincaId(usuario.finca_id);

    await cargarPotreros(usuario.finca_id);

    setLoading(false);
  };

  const cargarPotreros = async (idFinca: string) => {
    const { data, error } = await supabase
      .from("gan_potreros")
      .select(
        "id, nombre, hectareas, estado, observaciones, created_at"
      )
      .eq("finca_id", idFinca)
      .order("nombre", { ascending: true });

    if (error) {
      setMensaje(`Error al cargar potreros: ${error.message}`);
      return;
    }

    setPotreros(data || []);
  };

  const actualizarCampo = (
    campo: keyof typeof form,
    valor: string
  ) => {
    setForm((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  };

  const guardarPotrero = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    if (!form.nombre.trim()) {
      setMensaje("Debes colocar un nombre al potrero.");
      return;
    }

    if (
      form.hectareas &&
      Number(form.hectareas) <= 0
    ) {
      setMensaje("Las hectáreas deben ser mayores a cero.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase
      .from("gan_potreros")
      .insert({
        finca_id: fincaId,
        nombre: form.nombre.trim(),
        hectareas: form.hectareas
          ? Number(form.hectareas)
          : null,
        estado: form.estado,
        observaciones: form.observaciones.trim() || null,
      });

    if (error) {
      setMensaje(`Error al guardar: ${error.message}`);
      setGuardando(false);
      return;
    }

    setForm({
      nombre: "",
      hectareas: "",
      estado: "disponible",
      observaciones: "",
    });

    setMostrarFormulario(false);
    setMensaje("Potrero registrado correctamente.");

    await cargarPotreros(fincaId);

    setGuardando(false);
  };

  const totalHectareas = potreros.reduce(
    (suma, potrero) =>
      suma + Number(potrero.hectareas || 0),
    0
  );

  const ocupados = potreros.filter(
    (potrero) => potrero.estado === "ocupado"
  ).length;

  const disponibles = potreros.filter(
    (potrero) => potrero.estado === "disponible"
  ).length;

  if (loading) {
    return (
      <main style={estilos.cargando}>
        Cargando potreros...
      </main>
    );
  }

  return (
    <main style={estilos.pagina}>
      <aside style={estilos.sidebar}>
        <div style={estilos.logo}>
          <div style={estilos.logoIcono}>🐂</div>

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
          activo
        />

        <MenuItem
          texto="Nacimientos"
          icono="🐮"
        />

        <MenuItem
          texto="Pesajes"
          icono="⚖"
        />

        <MenuItem
          texto="Movimientos"
          icono="↔"
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
              Potreros
            </h1>

            <p style={estilos.subtitulo}>
              Administración de potreros y superficie ganadera
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
              : "+ Nuevo potrero"}
          </button>
        </header>

        {mensaje && (
          <div
            style={{
              ...estilos.mensaje,
              background: mensaje.includes(
                "correctamente"
              )
                ? "#edf8f0"
                : "#fff1f1",
              color: mensaje.includes(
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
            titulo="Potreros"
            valor={String(potreros.length)}
            detalle="Total registrados"
          />

          <Tarjeta
            titulo="Superficie"
            valor={`${totalHectareas.toLocaleString()} ha`}
            detalle="Hectáreas registradas"
          />

          <Tarjeta
            titulo="Ocupados"
            valor={String(ocupados)}
            detalle="Con ganado"
          />

          <Tarjeta
            titulo="Disponibles"
            valor={String(disponibles)}
            detalle="Disponibles para ganado"
          />
        </div>

        {mostrarFormulario && (
          <form
            onSubmit={guardarPotrero}
            style={estilos.formulario}
          >
            <h2 style={estilos.formTitulo}>
              Registrar nuevo potrero
            </h2>

            <div style={estilos.formGrid}>
              <div>
                <label style={estilos.label}>
                  Nombre del potrero *
                </label>

                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) =>
                    actualizarCampo(
                      "nombre",
                      e.target.value
                    )
                  }
                  placeholder="Ej. Potrero 1"
                  style={estilos.input}
                />
              </div>

              <div>
                <label style={estilos.label}>
                  Superficie (ha)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.hectareas}
                  onChange={(e) =>
                    actualizarCampo(
                      "hectareas",
                      e.target.value
                    )
                  }
                  placeholder="Ej. 25"
                  style={estilos.input}
                />
              </div>

              <div>
                <label style={estilos.label}>
                  Estado
                </label>

                <select
                  value={form.estado}
                  onChange={(e) =>
                    actualizarCampo(
                      "estado",
                      e.target.value
                    )
                  }
                  style={estilos.input}
                >
                  <option value="disponible">
                    Disponible
                  </option>

                  <option value="ocupado">
                    Ocupado
                  </option>

                  <option value="descanso">
                    Descanso
                  </option>

                  <option value="mantenimiento">
                    Mantenimiento
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
                  actualizarCampo(
                    "observaciones",
                    e.target.value
                  )
                }
                placeholder="Información adicional del potrero..."
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
                  : "Guardar potrero"}
              </button>
            </div>
          </form>
        )}

        <div style={estilos.tablaPanel}>
          <div style={estilos.tablaHeader}>
            <div>
              <h2 style={estilos.tablaTitulo}>
                Potreros registrados
              </h2>

              <span style={estilos.tablaSubtitulo}>
                {potreros.length} potrero
                {potreros.length === 1
                  ? ""
                  : "s"}
              </span>
            </div>
          </div>

          {potreros.length === 0 ? (
            <div style={estilos.vacio}>
              <div style={{ fontSize: "38px" }}>
                🌱
              </div>

              <strong>
                No hay potreros registrados
              </strong>

              <span>
                Utiliza “Nuevo potrero” para registrar el primero.
              </span>
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
              }}
            >
              <table style={estilos.tabla}>
                <thead>
                  <tr>
                    <th style={estilos.th}>
                      Potrero
                    </th>

                    <th style={estilos.th}>
                      Superficie
                    </th>

                    <th style={estilos.th}>
                      Estado
                    </th>

                    <th style={estilos.th}>
                      Observaciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {potreros.map((potrero) => (
                    <tr key={potrero.id}>
                      <td style={estilos.td}>
                        <strong>
                          {potrero.nombre}
                        </strong>
                      </td>

                      <td style={estilos.td}>
                        {potrero.hectareas
                          ? `${Number(
                              potrero.hectareas
                            ).toLocaleString()} ha`
                          : "—"}
                      </td>

                      <td style={estilos.td}>
                        <Estado
                          estado={
                            potrero.estado
                          }
                        />
                      </td>

                      <td style={estilos.td}>
                        {potrero.observaciones ||
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

function Estado({
  estado,
}: {
  estado: string;
}) {
  let fondo = "#edf8f0";
  let color = "#176b3a";

  if (estado === "ocupado") {
    fondo = "#eef4ff";
    color = "#315b9b";
  }

  if (estado === "descanso") {
    fondo = "#fff7e8";
    color = "#996515";
  }

  if (estado === "mantenimiento") {
    fondo = "#fff1f1";
    color = "#b42318";
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 10px",
        borderRadius: "20px",
        background: fondo,
        color,
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "capitalize",
      }}
    >
      {estado}
    </span>
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
      "repeat(4, minmax(0, 1fr))",
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
    boxShadow:
      "0 5px 18px rgba(26,72,45,0.04)",
  },

  formTitulo: {
    margin: "0 0 22px",
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
