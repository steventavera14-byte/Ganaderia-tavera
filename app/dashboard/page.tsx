"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Lote = {
  id: string;
  nombre: string;
  cantidad_total: number;
  cantidad_machos: number;
  cantidad_hembras: number;
  peso_promedio: number | null;
  estado: string;
  potrero_id: string | null;
};

type Potrero = {
  id: string;
  nombre: string;
  hectareas: number | null;
  estado: string;
};

type Nacimiento = {
  sexo: string;
};

export default function Dashboard() {
  const [nombre, setNombre] = useState("Steven");
  const [loading, setLoading] = useState(true);

  const [lotes, setLotes] = useState<Lote[]>([]);
  const [potreros, setPotreros] = useState<Potrero[]>([]);
  const [nacimientos, setNacimientos] = useState<Nacimiento[]>([]);

  useEffect(() => {
    cargarDashboard();
  }, []);

  const cargarDashboard = async () => {
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

    if (usuario.nombre) {
      setNombre(usuario.nombre.split(" ")[0]);
    }

    const fincaId = usuario.finca_id;

    const [respuestaLotes, respuestaPotreros, respuestaNacimientos] =
      await Promise.all([
        supabase
          .from("gan_lotes_ganado")
          .select(
            "id, nombre, cantidad_total, cantidad_machos, cantidad_hembras, peso_promedio, estado, potrero_id"
          )
          .eq("finca_id", fincaId),

        supabase
          .from("gan_potreros")
          .select("id, nombre, hectareas, estado")
          .eq("finca_id", fincaId),

        supabase
          .from("gan_nacimientos")
          .select("sexo")
          .eq("finca_id", fincaId),
      ]);

    if (!respuestaLotes.error) {
      setLotes(respuestaLotes.data || []);
    }

    if (!respuestaPotreros.error) {
      setPotreros(respuestaPotreros.data || []);
    }

    if (!respuestaNacimientos.error) {
      setNacimientos(respuestaNacimientos.data || []);
    }

    setLoading(false);
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const lotesActivos = lotes.filter(
    (lote) =>
      lote.estado === "activo" ||
      lote.estado === "feedlot"
  );

  const ganadoTotal = lotesActivos.reduce(
    (suma, lote) =>
      suma + Number(lote.cantidad_total || 0),
    0
  );

  const lotesConPeso = lotesActivos.filter(
    (lote) =>
      lote.peso_promedio !== null &&
      Number(lote.peso_promedio) > 0 &&
      Number(lote.cantidad_total) > 0
  );

  const animalesConPeso = lotesConPeso.reduce(
    (suma, lote) =>
      suma + Number(lote.cantidad_total),
    0
  );

  const pesoTotalPonderado = lotesConPeso.reduce(
    (suma, lote) =>
      suma +
      Number(lote.peso_promedio) *
        Number(lote.cantidad_total),
    0
  );

  const pesoPromedio =
    animalesConPeso > 0
      ? pesoTotalPonderado / animalesConPeso
      : 0;

  const machosNacidos = nacimientos.filter(
    (nacimiento) =>
      nacimiento.sexo === "macho"
  ).length;

  const hembrasNacidas = nacimientos.filter(
    (nacimiento) =>
      nacimiento.sexo === "hembra"
  ).length;

  const potrerosOcupadosIds = new Set(
    lotesActivos
      .filter((lote) => lote.potrero_id)
      .map((lote) => lote.potrero_id)
  );

  const potrerosOcupados =
    potrerosOcupadosIds.size;

  const hectareasTotales = potreros.reduce(
    (suma, potrero) =>
      suma + Number(potrero.hectareas || 0),
    0
  );

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f7f3",
          fontFamily: "Arial, sans-serif",
          color: "#176b3a",
          fontWeight: 700,
        }}
      >
        Cargando Ganadería Tavera...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f7f3",
        fontFamily: "Arial, sans-serif",
        color: "#20352a",
      }}
    >
      <aside
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: "235px",
          background: "#103f28",
          color: "white",
          padding: "26px 18px",
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "32px",
            paddingLeft: "8px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "#1b7542",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
            }}
          >
            🐂
          </div>

          <div>
            <div
              style={{
                fontSize: "17px",
                fontWeight: 800,
              }}
            >
              Ganadería
            </div>

            <div
              style={{
                fontSize: "17px",
                fontWeight: 800,
              }}
            >
              Tavera
            </div>
          </div>
        </div>

        <MenuItem
          icono="▦"
          titulo="Dashboard"
          activo
          ruta="/dashboard"
        />

        <MenuItem
          icono="🐄"
          titulo="Ganado"
        />

        <MenuItem
          icono="▣"
          titulo="Lotes"
          ruta="/lotes"
        />

        <MenuItem
          icono="🌱"
          titulo="Potreros"
          ruta="/potreros"
        />

        <MenuItem
          icono="🐮"
          titulo="Nacimientos"
        />

        <MenuItem
          icono="⚖"
          titulo="Pesajes"
        />

        <MenuItem
          icono="↔"
          titulo="Movimientos"
        />

        <MenuItem
          icono="♥"
          titulo="Sanidad"
        />

        <MenuItem
          icono="🌾"
          titulo="Feedlot"
        />

        <MenuItem
          icono="🚜"
          titulo="Maquinaria"
        />

        <MenuItem
          icono="👥"
          titulo="Personal"
        />

        <MenuItem
          icono="$"
          titulo="Gastos"
        />

        <MenuItem
          icono="▤"
          titulo="Reportes"
        />

        <div
          style={{
            marginTop: "30px",
            borderTop:
              "1px solid rgba(255,255,255,0.15)",
            paddingTop: "20px",
          }}
        >
          <button
            onClick={cerrarSesion}
            style={{
              width: "100%",
              background: "transparent",
              border:
                "1px solid rgba(255,255,255,0.25)",
              borderRadius: "9px",
              color: "white",
              padding: "10px",
              cursor: "pointer",
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <section
        style={{
          marginLeft: "235px",
          padding: "32px",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
                color: "#143e28",
              }}
            >
              Hola, {nombre}
            </h1>

            <p
              style={{
                margin: "7px 0 0",
                color: "#718078",
                fontSize: "14px",
              }}
            >
              Resumen general de Ganadería Tavera
            </p>
          </div>

          <div
            style={{
              background: "white",
              border: "1px solid #dfe8e1",
              borderRadius: "12px",
              padding: "10px 16px",
              fontSize: "13px",
              color: "#52705e",
            }}
          >
            🟢 Operación activa
          </div>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "18px",
            marginBottom: "25px",
          }}
        >
          <Tarjeta
            titulo="Ganado total"
            valor={ganadoTotal.toLocaleString()}
            detalle="Animales en lotes activos"
            icono="🐄"
          />

          <Tarjeta
            titulo="Lotes activos"
            valor={String(lotesActivos.length)}
            detalle="Grupos de ganado"
            icono="▣"
          />

          <Tarjeta
            titulo="Nacimientos"
            valor={String(nacimientos.length)}
            detalle="Registrados"
            icono="🐮"
          />

          <Tarjeta
            titulo="Peso promedio"
            valor={
              pesoPromedio > 0
                ? `${Math.round(
                    pesoPromedio
                  ).toLocaleString()} kg`
                : "—"
            }
            detalle="Promedio ponderado"
            icono="⚖"
          />

          <Tarjeta
            titulo="Potreros"
            valor={String(potreros.length)}
            detalle={`${hectareasTotales.toLocaleString()} ha registradas`}
            icono="🌱"
          />

          <Tarjeta
            titulo="Gastos"
            valor="$0"
            detalle="Pendiente de conectar"
            icono="$"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          <Panel titulo="Distribución del ganado">
            {lotesActivos.length === 0 ? (
              <Vacio texto="No hay lotes activos registrados." />
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "10px",
                }}
              >
                {lotesActivos.map((lote) => (
                  <div
                    key={lote.id}
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      background: "#f7faf7",
                      borderRadius: "9px",
                      padding: "13px 15px",
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          color: "#31513d",
                          fontSize: "13px",
                        }}
                      >
                        {lote.nombre}
                      </strong>

                      <div
                        style={{
                          marginTop: "4px",
                          color: "#8b998f",
                          fontSize: "11px",
                        }}
                      >
                        {lote.cantidad_machos} machos ·{" "}
                        {lote.cantidad_hembras} hembras
                      </div>
                    </div>

                    <strong
                      style={{
                        color: "#176b3a",
                        fontSize: "17px",
                      }}
                    >
                      {lote.cantidad_total}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel titulo="Resumen de nacimientos">
            <div
              style={{
                display: "grid",
                gap: "12px",
                paddingTop: "10px",
              }}
            >
              <Resumen
                etiqueta="Machos"
                valor={String(machosNacidos)}
              />

              <Resumen
                etiqueta="Hembras"
                valor={String(hembrasNacidas)}
              />

              <Resumen
                etiqueta="Total"
                valor={String(nacimientos.length)}
              />
            </div>
          </Panel>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
          }}
        >
          <Panel titulo="Potreros">
            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              <Resumen
                etiqueta="Potreros registrados"
                valor={String(potreros.length)}
              />

              <Resumen
                etiqueta="Potreros con ganado"
                valor={String(potrerosOcupados)}
              />

              <Resumen
                etiqueta="Superficie registrada"
                valor={`${hectareasTotales.toLocaleString()} ha`}
              />
            </div>
          </Panel>

          <Panel titulo="Alertas y pendientes">
            <div
              style={{
                minHeight: "150px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#91a097",
                textAlign: "center",
              }}
            >
              No hay alertas pendientes.
            </div>
          </Panel>
        </div>
      </section>
    </main>
  );
}

function MenuItem({
  icono,
  titulo,
  ruta,
  activo = false,
}: {
  icono: string;
  titulo: string;
  ruta?: string;
  activo?: boolean;
}) {
  return (
    <div
      onClick={() => {
        if (ruta) {
          window.location.href = ruta;
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "11px 12px",
        marginBottom: "5px",
        borderRadius: "9px",
        background: activo
          ? "rgba(255,255,255,0.14)"
          : "transparent",
        cursor: ruta ? "pointer" : "default",
        fontSize: "14px",
        fontWeight: activo ? 700 : 500,
      }}
    >
      <span
        style={{
          width: "22px",
          textAlign: "center",
          fontSize: "16px",
        }}
      >
        {icono}
      </span>

      {titulo}
    </div>
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
    <div
      style={{
        background: "white",
        borderRadius: "15px",
        padding: "20px",
        border: "1px solid #e0e8e2",
        boxShadow:
          "0 5px 18px rgba(26,72,45,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "15px",
        }}
      >
        <span
          style={{
            color: "#718078",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          {titulo}
        </span>

        <span
          style={{
            width: "35px",
            height: "35px",
            borderRadius: "9px",
            background: "#edf5ef",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icono}
        </span>
      </div>

      <div
        style={{
          fontSize: "27px",
          fontWeight: 800,
          color: "#174c2e",
        }}
      >
        {valor}
      </div>

      <div
        style={{
          marginTop: "6px",
          color: "#9aa69e",
          fontSize: "12px",
        }}
      >
        {detalle}
      </div>
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
    <div
      style={{
        background: "white",
        borderRadius: "15px",
        padding: "22px",
        border: "1px solid #e0e8e2",
        boxShadow:
          "0 5px 18px rgba(26,72,45,0.04)",
      }}
    >
      <h2
        style={{
          margin: "0 0 18px",
          fontSize: "16px",
          color: "#244b34",
        }}
      >
        {titulo}
      </h2>

      {children}
    </div>
  );
}

function Resumen({
  etiqueta,
  valor,
}: {
  etiqueta: string;
  valor: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#f7faf7",
        borderRadius: "9px",
        padding: "12px 14px",
      }}
    >
      <span
        style={{
          fontSize: "13px",
          color: "#617268",
        }}
      >
        {etiqueta}
      </span>

      <strong
        style={{
          color: "#176b3a",
          fontSize: "15px",
        }}
      >
        {valor}
      </strong>
    </div>
  );
}

function Vacio({
  texto,
}: {
  texto: string;
}) {
  return (
    <div
      style={{
        minHeight: "190px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#91a097",
        textAlign: "center",
        fontSize: "13px",
      }}
    >
      {texto}
    </div>
  );
}
