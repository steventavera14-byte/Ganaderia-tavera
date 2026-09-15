"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Sidebar from "../components/Sidebar";

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

    if (form.hectareas && Number(form.hectareas) <= 0) {
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
      <>
        <Sidebar />
        <main className="potreros-main potreros-loading">
          Cargando potreros...
        </main>
      </>
    );
  }

  return (
    <>
      <Sidebar />

      <main className="potreros-main">
        <header className="potreros-header">
          <div>
            <h1>Potreros</h1>
            <p>
              Administración de potreros y superficie ganadera
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
              setMostrarFormulario(!mostrarFormulario);
            }}
          >
            {mostrarFormulario
              ? "Cancelar"
              : "+ Nuevo potrero"}
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
        </section>

        {mostrarFormulario && (
          <form
            onSubmit={guardarPotrero}
            className="formulario"
          >
            <h2>Registrar nuevo potrero</h2>

            <div className="form-grid">
              <div className="campo">
                <label>Nombre del potrero *</label>

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
                />
              </div>

              <div className="campo">
                <label>Superficie (ha)</label>

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
                />
              </div>

              <div className="campo">
                <label>Estado</label>

                <select
                  value={form.estado}
                  onChange={(e) =>
                    actualizarCampo(
                      "estado",
                      e.target.value
                    )
                  }
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
                placeholder="Información adicional del potrero..."
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
                  : "Guardar potrero"}
              </button>
            </div>
          </form>
        )}

        <section className="potreros-panel">
          <div className="panel-header">
            <div>
              <h2>Potreros registrados</h2>

              <span>
                {potreros.length} potrero
                {potreros.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {potreros.length === 0 ? (
            <div className="vacio">
              <div className="vacio-icono">🌱</div>

              <strong>No hay potreros registrados</strong>

              <span>
                Utiliza “Nuevo potrero” para registrar el primero.
              </span>
            </div>
          ) : (
            <>
              <div className="potreros-desktop">
                <div className="tabla-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Potrero</th>
                        <th>Superficie</th>
                        <th>Estado</th>
                        <th>Observaciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {potreros.map((potrero) => (
                        <tr key={potrero.id}>
                          <td>
                            <strong>{potrero.nombre}</strong>
                          </td>

                          <td>
                            {potrero.hectareas
                              ? `${Number(
                                  potrero.hectareas
                                ).toLocaleString()} ha`
                              : "—"}
                          </td>

                          <td>
                            <Estado estado={potrero.estado} />
                          </td>

                          <td>
                            {potrero.observaciones || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="potreros-mobile">
                {potreros.map((potrero) => (
                  <article
                    key={potrero.id}
                    className="potrero-card"
                  >
                    <div className="potrero-card-top">
                      <div>
                        <span className="potrero-label">
                          POTRERO
                        </span>

                        <h3>{potrero.nombre}</h3>
                      </div>

                      <Estado estado={potrero.estado} />
                    </div>

                    <div className="potrero-superficie">
                      <span>Superficie</span>

                      <strong>
                        {potrero.hectareas
                          ? `${Number(
                              potrero.hectareas
                            ).toLocaleString()} ha`
                          : "—"}
                      </strong>
                    </div>

                    <div className="potrero-observaciones">
                      <span>Observaciones</span>

                      <strong>
                        {potrero.observaciones ||
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

        .potreros-main {
          margin-left: 235px;
          min-height: 100vh;
          background: #f4f7f3;
          padding: 32px;
          font-family: Arial, sans-serif;
          color: #20352a;
          overflow-x: hidden;
        }

        .potreros-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #176b3a;
          font-weight: 700;
        }

        .potreros-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 25px;
        }

        .potreros-header h1 {
          margin: 0;
          font-size: 28px;
          color: #143e28;
        }

        .potreros-header p {
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
            repeat(4, minmax(0, 1fr));
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

        .potreros-panel {
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

        .potreros-mobile {
          display: none;
        }
                /* ===========================
           TABLET
        =========================== */

        @media (max-width: 1100px) and (min-width: 821px) {
          .potreros-main {
            padding: 24px;
          }

          .resumen-grid {
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

          .potreros-main {
            margin-left: 0;
            width: 100%;
            max-width: 100%;
            min-height: 100vh;
            padding: 84px 14px 28px;
            overflow-x: hidden;
          }

          .potreros-loading {
            padding-top: 84px;
          }

          .potreros-header {
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
            margin-bottom: 18px;
          }

          .potreros-header h1 {
            font-size: 25px;
          }

          .potreros-header p {
            margin-top: 6px;
            font-size: 13px;
            line-height: 1.4;
          }

          .boton-header {
            width: 100%;
            min-height: 46px;
          }

          /* 4 TARJETAS EN 2 x 2 */

          .resumen-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 16px;
          }

          .resumen-card {
            padding: 15px 13px;
            border-radius: 12px;
            min-height: 118px;
            gap: 6px;
          }

          .resumen-card > span:first-child {
            font-size: 11px;
            line-height: 1.25;
          }

          .resumen-card strong {
            font-size: 25px;
            line-height: 1.1;
          }

          .resumen-card small {
            font-size: 10px;
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
            padding-left: 8px;
            padding-right: 8px;
          }

          /* PANEL */

          .potreros-panel {
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

          /* ESCONDEMOS TABLA DE ESCRITORIO */

          .potreros-desktop {
            display: none;
          }

          /* FICHAS MÓVILES */

          .potreros-mobile {
            display: block;
            padding: 12px;
          }

          .potrero-card {
            background: #ffffff;
            border: 1px solid #dfe8e2;
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 10px;
            min-width: 0;
          }

          .potrero-card:last-child {
            margin-bottom: 0;
          }

          .potrero-card-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            padding-bottom: 13px;
            border-bottom: 1px solid #edf1ee;
          }

          .potrero-label {
            display: block;
            color: #94a198;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 1px;
            margin-bottom: 3px;
          }

          .potrero-card-top h3 {
            margin: 0;
            color: #174c2e;
            font-size: 18px;
            overflow-wrap: anywhere;
          }

          .potrero-superficie {
            background: #f6faf7;
            border-radius: 9px;
            padding: 13px;
            margin-top: 14px;
          }

          .potrero-superficie span {
            display: block;
            color: #849188;
            font-size: 10px;
            margin-bottom: 5px;
          }

          .potrero-superficie strong {
            display: block;
            color: #176b3a;
            font-size: 23px;
            line-height: 1.1;
          }

          .potrero-observaciones {
            padding-top: 14px;
          }

          .potrero-observaciones span {
            display: block;
            color: #8a9890;
            font-size: 10px;
            margin-bottom: 5px;
          }

          .potrero-observaciones strong {
            display: block;
            color: #35483b;
            font-size: 12px;
            line-height: 1.4;
            overflow-wrap: anywhere;
          }
        }

        @media (max-width: 380px) {
          .potreros-main {
            padding-left: 10px;
            padding-right: 10px;
          }

          .resumen-grid {
            gap: 8px;
          }

          .resumen-card {
            padding: 13px 10px;
          }

          .resumen-card strong {
            font-size: 23px;
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

function Estado({
  estado,
}: {
  estado: string;
}) {
  let clase = "estado-disponible";

  if (estado === "ocupado") {
    clase = "estado-ocupado";
  }

  if (estado === "descanso") {
    clase = "estado-descanso";
  }

  if (estado === "mantenimiento") {
    clase = "estado-mantenimiento";
  }

  return (
    <>
      <span className={`estado-potrero ${clase}`}>
        {estado}
      </span>

      <style jsx>{`
        .estado-potrero {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: capitalize;
          white-space: nowrap;
        }

        .estado-disponible {
          background: #edf8f0;
          color: #176b3a;
        }

        .estado-ocupado {
          background: #eef4ff;
          color: #315b9b;
        }

        .estado-descanso {
          background: #fff7e8;
          color: #996515;
        }

        .estado-mantenimiento {
          background: #fff1f1;
          color: #b42318;
        }
      `}</style>
    </>
  );
}
