"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Sidebar from "../components/Sidebar";

type Lote = {
  id: string;
  nombre: string;
  categoria: string | null;
  raza: string | null;
  cantidad_total: number;
  cantidad_machos: number;
  cantidad_hembras: number;
  peso_promedio: number | null;
  estado: string;
  potrero_id: string | null;
  gan_potreros?: {
    nombre: string;
  } | null;
};

export default function GanadoPage() {
  const [loading, setLoading] = useState(true);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [mensaje, setMensaje] = useState("");

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
        estado,
        potrero_id,
        gan_potreros (
          nombre
        )
      `)
      .eq("finca_id", usuario.finca_id)
      .in("estado", ["activo", "feedlot"])
      .order("nombre");

    if (error) {
      setMensaje(`Error al cargar ganado: ${error.message}`);
      setLoading(false);
      return;
    }

    setLotes((data || []) as unknown as Lote[]);
    setLoading(false);
  };

  const totalGanado = lotes.reduce(
    (total, lote) => total + Number(lote.cantidad_total || 0),
    0
  );

  const totalMachos = lotes.reduce(
    (total, lote) => total + Number(lote.cantidad_machos || 0),
    0
  );

  const totalHembras = lotes.reduce(
    (total, lote) => total + Number(lote.cantidad_hembras || 0),
    0
  );

  const pesoPonderado =
    totalGanado > 0
      ? lotes.reduce(
          (total, lote) =>
            total +
            Number(lote.peso_promedio || 0) *
              Number(lote.cantidad_total || 0),
          0
        ) / totalGanado
      : 0;

  if (loading) {
    return (
      <>
        <Sidebar />
        <main className="ganado-main ganado-loading">
          Cargando ganado...
        </main>
      </>
    );
  }

  return (
    <>
      <Sidebar />

      <main className="ganado-main">
        <header className="ganado-header">
          <div>
            <h1>Ganado</h1>
            <p>Inventario general de ganado de la finca</p>
          </div>
        </header>

        {mensaje && <div className="mensaje-error">{mensaje}</div>}

        <section className="resumen-grid">
          <Tarjeta
            titulo="Ganado total"
            valor={String(totalGanado)}
            detalle="Animales activos"
          />

          <Tarjeta
            titulo="Machos"
            valor={String(totalMachos)}
            detalle="Inventario actual"
          />

          <Tarjeta
            titulo="Hembras"
            valor={String(totalHembras)}
            detalle="Inventario actual"
          />

          <Tarjeta
            titulo="Peso promedio"
            valor={
              pesoPonderado > 0
                ? `${pesoPonderado.toFixed(0)} kg`
                : "—"
            }
            detalle="Promedio ponderado"
          />
        </section>

        <section className="inventario-panel">
          <div className="panel-header">
            <div>
              <h2>Inventario por lote</h2>
              <span>
                {lotes.length} lote
                {lotes.length === 1 ? "" : "s"} activo
                {lotes.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {lotes.length === 0 ? (
            <div className="vacio">
              <div className="vacio-icono">🐄</div>

              <strong>No hay ganado registrado</strong>

              <span>
                Los animales aparecerán aquí cuando registres lotes
                de ganado.
              </span>
            </div>
          ) : (
            <>
              <div className="inventario-desktop">
                <div className="tabla-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Lote</th>
                        <th>Categoría</th>
                        <th>Raza</th>
                        <th>Total</th>
                        <th>Machos</th>
                        <th>Hembras</th>
                        <th>Peso prom.</th>
                        <th>Ubicación</th>
                        <th>Estado</th>
                      </tr>
                    </thead>

                    <tbody>
                      {lotes.map((lote) => (
                        <tr key={lote.id}>
                          <td>
                            <strong>{lote.nombre}</strong>
                          </td>

                          <td>{lote.categoria || "—"}</td>

                          <td>{lote.raza || "—"}</td>

                          <td>
                            <strong>{lote.cantidad_total}</strong>
                          </td>

                          <td>{lote.cantidad_machos}</td>

                          <td>{lote.cantidad_hembras}</td>

                          <td>
                            {lote.peso_promedio
                              ? `${Number(
                                  lote.peso_promedio
                                ).toFixed(0)} kg`
                              : "—"}
                          </td>

                          <td>
                            {lote.gan_potreros?.nombre ||
                              "Sin potrero"}
                          </td>

                          <td>
                            <Estado estado={lote.estado} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="inventario-mobile">
                {lotes.map((lote) => (
                  <article
                    key={lote.id}
                    className="lote-card-mobile"
                  >
                    <div className="lote-card-header">
                      <div>
                        <span className="lote-etiqueta">
                          LOTE
                        </span>
                        <h3>{lote.nombre}</h3>
                      </div>

                      <Estado estado={lote.estado} />
                    </div>

                    <div className="lote-principal">
                      <div>
                        <span>Total</span>
                        <strong>{lote.cantidad_total}</strong>
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
                        valor={lote.categoria || "—"}
                      />

                      <Dato
                        titulo="Raza"
                        valor={lote.raza || "—"}
                      />

                      <Dato
                        titulo="Machos"
                        valor={String(lote.cantidad_machos)}
                      />

                      <Dato
                        titulo="Hembras"
                        valor={String(lote.cantidad_hembras)}
                      />

                      <Dato
                        titulo="Potrero"
                        valor={
                          lote.gan_potreros?.nombre ||
                          "Sin potrero"
                        }
                      />
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="nota-lotes">
          <strong>Gestión por lotes</strong>

          <span>
            Actualmente el inventario se administra por lotes.
            Más adelante podremos habilitar identificación
            individual por caravana sin cambiar esta estructura.
          </span>
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

        .ganado-main {
          margin-left: 235px;
          min-height: 100vh;
          background: #f4f7f3;
          padding: 32px;
          font-family: Arial, sans-serif;
          color: #20352a;
          overflow-x: hidden;
        }

        .ganado-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #176b3a;
          font-weight: 700;
        }

        .ganado-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }

        .ganado-header h1 {
          margin: 0;
          font-size: 28px;
          color: #143e28;
        }

        .ganado-header p {
          margin: 7px 0 0;
          color: #718078;
          font-size: 14px;
        }

        .mensaje-error {
          padding: 12px 15px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-size: 13px;
          background: #fff1f1;
          color: #b42318;
        }

        .resumen-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
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

        .inventario-panel {
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
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .estado-activo {
          background: #eaf6ee;
          color: #176b3a;
        }

        .estado-feedlot {
          background: #fff4dd;
          color: #9a6700;
        }

        .vacio {
          min-height: 270px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: #829087;
          font-size: 13px;
          text-align: center;
          padding: 25px;
        }

        .vacio-icono {
          font-size: 42px;
        }

        .nota-lotes {
          margin-top: 18px;
          padding: 15px 18px;
          background: #edf5ef;
          border: 1px solid #d9e8dd;
          border-radius: 12px;
          color: #53675b;
          font-size: 12px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .inventario-mobile {
          display: none;
        }
                /* ===========================
           TABLET
        =========================== */

        @media (max-width: 1100px) and (min-width: 821px) {
          .ganado-main {
            padding: 24px;
          }

          .resumen-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
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

          .ganado-main {
            margin-left: 0;
            width: 100%;
            max-width: 100%;
            min-height: 100vh;
            padding: 84px 14px 28px;
            overflow-x: hidden;
          }

          .ganado-loading {
            padding-top: 84px;
          }

          .ganado-header {
            margin-bottom: 18px;
          }

          .ganado-header h1 {
            font-size: 25px;
          }

          .ganado-header p {
            margin-top: 6px;
            font-size: 13px;
            line-height: 1.4;
          }

          .resumen-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 9px;
            margin-bottom: 16px;
          }

          .resumen-card {
            padding: 14px 12px;
            border-radius: 12px;
            min-height: 105px;
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
            line-height: 1.25;
          }

          .inventario-panel {
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

          .inventario-desktop {
            display: none;
          }

          .inventario-mobile {
            display: block;
            padding: 12px;
          }

          .lote-card-mobile {
            border: 1px solid #dfe8e2;
            border-radius: 12px;
            background: #ffffff;
            padding: 14px;
            margin-bottom: 10px;
            min-width: 0;
          }

          .lote-card-mobile:last-child {
            margin-bottom: 0;
          }

          .lote-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            padding-bottom: 13px;
            border-bottom: 1px solid #edf1ee;
          }

          .lote-etiqueta {
            display: block;
            color: #94a198;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 1px;
            margin-bottom: 3px;
          }

          .lote-card-header h3 {
            margin: 0;
            color: #174c2e;
            font-size: 18px;
            overflow-wrap: anywhere;
          }

          .lote-principal {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            padding: 15px 0;
            border-bottom: 1px solid #edf1ee;
          }

          .lote-principal > div {
            background: #f6faf7;
            border-radius: 9px;
            padding: 12px;
            min-width: 0;
          }

          .lote-principal span {
            display: block;
            color: #849188;
            font-size: 10px;
            margin-bottom: 5px;
          }

          .lote-principal strong {
            display: block;
            color: #176b3a;
            font-size: 22px;
            line-height: 1.1;
            overflow-wrap: anywhere;
          }

          .lote-principal small {
            display: block;
            color: #9aa59e;
            font-size: 9px;
            margin-top: 4px;
          }

          .lote-datos {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 13px 10px;
            padding-top: 14px;
          }

          .lote-dato {
            min-width: 0;
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

          .lote-dato:last-child {
            grid-column: 1 / -1;
            background: #f6faf7;
            border-radius: 8px;
            padding: 10px 11px;
          }

          .nota-lotes {
            margin-top: 14px;
            padding: 14px;
            border-radius: 11px;
            font-size: 11px;
            line-height: 1.45;
          }

          .nota-lotes strong {
            font-size: 12px;
            color: #355b43;
          }
        }

        @media (max-width: 380px) {
          .ganado-main {
            padding-left: 10px;
            padding-right: 10px;
          }

          .resumen-grid {
            gap: 7px;
          }

          .resumen-card {
            padding: 12px 10px;
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

function Estado({ estado }: { estado: string }) {
  return (
    <span
      className={`estado ${
        estado === "feedlot"
          ? "estado-feedlot"
          : "estado-activo"
      }`}
    >
      {estado === "feedlot" ? "Feedlot" : "Activo"}
    </span>
  );
}

function Dato({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="lote-dato">
      <span>{titulo}</span>
      <strong>{valor}</strong>
    </div>
  );
}
