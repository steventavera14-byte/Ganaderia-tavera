"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Lote = {
  id: string;
  nombre: string;
  potrero_id: string | null;
};

type Potrero = {
  id: string;
  nombre: string;
};

type RegistroNacimiento = {
  id: string;
  lote_id: string;
  fecha: string;
  cantidad: number;
  sexo: string | null;
  descripcion: string | null;
  gan_lotes_ganado?: {
    nombre: string;
  } | null;
};

export default function NacimientosPage() {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [fincaId, setFincaId] = useState("");
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [potreros, setPotreros] = useState<Potrero[]>([]);
  const [registros, setRegistros] = useState<RegistroNacimiento[]>([]);

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split("T")[0],
    lote_id: "",
    potrero_id: "",
    sexo: "macho",
    cantidad: "1",
    peso_promedio: "",
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
      cargarNacimientos(usuario.finca_id),
    ]);

    setLoading(false);
  };

  const cargarLotes = async (idFinca: string) => {
    const { data } = await supabase
      .from("gan_lotes_ganado")
      .select("id, nombre, potrero_id")
      .eq("finca_id", idFinca)
      .in("estado", ["activo", "feedlot"])
      .order("nombre");

    setLotes(data || []);
  };

  const cargarPotreros = async (idFinca: string) => {
    const { data } = await supabase
      .from("gan_potreros")
      .select("id, nombre")
      .eq("finca_id", idFinca)
      .order("nombre");

    setPotreros(data || []);
  };

  const cargarNacimientos = async (idFinca: string) => {
    const { data, error } = await supabase
      .from("gan_lote_eventos")
      .select(`
        id,
        lote_id,
        fecha,
        cantidad,
        sexo,
        descripcion,
        gan_lotes_ganado!inner (
          nombre,
          finca_id
        )
      `)
      .eq("tipo", "nacimiento")
      .eq("gan_lotes_ganado.finca_id", idFinca)
      .order("fecha", { ascending: false });

    if (error) {
      setMensaje(`Error al cargar nacimientos: ${error.message}`);
      return;
    }

    setRegistros(
      (data || []) as unknown as RegistroNacimiento[]
    );
  };

  const seleccionarLote = (loteId: string) => {
    const lote = lotes.find((item) => item.id === loteId);

    setForm((anterior) => ({
      ...anterior,
      lote_id: loteId,
      potrero_id: lote?.potrero_id || "",
    }));
  };

  const guardarNacimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    if (!form.lote_id) {
      setMensaje("Debes seleccionar un lote.");
      return;
    }

    const cantidad = Number(form.cantidad);

    if (!cantidad || cantidad <= 0) {
      setMensaje("La cantidad debe ser mayor a cero.");
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

    const textoPeso = form.peso_promedio
      ? `Peso promedio al nacimiento: ${form.peso_promedio} kg.`
      : "";

    const descripcion = [
      textoPeso,
      form.observaciones.trim(),
    ]
      .filter(Boolean)
      .join(" ");

    const { error } = await supabase
      .from("gan_lote_eventos")
      .insert({
        lote_id: form.lote_id,
        fecha: form.fecha,
        tipo: "nacimiento",
        cantidad,
        sexo: form.sexo,
        descripcion: descripcion || null,
        registrado_por: user.id,
      });

    if (error) {
      setMensaje(`Error al guardar: ${error.message}`);
      setGuardando(false);
      return;
    }

    setForm({
      fecha: new Date().toISOString().split("T")[0],
      lote_id: "",
      potrero_id: "",
      sexo: "macho",
      cantidad: "1",
      peso_promedio: "",
      observaciones: "",
    });

    setMostrarFormulario(false);
    setMensaje("Nacimiento registrado correctamente.");

    await cargarNacimientos(fincaId);

    setGuardando(false);
  };

  const totalMachos = registros
    .filter((r) => r.sexo === "macho")
    .reduce((suma, r) => suma + Number(r.cantidad || 0), 0);

  const totalHembras = registros
    .filter((r) => r.sexo === "hembra")
    .reduce((suma, r) => suma + Number(r.cantidad || 0), 0);

  const totalNacimientos = registros.reduce(
    (suma, r) => suma + Number(r.cantidad || 0),
    0
  );

  if (loading) {
    return (
      <main style={estilos.cargando}>
        Cargando nacimientos...
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

        <MenuItem texto="Dashboard" icono="▦" ruta="/dashboard" />
        <MenuItem texto="Ganado" icono="🐄" />
        <MenuItem texto="Lotes" icono="▣" ruta="/lotes" />
        <MenuItem texto="Potreros" icono="🌱" ruta="/potreros" />
        <MenuItem texto="Nacimientos" icono="🐮" activo />
        <MenuItem texto="Pesajes" icono="⚖" />
        <MenuItem texto="Movimientos" icono="↔" />
        <MenuItem texto="Sanidad" icono="♥" />
        <MenuItem texto="Feedlot" icono="🌾" />
        <MenuItem texto="Maquinaria" icono="🚜" />
        <MenuItem texto="Personal" icono="👥" />
        <MenuItem texto="Gastos" icono="$" />
        <MenuItem texto="Reportes" icono="▤" />
      </aside>

      <section style={estilos.contenido}>
        <header style={estilos.header}>
          <div>
            <h1 style={estilos.titulo}>Nacimientos</h1>
            <p style={estilos.subtitulo}>
              Registro y control de nacimientos por lote
            </p>
          </div>

          <button
            style={estilos.botonPrincipal}
            onClick={() => {
              setMensaje("");
              setMostrarFormulario(!mostrarFormulario);
            }}
          >
            {mostrarFormulario
              ? "Cancelar"
              : "+ Registrar nacimiento"}
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

        <div style={estilos.resumenGrid}>
          <Tarjeta
            titulo="Nacimientos"
            valor={String(totalNacimientos)}
            detalle="Total registrado"
          />

          <Tarjeta
            titulo="Machos"
            valor={String(totalMachos)}
            detalle="Terneros machos"
          />

          <Tarjeta
            titulo="Hembras"
            valor={String(totalHembras)}
            detalle="Terneras hembras"
          />
        </div>

        {mostrarFormulario && (
          <form
            onSubmit={guardarNacimiento}
            style={estilos.formulario}
          >
            <h2 style={estilos.formTitulo}>
              Registrar nacimiento
            </h2>

            <div style={estilos.formGrid}>
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
                >
                  <option value="">
                    Seleccionar lote
                  </option>

                  {lotes.map((lote) => (
                    <option key={lote.id} value={lote.id}>
                      {lote.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={estilos.label}>Potrero</label>

                <select
                  value={form.potrero_id}
                  disabled
                  style={{
                    ...estilos.input,
                    background: "#f3f6f4",
                  }}
                >
                  <option value="">
                    Sin asignar
                  </option>

                  {potreros.map((potrero) => (
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
                <label style={estilos.label}>Sexo *</label>

                <select
                  value={form.sexo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sexo: e.target.value,
                    })
                  }
                  style={estilos.input}
                >
                  <option value="macho">Macho</option>
                  <option value="hembra">Hembra</option>
                </select>
              </div>

              <div>
                <label style={estilos.label}>Cantidad *</label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.cantidad}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cantidad: e.target.value,
                    })
                  }
                  style={estilos.input}
                />
              </div>

              <div>
                <label style={estilos.label}>
                  Peso promedio al nacimiento (kg)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.peso_promedio}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      peso_promedio: e.target.value,
                    })
                  }
                  placeholder="Ej. 32"
                  style={estilos.input}
                />
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
                    observaciones: e.target.value,
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
                onClick={() => setMostrarFormulario(false)}
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
                  : "Guardar nacimiento"}
              </button>
            </div>
          </form>
        )}

        <div style={estilos.tablaPanel}>
          <div style={estilos.tablaHeader}>
            <h2 style={estilos.tablaTitulo}>
              Nacimientos registrados
            </h2>

            <span style={estilos.tablaSubtitulo}>
              {registros.length} registro
              {registros.length === 1 ? "" : "s"}
            </span>
          </div>

          {registros.length === 0 ? (
            <div style={estilos.vacio}>
              <div style={{ fontSize: "38px" }}>🐮</div>
              <strong>
                No hay nacimientos registrados
              </strong>
              <span>
                Utiliza “Registrar nacimiento” para comenzar.
              </span>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={estilos.tabla}>
                <thead>
                  <tr>
                    <th style={estilos.th}>Fecha</th>
                    <th style={estilos.th}>Lote</th>
                    <th style={estilos.th}>Sexo</th>
                    <th style={estilos.th}>Cantidad</th>
                    <th style={estilos.th}>Detalle</th>
                  </tr>
                </thead>

                <tbody>
                  {registros.map((registro) => (
                    <tr key={registro.id}>
                      <td style={estilos.td}>
                        {registro.fecha}
                      </td>

                      <td style={estilos.td}>
                        <strong>
                          {registro.gan_lotes_ganado?.nombre ||
                            "—"}
                        </strong>
                      </td>

                      <td style={estilos.td}>
                        <span
                          style={{
                            ...estilos.estado,
                            background:
                              registro.sexo === "hembra"
                                ? "#fff1f5"
                                : "#eef4ff",
                            color:
                              registro.sexo === "hembra"
                                ? "#a83b64"
                                : "#315b9b",
                          }}
                        >
                          {registro.sexo || "—"}
                        </span>
                      </td>

                      <td style={estilos.td}>
                        {registro.cantidad}
                      </td>

                      <td style={estilos.td}>
                        {registro.descripcion || "—"}
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
        if (ruta) window.location.href = ruta;
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
        cursor: ruta ? "pointer" : "default",
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

  estado: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "capitalize",
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
