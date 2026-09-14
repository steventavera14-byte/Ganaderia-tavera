"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Sidebar from "../components/Sidebar";

type Lote = {
  id: string;
  nombre: string;
  cantidad_total: number;
  cantidad_machos: number;
  cantidad_hembras: number;
  peso_promedio: number | null;
  potrero_id: string | null;
  estado: string;
};

type Potrero = {
  id: string;
  nombre: string;
  hectareas: number | null;
  estado: string;
};

type Nacimiento = {
  cantidad: number;
  sexo: string | null;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  const [nombreUsuario, setNombreUsuario] =
    useState("Steven");

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [potreros, setPotreros] = useState<Potrero[]>([]);
  const [nacimientos, setNacimientos] =
    useState<Nacimiento[]>([]);

  useEffect(() => {
    iniciarDashboard();
  }, []);

  const iniciarDashboard = async () => {
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
        .select("finca_id, nombre, rol, activo")
        .eq("user_id", user.id)
        .eq("activo", true)
        .maybeSingle();

    if (errorUsuario || !usuario) {
      await supabase.auth.signOut();
      window.location.href = "/";
      return;
    }

    if (usuario.nombre) {
      const primerNombre =
        usuario.nombre.split(" ")[0];

      setNombreUsuario(primerNombre);
    }

    await cargarDashboard(usuario.finca_id);

    setLoading(false);
  };

  const cargarDashboard = async (
    fincaId: string
  ) => {
    const [
      resultadoLotes,
      resultadoPotreros,
      resultadoNacimientos,
    ] = await Promise.all([
      supabase
        .from("gan_lotes_ganado")
        .select(
          `
          id,
          nombre,
          cantidad_total,
          cantidad_machos,
          cantidad_hembras,
          peso_promedio,
          potrero_id,
          estado
        `
        )
        .eq("finca_id", fincaId)
        .in("estado", ["activo", "feedlot"])
        .order("nombre"),

      supabase
        .from("gan_potreros")
        .select(
          `
          id,
          nombre,
          hectareas,
          estado
        `
        )
        .eq("finca_id", fincaId)
        .order("nombre"),

      supabase
        .from("gan_lote_eventos")
        .select(
          `
          cantidad,
          sexo,
          gan_lotes_ganado!inner (
            finca_id
          )
        `
        )
        .eq("tipo", "nacimiento")
        .eq(
          "gan_lotes_ganado.finca_id",
          fincaId
        ),
    ]);

    if (resultadoLotes.error) {
      console.error(
        "Error cargando lotes:",
        resultadoLotes.error
      );
    }

    if (resultadoPotreros.error) {
      console.error(
        "Error cargando potreros:",
        resultadoPotreros.error
      );
    }

    if (resultadoNacimientos.error) {
      console.error(
        "Error cargando nacimientos:",
        resultadoNacimientos.error
      );
    }

    setLotes(resultadoLotes.data || []);
    setPotreros(resultadoPotreros.data || []);

    setNacimientos(
      (resultadoNacimientos.data ||
        []) as unknown as Nacimiento[]
    );
  };

  const ganadoTotal = lotes.reduce(
    (suma, lote) =>
      suma + Number(lote.cantidad_total || 0),
    0
  );

  const lotesActivos = lotes.length;

  const machosNacidos = nacimientos
    .filter(
      (nacimiento) =>
        nacimiento.sexo === "macho"
    )
    .reduce(
      (suma, nacimiento) =>
        suma +
        Number(nacimiento.cantidad || 0),
      0
    );

  const hembrasNacidas = nacimientos
    .filter(
      (nacimiento) =>
        nacimiento.sexo === "hembra"
    )
    .reduce(
      (suma, nacimiento) =>
        suma +
        Number(nacimiento.cantidad || 0),
      0
    );

  const totalNacimientos =
    machosNacidos + hembrasNacidas;

  const animalesConPeso = lotes.filter(
    (lote) =>
      lote.peso_promedio !== null &&
      Number(lote.peso_promedio) > 0 &&
      Number(lote.cantidad_total) > 0
  );

  const pesoTotalPonderado =
    animalesConPeso.reduce(
      (suma, lote) =>
        suma +
        Number(lote.peso_promedio || 0) *
          Number(lote.cantidad_total || 0),
      0
    );

  const cantidadConPeso =
    animalesConPeso.reduce(
      (suma, lote) =>
        suma +
        Number(lote.cantidad_total || 0),
      0
    );

  const pesoPromedio =
    cantidadConPeso > 0
      ? pesoTotalPonderado /
        cantidadConPeso
      : 0;

  const superficieTotal =
    potreros.reduce(
      (suma, potrero) =>
        suma +
        Number(potrero.hectareas || 0),
      0
    );

  const potrerosConGanado = new Set(
    lotes
      .filter(
        (lote) =>
          lote.potrero_id &&
          Number(lote.cantidad_total) > 0
      )
      .map((lote) => lote.potrero_id)
  ).size;

  if (loading) {
    return (
      <main style={estilos.cargando}>
        Cargando Ganadería Tavera...
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
              Hola, {nombreUsuario}
            </h1>

            <p style={estilos.subtitulo}>
              Resumen general de Ganadería Tavera
            </p>
          </div>

          <div style={estilos.operacion}>
            🟢 Operación activa
          </div>
        </header>

        <div style={estilos.tarjetas}>
          <Tarjeta
            titulo="Ganado total"
            valor={String(ganadoTotal)}
            detalle="Animales en lotes activos"
            icono="🐄"
          />

          <Tarjeta
            titulo="Lotes activos"
            valor={String(lotesActivos)}
            detalle="Grupos de ganado"
            icono="▣"
          />

          <Tarjeta
            titulo="Nacimientos"
            valor={String(
              totalNacimientos
            )}
            detalle="Registrados"
            icono="🐮"
          />

          <Tarjeta
            titulo="Peso promedio"
            valor={
              pesoPromedio > 0
                ? `${Math.round(
                    pesoPromedio
                  )} kg`
                : "—"
            }
            detalle="Promedio ponderado"
            icono="⚖"
          />

          <Tarjeta
            titulo="Potreros"
            valor={String(
              potreros.length
            )}
            detalle={`${superficieTotal} ha registradas`}
            icono="🌱"
          />

          <Tarjeta
            titulo="Gastos"
            valor="$0"
            detalle="Pendiente de conectar"
            icono="$"
          />
        </div>

        <div style={estilos.gridSuperior}>
          <Panel titulo="Distribución del ganado">
            {lotes.length === 0 ? (
              <div style={estilos.vacio}>
                Los datos de lotes y potreros
                aparecerán aquí.
              </div>
            ) : (
              <div>
                {lotes.map((lote) => (
                  <div
                    key={lote.id}
                    style={
                      estilos.filaResumen
                    }
                  >
                    <div>
                      <strong>
                        {lote.nombre}
                      </strong>

                      <div
                        style={
                          estilos.detalleFila
                        }
                      >
                        {Number(
                          lote.cantidad_machos ||
                            0
                        )}{" "}
                        machos ·{" "}
                        {Number(
                          lote.cantidad_hembras ||
                            0
                        )}{" "}
                        hembras
                      </div>
                    </div>

                    <strong
                      style={
                        estilos.numeroVerde
                      }
                    >
                      {Number(
                        lote.cantidad_total ||
                          0
                      )}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel titulo="Resumen de nacimientos">
            <FilaDato
              texto="Machos"
              valor={machosNacidos}
            />

            <FilaDato
              texto="Hembras"
              valor={hembrasNacidas}
            />

            <FilaDato
              texto="Total"
              valor={totalNacimientos}
            />
          </Panel>
        </div>

        <div style={estilos.gridInferior}>
          <Panel titulo="Potreros">
            <FilaDato
              texto="Potreros registrados"
              valor={potreros.length}
            />

            <FilaDato
              texto="Potreros con ganado"
              valor={potrerosConGanado}
            />

            <FilaDato
              texto="Superficie registrada"
              valor={`${superficieTotal} ha`}
            />
          </Panel>

          <Panel titulo="Alertas y pendientes">
            <div style={estilos.vacio}>
              No hay alertas pendientes.
            </div>
          </Panel>
        </div>
      </section>
    </main>
  );
}

function Tarjeta({
  titulo,
  valor,
  detalle,
  icono,
}: {
  titulo: string;
  valor: string;
  detalle: string;
  icono: string;
}) {
  return (
    <div style={estilos.tarjeta}>
      <div
        style={
          estilos.tarjetaEncabezado
        }
      >
        <span
          style={
            estilos.tarjetaTitulo
          }
        >
          {titulo}
        </span>

        <div
          style={estilos.iconoTarjeta}
        >
          {icono}
        </div>
      </div>

      <strong
        style={estilos.tarjetaValor}
      >
        {valor}
      </strong>

      <span
        style={estilos.tarjetaDetalle}
      >
        {detalle}
      </span>
    </div>
  );
}

function Panel({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div style={estilos.panel}>
      <h2 style={estilos.panelTitulo}>
        {titulo}
      </h2>

      {children}
    </div>
  );
}

function FilaDato({
  texto,
  valor,
}: {
  texto: string;
  valor: string | number;
}) {
  return (
    <div style={estilos.filaDato}>
      <span>{texto}</span>

      <strong
        style={estilos.numeroVerde}
      >
        {valor}
      </strong>
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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "28px",
  },

  titulo: {
    margin: 0,
    color: "#143e28",
    fontSize: "28px",
  },

  subtitulo: {
    margin: "7px 0 0",
    color: "#718078",
    fontSize: "14px",
  },

  operacion: {
    background: "white",
    border: "1px solid #e0e8e2",
    borderRadius: "11px",
    padding: "11px 16px",
    fontSize: "13px",
  },

  tarjetas: {
    display: "grid",
    gridTemplateColumns:
      "repeat(6, minmax(0, 1fr))",
    gap: "18px",
    marginBottom: "22px",
  },

  tarjeta: {
    background: "white",
    border: "1px solid #e0e8e2",
    borderRadius: "14px",
    padding: "18px",
    minHeight: "108px",
  },

  tarjetaEncabezado: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "14px",
  },

  tarjetaTitulo: {
    color: "#718078",
    fontSize: "13px",
    fontWeight: 600,
  },

  iconoTarjeta: {
    width: "34px",
    height: "34px",
    borderRadius: "9px",
    background: "#edf4ef",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  tarjetaValor: {
    display: "block",
    color: "#176b3a",
    fontSize: "26px",
    marginBottom: "6px",
  },

  tarjetaDetalle: {
    color: "#98a39c",
    fontSize: "12px",
  },

  gridSuperior: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "20px",
    marginBottom: "20px",
  },

  gridInferior: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  },

  panel: {
    background: "white",
    border: "1px solid #e0e8e2",
    borderRadius: "15px",
    padding: "22px",
    minHeight: "180px",
  },

  panelTitulo: {
    margin: "0 0 20px",
    fontSize: "17px",
    color: "#244b34",
  },

  filaResumen: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "13px 14px",
    background: "#f7faf7",
    borderRadius: "9px",
    marginBottom: "9px",
  },

  detalleFila: {
    color: "#8a978f",
    fontSize: "11px",
    marginTop: "5px",
  },

  numeroVerde: {
    color: "#176b3a",
  },

  filaDato: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "#f7faf7",
    borderRadius: "8px",
    padding: "12px 14px",
    marginBottom: "10px",
    fontSize: "13px",
  },

  vacio: {
    minHeight: "130px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    color: "#91a097",
    fontSize: "14px",
  },
};
