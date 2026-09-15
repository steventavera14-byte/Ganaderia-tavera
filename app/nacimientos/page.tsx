"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Sidebar from "../components/Sidebar";

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
    .reduce(
      (suma, r) => suma + Number(r.cantidad || 0),
      0
    );

  const totalHembras = registros
    .filter((r) => r.sexo === "hembra")
    .reduce(
      (suma, r) => suma + Number(r.cantidad || 0),
      0
    );

  const totalNacimientos = registros.reduce(
    (suma, r) => suma + Number(r.cantidad || 0),
    0
  );

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
      <>
        <Sidebar />
        <main className="nacimientos-main nacimientos-loading">
          Cargando nacimientos...
        </main>
      </>
    );
  }

  return (
    <>
      <Sidebar />

      <main className="nacimientos-main">
        <header className="nacimientos-header">
          <div>
            <h1>Nacimientos</h1>
            <p>Registro y control de nacimientos por lote</p>
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
              : "+ Registrar nacimiento"}
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
        </section>

        {mostrarFormulario && (
          <form
            onSubmit={guardarNacimiento}
            className="formulario"
          >
            <h2>Registrar nacimiento</h2>

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
                />
              </div>

              <div className="campo">
                <label>Lote *</label>

                <select
                  value={form.lote_id}
                  onChange={(e) =>
                    seleccionarLote(e.target.value)
                  }
                >
                  <option value="">
                    Seleccionar lote
                  </option>

                  {lotes.map((lote) => (
                    <option
                      key={lote.id}
                      value={lote.id}
                    >
                      {lote.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="campo">
                <label>Potrero</label>

                <select
                  value={form.potrero_id}
                  disabled
                  className="input-disabled"
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

              <div className="campo">
                <label>Sexo *</label>

                <select
                  value={form.sexo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sexo: e.target.value,
                    })
                  }
                >
                  <option value="macho">
                    Macho
                  </option>

                  <option value="hembra">
                    Hembra
                  </option>
                </select>
              </div>

              <div className="campo">
                <label>Cantidad *</label>

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
                />
              </div>

              <div className="campo">
                <label>
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
                placeholder="Información adicional..."
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
                  : "Guardar nacimiento"}
              </button>
            </div>
          </form>
        )}

        <section className="nacimientos-panel">
          <div className="panel-header">
            <h2>Nacimientos registrados</h2>

            <span>
              {registros.length} registro
              {registros.length === 1 ? "" : "s"}
            </span>
          </div>

          {registros.length === 0 ? (
            <div className="vacio">
              <div className="vacio-icono">🐮</div>

              <strong>
                No hay nacimientos registrados
              </strong>

              <span>
                Utiliza “Registrar nacimiento” para comenzar.
              </span>
            </div>
          ) : (
            <>
              <div className="nacimientos-desktop">
                <div className="tabla-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Lote</th>
                        <th>Sexo</th>
                        <th>Cantidad</th>
                        <th>Detalle</th>
                      </tr>
                    </thead>

                    <tbody>
                      {registros.map((registro) => (
                        <tr key={registro.id}>
                          <td>
                            {formatearFecha(
                              registro.fecha
                            )}
                          </td>

                          <td>
                            <strong>
                              {registro.gan_lotes_ganado
                                ?.nombre || "—"}
                            </strong>
                          </td>

                          <td>
                            <SexoBadge
                              sexo={registro.sexo}
                            />
                          </td>

                          <td>{registro.cantidad}</td>

                          <td>
                            {registro.descripcion || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="nacimientos-mobile">
                {registros.map((registro) => (
                  <article
                    key={registro.id}
                    className="nacimiento-card"
                  >
                    <div className="nacimiento-top">
                      <div>
                        <span className="card-label">
                          NACIMIENTO
                        </span>

                        <h3>
                          {registro.gan_lotes_ganado
                            ?.nombre || "Sin lote"}
                        </h3>

                        <span className="fecha-mobile">
                          {formatearFecha(
                            registro.fecha
                          )}
                        </span>
                      </div>

                      <SexoBadge sexo={registro.sexo} />
                    </div>

                    <div className="cantidad-box">
                      <span>Cantidad</span>

                      <strong>
                        {registro.cantidad}
                      </strong>

                      <small>
                        {Number(registro.cantidad) === 1
                          ? "animal"
                          : "animales"}
                      </small>
                    </div>

                    <div className="detalle-mobile">
                      <span>Detalle</span>

                      <strong>
                        {registro.descripcion ||
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

        .nacimientos-main {
          margin-left: 235px;
          min-height: 100vh;
          background: #f4f7f3;
          padding: 32px;
          font-family: Arial, sans-serif;
          color: #20352a;
          overflow-x: hidden;
        }

        .nacimientos-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #176b3a;
          font-weight: 700;
        }

        .nacimientos-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 25px;
        }

        .nacimientos-header h1 {
          margin: 0;
          font-size: 28px;
          color: #143e28;
        }

        .nacimientos-header p {
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

        .campo .input-disabled {
          background: #f3f6f4;
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

        .nacimientos-panel {
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

        .nacimientos-mobile {
          display: none;
        }
                /* ===========================
           TABLET
        =========================== */

        @media (max-width: 1100px) and (min-width: 821px) {
          .nacimientos-main {
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

          .nacimientos-main {
            margin-left: 0;
            width: 100%;
            max-width: 100%;
            min-height: 100vh;
            padding: 84px 14px 28px;
            overflow-x: hidden;
          }

          .nacimientos-loading {
            padding-top: 84px;
          }

          .nacimientos-header {
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
            margin-bottom: 18px;
          }

          .nacimientos-header h1 {
            font-size: 25px;
          }

          .nacimientos-header p {
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

          /* PANEL DE REGISTROS */

          .nacimientos-panel {
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

          /* OCULTAMOS TABLA DE ESCRITORIO */

          .nacimientos-desktop {
            display: none;
          }

          /* FICHAS MÓVILES */

          .nacimientos-mobile {
            display: block;
            padding: 12px;
          }

          .nacimiento-card {
            background: #ffffff;
            border: 1px solid #dfe8e2;
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 10px;
            min-width: 0;
          }

          .nacimiento-card:last-child {
            margin-bottom: 0;
          }

          .nacimiento-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
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

          .nacimiento-top h3 {
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

          .cantidad-box {
            background: #f6faf7;
            border-radius: 9px;
            padding: 13px;
            margin-top: 14px;
          }

          .cantidad-box span {
            display: block;
            color: #849188;
            font-size: 10px;
            margin-bottom: 5px;
          }

          .cantidad-box strong {
            display: block;
            color: #176b3a;
            font-size: 25px;
            line-height: 1.1;
          }

          .cantidad-box small {
            display: block;
            color: #9aa59e;
            font-size: 9px;
            margin-top: 4px;
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
          .nacimientos-main {
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
            font-size: 23px;
          }

          .resumen-card small {
            font-size: 8px;
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

function SexoBadge({
  sexo,
}: {
  sexo: string | null;
}) {
  const esHembra = sexo === "hembra";

  return (
    <>
      <span
        className={`sexo-badge ${
          esHembra
            ? "sexo-hembra"
            : "sexo-macho"
        }`}
      >
        {esHembra
          ? "Hembra"
          : sexo === "macho"
          ? "Macho"
          : sexo || "—"}
      </span>

      <style jsx>{`
        .sexo-badge {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .sexo-macho {
          background: #eef4ff;
          color: #315b9b;
        }

        .sexo-hembra {
          background: #fff0f6;
          color: #a43b6b;
        }
      `}</style>
    </>
  );
}
