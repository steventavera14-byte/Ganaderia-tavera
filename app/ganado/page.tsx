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

    const { data: usuario, error: errorUsuario } =
      await supabase
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
      setMensaje(
        `Error al cargar ganado: ${error.message}`
      );
      setLoading(false);
      return;
    }

    setLotes((data || []) as unknown as Lote[]);
    setLoading(false);
  };

  const totalGanado = lotes.reduce(
    (total, lote) =>
      total + Number(lote.cantidad_total || 0),
    0
  );

  const totalMachos = lotes.reduce(
    (total, lote) =>
      total + Number(lote.cantidad_machos || 0),
    0
  );

  const totalHembras = lotes.reduce(
    (total, lote) =>
      total + Number(lote.cantidad_hembras || 0),
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
      <main style={estilos.cargando}>
        Cargando ganado...
      </main>
    );
  }

  return (
    <main style={estilos.pagina}>
      <Sidebar />

      <section style={estilos.contenido}>
        <header style={estilos.header}>
          <div>
            <h1 style={estilos.titulo}>
              Ganado
            </h1>

            <p style={estilos.subtitulo}>
              Inventario general de ganado de la finca
            </p>
          </div>
        </header>

        {mensaje && (
          <div style={estilos.mensaje}>
            {mensaje}
          </div>
        )}

        <div style={estilos.resumenGrid}>
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
        </div>

        <div style={estilos.panel}>
          <div style={estilos.panelHeader}>
            <div>
              <h2 style={estilos.panelTitulo}>
                Inventario por lote
              </h2>

              <span style={estilos.panelSubtitulo}>
                {lotes.length} lote
                {lotes.length === 1 ? "" : "s"} activo
                {lotes.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {lotes.length === 0 ? (
            <div style={estilos.vacio}>
              <div style={{ fontSize: "42px" }}>
                🐄
              </div>

              <strong>
                No hay ganado registrado
              </strong>

              <span>
                Los animales aparecerán aquí cuando
                registres lotes de ganado.
              </span>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={estilos.tabla}>
                <thead>
                  <tr>
                    <th style={estilos.th}>
                      Lote
                    </th>

                    <th style={estilos.th}>
                      Categoría
                    </th>

                    <th style={estilos.th}>
                      Raza
                    </th>

                    <th style={estilos.th}>
                      Total
                    </th>

                    <th style={estilos.th}>
                      Machos
                    </th>

                    <th style={estilos.th}>
                      Hembras
                    </th>

                    <th style={estilos.th}>
                      Peso prom.
                    </th>

                    <th style={estilos.th}>
                      Ubicación
                    </th>

                    <th style={estilos.th}>
                      Estado
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {lotes.map((lote) => (
                    <tr key={lote.id}>
                      <td style={estilos.td}>
                        <strong>
                          {lote.nombre}
                        </strong>
                      </td>

                      <td style={estilos.td}>
                        {lote.categoria || "—"}
                      </td>

                      <td style={estilos.td}>
                        {lote.raza || "—"}
                      </td>

                      <td style={estilos.td}>
                        <strong>
                          {lote.cantidad_total}
                        </strong>
                      </td>

                      <td style={estilos.td}>
                        {lote.cantidad_machos}
                      </td>

                      <td style={estilos.td}>
                        {lote.cantidad_hembras}
                      </td>

                      <td style={estilos.td}>
                        {lote.peso_promedio
                          ? `${Number(
                              lote.peso_promedio
                            ).toFixed(0)} kg`
                          : "—"}
                      </td>

                      <td style={estilos.td}>
                        {lote.gan_potreros?.nombre ||
                          "Sin potrero"}
                      </td>

                      <td style={estilos.td}>
                        <span
                          style={{
                            ...estilos.estado,
                            background:
                              lote.estado === "feedlot"
                                ? "#fff4dd"
                                : "#eaf6ee",
                            color:
                              lote.estado === "feedlot"
                                ? "#9a6700"
                                : "#176b3a",
                          }}
                        >
                          {lote.estado === "feedlot"
                            ? "Feedlot"
                            : "Activo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={estilos.nota}>
          <strong>Gestión por lotes</strong>

          <span>
            Actualmente el inventario se administra
            por lotes. Más adelante podremos habilitar
            identificación individual por caravana sin
            cambiar esta estructura.
          </span>
        </div>
      </section>
    </main>
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

  contenido: {
    marginLeft: "235px",
    padding: "32px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
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

  mensaje: {
    padding: "12px 15px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontSize: "13px",
    background: "#fff1f1",
    color: "#b42318",
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

  panel: {
    background: "white",
    border: "1px solid #e0e8e2",
    borderRadius: "15px",
    overflow: "hidden",
  },

  panelHeader: {
    padding: "20px 22px",
    borderBottom: "1px solid #edf1ee",
  },

  panelTitulo: {
    margin: 0,
    fontSize: "17px",
    color: "#244b34",
  },

  panelSubtitulo: {
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
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 700,
  },

  vacio: {
    minHeight: "270px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    color: "#829087",
    fontSize: "13px",
  },

  nota: {
    marginTop: "18px",
    padding: "15px 18px",
    background: "#edf5ef",
    border: "1px solid #d9e8dd",
    borderRadius: "12px",
    color: "#53675b",
    fontSize: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
};
