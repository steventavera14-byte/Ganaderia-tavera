"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../../lib/supabase";

const FINCA_ID = "89057e73-c093-4a83-b63c-153b9a33ca3a";

type CentroCosto = {
  id: string;
  nombre: string;
  tipo: string;
  activo: boolean;
};

type Proveedor = {
  id: string;
  nombre: string;
  activo: boolean;
};

type Gasto = {
  id: string;
  fecha: string;
  descripcion: string;
  categoria: string;
  centro_costo_id: string | null;
  proveedor_id: string | null;
  monto: number;
  moneda: string;
  metodo_pago: string | null;
  numero_documento: string | null;
  observaciones: string | null;
  created_at: string;
};

const categorias = [
  ["ganado", "Ganado"],
  ["alimentacion", "Alimentación"],
  ["potreros", "Potreros"],
  ["maquinaria", "Maquinaria"],
  ["personal", "Personal"],
  ["sanidad", "Sanidad"],
  ["infraestructura", "Infraestructura"],
  ["administracion", "Administración"],
  ["combustible", "Combustible"],
  ["impuestos", "Impuestos"],
  ["servicios", "Servicios"],
  ["transporte", "Transporte"],
  ["feedlot", "Feedlot"],
  ["otro", "Otro"],
];

const hoyLocal = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const mesActual = () => hoyLocal().slice(0, 7);

const formatoNumero = (valor: number) =>
  new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);

const etiquetaCategoria = (valor: string) =>
  categorias.find(([id]) => id === valor)?.[1] ?? valor;

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [centros, setCentros] = useState<CentroCosto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [esMovil, setEsMovil] = useState(false);

  const [fecha, setFecha] = useState(hoyLocal());
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("ganado");
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState("BOB");
  const [centroCostoId, setCentroCostoId] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [filtroMes, setFiltroMes] = useState(mesActual());
  const [filtroMoneda, setFiltroMoneda] = useState("TODAS");
  const [filtroCategoria, setFiltroCategoria] = useState("TODAS");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const revisar = () => setEsMovil(window.innerWidth <= 820);
    revisar();
    window.addEventListener("resize", revisar);
    return () => window.removeEventListener("resize", revisar);
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    setError("");

    const [gastosRes, centrosRes, proveedoresRes] = await Promise.all([
      supabase
        .from("gan_gastos")
        .select("*")
        .eq("finca_id", FINCA_ID)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("gan_centros_costos")
        .select("id,nombre,tipo,activo")
        .eq("finca_id", FINCA_ID)
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("gan_proveedores")
        .select("id,nombre,activo")
        .eq("finca_id", FINCA_ID)
        .eq("activo", true)
        .order("nombre"),
    ]);

    if (gastosRes.error || centrosRes.error || proveedoresRes.error) {
      setError(
        gastosRes.error?.message ||
          centrosRes.error?.message ||
          proveedoresRes.error?.message ||
          "No se pudieron cargar los datos."
      );
    } else {
      setGastos((gastosRes.data || []) as Gasto[]);
      setCentros((centrosRes.data || []) as CentroCosto[]);
      setProveedores((proveedoresRes.data || []) as Proveedor[]);
    }

    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const limpiarFormulario = () => {
    setFecha(hoyLocal());
    setDescripcion("");
    setCategoria("ganado");
    setMonto("");
    setMoneda("BOB");
    setCentroCostoId("");
    setProveedorId("");
    setMetodoPago("");
    setNumeroDocumento("");
    setObservaciones("");
  };

  const registrarGasto = async (e: FormEvent) => {
    e.preventDefault();
    setMensaje("");
    setError("");

    const montoNumero = Number(monto);

    if (!descripcion.trim()) {
      setError("Escribe una descripción.");
      return;
    }

    if (monto === "" || Number.isNaN(montoNumero) || montoNumero < 0) {
      setError("Ingresa un monto válido.");
      return;
    }

    setGuardando(true);

    const { error: rpcError } = await supabase.rpc("gan_registrar_gasto", {
      p_finca_id: FINCA_ID,
      p_fecha: fecha,
      p_descripcion: descripcion.trim(),
      p_categoria: categoria,
      p_monto: montoNumero,
      p_moneda: moneda,
      p_centro_costo_id: centroCostoId || null,
      p_proveedor_id: proveedorId || null,
      p_metodo_pago: metodoPago.trim() || null,
      p_numero_documento: numeroDocumento.trim() || null,
      p_observaciones: observaciones.trim() || null,
    });

    if (rpcError) {
      setError(rpcError.message);
      setGuardando(false);
      return;
    }

    limpiarFormulario();
    setMostrarFormulario(false);
    setMensaje("Gasto registrado correctamente.");
    await cargarDatos();
    setGuardando(false);
  };

  const gastosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return gastos.filter((gasto) => {
      const cumpleMes = !filtroMes || gasto.fecha.startsWith(filtroMes);
      const cumpleMoneda =
        filtroMoneda === "TODAS" || gasto.moneda === filtroMoneda;
      const cumpleCategoria =
        filtroCategoria === "TODAS" || gasto.categoria === filtroCategoria;
      const cumpleBusqueda =
        !texto ||
        gasto.descripcion.toLowerCase().includes(texto) ||
        (gasto.numero_documento || "").toLowerCase().includes(texto);

      return cumpleMes && cumpleMoneda && cumpleCategoria && cumpleBusqueda;
    });
  }, [gastos, filtroMes, filtroMoneda, filtroCategoria, busqueda]);

  const totalBOB = useMemo(
    () =>
      gastosFiltrados
        .filter((g) => g.moneda === "BOB")
        .reduce((suma, g) => suma + Number(g.monto), 0),
    [gastosFiltrados]
  );

  const totalUSD = useMemo(
    () =>
      gastosFiltrados
        .filter((g) => g.moneda === "USD")
        .reduce((suma, g) => suma + Number(g.monto), 0),
    [gastosFiltrados]
  );

  const nombreCentro = (id: string | null) =>
    id ? centros.find((c) => c.id === id)?.nombre || "—" : "—";

  const nombreProveedor = (id: string | null) =>
    id ? proveedores.find((p) => p.id === id)?.nombre || "—" : "—";

  return (
    <div style={estilos.pagina}>
      <Sidebar />

      <main
        style={{
          ...estilos.main,
          marginLeft: esMovil ? 0 : 235,
          paddingTop: esMovil ? 92 : 30,
          paddingLeft: esMovil ? 16 : 30,
          paddingRight: esMovil ? 16 : 30,
        }}
      >
        <div style={estilos.encabezado}>
          <div>
            <div style={estilos.eyebrow}>CONTROL FINANCIERO</div>
            <h1 style={estilos.titulo}>Gastos</h1>
            <p style={estilos.subtitulo}>
              Registra y controla los egresos de Ganadería Tavera.
            </p>
          </div>

          <button
            type="button"
            style={estilos.botonPrincipal}
            onClick={() => {
              setMensaje("");
              setError("");
              setMostrarFormulario((valor) => !valor);
            }}
          >
            {mostrarFormulario ? "Cerrar" : "+ Registrar gasto"}
          </button>
        </div>

        {mensaje && <div style={estilos.exito}>{mensaje}</div>}
        {error && <div style={estilos.error}>{error}</div>}

        {mostrarFormulario && (
          <section style={estilos.panel}>
            <div style={estilos.panelTitulo}>Nuevo gasto</div>

            <form onSubmit={registrarGasto}>
              <div style={estilos.formGrid}>
                <Campo label="Fecha">
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    style={estilos.input}
                    required
                  />
                </Campo>

                <Campo label="Descripción">
                  <input
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Ej. Compra de sal mineral"
                    style={estilos.input}
                    required
                  />
                </Campo>

                <Campo label="Categoría">
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    style={estilos.input}
                  >
                    {categorias.map(([valor, etiqueta]) => (
                      <option key={valor} value={valor}>
                        {etiqueta}
                      </option>
                    ))}
                  </select>
                </Campo>

                <Campo label="Centro de costo">
                  <select
                    value={centroCostoId}
                    onChange={(e) => setCentroCostoId(e.target.value)}
                    style={estilos.input}
                  >
                    <option value="">Sin asignar</option>
                    {centros.map((centro) => (
                      <option key={centro.id} value={centro.id}>
                        {centro.nombre}
                      </option>
                    ))}
                  </select>
                </Campo>

                <Campo label="Monto">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    style={estilos.input}
                    required
                  />
                </Campo>

                <Campo label="Moneda">
                  <select
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value)}
                    style={estilos.input}
                  >
                    <option value="BOB">Bs — Bolivianos</option>
                    <option value="USD">USD — Dólares</option>
                  </select>
                </Campo>

                <Campo label="Proveedor">
                  <select
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                    style={estilos.input}
                  >
                    <option value="">Sin proveedor</option>
                    {proveedores.map((proveedor) => (
                      <option key={proveedor.id} value={proveedor.id}>
                        {proveedor.nombre}
                      </option>
                    ))}
                  </select>
                </Campo>

                <Campo label="Método de pago">
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    style={estilos.input}
                  >
                    <option value="">Sin especificar</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="cheque">Cheque</option>
                    <option value="otro">Otro</option>
                  </select>
                </Campo>

                <Campo label="N.º documento / factura">
                  <input
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value)}
                    placeholder="Opcional"
                    style={estilos.input}
                  />
                </Campo>

                <Campo label="Observaciones">
                  <input
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Opcional"
                    style={estilos.input}
                  />
                </Campo>
              </div>

              <div style={estilos.accionesFormulario}>
                <button
                  type="button"
                  style={estilos.botonSecundario}
                  onClick={() => {
                    limpiarFormulario();
                    setMostrarFormulario(false);
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  style={{
                    ...estilos.botonPrincipal,
                    opacity: guardando ? 0.65 : 1,
                  }}
                >
                  {guardando ? "Guardando..." : "Guardar gasto"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section style={estilos.tarjetasGrid}>
          <TarjetaResumen
            titulo="Total en bolivianos"
            valor={`Bs ${formatoNumero(totalBOB)}`}
            detalle="Según los filtros seleccionados"
          />
          <TarjetaResumen
            titulo="Total en dólares"
            valor={`USD ${formatoNumero(totalUSD)}`}
            detalle="Sin conversión automática"
          />
          <TarjetaResumen
            titulo="Registros"
            valor={String(gastosFiltrados.length)}
            detalle="Gastos encontrados"
          />
        </section>

        <section style={estilos.panel}>
          <div style={estilos.panelCabecera}>
            <div>
              <div style={estilos.panelTitulo}>Historial de gastos</div>
              <div style={estilos.panelSubtitulo}>
                Los totales de Bs y USD se mantienen separados.
              </div>
            </div>
          </div>

          <div style={estilos.filtros}>
            <Campo label="Mes">
              <input
                type="month"
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
                style={estilos.input}
              />
            </Campo>

            <Campo label="Moneda">
              <select
                value={filtroMoneda}
                onChange={(e) => setFiltroMoneda(e.target.value)}
                style={estilos.input}
              >
                <option value="TODAS">Todas</option>
                <option value="BOB">Bolivianos</option>
                <option value="USD">Dólares</option>
              </select>
            </Campo>

            <Campo label="Categoría">
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                style={estilos.input}
              >
                <option value="TODAS">Todas</option>
                {categorias.map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Buscar">
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Descripción o documento"
                style={estilos.input}
              />
            </Campo>
          </div>

          {cargando ? (
            <div style={estilos.estadoVacio}>Cargando gastos...</div>
          ) : gastosFiltrados.length === 0 ? (
            <div style={estilos.estadoVacio}>
              No hay gastos para los filtros seleccionados.
            </div>
          ) : esMovil ? (
            <div style={estilos.listaMovil}>
              {gastosFiltrados.map((gasto) => (
                <div key={gasto.id} style={estilos.gastoMovil}>
                  <div style={estilos.gastoMovilCabecera}>
                    <div>
                      <div style={estilos.descripcionFuerte}>
                        {gasto.descripcion}
                      </div>
                      <div style={estilos.textoSuave}>{gasto.fecha}</div>
                    </div>

                    <div style={estilos.montoFuerte}>
                      {gasto.moneda === "BOB" ? "Bs" : "USD"}{" "}
                      {formatoNumero(Number(gasto.monto))}
                    </div>
                  </div>

                  <div style={estilos.chips}>
                    <span style={estilos.chip}>
                      {etiquetaCategoria(gasto.categoria)}
                    </span>
                    {nombreCentro(gasto.centro_costo_id) !== "—" && (
                      <span style={estilos.chipClaro}>
                        {nombreCentro(gasto.centro_costo_id)}
                      </span>
                    )}
                  </div>

                  <div style={estilos.detalleMovil}>
                    <span>Proveedor: {nombreProveedor(gasto.proveedor_id)}</span>
                    <span>Pago: {gasto.metodo_pago || "—"}</span>
                    <span>Documento: {gasto.numero_documento || "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={estilos.tablaContenedor}>
              <table style={estilos.tabla}>
                <thead>
                  <tr>
                    <th style={estilos.th}>Fecha</th>
                    <th style={estilos.th}>Descripción</th>
                    <th style={estilos.th}>Categoría</th>
                    <th style={estilos.th}>Centro</th>
                    <th style={estilos.th}>Proveedor</th>
                    <th style={estilos.th}>Pago</th>
                    <th style={{ ...estilos.th, textAlign: "right" }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {gastosFiltrados.map((gasto) => (
                    <tr key={gasto.id}>
                      <td style={estilos.td}>{gasto.fecha}</td>
                      <td style={estilos.td}>
                        <div style={estilos.descripcionFuerte}>
                          {gasto.descripcion}
                        </div>
                        {gasto.numero_documento && (
                          <div style={estilos.textoSuave}>
                            Doc. {gasto.numero_documento}
                          </div>
                        )}
                      </td>
                      <td style={estilos.td}>
                        {etiquetaCategoria(gasto.categoria)}
                      </td>
                      <td style={estilos.td}>
                        {nombreCentro(gasto.centro_costo_id)}
                      </td>
                      <td style={estilos.td}>
                        {nombreProveedor(gasto.proveedor_id)}
                      </td>
                      <td style={estilos.td}>{gasto.metodo_pago || "—"}</td>
                      <td
                        style={{
                          ...estilos.td,
                          textAlign: "right",
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {gasto.moneda === "BOB" ? "Bs" : "USD"}{" "}
                        {formatoNumero(Number(gasto.monto))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={estilos.campo}>
      <span style={estilos.label}>{label}</span>
      {children}
    </label>
  );
}

function TarjetaResumen({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: string;
  detalle: string;
}) {
  return (
    <div style={estilos.tarjetaResumen}>
      <div style={estilos.tarjetaTitulo}>{titulo}</div>
      <div style={estilos.tarjetaValor}>{valor}</div>
      <div style={estilos.tarjetaDetalle}>{detalle}</div>
    </div>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  pagina: {
    minHeight: "100vh",
    background: "#f4f7f5",
    color: "#173327",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  main: {
    minHeight: "100vh",
    boxSizing: "border-box",
    paddingBottom: "50px",
  },
  encabezado: {
    maxWidth: "1280px",
    margin: "0 auto 24px",
    display: "flex",
    gap: "18px",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  eyebrow: {
    color: "#1b7542",
    fontSize: "11px",
    fontWeight: 900,
    letterSpacing: "1.4px",
    marginBottom: "7px",
  },
  titulo: {
    margin: 0,
    fontSize: "30px",
    lineHeight: 1.1,
    color: "#123824",
  },
  subtitulo: {
    margin: "7px 0 0",
    color: "#6b7e73",
    fontSize: "14px",
  },
  botonPrincipal: {
    border: "none",
    borderRadius: "10px",
    background: "#176b3a",
    color: "white",
    padding: "12px 17px",
    minHeight: "43px",
    fontWeight: 800,
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  botonSecundario: {
    border: "1px solid #d6e0da",
    borderRadius: "10px",
    background: "white",
    color: "#294638",
    padding: "11px 16px",
    minHeight: "43px",
    fontWeight: 750,
    fontSize: "13px",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  exito: {
    maxWidth: "1280px",
    margin: "0 auto 16px",
    background: "#eaf7ef",
    border: "1px solid #bfe3cc",
    color: "#176b3a",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "13px",
    fontWeight: 700,
  },
  error: {
    maxWidth: "1280px",
    margin: "0 auto 16px",
    background: "#fff1f1",
    border: "1px solid #efc3c3",
    color: "#9b2c2c",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "13px",
    fontWeight: 700,
  },
  panel: {
    maxWidth: "1280px",
    margin: "0 auto 22px",
    background: "white",
    border: "1px solid #e2e9e5",
    borderRadius: "15px",
    padding: "20px",
    boxSizing: "border-box",
    boxShadow: "0 5px 18px rgba(20,58,38,0.04)",
  },
  panelCabecera: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "center",
    marginBottom: "18px",
  },
  panelTitulo: {
    fontSize: "16px",
    fontWeight: 850,
    color: "#173c28",
    marginBottom: "4px",
  },
  panelSubtitulo: {
    fontSize: "12px",
    color: "#819087",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "15px",
    marginTop: "16px",
  },
  campo: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    minWidth: 0,
  },
  label: {
    fontSize: "11px",
    fontWeight: 800,
    color: "#53685c",
  },
  input: {
    width: "100%",
    minHeight: "42px",
    boxSizing: "border-box",
    border: "1px solid #d7e1db",
    borderRadius: "9px",
    background: "#fff",
    padding: "9px 11px",
    color: "#173327",
    fontSize: "13px",
    fontFamily: "inherit",
    outline: "none",
  },
  accionesFormulario: {
    marginTop: "18px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    flexWrap: "wrap",
  },
  tarjetasGrid: {
    maxWidth: "1280px",
    margin: "0 auto 22px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },
  tarjetaResumen: {
    background: "white",
    border: "1px solid #e2e9e5",
    borderRadius: "14px",
    padding: "18px",
    boxShadow: "0 4px 14px rgba(20,58,38,0.035)",
  },
  tarjetaTitulo: {
    color: "#718178",
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".5px",
  },
  tarjetaValor: {
    marginTop: "8px",
    fontSize: "24px",
    lineHeight: 1.1,
    fontWeight: 900,
    color: "#153d28",
  },
  tarjetaDetalle: {
    marginTop: "7px",
    fontSize: "11px",
    color: "#91a098",
  },
  filtros: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
    gap: "12px",
    marginBottom: "18px",
  },
  tablaContenedor: {
    overflowX: "auto",
    border: "1px solid #e6ece8",
    borderRadius: "11px",
  },
  tabla: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "900px",
    fontSize: "12px",
  },
  th: {
    background: "#f6f9f7",
    color: "#64776c",
    textAlign: "left",
    padding: "11px 12px",
    borderBottom: "1px solid #e2e9e5",
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: ".45px",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #edf1ef",
    color: "#3b5145",
    verticalAlign: "top",
  },
  descripcionFuerte: {
    color: "#173c28",
    fontWeight: 800,
  },
  textoSuave: {
    marginTop: "3px",
    color: "#8a9991",
    fontSize: "10px",
  },
  estadoVacio: {
    padding: "36px 14px",
    textAlign: "center",
    color: "#84938b",
    fontSize: "13px",
    border: "1px dashed #dce5df",
    borderRadius: "11px",
    background: "#fafcfb",
  },
  listaMovil: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  gastoMovil: {
    border: "1px solid #e3eae6",
    borderRadius: "12px",
    padding: "14px",
    background: "#fff",
  },
  gastoMovilCabecera: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },
  montoFuerte: {
    fontWeight: 900,
    color: "#176b3a",
    whiteSpace: "nowrap",
    fontSize: "13px",
  },
  chips: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    marginTop: "11px",
  },
  chip: {
    borderRadius: "999px",
    background: "#eaf6ef",
    color: "#176b3a",
    padding: "5px 8px",
    fontSize: "10px",
    fontWeight: 800,
  },
  chipClaro: {
    borderRadius: "999px",
    background: "#f2f5f3",
    color: "#65766d",
    padding: "5px 8px",
    fontSize: "10px",
    fontWeight: 750,
  },
  detalleMovil: {
    marginTop: "11px",
    paddingTop: "10px",
    borderTop: "1px solid #edf1ef",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    color: "#718178",
    fontSize: "10px",
  },
};

