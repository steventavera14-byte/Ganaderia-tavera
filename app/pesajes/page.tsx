"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Sidebar from "../components/Sidebar";

type Lote = {
  id: string;
  nombre: string;
  cantidad_total: number;
  peso_promedio: number | null;
};

type Pesaje = {
  id: string;
  lote_id: string;
  fecha: string;
  cantidad_pesada: number | null;
  peso_promedio: number;
  peso_minimo: number | null;
  peso_maximo: number | null;
  observaciones: string | null;
  gan_lotes_ganado?: { nombre: string } | null;
};

type DetallePeso = {
  id: string;
  pesaje_id: string;
  numero_animal: number;
  peso: number;
  observaciones: string | null;
};

const hoyLocal = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
};

export default function PesajesPage() {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [fincaId, setFincaId] = useState("");
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [pesajes, setPesajes] = useState<Pesaje[]>([]);

  const [fecha, setFecha] = useState(hoyLocal());
  const [loteId, setLoteId] = useState("");
  const [cantidadPesada, setCantidadPesada] = useState("");
  const [pesos, setPesos] = useState<string[]>([]);
  const [observaciones, setObservaciones] = useState("");

  const [pesajeDetalle, setPesajeDetalle] = useState<Pesaje | null>(null);
  const [detalles, setDetalles] = useState<DetallePeso[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [pesajeEditandoId, setPesajeEditandoId] = useState<string | null>(null);

  useEffect(() => {
    iniciar();
  }, []);

  const iniciar = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

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
      cargarPesajes(usuario.finca_id),
    ]);

    setLoading(false);
  };

  const cargarLotes = async (idFinca: string) => {
    const { data, error } = await supabase
      .from("gan_lotes_ganado")
      .select("id, nombre, cantidad_total, peso_promedio")
      .eq("finca_id", idFinca)
      .in("estado", ["activo", "feedlot"])
      .order("nombre");

    if (error) {
      setMensaje(`Error al cargar lotes: ${error.message}`);
      return;
    }

    setLotes((data || []) as Lote[]);
  };

  const cargarPesajes = async (idFinca: string) => {
    const { data, error } = await supabase
      .from("gan_lote_pesajes")
      .select(`
        id,
        lote_id,
        fecha,
        cantidad_pesada,
        peso_promedio,
        peso_minimo,
        peso_maximo,
        observaciones,
        gan_lotes_ganado!inner (
          nombre,
          finca_id
        )
      `)
      .eq("gan_lotes_ganado.finca_id", idFinca)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setMensaje(`Error al cargar pesajes: ${error.message}`);
      return;
    }

    setPesajes((data || []) as unknown as Pesaje[]);
  };

  const seleccionarLote = (id: string) => {
    setLoteId(id);
    const lote = lotes.find((item) => item.id === id);

    if (!lote) {
      setCantidadPesada("");
      setPesos([]);
      return;
    }

    const cantidad = Number(lote.cantidad_total) || 0;
    setCantidadPesada(String(cantidad));
    setPesos(Array.from({ length: cantidad }, () => ""));
  };

  const cambiarCantidad = (valor: string) => {
    setCantidadPesada(valor);
    const cantidad = Math.max(0, Math.floor(Number(valor) || 0));

    setPesos((actuales) =>
      Array.from({ length: cantidad }, (_, i) => actuales[i] ?? "")
    );
  };

  const cambiarPeso = (indice: number, valor: string) => {
    setPesos((actuales) => {
      const copia = [...actuales];
      copia[indice] = valor;
      return copia;
    });
  };

  const pesosNumericos = useMemo(
    () =>
      pesos
        .map((p) => Number(p))
        .filter((p) => Number.isFinite(p) && p > 0),
    [pesos]
  );

  const resumen = useMemo(() => {
    if (pesosNumericos.length === 0) {
      return { promedio: 0, minimo: 0, maximo: 0 };
    }

    const total = pesosNumericos.reduce((suma, p) => suma + p, 0);
    return {
      promedio: total / pesosNumericos.length,
      minimo: Math.min(...pesosNumericos),
      maximo: Math.max(...pesosNumericos),
    };
  }, [pesosNumericos]);

  const limpiarFormulario = () => {
    setFecha(hoyLocal());
    setLoteId("");
    setCantidadPesada("");
    setPesos([]);
    setObservaciones("");
    setPesajeEditandoId(null);
  };

  const guardarPesaje = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    if (!loteId) {
      setMensaje("Debes seleccionar un lote.");
      return;
    }

    const cantidad = Math.floor(Number(cantidadPesada));

    if (!cantidad || cantidad <= 0) {
      setMensaje("La cantidad pesada debe ser mayor a cero.");
      return;
    }

    if (pesos.length !== cantidad) {
      setMensaje("La cantidad de pesos no coincide con la cantidad pesada.");
      return;
    }

    const incompleto = pesos.some((p) => {
      const n = Number(p);
      return p.trim() === "" || !Number.isFinite(n) || n <= 0;
    });

    if (incompleto) {
      setMensaje("Debes ingresar un peso válido para cada animal.");
      return;
    }

    setGuardando(true);

    const { error } = pesajeEditandoId
      ? await supabase.rpc("gan_editar_pesaje_individual", {
          p_pesaje_id: pesajeEditandoId,
          p_fecha: fecha,
          p_pesos: pesos.map(Number),
          p_observaciones: observaciones.trim() || null,
        })
      : await supabase.rpc("gan_registrar_pesaje_individual", {
          p_lote_id: loteId,
          p_fecha: fecha,
          p_pesos: pesos.map(Number),
          p_observaciones: observaciones.trim() || null,
        });

    if (error) {
      setMensaje(`Error al guardar: ${error.message}`);
      setGuardando(false);
      return;
    }

    const fueEdicion = Boolean(pesajeEditandoId);
    limpiarFormulario();
    setMostrarFormulario(false);
    setPesajeDetalle(null);
    setMensaje(
      fueEdicion
        ? "Pesaje actualizado correctamente."
        : "Pesaje registrado correctamente."
    );
    await cargarPesajes(fincaId);
    setGuardando(false);
  };

  const editarPesaje = async (pesaje: Pesaje) => {
    setMensaje("");
    setCargandoDetalle(true);

    const { data, error } = await supabase
      .from("gan_pesaje_detalles")
      .select("numero_animal,peso")
      .eq("pesaje_id", pesaje.id)
      .order("numero_animal", { ascending: true });

    setCargandoDetalle(false);

    if (error) {
      setMensaje(`Error al cargar el pesaje: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      setMensaje(
        "Este pesaje fue registrado con el sistema anterior y no tiene pesos individuales para editar."
      );
      return;
    }

    setPesajeDetalle(null);
    setPesajeEditandoId(pesaje.id);
    setFecha(pesaje.fecha);
    setLoteId(pesaje.lote_id);
    setCantidadPesada(String(data.length));
    setPesos(data.map((item) => String(Number(item.peso))));
    setObservaciones(pesaje.observaciones || "");
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminarPesaje = async (pesaje: Pesaje) => {
    const nombreLote = pesaje.gan_lotes_ganado?.nombre || "este lote";
    const confirmar = window.confirm(
      `¿Eliminar el pesaje de ${nombreLote} del ${formatearFecha(
        pesaje.fecha
      )}? Esta acción también eliminará sus pesos individuales.`
    );

    if (!confirmar) return;

    setMensaje("");

    const { error } = await supabase.rpc("gan_eliminar_pesaje", {
      p_pesaje_id: pesaje.id,
    });

    if (error) {
      setMensaje(`Error al eliminar: ${error.message}`);
      return;
    }

    if (pesajeDetalle?.id === pesaje.id) setPesajeDetalle(null);
    if (pesajeEditandoId === pesaje.id) {
      limpiarFormulario();
      setMostrarFormulario(false);
    }

    setMensaje("Pesaje eliminado correctamente.");
    await cargarPesajes(fincaId);
  };

  const abrirDetalle = async (pesaje: Pesaje) => {
    setPesajeDetalle(pesaje);
    setDetalles([]);
    setCargandoDetalle(true);
    setMensaje("");

    const { data, error } = await supabase
      .from("gan_pesaje_detalles")
      .select("id,pesaje_id,numero_animal,peso,observaciones")
      .eq("pesaje_id", pesaje.id)
      .order("numero_animal", { ascending: true });

    if (error) {
      setMensaje(`Error al cargar detalle: ${error.message}`);
    } else {
      setDetalles((data || []) as DetallePeso[]);
    }

    setCargandoDetalle(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const formatearFecha = (valor: string) =>
    new Date(valor).toLocaleDateString("es-BO", {
      timeZone: "UTC",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const ultimoPesaje = pesajes.length > 0 ? pesajes[0] : null;

  if (loading) {
    return (
      <>
        <Sidebar />
        <main className="pesajes-main pesajes-loading">Cargando pesajes...</main>
      </>
    );
  }

  return (
    <>
      <Sidebar />

      <main className="pesajes-main">
        <header className="pesajes-header">
          <div>
            <h1>Pesajes</h1>
            <p>Historial y control de peso por lote y por animal</p>
          </div>

          <button
            className={mostrarFormulario ? "boton-secundario boton-header" : "boton-principal boton-header"}
            onClick={() => {
              setMensaje("");
              if (mostrarFormulario) {
                limpiarFormulario();
                setMostrarFormulario(false);
              } else {
                limpiarFormulario();
                setMostrarFormulario(true);
              }
            }}
          >
            {mostrarFormulario
              ? "Cancelar"
              : "+ Registrar pesaje"}
          </button>
        </header>

        {mensaje && (
          <div className={`mensaje ${mensaje.includes("correctamente") ? "mensaje-exito" : "mensaje-error"}`}>
            {mensaje}
          </div>
        )}

        {pesajeDetalle && (
          <section className="detalle-panel">
            <div className="detalle-cabecera">
              <div>
                <span className="detalle-eyebrow">DETALLE DEL PESAJE</span>
                <h2>{pesajeDetalle.gan_lotes_ganado?.nombre || "Lote"}</h2>
                <p>
                  {formatearFecha(pesajeDetalle.fecha)} · {pesajeDetalle.cantidad_pesada ?? "—"} animales
                </p>
              </div>
              <button className="boton-secundario" onClick={() => setPesajeDetalle(null)}>
                Cerrar
              </button>
            </div>

            <div className="detalle-resumen">
              <MiniDato titulo="Promedio" valor={`${Number(pesajeDetalle.peso_promedio).toLocaleString()} kg`} />
              <MiniDato titulo="Mínimo" valor={pesajeDetalle.peso_minimo !== null ? `${Number(pesajeDetalle.peso_minimo).toLocaleString()} kg` : "—"} />
              <MiniDato titulo="Máximo" valor={pesajeDetalle.peso_maximo !== null ? `${Number(pesajeDetalle.peso_maximo).toLocaleString()} kg` : "—"} />
            </div>

            {cargandoDetalle ? (
              <div className="detalle-vacio">Cargando pesos individuales...</div>
            ) : detalles.length === 0 ? (
              <div className="detalle-vacio">
                Este pesaje fue registrado con el sistema anterior y no tiene pesos individuales.
              </div>
            ) : (
              <div className="animales-grid">
                {detalles.map((detalle) => (
                  <div className="animal-peso" key={detalle.id}>
                    <span>Animal {detalle.numero_animal}</span>
                    <strong>{Number(detalle.peso).toLocaleString()} kg</strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="resumen-grid">
          <Tarjeta titulo="Pesajes registrados" valor={String(pesajes.length)} detalle="Historial de pesajes" />
          <Tarjeta titulo="Lotes con control" valor={String(new Set(pesajes.map((p) => p.lote_id)).size)} detalle="Lotes pesados" />
          <Tarjeta
            titulo="Último peso"
            valor={ultimoPesaje ? `${Number(ultimoPesaje.peso_promedio).toLocaleString()} kg` : "—"}
            detalle={ultimoPesaje ? ultimoPesaje.gan_lotes_ganado?.nombre || "Último registro" : "Sin registros"}
          />
        </section>

        {mostrarFormulario && (
          <form onSubmit={guardarPesaje} className="formulario">
            <h2>
              {pesajeEditandoId
                ? "Editar pesaje individual"
                : "Registrar pesaje individual"}
            </h2>

            <div className="form-grid">
              <div className="campo">
                <label>Fecha *</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
              </div>

              <div className="campo">
                <label>Lote *</label>
                <select
                  value={loteId}
                  onChange={(e) => seleccionarLote(e.target.value)}
                  required
                  disabled={Boolean(pesajeEditandoId)}
                >
                  <option value="">Seleccionar lote</option>
                  {lotes.map((lote) => (
                    <option key={lote.id} value={lote.id}>
                      {lote.nombre} — {lote.cantidad_total} animales
                    </option>
                  ))}
                </select>
              </div>

              <div className="campo">
                <label>Cantidad a pesar *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={cantidadPesada}
                  onChange={(e) => cambiarCantidad(e.target.value)}
                  placeholder="Ej. 102"
                  required
                />
              </div>
            </div>

            {pesos.length > 0 && (
              <>
                <div className="pesos-cabecera">
                  <div>
                    <h3>Pesos individuales</h3>
                    <p>Ingresa el peso de cada animal. El resumen se calcula automáticamente.</p>
                  </div>
                  <span>{pesosNumericos.length} / {pesos.length} registrados</span>
                </div>

                <div className="calculo-grid">
                  <MiniDato titulo="Promedio automático" valor={pesosNumericos.length ? `${resumen.promedio.toFixed(1)} kg` : "—"} />
                  <MiniDato titulo="Mínimo automático" valor={pesosNumericos.length ? `${resumen.minimo.toLocaleString()} kg` : "—"} />
                  <MiniDato titulo="Máximo automático" valor={pesosNumericos.length ? `${resumen.maximo.toLocaleString()} kg` : "—"} />
                </div>

                <div className="entrada-pesos-grid">
                  {pesos.map((peso, indice) => (
                    <label className="entrada-peso" key={indice}>
                      <span>Animal {indice + 1}</span>
                      <div>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          inputMode="decimal"
                          value={peso}
                          onChange={(e) => cambiarPeso(indice, e.target.value)}
                          placeholder="0"
                          required
                        />
                        <small>kg</small>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}

            <div className="observaciones">
              <label>Observaciones</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Información adicional del pesaje..."
              />
            </div>

            <div className="form-botones">
              <button
                type="button"
                className="boton-secundario"
                onClick={() => {
                  limpiarFormulario();
                  setMostrarFormulario(false);
                }}
              >
                Cancelar
              </button>
              <button type="submit" disabled={guardando} className="boton-principal" style={{ opacity: guardando ? 0.7 : 1 }}>
                {guardando
                  ? "Guardando..."
                  : pesajeEditandoId
                  ? "Guardar cambios"
                  : "Guardar pesaje"}
              </button>
            </div>
          </form>
        )}

        <section className="pesajes-panel">
          <div className="panel-header">
            <h2>Historial de pesajes</h2>
            <span>{pesajes.length} registro{pesajes.length === 1 ? "" : "s"}</span>
          </div>

          {pesajes.length === 0 ? (
            <div className="vacio">
              <div className="vacio-icono">⚖️</div>
              <strong>No hay pesajes registrados</strong>
              <span>Utiliza “Registrar pesaje” para comenzar.</span>
            </div>
          ) : (
            <>
              <div className="pesajes-desktop">
                <div className="tabla-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th><th>Lote</th><th>Animales</th><th>Promedio</th>
                        <th>Mínimo</th><th>Máximo</th><th>Observaciones</th><th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pesajes.map((pesaje) => (
                        <tr key={pesaje.id}>
                          <td>{formatearFecha(pesaje.fecha)}</td>
                          <td><strong>{pesaje.gan_lotes_ganado?.nombre || "—"}</strong></td>
                          <td>{pesaje.cantidad_pesada ?? "—"}</td>
                          <td><strong className="peso-verde">{Number(pesaje.peso_promedio).toLocaleString()} kg</strong></td>
                          <td>{pesaje.peso_minimo !== null ? `${Number(pesaje.peso_minimo).toLocaleString()} kg` : "—"}</td>
                          <td>{pesaje.peso_maximo !== null ? `${Number(pesaje.peso_maximo).toLocaleString()} kg` : "—"}</td>
                          <td>{pesaje.observaciones || "—"}</td>
                          <td>
                            <div className="acciones-pesaje">
                              <button className="boton-detalle" onClick={() => abrirDetalle(pesaje)}>
                                Ver detalle
                              </button>
                              <button className="boton-editar" onClick={() => editarPesaje(pesaje)}>
                                Editar
                              </button>
                              <button className="boton-eliminar" onClick={() => eliminarPesaje(pesaje)}>
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pesajes-mobile">
                {pesajes.map((pesaje) => (
                  <article key={pesaje.id} className="pesaje-card">
                    <div className="pesaje-top">
                      <div>
                        <span className="card-label">PESAJE</span>
                        <h3>{pesaje.gan_lotes_ganado?.nombre || "Sin lote"}</h3>
                        <span className="fecha-mobile">{formatearFecha(pesaje.fecha)}</span>
                      </div>
                      <span className="animales-badge">{pesaje.cantidad_pesada ?? "—"} animales</span>
                    </div>

                    <div className="peso-principal">
                      <span>Peso promedio</span>
                      <strong>{Number(pesaje.peso_promedio).toLocaleString()} kg</strong>
                      <small>por animal</small>
                    </div>

                    <div className="pesos-grid">
                      <div><span>Peso mínimo</span><strong>{pesaje.peso_minimo !== null ? `${Number(pesaje.peso_minimo).toLocaleString()} kg` : "—"}</strong></div>
                      <div><span>Peso máximo</span><strong>{pesaje.peso_maximo !== null ? `${Number(pesaje.peso_maximo).toLocaleString()} kg` : "—"}</strong></div>
                    </div>

                    <div className="detalle-mobile">
                      <span>Observaciones</span>
                      <strong>{pesaje.observaciones || "Sin observaciones"}</strong>
                    </div>

                    <div className="acciones-mobile">
                      <button className="boton-detalle" onClick={() => abrirDetalle(pesaje)}>
                        Ver detalle
                      </button>
                      <button className="boton-editar" onClick={() => editarPesaje(pesaje)}>
                        Editar
                      </button>
                      <button className="boton-eliminar" onClick={() => eliminarPesaje(pesaje)}>
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      <style jsx global>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #f4f7f3; }
        .pesajes-main { margin-left:235px; min-height:100vh; background:#f4f7f3; padding:32px; font-family:Arial,sans-serif; color:#20352a; overflow-x:hidden; }
        .pesajes-loading { display:flex; align-items:center; justify-content:center; color:#176b3a; font-weight:700; }
        .pesajes-header { display:flex; justify-content:space-between; align-items:center; gap:20px; margin-bottom:25px; }
        .pesajes-header h1 { margin:0; font-size:28px; color:#143e28; }
        .pesajes-header p { margin:7px 0 0; color:#718078; font-size:14px; }
        .boton-principal,.boton-secundario,.boton-detalle,.boton-editar,.boton-eliminar { border-radius:10px; padding:12px 18px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; }
        .boton-principal { background:#176b3a; border:none; color:white; }
        .boton-secundario { background:white; border:1px solid #d7dfd9; color:#53675b; }
        .boton-detalle { border:1px solid #bfe0ca; background:#edf8f0; color:#176b3a; padding:8px 11px; white-space:nowrap; }
        .boton-editar { border:1px solid #d7dfd9; background:white; color:#53675b; padding:8px 11px; white-space:nowrap; }
        .boton-eliminar { border:1px solid #f0c7c7; background:#fff5f5; color:#b42318; padding:8px 11px; white-space:nowrap; }
        .acciones-pesaje { display:flex; align-items:center; gap:6px; flex-wrap:nowrap; }
        .mensaje { padding:12px 15px; border-radius:10px; margin-bottom:20px; font-size:13px; }
        .mensaje-exito { background:#edf8f0; color:#176b3a; }
        .mensaje-error { background:#fff1f1; color:#b42318; }
        .resumen-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; margin-bottom:22px; }
        .resumen-card { background:white; border:1px solid #e0e8e2; border-radius:14px; padding:19px; display:flex; flex-direction:column; gap:7px; min-width:0; }
        .resumen-card > span:first-child { color:#718078; font-size:13px; font-weight:600; }
        .resumen-card strong { color:#176b3a; font-size:27px; }
        .resumen-card small { color:#98a39c; font-size:12px; }
        .formulario,.detalle-panel { background:white; border:1px solid #e0e8e2; border-radius:15px; padding:24px; margin-bottom:22px; }
        .formulario h2 { margin:0 0 22px; color:#244b34; font-size:18px; }
        .form-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:17px; }
        .campo { min-width:0; }
        .campo label,.observaciones label { display:block; margin-bottom:7px; color:#43594b; font-size:13px; font-weight:600; }
        .campo input,.campo select,.observaciones textarea,.entrada-peso input { width:100%; box-sizing:border-box; border:1px solid #d7dfd9; border-radius:9px; padding:11px 12px; font-size:14px; outline:none; background:white; color:#20352a; font-family:inherit; }
        .campo select:disabled { background:#f3f6f4; color:#66776c; cursor:not-allowed; }
        .observaciones { margin-top:18px; }
        .observaciones textarea { min-height:90px; resize:vertical; }
        .form-botones { display:flex; justify-content:flex-end; gap:10px; margin-top:22px; }
        .pesos-cabecera { display:flex; justify-content:space-between; align-items:flex-end; gap:15px; margin:25px 0 14px; }
        .pesos-cabecera h3 { margin:0; color:#244b34; font-size:16px; }
        .pesos-cabecera p { margin:5px 0 0; color:#829087; font-size:12px; }
        .pesos-cabecera > span { background:#edf8f0; color:#176b3a; border-radius:20px; padding:7px 11px; font-size:11px; font-weight:800; white-space:nowrap; }
        .calculo-grid,.detalle-resumen { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin-bottom:16px; }
        .mini-dato { background:#f6faf7; border:1px solid #e4ece6; border-radius:10px; padding:12px; }
        .mini-dato span { display:block; color:#849188; font-size:10px; margin-bottom:5px; }
        .mini-dato strong { color:#176b3a; font-size:17px; }
        .entrada-pesos-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(125px,1fr)); gap:10px; max-height:440px; overflow-y:auto; padding:2px 4px 4px 2px; }
        .entrada-peso { background:#f8faf8; border:1px solid #e4ebe6; border-radius:10px; padding:10px; }
        .entrada-peso > span { display:block; color:#607268; font-size:11px; font-weight:700; margin-bottom:6px; }
        .entrada-peso > div { position:relative; }
        .entrada-peso input { padding-right:34px; }
        .entrada-peso small { position:absolute; right:10px; top:50%; transform:translateY(-50%); color:#89978e; font-size:10px; pointer-events:none; }
        .detalle-cabecera { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; margin-bottom:18px; }
        .detalle-eyebrow { color:#176b3a; font-size:10px; font-weight:900; letter-spacing:1px; }
        .detalle-cabecera h2 { margin:5px 0 3px; color:#174c2e; font-size:21px; }
        .detalle-cabecera p { margin:0; color:#829087; font-size:12px; }
        .animales-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(135px,1fr)); gap:9px; max-height:480px; overflow-y:auto; }
        .animal-peso { border:1px solid #e2e9e4; border-radius:9px; padding:11px; background:#fafcfb; }
        .animal-peso span { display:block; color:#7d8d83; font-size:10px; margin-bottom:5px; }
        .animal-peso strong { color:#244b34; font-size:15px; }
        .detalle-vacio { padding:25px; text-align:center; color:#829087; background:#f8faf8; border-radius:10px; font-size:12px; }
        .pesajes-panel { background:white; border:1px solid #e0e8e2; border-radius:15px; overflow:hidden; }
        .panel-header { padding:20px 22px; border-bottom:1px solid #edf1ee; }
        .panel-header h2 { margin:0; font-size:17px; color:#244b34; }
        .panel-header span { display:block; margin-top:5px; color:#94a198; font-size:12px; }
        .tabla-wrap { width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; }
        table { width:100%; border-collapse:collapse; font-size:13px; }
        th { text-align:left; padding:13px 16px; background:#f7faf7; color:#66776c; font-weight:700; border-bottom:1px solid #edf1ee; white-space:nowrap; }
        td { padding:14px 16px; border-bottom:1px solid #edf1ee; color:#45594c; }
        .peso-verde { color:#176b3a; }
        .vacio { min-height:250px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:9px; color:#829087; font-size:13px; text-align:center; padding:24px; }
        .vacio-icono { font-size:38px; }
        .pesajes-mobile { display:none; }

        @media (max-width:1100px) and (min-width:821px) {
          .pesajes-main { padding:24px; }
          .form-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
        }

        @media (max-width:820px) {
          html,body { width:100%; max-width:100%; overflow-x:hidden; }
          .pesajes-main { margin-left:0; width:100%; max-width:100%; min-height:100vh; padding:84px 14px 28px; overflow-x:hidden; }
          .pesajes-loading { padding-top:84px; }
          .pesajes-header { flex-direction:column; align-items:stretch; gap:14px; margin-bottom:18px; }
          .pesajes-header h1 { font-size:25px; }
          .pesajes-header p { margin-top:6px; font-size:13px; line-height:1.4; }
          .boton-header { width:100%; min-height:46px; }
          .resumen-grid { grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-bottom:16px; }
          .resumen-card { padding:14px 10px; border-radius:12px; min-height:112px; gap:5px; }
          .resumen-card > span:first-child { font-size:10px; line-height:1.25; }
          .resumen-card strong { font-size:25px; line-height:1.1; }
          .resumen-card small { font-size:9px; line-height:1.3; }
          .formulario,.detalle-panel { padding:16px; border-radius:12px; margin-bottom:16px; }
          .formulario h2 { margin-bottom:18px; font-size:17px; }
          .form-grid { grid-template-columns:1fr; gap:14px; }
          .campo input,.campo select,.observaciones textarea,.entrada-peso input { font-size:16px; }
          .campo input,.campo select { min-height:46px; }
          .observaciones { margin-top:14px; }
          .observaciones textarea { min-height:100px; }
          .form-botones { display:grid; grid-template-columns:1fr 1fr; gap:9px; margin-top:18px; }
          .form-botones button { width:100%; min-height:45px; padding-left:7px; padding-right:7px; }
          .pesos-cabecera { align-items:flex-start; }
          .pesos-cabecera p { line-height:1.4; }
          .calculo-grid,.detalle-resumen { grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px; }
          .mini-dato { padding:10px 8px; }
          .mini-dato strong { font-size:14px; }
          .entrada-pesos-grid { grid-template-columns:repeat(2,minmax(0,1fr)); max-height:none; }
          .detalle-cabecera { align-items:center; }
          .animales-grid { grid-template-columns:repeat(2,minmax(0,1fr)); max-height:none; }
          .pesajes-panel { border-radius:12px; }
          .panel-header { padding:16px; }
          .panel-header h2 { font-size:17px; }
          .panel-header span { font-size:11px; }
          .pesajes-desktop { display:none; }
          .pesajes-mobile { display:block; padding:12px; }
          .pesaje-card { background:#fff; border:1px solid #dfe8e2; border-radius:12px; padding:14px; margin-bottom:10px; min-width:0; }
          .pesaje-card:last-child { margin-bottom:0; }
          .pesaje-top { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; padding-bottom:13px; border-bottom:1px solid #edf1ee; }
          .card-label { display:block; color:#94a198; font-size:9px; font-weight:800; letter-spacing:1px; margin-bottom:3px; }
          .pesaje-top h3 { margin:0; color:#174c2e; font-size:18px; overflow-wrap:anywhere; }
          .fecha-mobile { display:block; margin-top:5px; color:#89978e; font-size:11px; }
          .animales-badge { display:inline-block; background:#eaf6ee; color:#176b3a; border-radius:20px; padding:6px 10px; font-size:10px; font-weight:700; white-space:nowrap; }
          .peso-principal { background:#f6faf7; border-radius:9px; padding:14px; margin-top:14px; }
          .peso-principal span { display:block; color:#849188; font-size:10px; margin-bottom:5px; }
          .peso-principal strong { display:block; color:#176b3a; font-size:26px; line-height:1.1; }
          .peso-principal small { display:block; color:#9aa59e; font-size:9px; margin-top:4px; }
          .pesos-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px; }
          .pesos-grid > div { background:#f8faf8; border-radius:9px; padding:12px; min-width:0; }
          .pesos-grid span { display:block; color:#8a9890; font-size:10px; margin-bottom:5px; }
          .pesos-grid strong { display:block; color:#35483b; font-size:13px; line-height:1.35; overflow-wrap:anywhere; }
          .detalle-mobile { padding-top:14px; }
          .detalle-mobile span { display:block; color:#8a9890; font-size:10px; margin-bottom:5px; }
          .detalle-mobile strong { display:block; color:#35483b; font-size:12px; line-height:1.45; font-weight:600; overflow-wrap:anywhere; }
          .boton-detalle-mobile { width:100%; margin-top:14px; min-height:43px; }
          .acciones-mobile { display:grid; grid-template-columns:1.35fr .8fr .9fr; gap:7px; margin-top:14px; }
          .acciones-mobile button { width:100%; min-height:42px; padding:8px 5px; font-size:11px; }
        }

        @media (max-width:380px) {
          .pesajes-main { padding-left:10px; padding-right:10px; }
          .resumen-grid { gap:6px; }
          .resumen-card { padding:12px 8px; }
          .resumen-card > span:first-child { font-size:9px; }
          .resumen-card strong { font-size:22px; }
          .resumen-card small { font-size:8px; }
          .animales-badge { font-size:9px; padding:5px 8px; }
        }
      `}</style>
    </>
  );
}

function Tarjeta({ titulo, valor, detalle }: { titulo: string; valor: string; detalle: string }) {
  return (
    <div className="resumen-card">
      <span>{titulo}</span>
      <strong>{valor}</strong>
      <small>{detalle}</small>
    </div>
  );
}

function MiniDato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="mini-dato">
      <span>{titulo}</span>
      <strong>{valor}</strong>
    </div>
  );
}
