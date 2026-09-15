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
  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);
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
    fecha_ingreso:
      new Date().toISOString().split("T")[0],
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

    const { data: usuario, error: errorUsuario } =
      await supabase
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
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      setMensaje(
        `Error al cargar lotes: ${error.message}`
      );
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

  const guardarLote = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    setMensaje("");

    const total = Number(
      form.cantidad_total || 0
    );

    const machos = Number(
      form.cantidad_machos || 0
    );

    const hembras = Number(
      form.cantidad_hembras || 0
    );

    if (!form.nombre.trim()) {
      setMensaje(
        "Debes colocar un nombre al lote."
      );
      return;
    }

    if (total <= 0) {
      setMensaje(
        "La cantidad total debe ser mayor a cero."
      );
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

    const {
      data: loteCreado,
      error,
    } = await supabase
      .from("gan_lotes_ganado")
      .insert({
        finca_id: fincaId,
        nombre: form.nombre.trim(),
        categoria:
          form.categoria || null,
        raza: form.raza || null,
        cantidad_total: total,
        cantidad_machos: machos,
        cantidad_hembras: hembras,
        peso_promedio:
          form.peso_promedio
            ? Number(form.peso_promedio)
            : null,
        fecha_ingreso:
          form.fecha_ingreso || null,
        origen: form.origen || null,
        potrero_id:
          form.potrero_id || null,
        estado: "activo",
        observaciones:
          form.observaciones || null,
      })
      .select("id")
      .single();

    if (error) {
      setMensaje(
        `Error al guardar: ${error.message}`
      );
      setGuardando(false);
      return;
    }

    await supabase
      .from("gan_lote_eventos")
      .insert({
        lote_id: loteCreado.id,
        fecha:
          form.fecha_ingreso ||
          new Date()
            .toISOString()
            .split("T")[0],
        tipo: "creacion",
        cantidad: total,
        descripcion:
          "Creación inicial del lote",
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
      fecha_ingreso:
        new Date()
          .toISOString()
          .split("T")[0],
      origen: "",
      potrero_id: "",
      observaciones: "",
    });

    setMostrarFormulario(false);

    setMensaje(
      "Lote registrado correctamente."
    );

    await cargarLotes(fincaId);

    setGuardando(false);
  };

  const totalGanado = lotes
    .filter(
      (lote) =>
        lote.estado === "activo" ||
        lote.estado === "feedlot"
    )
    .reduce(
      (suma, lote) =>
        suma +
        Number(lote.cantidad_total || 0),
      0
    );

  const lotesActivos = lotes.filter(
    (lote) =>
      lote.estado === "activo" ||
      lote.estado === "feedlot"
  ).length;

  if (loading) {
    return (
      <>
        <Sidebar />
        <main className="lotes-main lotes-loading">
          Cargando lotes...
        </main>
      </>
    );
  }

  return (
    <>
      <Sidebar />

      <main className="lotes-main">
        <header className="lotes-header">
          <div>
            <h1>Lotes de ganado</h1>
            <p>
              Administración de grupos y existencias de ganado
            </p>
          </div>

          <button
            className={
              mostrarFormulario
                ? "boton-secundario boton-header"
                : "boton-principal boton-header"
            }
            onClick={() => {
              setMensaje("");
              setMostrarFormulario(
                !mostrarFormulario
              );
            }}
          >
            {mostrarFormulario
              ? "Cancelar"
              : "+ Nuevo lote"}
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
            titulo="Ganado total"
            valor={totalGanado.toLocaleString()}
            detalle="Animales en lotes activos"
          />

          <Tarjeta
            titulo="Lotes activos"
            valor={String(lotesActivos)}
            detalle="Grupos registrados"
          />

          <Tarjeta
            titulo="Potreros disponibles"
            valor={String(potreros.length)}
            detalle="Potreros registrados"
          />
        </section>

        {mostrarFormulario && (
          <form
            onSubmit={guardarLote}
            className="formulario"
          >
            <h2>Registrar nuevo lote</h2>

            <div className="form-grid">
              <Campo
                label="Nombre del lote *"
                value={form.nombre}
                onChange={(v) =>
                  actualizarCampo("nombre", v)
                }
                placeholder="Ej. Novillos Lote 1"
              />

              <Campo
                label="Categoría"
                value={form.categoria}
                onChange={(v) =>
                  actualizarCampo("categoria", v)
                }
                placeholder="Ej. Novillos"
              />

              <Campo
                label="Raza"
                value={form.raza}
                onChange={(v) =>
                  actualizarCampo("raza", v)
                }
                placeholder="Ej. Nelore"
              />

              <Campo
                label="Cantidad total *"
                type="number"
                value={form.cantidad_total}
                onChange={(v) =>
                  actualizarCampo(
                    "cantidad_total",
                    v
                  )
                }
              />

              <Campo
                label="Machos"
                type="number"
                value={form.cantidad_machos}
                onChange={(v) =>
                  actualizarCampo(
                    "cantidad_machos",
                    v
                  )
                }
              />

              <Campo
                label="Hembras"
                type="number"
                value={form.cantidad_hembras}
                onChange={(v) =>
                  actualizarCampo(
                    "cantidad_hembras",
                    v
                  )
                }
              />

              <Campo
                label="Peso promedio (kg)"
                type="number"
                value={form.peso_promedio}
                onChange={(v) =>
                  actualizarCampo(
                    "peso_promedio",
                    v
                  )
                }
              />

              <Campo
                label="Fecha de ingreso"
                type="date"
                value={form.fecha_ingreso}
                onChange={(v) =>
                  actualizarCampo(
                    "fecha_ingreso",
                    v
                  )
                }
              />

              <Campo
                label="Origen"
                value={form.origen}
                onChange={(v) =>
                  actualizarCampo("origen", v)
                }
                placeholder="Ej. Nacidos en finca"
              />

              <div className="campo">
                <label>Potrero</label>

                <select
                  value={form.potrero_id}
                  onChange={(e) =>
                    actualizarCampo(
                      "potrero_id",
                      e.target.value
                    )
                  }
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
            </div>

            <div className="observaciones">
              <label>Observaciones</label>

              <textarea
                value={form.observaciones}
                onChange={(e) =>
                  actualizarCampo(
                    "observaciones",
                    e.target.value
                  )
                }
                placeholder="Información adicional del lote..."
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
                  : "Guardar lote"}
              </button>
            </div>
          </form>
        )}

        <section className="lotes-panel">
          <div className="panel-header">
            <div>
              <h2>Lotes registrados</h2>
              <span>
                {lotes.length} lote
                {lotes.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {lotes.length === 0 ? (
            <div className="vacio">
              <div className="vacio-icono">
                🐄
              </div>

              <strong>
                No hay lotes registrados
              </strong>

              <span>
                Utiliza “Nuevo lote” para registrar el primero.
              </span>
            </div>
          ) : (
            <>
              <div className="lotes-desktop">
                <div className="tabla-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Lote</th>
                        <th>Categoría</th>
                        <th>Raza</th>
                        <th>Cantidad</th>
                        <th>M / H</th>
                        <th>Peso prom.</th>
                        <th>Potrero</th>
                        <th>Estado</th>
                      </tr>
                    </thead>

                    <tbody>
                      {lotes.map((lote) => (
                        <tr key={lote.id}>
                          <td>
                            <strong>
                              {lote.nombre}
                            </strong>
                          </td>

                          <td>
                            {lote.categoria || "—"}
                          </td>

                          <td>
                            {lote.raza || "—"}
                          </td>

                          <td>
                            {lote.cantidad_total}
                          </td>

                          <td>
                            {lote.cantidad_machos} /{" "}
                            {lote.cantidad_hembras}
                          </td>

                          <td>
                            {lote.peso_promedio
                              ? `${lote.peso_promedio} kg`
                              : "—"}
                          </td>

                          <td>
                            {lote.gan_potreros
                              ?.nombre ||
                              "Sin asignar"}
                          </td>

                          <td>
                            <Estado
                              estado={lote.estado}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lotes-mobile">
                {lotes.map((lote) => (
                  <article
                    key={lote.id}
                    className="lote-card"
                  >
                    <div className="lote-card-top">
                      <div>
                        <span className="lote-label">
                          LOTE
                        </span>
                        <h3>{lote.nombre}</h3>
                      </div>

                      <Estado
                        estado={lote.estado}
                      />
                    </div>

                    <div className="lote-resumen">
                      <div>
                        <span>Cantidad</span>
                        <strong>
                          {lote.cantidad_total}
                        </strong>
                        <small>animales</small>
                      </div>

                      <div>
                        <span>Peso promedio</span>
                        <strong>
                          {lote.peso_promedio
                            ? `${Number(
                                lote.peso_promedio
                              ).toFixed(0)} kg`
                            : "—"}
                        </strong>
                        <small>por animal</small>
                      </div>
                    </div>

                    <div className="lote-datos">
                      <Dato
                        titulo="Categoría"
                        valor={
                          lote.categoria || "—"
                        }
                      />

                      <Dato
                        titulo="Raza"
                        valor={lote.raza || "—"}
                      />

                      <Dato
                        titulo="Machos"
                        valor={String(
                          lote.cantidad_machos
                        )}
                      />

                      <Dato
                        titulo="Hembras"
                        valor={String(
                          lote.cantidad_hembras
                        )}
                      />

                      <Dato
                        titulo="Potrero"
                        valor={
                          lote.gan_potreros
                            ?.nombre ||
                          "Sin asignar"
                        }
                        ancho
                      />

                      {lote.fecha_ingreso && (
                        <Dato
                          titulo="Fecha de ingreso"
                          valor={formatearFecha(
                            lote.fecha_ingreso
                          )}
                        />
                      )}

                      {lote.origen && (
                        <Dato
                          titulo="Origen"
                          valor={lote.origen}
                        />
                      )}
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

        .lotes-main {
          margin-left: 235px;
          min-height: 100vh;
          background: #f4f7f3;
          padding: 32px;
          font-family: Arial, sans-serif;
          color: #20352a;
          overflow-x: hidden;
        }

        .lotes-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #176b3a;
          font-weight: 700;
        }

        .lotes-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 25px;
        }

        .lotes-header h1 {
          margin: 0;
          font-size: 28px;
          color: #143e28;
        }

        .lotes-header p {
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

        .resumen-card > span {
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
          box-shadow:
            0 5px 18px rgba(26, 72, 45, 0.04);
        }

        .formulario h2 {
          margin: 0 0 22px;
          color: #244b34;
          font-size: 18px;
        }

        .form-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
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
          font-family: inherit;
          color: #20352a;
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

        .lotes-panel {
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
          white-space: nowrap;
        }

        .estado {
          display: inline-block;
          padding: 5px 9px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: capitalize;
          white-space: nowrap;
        }

        .estado-activo {
          background: #edf8f0;
          color: #176b3a;
        }

        .estado-feedlot {
          background: #fff4dd;
          color: #9a6700;
        }

        .estado-otro {
          background: #f1f3f1;
          color: #647168;
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

        .lotes-mobile {
          display: none;
        }
                /* ===========================
           TABLET
        =========================== */

        @media (max-width: 1100px) and (min-width: 821px) {
          .lotes-main {
            padding: 24px;
          }

          .resumen-grid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
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

          .lotes-main {
            margin-left: 0;
            width: 100%;
            max-width: 100%;
            min-height: 100vh;
            padding: 84px 14px 28px;
            overflow-x: hidden;
          }

          .lotes-loading {
            padding-top: 84px;
          }

          .lotes-header {
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
            margin-bottom: 18px;
          }

          .lotes-header h1 {
            font-size: 25px;
          }

          .lotes-header p {
            margin-top: 6px;
            font-size: 13px;
            line-height: 1.4;
          }

          .boton-header {
            width: 100%;
            min-height: 46px;
          }

          .resumen-grid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
            gap: 8px;
            margin-bottom: 16px;
          }

          .resumen-card {
            padding: 13px 10px;
            border-radius: 12px;
            gap: 5px;
            min-height: 105px;
          }

          .resumen-card > span {
            font-size: 10px;
            line-height: 1.25;
          }

          .resumen-card strong {
            font-size: 24px;
            line-height: 1.1;
          }

          .resumen-card small {
            font-size: 9px;
            line-height: 1.25;
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
            padding-left: 8px;
            padding-right: 8px;
          }

          /* LOTES REGISTRADOS */

          .lotes-panel {
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

          .lotes-desktop {
            display: none;
          }

          .lotes-mobile {
            display: block;
            padding: 12px;
          }

          .lote-card {
            background: #ffffff;
            border: 1px solid #dfe8e2;
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 10px;
            min-width: 0;
          }

          .lote-card:last-child {
            margin-bottom: 0;
          }

          .lote-card-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            padding-bottom: 13px;
            border-bottom: 1px solid #edf1ee;
          }

          .lote-label {
            display: block;
            color: #94a198;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 1px;
            margin-bottom: 3px;
          }

          .lote-card-top h3 {
            margin: 0;
            color: #174c2e;
            font-size: 18px;
            overflow-wrap: anywhere;
          }

          .lote-resumen {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            padding: 15px 0;
            border-bottom: 1px solid #edf1ee;
          }

          .lote-resumen > div {
            background: #f6faf7;
            border-radius: 9px;
            padding: 12px;
            min-width: 0;
          }

          .lote-resumen span {
            display: block;
            color: #849188;
            font-size: 10px;
            margin-bottom: 5px;
          }

          .lote-resumen strong {
            display: block;
            color: #176b3a;
            font-size: 22px;
            line-height: 1.1;
            overflow-wrap: anywhere;
          }

          .lote-resumen small {
            display: block;
            color: #9aa59e;
            font-size: 9px;
            margin-top: 4px;
          }

          .lote-datos {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 13px 10px;
            padding-top: 14px;
          }

          .lote-dato {
            min-width: 0;
          }

          .lote-dato-ancho {
            grid-column: 1 / -1;
            background: #f6faf7;
            border-radius: 8px;
            padding: 10px 11px;
          }

          .lote-dato span {
            display: block;
            color: #8a9890;
            font-size: 10px;
            margin-bottom: 4px;
          }

          .lote-dato strong {
            display: block;
            color: #35483b;
            font-size: 12px;
            overflow-wrap: anywhere;
          }
        }

        @media (max-width: 380px) {
          .lotes-main {
            padding-left: 10px;
            padding-right: 10px;
          }

          .resumen-grid {
            gap: 6px;
          }

          .resumen-card {
            padding: 12px 7px;
          }

          .resumen-card > span {
            font-size: 9px;
          }

          .resumen-card strong {
            font-size: 22px;
          }

          .resumen-card small {
            font-size: 8px;
          }
        }
      `}</style>
    </>
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
    <div className="campo">
      <label>{label}</label>

      <input
        type={type}
        value={value}
        min={
          type === "number"
            ? "0"
            : undefined
        }
        step={
          type === "number"
            ? "any"
            : undefined
        }
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
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
    <div className="resumen-card">
      <span>{titulo}</span>
      <strong>{valor}</strong>
      <small>{detalle}</small>
    </div>
  );
}

function Estado({
  estado,
}: {
  estado: string;
}) {
  const clase =
    estado === "activo"
      ? "estado-activo"
      : estado === "feedlot"
      ? "estado-feedlot"
      : "estado-otro";

  return (
    <span className={`estado ${clase}`}>
      {estado === "feedlot"
        ? "Feedlot"
        : estado === "activo"
        ? "Activo"
        : estado}
    </span>
  );
}

function Dato({
  titulo,
  valor,
  ancho = false,
}: {
  titulo: string;
  valor: string;
  ancho?: boolean;
}) {
  return (
    <div
      className={`lote-dato ${
        ancho ? "lote-dato-ancho" : ""
      }`}
    >
      <span>{titulo}</span>
      <strong>{valor}</strong>
    </div>
  );
}

function formatearFecha(fecha: string) {
  const partes = fecha.split("-");

  if (partes.length !== 3) {
    return fecha;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}
