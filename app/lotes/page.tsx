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
  categoria: string | null;
  raza: string | null;
  cantidad_total: number;
  cantidad_machos: number;
  cantidad_hembras: number;
  peso_promedio: number | null;
  fecha_ingreso: string | null;
  origen: string | null;
  estado: string;
  potrero_id: string | null;
  gan_potreros?: {
    nombre: string;
  } | null;
};

export default function LotesPage() {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [fincaId, setFincaId] = useState("");
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [potreros, setPotreros] = useState<Potrero[]>([]);

  const [form, setForm] = useState({
    nombre: "",
    categoria: "",
    raza: "",
    cantidad_total: "",
    cantidad_machos: "",
    cantidad_hembras: "",
    peso_promedio: "",
    fecha_ingreso: new Date().toISOString().split("T")[0],
    origen: "",
    potrero_id: "",
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

    await Promise.all([
      cargarLotes(usuario.finca_id),
      cargarPotreros(usuario.finca_id),
    ]);

    setLoading(false);
  };

  const cargarLotes = async (idFinca: string) => {
    const { data, error } = await supabase
      .from("gan_lotes_ganado")
      .select(`
        id,
        nombre,
        categoria,
        raza,
        cantidad_total,
        cantidad_machos,
        cantidad_hembras,
        peso_promedio,
        fecha_ingreso,
        origen,
        estado,
        potrero_id,
        gan_potreros (
          nombre
        )
      `)
      .eq("finca_id", idFinca)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMensaje(`Error al cargar lotes: ${error.message}`);
      return;
    }

    setLotes((data || []) as unknown as Lote[]);
  };

  const cargarPotreros = async (idFinca: string) => {
    const { data, error } = await supabase
      .from("gan_potreros")
      .select("id, nombre")
      .eq("finca_id", idFinca)
      .order("nombre");

    if (error) {
      console.error(error);
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

  const guardarLote = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    const total = Number(form.cantidad_total || 0);
    const machos = Number(form.cantidad_machos || 0);
    const hembras = Number(form.cantidad_hembras || 0);

    if (!form.nombre.trim()) {
      setMensaje("Debes colocar un nombre al lote.");
      return;
    }

    if (total <= 0) {
      setMensaje("La cantidad total debe ser mayor a cero.");
      return;
    }

    if (machos + hembras > total) {
      setMensaje(
        "La suma de machos y hembras no puede superar la cantidad total."
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

    const { data: loteCreado, error } = await supabase
      .from("gan_lotes_ganado")
      .insert({
        finca_id: fincaId,
        nombre: form.nombre.trim(),
        categoria: form.categoria || null,
        raza: form.raza || null,
        cantidad_total: total,
        cantidad_machos: machos,
        cantidad_hembras: hembras,
        peso_promedio: form.peso_promedio
          ? Number(form.peso_promedio)
          : null,
        fecha_ingreso: form.fecha_ingreso || null,
        origen: form.origen || null,
        potrero_id: form.potrero_id || null,
        estado: "activo",
        observaciones: form.observaciones || null,
      })
      .select("id")
      .single();

    if (error) {
      setMensaje(`Error al guardar: ${error.message}`);
      setGuardando(false);
      return;
    }

    await supabase.from("gan_lote_eventos").insert({
      lote_id: loteCreado.id,
      fecha: form.fecha_ingreso || new Date().toISOString().split("T")[0],
      tipo: "creacion",
      cantidad: total,
      descripcion: "Creación inicial del lote",
      registrado_por: user.id,
    });

    setForm({
      nombre: "",
      categoria: "",
      raza: "",
      cantidad_total: "",
      cantidad_machos: "",
      cantidad_hembras: "",
      peso_promedio: "",
      fecha_ingreso: new Date().toISOString().split("T")[0],
      origen: "",
      potrero_id: "",
      observaciones: "",
    });

    setMostrarFormulario(false);
    setMensaje("Lote registrado correctamente.");
    await cargarLotes(fincaId);
    setGuardando(false);
  };

  const totalGanado = lotes
    .filter((lote) => lote.estado === "activo" || lote.estado === "feedlot")
    .reduce((suma, lote) => suma + Number(lote.cantidad_total || 0), 0);

  if (loading) {
    return (
      <main style={estilos.cargando}>
        Cargando lotes...
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
        <MenuItem texto="Lotes" icono="▣" activo />
        <MenuItem texto="Potreros" icono="🌱" />
        <MenuItem texto="Nacimientos" icono="🐮" />
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
            <h1 style={estilos.titulo}>Lotes de ganado</h1>
            <p style={estilos.subtitulo}>
              Administración de grupos y existencias de ganado
            </p>
          </div>

          <button
            style={estilos.botonPrincipal}
            onClick={() => {
              setMensaje("");
              setMostrarFormulario(!mostrarFormulario);
            }}
          >
            {mostrarFormulario ? "Cancelar" : "+ Nuevo lote"}
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
            titulo="Ganado total"
            valor={totalGanado.toLocaleString()}
            detalle="Animales en lotes activos"
          />

          <Tarjeta
            titulo="Lotes activos"
            valor={String(
              lotes.filter(
                (lote) =>
                  lote.estado === "activo" ||
                  lote.estado === "feedlot"
              ).length
            )}
            detalle="Grupos registrados"
          />

          <Tarjeta
            titulo="Potreros disponibles"
            valor={String(potreros.length)}
            detalle="Potreros registrados"
          />
        </div>

        {mostrarFormulario && (
          <form
            onSubmit={guardarLote}
            style={estilos.formulario}
          >
            <h2 style={estilos.formTitulo}>Registrar nuevo lote</h2>

            <div style={estilos.formGrid}>
              <Campo
                label="Nombre del lote *"
                value={form.nombre}
                onChange={(v) => actualizarCampo("nombre", v)}
                placeholder="Ej. Novillos Lote 1"
              />

              <Campo
                label="Categoría"
                value={form.categoria}
                onChange={(v) => actualizarCampo("categoria", v)}
                placeholder="Ej. Novillos"
              />

              <Campo
                label="Raza"
                value={form.raza}
                onChange={(v) => actualizarCampo("raza", v)}
                placeholder="Ej. Nelore"
              />

              <Campo
                label="Cantidad total *"
                type="number"
                value={form.cantidad_total}
                onChange={(v) =>
                  actualizarCampo("cantidad_total", v)
                }
              />

              <Campo
                label="Machos"
                type="number"
                value={form.cantidad_machos}
                onChange={(v) =>
                  actualizarCampo("cantidad_machos", v)
                }
              />

              <Campo
                label="Hembras"
                type="number"
                value={form.cantidad_hembras}
                onChange={(v) =>
                  actualizarCampo("cantidad_hembras", v)
                }
              />

              <Campo
                label="Peso promedio (kg)"
                type="number"
                value={form.peso_promedio}
                onChange={(v) =>
                  actualizarCampo("peso_promedio", v)
                }
              />

              <Campo
                label="Fecha de ingreso"
                type="date"
                value={form.fecha_ingreso}
                onChange={(v) =>
                  actualizarCampo("fecha_ingreso", v)
                }
              />

              <Campo
                label="Origen"
                value={form.origen}
                onChange={(v) => actualizarCampo("origen", v)}
                placeholder="Ej. Nacidos en finca"
              />

              <div>
                <label style={estilos.label}>Potrero</label>
                <select
                  value={form.potrero_id}
                  onChange={(e) =>
                    actualizarCampo("potrero_id", e.target.value)
                  }
                  style={estilos.input}
                >
                  <option value="">Sin asignar</option>

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
            </div>

            <div style={{ marginTop: "18px" }}>
              <label style={estilos.label}>Observaciones</label>

              <textarea
                value={form.observaciones}
                onChange={(e) =>
                  actualizarCampo(
                    "observaciones",
                    e.target.value
                  )
                }
                placeholder="Información adicional del lote..."
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
                {guardando ? "Guardando..." : "Guardar lote"}
              </button>
            </div>
          </form>
        )}

        <div style={estilos.tablaPanel}>
          <div style={estilos.tablaHeader}>
            <div>
              <h2 style={estilos.tablaTitulo}>
                Lotes registrados
              </h2>

              <span style={estilos.tablaSubtitulo}>
                {lotes.length} lote
                {lotes.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {lotes.length === 0 ? (
            <div style={estilos.vacio}>
              <div style={{ fontSize: "38px" }}>🐄</div>
              <strong>No hay lotes registrados</strong>
              <span>
                Utiliza “Nuevo lote” para registrar el primero.
              </span>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={estilos.tabla}>
                <thead>
                  <tr>
                    <th style={estilos.th}>Lote</th>
                    <th style={estilos.th}>Categoría</th>
                    <th style={estilos.th}>Raza</th>
                    <th style={estilos.th}>Cantidad</th>
                    <th style={estilos.th}>M / H</th>
                    <th style={estilos.th}>Peso prom.</th>
                    <th style={estilos.th}>Potrero</th>
                    <th style={estilos.th}>Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {lotes.map((lote) => (
                    <tr key={lote.id}>
                      <td style={estilos.td}>
                        <strong>{lote.nombre}</strong>
                      </td>

                      <td style={estilos.td}>
                        {lote.categoria || "—"}
                      </td>

                      <td style={estilos.td}>
                        {lote.raza || "—"}
                      </td>

                      <td style={estilos.td}>
                        {lote.cantidad_total}
                      </td>

                      <td style={estilos.td}>
                        {lote.cantidad_machos} /{" "}
                        {lote.cantidad_hembras}
                      </td>

                      <td style={estilos.td}>
                        {lote.peso_promedio
                          ? `${lote.peso_promedio} kg`
                          : "—"}
                      </td>

                      <td style={estilos.td}>
                        {lote.gan_potreros?.nombre || "Sin asignar"}
                      </td>

                      <td style={estilos.td}>
                        <span style={estilos.estado}>
                          {lote.estado}
                        </span>
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
      <span style={{ width: "22px", textAlign: "center" }}>
        {icono}
      </span>
      {texto}
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={estilos.label}>{label}</label>

      <input
        type={type}
        value={value}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "any" : undefined}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={estilos.input}
      />
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
      <span style={estilos.tarjetaTitulo}>{titulo}</span>
      <strong style={estilos.tarjetaValor}>{valor}</strong>
      <span style={estilos.tarjetaDetalle}>{detalle}</span>
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
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
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
    boxShadow: "0 5px 18px rgba(26,72,45,0.04)",
  },

  formTitulo: {
    margin: "0 0 22px",
    color: "#244b34",
    fontSize: "18px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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
    whiteSpace: "nowrap",
  },

  estado: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: "20px",
    background: "#edf8f0",
    color: "#176b3a",
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
