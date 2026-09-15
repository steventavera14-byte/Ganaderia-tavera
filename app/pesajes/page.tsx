"use client";

import { useEffect, useState } from "react";
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
  gan_lotes_ganado?: {
    nombre: string;
  } | null;
};

export default function PesajesPage() {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [fincaId, setFincaId] = useState("");
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [pesajes, setPesajes] = useState<Pesaje[]>([]);

  const [form, setForm] = useState({
    fecha: new Date().toISOString().split("T")[0],
    lote_id: "",
    cantidad_pesada: "",
    peso_promedio: "",
    peso_minimo: "",
    peso_maximo: "",
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
      .order("fecha", { ascending: false });

    if (error) {
      setMensaje(`Error al cargar pesajes: ${error.message}`);
      return;
    }

    setPesajes((data || []) as unknown as Pesaje[]);
  };

  const seleccionarLote = (loteId: string) => {
    const lote = lotes.find((item) => item.id === loteId);

    setForm((anterior) => ({
      ...anterior,
      lote_id: loteId,
      cantidad_pesada: lote
        ? String(lote.cantidad_total)
        : "",
    }));
  };

  const guardarPesaje = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");

    if (!form.lote_id) {
      setMensaje("Debes seleccionar un lote.");
      return;
    }

    const cantidadPesada = Number(form.cantidad_pesada);
    const pesoPromedio = Number(form.peso_promedio);

    if (!cantidadPesada || cantidadPesada <= 0) {
      setMensaje("La cantidad pesada debe ser mayor a cero.");
      return;
    }

    if (!pesoPromedio || pesoPromedio <= 0) {
      setMensaje("El peso promedio debe ser mayor a cero.");
      return;
    }

    const pesoMinimo = form.peso_minimo
      ? Number(form.peso_minimo)
      : null;

    const pesoMaximo = form.peso_maximo
      ? Number(form.peso_maximo)
      : null;

    if (
      pesoMinimo !== null &&
      pesoMaximo !== null &&
      pesoMinimo > pesoMaximo
    ) {
      setMensaje(
        "El peso mínimo no puede ser mayor que el peso máximo."
      );
      return;
    }

    if (
      pesoMinimo !== null &&
      pesoPromedio < pesoMinimo
    ) {
      setMensaje(
        "El peso promedio no puede ser menor que el peso mínimo."
      );
      return;
    }

    if (
      pesoMaximo !== null &&
      pesoPromedio > pesoMaximo
    ) {
      setMensaje(
        "El peso promedio no puede ser mayor que el peso máximo."
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
      .from("gan_lote_pesajes")
      .insert({
        lote_id: form.lote_id,
        fecha: form.fecha,
        cantidad_pesada: cantidadPesada,
        peso_promedio: pesoPromedio,
        peso_minimo: pesoMinimo,
        peso_maximo: pesoMaximo,
        observaciones:
          form.observaciones.trim() || null,
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
      cantidad_pesada: "",
      peso_promedio: "",
      peso_minimo: "",
      peso_maximo: "",
      observaciones: "",
    });

    setMostrarFormulario(false);
    setMensaje("Pesaje registrado correctamente.");

    await cargarPesajes(fincaId);

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

  const ultimoPesaje =
    pesajes.length > 0 ? pesajes[0] : null;

  if (loading) {
    return (
      <>
        <Sidebar />
        <main className="pesajes-main pesajes-loading">
          Cargando pesajes...
        </main>
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
            <p>Historial y control de peso por lote</p>
          </div>

          <button
            className={
              mostrarFormulario
                ? "boton-secundario boton-header"
                : "boton-principal boton-header"
            }
            onClick={() => {
              setMensaje("");
              setMostrarFormulario(!mostrarFormulario);
            }}
          >
            {mostrarFormulario
              ? "Cancelar"
              : "+ Registrar pesaje"}
          </button>
        </header>

        {mensaje && (
          <div
            className={`mensaje ${
              mensaje.includes("correctamente")
                ? "mensaje-exito"
                : "mensaje-error"
            }`}
          >
            {mensaje}
          </div>
        )}

        <section className="resumen-grid">
          <Tarjeta
            titulo="Pesajes registrados"
            valor={String(pesajes.length)}
            detalle="Historial de pesajes"
          />

          <Tarjeta
            titulo="Lotes con control"
            valor={String(
              new Set(pesajes.map((p) => p.lote_id)).size
            )}
            detalle="Lotes pesados"
          />

          <Tarjeta
            titulo="Último peso"
            valor={
              ultimoPesaje
                ? `${Number(
                    ultimoPesaje.peso_promedio
                  ).toLocaleString()} kg`
                : "—"
            }
            detalle={
              ultimoPesaje
                ? ultimoPesaje.gan_lotes_ganado?.nombre ||
                  "Último registro"
                : "Sin registros"
            }
          />
        </section>

        {mostrarFormulario && (
          <form
            onSubmit={guardarPesaje}
            className="formulario"
          >
            <h2>Registrar pesaje</h2>

            <div className="form-grid">
              <div className="campo">
                <label>Fecha *</label>

                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fecha: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="campo">
                <label>Lote *</label>

                <select
                  value={form.lote_id}
                  onChange={(e) =>
                    seleccionarLote(e.target.value)
                  }
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

              <div className="campo">
                <label>Cantidad pesada *</label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.cantidad_pesada}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cantidad_pesada: e.target.value,
                    })
                  }
                  placeholder="Ej. 102"
                  required
                />
              </div>

              <div className="campo">
                <label>Peso promedio (kg) *</label>

                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.peso_promedio}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      peso_promedio: e.target.value,
                    })
                  }
                  placeholder="Ej. 325"
                  required
                />
              </div>

              <div className="campo">
                <label>Peso mínimo (kg)</label>

                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.peso_minimo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      peso_minimo: e.target.value,
                    })
                  }
                  placeholder="Ej. 280"
                />
              </div>

              <div className="campo">
                <label>Peso máximo (kg)</label>

                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.peso_maximo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      peso_maximo: e.target.value,
                    })
                  }
                  placeholder="Ej. 370"
                />
              </div>
            </div>

            <div className="observaciones">
              <label>Observaciones</label>

              <textarea
                value={form.observaciones}
                onChange={(e) =>
                  setForm({
                    ...form,
                    observaciones: e.target.value,
                  })
                }
                placeholder="Información adicional del pesaje..."
              />
            </div>

            <div className="form-botones">
              <button
                type="button"
                className="boton-secundario"
                onClick={() =>
                  setMostrarFormulario(false)
                }
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                className="boton-principal"
                style={{
                  opacity: guardando ? 0.7 : 1,
                }}
              >
                {guardando
                  ? "Guardando..."
                  : "Guardar pesaje"}
              </button>
            </div>
          </form>
        )}

        <section className="pesajes-panel">
          <div className="panel-header">
            <h2>Historial de pesajes</h2>

            <span>
              {pesajes.length} registro
              {pesajes.length === 1 ? "" : "s"}
            </span>
          </div>

          {pesajes.length === 0 ? (
            <div className="vacio">
              <div className="vacio-icono">⚖️</div>

              <strong>
                No hay pesajes registrados
              </strong>

              <span>
                Utiliza “Registrar pesaje” para comenzar.
              </span>
            </div>
          ) : (
            <>
              <div className="pesajes-desktop">
                <div className="tabla-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Lote</th>
                        <th>Animales</th>
                        <th>Promedio</th>
                        <th>Mínimo</th>
                        <th>Máximo</th>
                        <th>Observaciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {pesajes.map((pesaje) => (
                        <tr key={pesaje.id}>
                          <td>
                            {formatearFecha(
                              pesaje.fecha
                            )}
                          </td>

                          <td>
                            <strong>
                              {pesaje.gan_lotes_ganado
                                ?.nombre || "—"}
                            </strong>
                          </td>

                          <td>
                            {pesaje.cantidad_pesada ?? "—"}
                          </td>

                          <td>
                            <strong className="peso-verde">
                              {Number(
                                pesaje.peso_promedio
                              ).toLocaleString()}{" "}
                              kg
                            </strong>
                          </td>

                          <td>
                            {pesaje.peso_minimo !== null
                              ? `${Number(
                                  pesaje.peso_minimo
                                ).toLocaleString()} kg`
                              : "—"}
                          </td>

                          <td>
                            {pesaje.peso_maximo !== null
                              ? `${Number(
                                  pesaje.peso_maximo
                                ).toLocaleString()} kg`
                              : "—"}
                          </td>

                          <td>
                            {pesaje.observaciones || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pesajes-mobile">
                {pesajes.map((pesaje) => (
                  <article
                    key={pesaje.id}
                    className="pesaje-card"
                  >
                    <div className="pesaje-top">
                      <div>
                        <span className="card-label">
                          PESAJE
                        </span>

                        <h3>
                          {pesaje.gan_lotes_ganado
                            ?.nombre || "Sin lote"}
                        </h3>

                        <span className="fecha-mobile">
                          {formatearFecha(
                            pesaje.fecha
                          )}
                        </span>
                      </div>

                      <span className="animales-badge">
                        {pesaje.cantidad_pesada ?? "—"}{" "}
                        animales
                      </span>
                    </div>

                    <div className="peso-principal">
                      <span>Peso promedio</span>

                      <strong>
                        {Number(
                          pesaje.peso_promedio
                        ).toLocaleString()}{" "}
                        kg
                      </strong>

                      <small>por animal</small>
                    </div>

                    <div className="pesos-grid">
                      <div>
                        <span>Peso mínimo</span>
                        <strong>
                          {pesaje.peso_minimo !== null
                            ? `${Number(
                                pesaje.peso_minimo
                              ).toLocaleString()} kg`
                            : "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Peso máximo</span>
                        <strong>
                          {pesaje.peso_maximo !== null
                            ? `${Number(
                                pesaje.peso_maximo
                              ).toLocaleString()} kg`
                            : "—"}
                        </strong>
                      </div>
                    </div>

                    <div className="detalle-mobile">
                      <span>Observaciones</span>

                      <strong>
                        {pesaje.observaciones ||
                          "Sin observaciones"}
                      </strong>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #f4f7f3;
        }

        .pesajes-main {
          margin-left: 235px;
          min-height: 100vh;
          background: #f4f7f3;
          padding: 32px;
          font-family: Arial, sans-serif;
          color: #20352a;
          overflow-x: hidden;
        }

        .pesajes-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #176b3a;
          font-weight: 700;
        }

        .pesajes-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 25px;
        }

        .pesajes-header h1 {
          margin: 0;
          font-size: 28px;
          color: #143e28;
        }

        .pesajes-header p {
          margin: 7px 0 0;
          color: #718078;
          font-size: 14px;
        }

        .boton-principal,
        .boton-secundario {
          border-radius: 10px;
          padding: 12px 18px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
        }

        .boton-principal {
          background: #176b3a;
          border: none;
          color: white;
        }

        .boton-secundario {
          background: white;
          border: 1px solid #d7dfd9;
          color: #53675b;
        }

        .mensaje {
          padding: 12px 15px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-size: 13px;
        }

        .mensaje-exito {
          background: #edf8f0;
          color: #176b3a;
        }

        .mensaje-error {
          background: #fff1f1;
          color: #b42318;
        }

        .resumen-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 22px;
        }

        .resumen-card {
          background: white;
          border: 1px solid #e0e8e2;
          border-radius: 14px;
          padding: 19px;
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
        }

        .resumen-card > span:first-child {
          color: #718078;
          font-size: 13px;
          font-weight: 600;
        }

        .resumen-card strong {
          color: #176b3a;
          font-size: 27px;
        }

        .resumen-card small {
          color: #98a39c;
          font-size: 12px;
        }

        .formulario {
          background: white;
          border: 1px solid #e0e8e2;
          border-radius: 15px;
          padding: 24px;
          margin-bottom: 22px;
        }

        .formulario h2 {
          margin: 0 0 22px;
          color: #244b34;
          font-size: 18px;
        }

        .form-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 17px;
        }

        .campo {
          min-width: 0;
        }

        .campo label,
        .observaciones label {
          display: block;
          margin-bottom: 7px;
          color: #43594b;
          font-size: 13px;
          font-weight: 600;
        }

        .campo input,
        .campo select,
        .observaciones textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d7dfd9;
          border-radius: 9px;
          padding: 11px 12px;
          font-size: 14px;
          outline: none;
          background: white;
          color: #20352a;
          font-family: inherit;
        }

        .observaciones {
          margin-top: 18px;
        }

        .observaciones textarea {
          min-height: 90px;
          resize: vertical;
        }

        .form-botones {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 22px;
        }

        .pesajes-panel {
          background: white;
          border: 1px solid #e0e8e2;
          border-radius: 15px;
          overflow: hidden;
        }

        .panel-header {
          padding: 20px 22px;
          border-bottom: 1px solid #edf1ee;
        }

        .panel-header h2 {
          margin: 0;
          font-size: 17px;
          color: #244b34;
        }

        .panel-header span {
          display: block;
          margin-top: 5px;
          color: #94a198;
          font-size: 12px;
        }

        .tabla-wrap {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        th {
          text-align: left;
          padding: 13px 16px;
          background: #f7faf7;
          color: #66776c;
          font-weight: 700;
          border-bottom: 1px solid #edf1ee;
          white-space: nowrap;
        }

        td {
          padding: 14px 16px;
          border-bottom: 1px solid #edf1ee;
          color: #45594c;
        }

        .peso-verde {
          color: #176b3a;
        }

        .vacio {
          min-height: 250px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: #829087;
          font-size: 13px;
          text-align: center;
          padding: 24px;
        }

        .vacio-icono {
          font-size: 38px;
        }

        .pesajes-mobile {
          display: none;
        }
                /* ===========================
           TABLET
        =========================== */

        @media (max-width: 1100px) and (min-width: 821px) {
          .pesajes-main {
            padding: 24px;
          }

          .form-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        /* ===========================
           CELULAR
        =========================== */

        @media (max-width: 820px) {
          html,
          body {
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
          }

          .pesajes-main {
            margin-left: 0;
            width: 100%;
            max-width: 100%;
            min-height: 100vh;
            padding: 84px 14px 28px;
            overflow-x: hidden;
          }

          .pesajes-loading {
            padding-top: 84px;
          }

          .pesajes-header {
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
            margin-bottom: 18px;
          }

          .pesajes-header h1 {
            font-size: 25px;
          }

          .pesajes-header p {
            margin-top: 6px;
            font-size: 13px;
            line-height: 1.4;
          }

          .boton-header {
            width: 100%;
            min-height: 46px;
          }

          /* 3 INDICADORES */

          .resumen-grid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
            gap: 8px;
            margin-bottom: 16px;
          }

          .resumen-card {
            padding: 14px 10px;
            border-radius: 12px;
            min-height: 112px;
            gap: 5px;
          }

          .resumen-card > span:first-child {
            font-size: 10px;
            line-height: 1.25;
          }

          .resumen-card strong {
            font-size: 25px;
            line-height: 1.1;
          }

          .resumen-card small {
            font-size: 9px;
            line-height: 1.3;
          }

          /* FORMULARIO */

          .formulario {
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 16px;
          }

          .formulario h2 {
            margin-bottom: 18px;
            font-size: 17px;
          }

          .form-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .campo input,
          .campo select,
          .observaciones textarea {
            font-size: 16px;
          }

          .campo input,
          .campo select {
            min-height: 46px;
          }

          .observaciones {
            margin-top: 14px;
          }

          .observaciones textarea {
            min-height: 100px;
          }

          .form-botones {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 9px;
            margin-top: 18px;
          }

          .form-botones button {
            width: 100%;
            min-height: 45px;
            padding-left: 7px;
            padding-right: 7px;
          }

          /* PANEL */

          .pesajes-panel {
            border-radius: 12px;
          }

          .panel-header {
            padding: 16px;
          }

          .panel-header h2 {
            font-size: 17px;
          }

          .panel-header span {
            font-size: 11px;
          }

          /* OCULTAR TABLA EN CELULAR */

          .pesajes-desktop {
            display: none;
          }

          /* FICHAS MÓVILES */

          .pesajes-mobile {
            display: block;
            padding: 12px;
          }

          .pesaje-card {
            background: #ffffff;
            border: 1px solid #dfe8e2;
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 10px;
            min-width: 0;
          }

          .pesaje-card:last-child {
            margin-bottom: 0;
          }

          .pesaje-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 10px;
            padding-bottom: 13px;
            border-bottom: 1px solid #edf1ee;
          }

          .card-label {
            display: block;
            color: #94a198;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 1px;
            margin-bottom: 3px;
          }

          .pesaje-top h3 {
            margin: 0;
            color: #174c2e;
            font-size: 18px;
            overflow-wrap: anywhere;
          }

          .fecha-mobile {
            display: block;
            margin-top: 5px;
            color: #89978e;
            font-size: 11px;
          }

          .animales-badge {
            display: inline-block;
            background: #eaf6ee;
            color: #176b3a;
            border-radius: 20px;
            padding: 6px 10px;
            font-size: 10px;
            font-weight: 700;
            white-space: nowrap;
          }

          .peso-principal {
            background: #f6faf7;
            border-radius: 9px;
            padding: 14px;
            margin-top: 14px;
          }

          .peso-principal span {
            display: block;
            color: #849188;
            font-size: 10px;
            margin-bottom: 5px;
          }

          .peso-principal strong {
            display: block;
            color: #176b3a;
            font-size: 26px;
            line-height: 1.1;
          }

          .peso-principal small {
            display: block;
            color: #9aa59e;
            font-size: 9px;
            margin-top: 4px;
          }

          .pesos-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 10px;
          }

          .pesos-grid > div {
            background: #f8faf8;
            border-radius: 9px;
            padding: 12px;
            min-width: 0;
          }

          .pesos-grid span {
            display: block;
            color: #8a9890;
            font-size: 10px;
            margin-bottom: 5px;
          }

          .pesos-grid strong {
            display: block;
            color: #35483b;
            font-size: 13px;
            line-height: 1.35;
            overflow-wrap: anywhere;
          }

          .detalle-mobile {
            padding-top: 14px;
          }

          .detalle-mobile span {
            display: block;
            color: #8a9890;
            font-size: 10px;
            margin-bottom: 5px;
          }

          .detalle-mobile strong {
            display: block;
            color: #35483b;
            font-size: 12px;
            line-height: 1.45;
            font-weight: 600;
            overflow-wrap: anywhere;
          }
        }

        @media (max-width: 380px) {
          .pesajes-main {
            padding-left: 10px;
            padding-right: 10px;
          }

          .resumen-grid {
            gap: 6px;
          }

          .resumen-card {
            padding: 12px 8px;
          }

          .resumen-card > span:first-child {
            font-size: 9px;
          }

          .resumen-card strong {
            font-size: 22px;
          }

          .resumen-card small {
            font-size: 8px;
          }

          .animales-badge {
            font-size: 9px;
            padding: 5px 8px;
          }
        }
      `}</style>
    </>
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
    <div className="resumen-card">
      <span>{titulo}</span>
      <strong>{valor}</strong>
      <small>{detalle}</small>
    </div>
  );
}
