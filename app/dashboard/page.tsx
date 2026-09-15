"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

type MaquinariaAlerta = {
  id: string;
  nombre: string;
  tipo_medicion: string;
  lectura_actual: number;
};

type ServicioAlerta = {
  id: string;
  maquinaria_id: string;
  descripcion: string;
  proxima_fecha: string | null;
  proxima_lectura: number | null;
  completado: boolean;
};

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [esMovil, setEsMovil] = useState(false);

  const [nombreUsuario, setNombreUsuario] =
    useState("Steven");

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [potreros, setPotreros] = useState<Potrero[]>([]);
  const [nacimientos, setNacimientos] =
    useState<Nacimiento[]>([]);

  const [maquinariaAlertas, setMaquinariaAlertas] =
    useState<MaquinariaAlerta[]>([]);
  const [serviciosAlertas, setServiciosAlertas] =
    useState<ServicioAlerta[]>([]);

  useEffect(() => {
    const comprobarPantalla = () => {
      setEsMovil(window.innerWidth <= 820);
    };

    comprobarPantalla();

    window.addEventListener(
      "resize",
      comprobarPantalla
    );

    iniciarDashboard();

    return () => {
      window.removeEventListener(
        "resize",
        comprobarPantalla
      );
    };
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
      resultadoMaquinaria,
      resultadoServicios,
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

      supabase
        .from("gan_maquinaria")
        .select("id, nombre, tipo_medicion, lectura_actual")
        .eq("finca_id", fincaId),

      supabase
        .from("gan_mantenimiento_programado")
        .select(
          `
            id,
            maquinaria_id,
            descripcion,
            proxima_fecha,
            proxima_lectura,
            completado,
            gan_maquinaria!inner (
              finca_id
            )
          `
        )
        .eq("completado", false)
        .eq("gan_maquinaria.finca_id", fincaId),
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

    if (resultadoMaquinaria.error) {
      console.error(
        "Error cargando maquinaria para alertas:",
        resultadoMaquinaria.error
      );
    }

    if (resultadoServicios.error) {
      console.error(
        "Error cargando servicios programados:",
        resultadoServicios.error
      );
    }

    setMaquinariaAlertas(
      (resultadoMaquinaria.data || []) as MaquinariaAlerta[]
    );

    setServiciosAlertas(
      (resultadoServicios.data || []) as unknown as ServicioAlerta[]
    );
  };

  const ganadoTotal = lotes.reduce(
    (suma, lote) =>
      suma + Number(lote.cantidad_total || 0),
    0
  );

  const machosTotales = lotes.reduce(
    (suma, lote) =>
      suma + Number(lote.cantidad_machos || 0),
    0
  );

  const hembrasTotales = lotes.reduce(
    (suma, lote) =>
      suma + Number(lote.cantidad_hembras || 0),
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
        suma + Number(nacimiento.cantidad || 0),
      0
    );

  const hembrasNacidas = nacimientos
    .filter(
      (nacimiento) =>
        nacimiento.sexo === "hembra"
    )
    .reduce(
      (suma, nacimiento) =>
        suma + Number(nacimiento.cantidad || 0),
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
        suma + Number(lote.cantidad_total || 0),
      0
    );

  const pesoPromedio =
    cantidadConPeso > 0
      ? pesoTotalPonderado / cantidadConPeso
      : 0;

  const superficieTotal = potreros.reduce(
    (suma, potrero) =>
      suma + Number(potrero.hectareas || 0),
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

  const alertasMantenimiento = serviciosAlertas
    .map((servicio) => {
      const maquina = maquinariaAlertas.find(
        (item) => item.id === servicio.maquinaria_id
      );

      if (!maquina) return null;

      const ahora = new Date();
      const hoy = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate()
      );

      let diasRestantes: number | null = null;
      if (servicio.proxima_fecha) {
        const [anio, mes, dia] = servicio.proxima_fecha
          .split("-")
          .map(Number);
        const fecha = new Date(anio, mes - 1, dia);
        diasRestantes = Math.ceil(
          (fecha.getTime() - hoy.getTime()) / 86400000
        );
      }

      let lecturaRestante: number | null = null;
      if (
        servicio.proxima_lectura !== null &&
        servicio.proxima_lectura !== undefined
      ) {
        lecturaRestante =
          Number(servicio.proxima_lectura) -
          Number(maquina.lectura_actual || 0);
      }

      const realizarAhora =
        (diasRestantes !== null && diasRestantes <= 0) ||
        (lecturaRestante !== null && lecturaRestante <= 0);

      const proximo =
        !realizarAhora &&
        ((diasRestantes !== null && diasRestantes <= 10) ||
          (lecturaRestante !== null && lecturaRestante <= 20));

      if (!realizarAhora && !proximo) return null;

      const detalles: string[] = [];

      if (diasRestantes !== null) {
        if (diasRestantes > 1) detalles.push(`faltan ${diasRestantes} días`);
        else if (diasRestantes === 1) detalles.push("falta 1 día");
        else if (diasRestantes === 0) detalles.push("vence hoy");
        else detalles.push(`vencido hace ${Math.abs(diasRestantes)} días`);
      }

      if (lecturaRestante !== null) {
        const unidad =
          maquina.tipo_medicion === "km" ? "km" : "h";

        if (lecturaRestante > 0) {
          detalles.push(
            `faltan ${lecturaRestante.toLocaleString("es-BO")} ${unidad}`
          );
        } else if (lecturaRestante === 0) {
          detalles.push("lectura alcanzada");
        } else {
          detalles.push(
            `superado por ${Math.abs(lecturaRestante).toLocaleString(
              "es-BO"
            )} ${unidad}`
          );
        }
      }

      return {
        id: servicio.id,
        maquinariaId: maquina.id,
        maquina: maquina.nombre,
        servicio: servicio.descripcion,
        nivel: realizarAhora ? "urgente" : "proximo",
        detalle: detalles.join(" · "),
      };
    })
    .filter(Boolean) as {
      id: string;
      maquinariaId: string;
      maquina: string;
      servicio: string;
      nivel: "urgente" | "proximo";
      detalle: string;
    }[];

  alertasMantenimiento.sort((a, b) => {
    if (a.nivel === b.nivel) return 0;
    return a.nivel === "urgente" ? -1 : 1;
  });

  const irA = (ruta: string) => {
    router.push(ruta);
  };

  if (loading) {
    return (
      <main style={estilos.cargando}>
        <div style={estilos.cargandoLogo}>🐂</div>
        <strong>Ganadería Tavera</strong>
        <span style={estilos.cargandoTexto}>
          Cargando información...
        </span>
      </main>
    );
  }

  return (
    <main style={estilos.pagina}>
      <Sidebar />

      <section
        style={{
          ...estilos.contenido,
          ...(esMovil
            ? estilos.contenidoMovil
            : {}),
        }}
      >
        {/* HERO GANADERÍA TAVERA */}

        <section
          style={{
            ...estilos.heroImagen,
            ...(esMovil ? estilos.heroImagenMovil : {}),
          }}
        >
          <img
            src="/ganaderia-tavera-banner.png"
            alt="Ganadería Tavera"
            style={{
              ...estilos.heroBanner,
              ...(esMovil ? estilos.heroBannerMovil : {}),
            }}
          />
        </section>

        {/* TARJETAS PRINCIPALES */}

        <section
          style={{
            ...estilos.tarjetasPrincipales,
            gridTemplateColumns: esMovil
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(4, minmax(0, 1fr))",
          }}
        >
          <TarjetaPrincipal
            icono="🐄"
            titulo="Ganado total"
            valor={String(ganadoTotal)}
            detalle="Animales activos"
            onClick={() => irA("/ganado")}
            compacta={esMovil}
          />

          <TarjetaPrincipal
            icono="⚖️"
            titulo="Peso promedio"
            valor={
              pesoPromedio > 0
                ? `${Math.round(pesoPromedio)} kg`
                : "—"
            }
            detalle="Promedio ponderado"
            onClick={() => irA("/pesajes")}
            compacta={esMovil}
          />

          <TarjetaPrincipal
            icono="🐮"
            titulo="Nacimientos"
            valor={String(totalNacimientos)}
            detalle="Registrados"
            onClick={() => irA("/nacimientos")}
            compacta={esMovil}
          />

          <TarjetaPrincipal
            icono="🌱"
            titulo="Potreros"
            valor={String(potreros.length)}
            detalle={`${superficieTotal} ha`}
            onClick={() => irA("/potreros")}
            compacta={esMovil}
          />
        </section>

        {/* ACCESOS RÁPIDOS */}

        <section style={estilos.seccion}>
          <div style={estilos.tituloSeccionFila}>
            <div>
              <h2 style={estilos.tituloSeccion}>
                Accesos rápidos
              </h2>

              <p style={estilos.subtituloSeccion}>
                Operaciones frecuentes
              </p>
            </div>
          </div>

          <div
            style={{
              ...estilos.accesosGrid,
              gridTemplateColumns: esMovil
                ? "repeat(3, minmax(0, 1fr))"
                : "repeat(6, minmax(0, 1fr))",
            }}
          >
            <AccesoRapido
              icono="🐄"
              texto="Ganado"
              onClick={() => irA("/ganado")}
            />

            <AccesoRapido
              icono="▣"
              texto="Lotes"
              onClick={() => irA("/lotes")}
            />

            <AccesoRapido
              icono="🌱"
              texto="Potreros"
              onClick={() => irA("/potreros")}
            />

            <AccesoRapido
              icono="⚖️"
              texto="Pesajes"
              onClick={() => irA("/pesajes")}
            />

            <AccesoRapido
              icono="♥"
              texto="Sanidad"
              onClick={() => irA("/sanidad")}
            />

            <AccesoRapido
              icono="👥"
              texto="Personal"
              onClick={() => irA("/personal")}
            />
          </div>
        </section>

        {/* INVENTARIO */}

        <section
          style={{
            ...estilos.gridMedio,
            gridTemplateColumns: esMovil
              ? "1fr"
              : "1.6fr 1fr",
          }}
        >
          <div style={estilos.panel}>
            <div style={estilos.panelHeader}>
              <div>
                <h2 style={estilos.panelTitulo}>
                  Distribución del ganado
                </h2>

                <p style={estilos.panelSubtitulo}>
                  Inventario por lote
                </p>
              </div>

              <button
                type="button"
                onClick={() => irA("/lotes")}
                style={estilos.botonVerTodo}
              >
                Ver lotes
              </button>
            </div>

            {lotes.length === 0 ? (
              <div style={estilos.vacio}>
                No hay lotes activos registrados.
              </div>
            ) : (
              <div style={estilos.listaLotes}>
                {lotes.map((lote) => {
                  const porcentaje =
                    ganadoTotal > 0
                      ? (Number(
                          lote.cantidad_total || 0
                        ) /
                          ganadoTotal) *
                        100
                      : 0;

                  return (
                    <div
                      key={lote.id}
                      style={estilos.loteItem}
                    >
                      <div style={estilos.loteFila}>
                        <div>
                          <strong
                            style={estilos.loteNombre}
                          >
                            {lote.nombre}
                          </strong>

                          <div
                            style={
                              estilos.loteDetalle
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

                        <div
                          style={
                            estilos.loteCantidad
                          }
                        >
                          {Number(
                            lote.cantidad_total || 0
                          )}
                        </div>
                      </div>

                      <div
                        style={
                          estilos.barraContenedor
                        }
                      >
                        <div
                          style={{
                            ...estilos.barra,
                            width: `${Math.max(
                              porcentaje,
                              2
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={estilos.panel}>
            <div style={estilos.panelHeader}>
              <div>
                <h2 style={estilos.panelTitulo}>
                  Composición
                </h2>

                <p style={estilos.panelSubtitulo}>
                  Inventario actual
                </p>
              </div>
            </div>

            <div style={estilos.composicion}>
              <div style={estilos.composicionItem}>
                <div
                  style={
                    estilos.composicionIcono
                  }
                >
                  ♂
                </div>

                <div>
                  <span
                    style={
                      estilos.composicionLabel
                    }
                  >
                    Machos
                  </span>

                  <strong
                    style={
                      estilos.composicionValor
                    }
                  >
                    {machosTotales}
                  </strong>
                </div>
              </div>

              <div style={estilos.composicionItem}>
                <div
                  style={
                    estilos.composicionIcono
                  }
                >
                  ♀
                </div>

                <div>
                  <span
                    style={
                      estilos.composicionLabel
                    }
                  >
                    Hembras
                  </span>

                  <strong
                    style={
                      estilos.composicionValor
                    }
                  >
                    {hembrasTotales}
                  </strong>
                </div>
              </div>
            </div>

            <div style={estilos.totalInventario}>
              <span>Total inventario</span>

              <strong>{ganadoTotal}</strong>
            </div>
          </div>
        </section>

        {/* RESUMEN INFERIOR */}

        <section
          style={{
            ...estilos.gridInferior,
            gridTemplateColumns: esMovil
              ? "1fr"
              : "repeat(3, minmax(0, 1fr))",
          }}
        >
          <ResumenPanel
            icono="🐮"
            titulo="Nacimientos"
          >
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
              destacado
            />
          </ResumenPanel>

          <ResumenPanel
            icono="🌱"
            titulo="Potreros"
          >
            <FilaDato
              texto="Registrados"
              valor={potreros.length}
            />

            <FilaDato
              texto="Con ganado"
              valor={potrerosConGanado}
            />

            <FilaDato
              texto="Superficie"
              valor={`${superficieTotal} ha`}
              destacado
            />
          </ResumenPanel>

          <ResumenPanel
            icono="🔔"
            titulo="Alertas"
          >
            {alertasMantenimiento.length === 0 ? (
              <div style={estilos.sinAlertas}>
                <div style={estilos.checkAlertas}>
                  ✓
                </div>

                <strong>Todo al día</strong>

                <span>
                  No hay mantenimientos próximos ni vencidos.
                </span>
              </div>
            ) : (
              <div style={estilos.listaAlertas}>
                {alertasMantenimiento.map((alerta) => (
                  <button
                    key={alerta.id}
                    type="button"
                    onClick={() =>
                      irA(`/maquinaria/${alerta.maquinariaId}`)
                    }
                    style={{
                      ...estilos.alertaItem,
                      ...(alerta.nivel === "urgente"
                        ? estilos.alertaUrgente
                        : estilos.alertaProxima),
                    }}
                  >
                    <div style={estilos.alertaCabecera}>
                      <span style={estilos.alertaIcono}>
                        {alerta.nivel === "urgente" ? "🔴" : "⚠️"}
                      </span>

                      <div style={estilos.alertaTexto}>
                        <strong style={estilos.alertaMaquina}>
                          {alerta.maquina}
                        </strong>
                        <span style={estilos.alertaServicio}>
                          {alerta.servicio}
                        </span>
                      </div>
                    </div>

                    <span style={estilos.alertaDetalle}>
                      {alerta.detalle}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </ResumenPanel>
        </section>

        <div style={estilos.pieDashboard}>
          Ganadería Tavera · Gestión ganadera
        </div>
      </section>
    </main>
  );
}

function TarjetaPrincipal({
  icono,
  titulo,
  valor,
  detalle,
  onClick,
  compacta,
}: {
  icono: string;
  titulo: string;
  valor: string;
  detalle: string;
  onClick: () => void;
  compacta: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...estilos.tarjetaPrincipal,
        padding: compacta ? "15px" : "19px",
        minHeight: compacta ? "132px" : "145px",
      }}
    >
      <div style={estilos.tarjetaIcono}>
        {icono}
      </div>

      <span style={estilos.tarjetaTitulo}>
        {titulo}
      </span>

      <strong
        style={{
          ...estilos.tarjetaValor,
          fontSize: compacta ? "25px" : "30px",
        }}
      >
        {valor}
      </strong>

      <span style={estilos.tarjetaDetalle}>
        {detalle}
      </span>
    </button>
  );
}

function AccesoRapido({
  icono,
  texto,
  onClick,
}: {
  icono: string;
  texto: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={estilos.accesoRapido}
    >
      <div style={estilos.accesoIcono}>
        {icono}
      </div>

      <span>{texto}</span>
    </button>
  );
}

function ResumenPanel({
  icono,
  titulo,
  children,
}: {
  icono: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div style={estilos.panel}>
      <div style={estilos.resumenTitulo}>
        <div style={estilos.resumenIcono}>
          {icono}
        </div>

        <h2 style={estilos.panelTitulo}>
          {titulo}
        </h2>
      </div>

      {children}
    </div>
  );
}

function FilaDato({
  texto,
  valor,
  destacado = false,
}: {
  texto: string;
  valor: string | number;
  destacado?: boolean;
}) {
  return (
    <div
      style={{
        ...estilos.filaDato,
        ...(destacado
          ? estilos.filaDestacada
          : {}),
      }}
    >
      <span>{texto}</span>

      <strong
        style={{
          color: destacado
            ? "#176b3a"
            : "#2d4938",
        }}
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
    background: "#f3f6f3",
    color: "#20352a",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  },

  cargando: {
    minHeight: "100vh",
    background: "#f3f6f3",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    color: "#174c2e",
  },

  cargandoLogo: {
    width: "58px",
    height: "58px",
    borderRadius: "17px",
    background: "#176b3a",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "30px",
    marginBottom: "5px",
  },

  cargandoTexto: {
    fontSize: "12px",
    color: "#829087",
  },

  contenido: {
    marginLeft: "235px",
    padding: "28px",
    boxSizing: "border-box",
    maxWidth: "1700px",
  },

  contenidoMovil: {
    marginLeft: 0,
    padding: "84px 14px 24px",
    width: "100%",
  },

  heroImagen: {
    width: "100%",
    height: "310px",
    borderRadius: "22px",
    overflow: "hidden",
    marginBottom: "20px",
    background: "#dfe8df",
    boxShadow: "0 12px 35px rgba(20,79,45,0.13)",
  },

  heroImagenMovil: {
    height: "190px",
    borderRadius: "18px",
  },

  heroBanner: {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
  },

  heroBannerMovil: {
    objectFit: "cover",
    objectPosition: "center",
  },

  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: "22px",
    padding: "30px 32px 24px",
    marginBottom: "20px",
    background:
      "linear-gradient(135deg, #0d4a2d 0%, #176b3a 58%, #27884e 100%)",
    color: "white",
    boxShadow:
      "0 12px 35px rgba(20,79,45,0.16)",
  },

  heroMovil: {
    borderRadius: "18px",
    padding: "23px 20px 19px",
  },

  heroDecoracionUno: {
    position: "absolute",
    width: "260px",
    height: "260px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.055)",
    right: "-70px",
    top: "-120px",
  },

  heroDecoracionDos: {
    position: "absolute",
    width: "180px",
    height: "180px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.04)",
    right: "120px",
    bottom: "-135px",
  },

  heroContenido: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "15px",
  },

  heroEtiqueta: {
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "1.5px",
    color: "rgba(255,255,255,0.68)",
    marginBottom: "7px",
  },

  heroTitulo: {
    margin: 0,
    fontSize: "31px",
    lineHeight: 1.15,
    letterSpacing: "-0.5px",
  },

  heroTituloMovil: {
    fontSize: "25px",
  },

  heroSubtitulo: {
    margin: "8px 0 0",
    fontSize: "13px",
    color: "rgba(255,255,255,0.76)",
    lineHeight: 1.45,
  },

  estadoOperacion: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "8px 11px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.13)",
    fontSize: "10px",
    fontWeight: 700,
  },

  puntoActivo: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#85e39e",
    boxShadow: "0 0 0 3px rgba(133,227,158,0.12)",
  },

  heroResumen: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: "22px",
    marginTop: "25px",
  },

  heroResumenLabel: {
    display: "block",
    fontSize: "9px",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    color: "rgba(255,255,255,0.60)",
    marginBottom: "4px",
  },

  heroResumenValor: {
    display: "block",
    fontSize: "15px",
  },

  heroSeparador: {
    width: "1px",
    height: "29px",
    background: "rgba(255,255,255,0.16)",
  },

  tarjetasPrincipales: {
    display: "grid",
    gap: "12px",
    marginBottom: "26px",
  },

  tarjetaPrincipal: {
    border: "1px solid #dde6df",
    borderRadius: "17px",
    background: "white",
    textAlign: "left",
    cursor: "pointer",
    fontFamily: "inherit",
    color: "#20352a",
    boxShadow: "0 3px 12px rgba(25,62,40,0.035)",
    display: "flex",
    flexDirection: "column",
  },

  tarjetaIcono: {
    width: "37px",
    height: "37px",
    borderRadius: "11px",
    background: "#edf5ef",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    marginBottom: "12px",
  },

  tarjetaTitulo: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#718078",
    marginBottom: "4px",
  },

  tarjetaValor: {
    display: "block",
    color: "#176b3a",
    lineHeight: 1.1,
    marginBottom: "6px",
    letterSpacing: "-0.5px",
  },

  tarjetaDetalle: {
    fontSize: "10px",
    color: "#98a39c",
  },

  seccion: {
    marginBottom: "24px",
  },

  tituloSeccionFila: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "12px",
  },

  tituloSeccion: {
    margin: 0,
    fontSize: "16px",
    color: "#244b34",
  },

  subtituloSeccion: {
    margin: "3px 0 0",
    color: "#89978e",
    fontSize: "10px",
  },

  accesosGrid: {
    display: "grid",
    gap: "10px",
  },

  accesoRapido: {
    minHeight: "85px",
    border: "1px solid #dde6df",
    borderRadius: "14px",
    background: "white",
    color: "#31523e",
    fontFamily: "inherit",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
  },

  accesoIcono: {
    width: "34px",
    height: "34px",
    borderRadius: "10px",
    background: "#eef6f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "17px",
  },

  gridMedio: {
    display: "grid",
    gap: "16px",
    marginBottom: "16px",
  },

  gridInferior: {
    display: "grid",
    gap: "16px",
  },

  panel: {
    background: "white",
    border: "1px solid #dde6df",
    borderRadius: "17px",
    padding: "19px",
    boxShadow: "0 3px 12px rgba(25,62,40,0.025)",
    boxSizing: "border-box",
  },

  panelHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "17px",
  },

  panelTitulo: {
    margin: 0,
    fontSize: "15px",
    color: "#244b34",
  },

  panelSubtitulo: {
    margin: "4px 0 0",
    fontSize: "10px",
    color: "#929f97",
  },

  botonVerTodo: {
    border: "none",
    background: "#edf6f0",
    color: "#176b3a",
    borderRadius: "8px",
    padding: "7px 10px",
    fontSize: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },

  listaLotes: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  loteItem: {
    padding: "13px 14px",
    borderRadius: "12px",
    background: "#f7faf7",
  },

  loteFila: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },

  loteNombre: {
    fontSize: "12px",
    color: "#294a35",
  },

  loteDetalle: {
    marginTop: "4px",
    fontSize: "9px",
    color: "#89978e",
  },

  loteCantidad: {
    fontSize: "19px",
    fontWeight: 800,
    color: "#176b3a",
  },

  barraContenedor: {
    height: "5px",
    background: "#e3ece5",
    borderRadius: "999px",
    overflow: "hidden",
    marginTop: "10px",
  },

  barra: {
    height: "100%",
    background:
      "linear-gradient(90deg, #176b3a, #3a9b5d)",
    borderRadius: "999px",
  },

  composicion: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },

  composicionItem: {
    padding: "15px 12px",
    background: "#f7faf7",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  composicionIcono: {
    width: "33px",
    height: "33px",
    borderRadius: "10px",
    background: "#e7f2ea",
    color: "#176b3a",
    fontSize: "18px",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  composicionLabel: {
    display: "block",
    fontSize: "9px",
    color: "#849188",
    marginBottom: "3px",
  },

  composicionValor: {
    display: "block",
    fontSize: "19px",
    color: "#244b34",
  },

  totalInventario: {
    marginTop: "12px",
    padding: "13px 14px",
    borderTop: "1px solid #edf1ee",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "11px",
    color: "#68786e",
  },

  resumenTitulo: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginBottom: "16px",
  },

  resumenIcono: {
    width: "33px",
    height: "33px",
    borderRadius: "10px",
    background: "#edf5ef",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
  },

  filaDato: {
    minHeight: "38px",
    padding: "0 11px",
    marginBottom: "7px",
    borderRadius: "9px",
    background: "#f7faf7",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "11px",
    color: "#68786e",
  },

  filaDestacada: {
    background: "#edf6f0",
    fontWeight: 700,
  },

  sinAlertas: {
    minHeight: "130px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    textAlign: "center",
    color: "#819087",
    fontSize: "10px",
  },

  checkAlertas: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#e8f5ec",
    color: "#176b3a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "17px",
    fontWeight: 800,
    marginBottom: "3px",
  },

  listaAlertas: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  alertaItem: {
    width: "100%",
    border: "1px solid transparent",
    borderRadius: "11px",
    padding: "11px 12px",
    textAlign: "left",
    fontFamily: "inherit",
    cursor: "pointer",
    boxSizing: "border-box",
  },

  alertaProxima: {
    background: "#fff8e8",
    borderColor: "#f1dfad",
    color: "#765719",
  },

  alertaUrgente: {
    background: "#fff0f0",
    borderColor: "#efcaca",
    color: "#8d3434",
  },

  alertaCabecera: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
  },

  alertaIcono: {
    fontSize: "13px",
    lineHeight: 1.3,
  },

  alertaTexto: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },

  alertaMaquina: {
    fontSize: "11px",
    lineHeight: 1.25,
  },

  alertaServicio: {
    fontSize: "10px",
    lineHeight: 1.3,
  },

  alertaDetalle: {
    display: "block",
    marginTop: "6px",
    paddingLeft: "21px",
    fontSize: "9px",
    opacity: 0.82,
    lineHeight: 1.35,
  },

  vacio: {
    minHeight: "140px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    color: "#91a097",
    fontSize: "12px",
  },

  pieDashboard: {
    padding: "24px 0 5px",
    textAlign: "center",
    color: "#a0aaa4",
    fontSize: "9px",
  },
};
