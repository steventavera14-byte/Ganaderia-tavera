"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Dashboard() {
  const [nombre, setNombre] = useState("Steven");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verificarUsuario = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/";
        return;
      }

      const { data } = await supabase
        .from("gan_usuarios")
        .select("nombre, rol")
        .eq("user_id", user.id)
        .eq("activo", true)
        .maybeSingle();

      if (!data) {
        await supabase.auth.signOut();
        window.location.href = "/";
        return;
      }

      if (data.nombre) {
        setNombre(data.nombre.split(" ")[0]);
      }

      setLoading(false);
    };

    verificarUsuario();
  }, []);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

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

  const menu = [
    ["▦", "Dashboard"],
    ["🐄", "Ganado"],
    ["▣", "Lotes"],
    ["🌱", "Potreros"],
    ["🐮", "Nacimientos"],
    ["⚖", "Pesajes"],
    ["↔", "Movimientos"],
    ["♥", "Sanidad"],
    ["🌾", "Feedlot"],
    ["🚜", "Maquinaria"],
    ["👥", "Personal"],
    ["$", "Gastos"],
    ["▤", "Reportes"],
  ];

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

        <nav>
          {menu.map(([icono, titulo], index) => (
            <div
              key={titulo}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "11px 12px",
                marginBottom: "5px",
                borderRadius: "9px",
                background:
                  index === 0 ? "rgba(255,255,255,0.14)" : "transparent",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: index === 0 ? 700 : 500,
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
          ))}
        </nav>

        <div
          style={{
            marginTop: "30px",
            borderTop: "1px solid rgba(255,255,255,0.15)",
            paddingTop: "20px",
          }}
        >
          <button
            onClick={cerrarSesion}
            style={{
              width: "100%",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.25)",
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
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "18px",
            marginBottom: "25px",
          }}
        >
          <Tarjeta
            titulo="Ganado total"
            valor="0"
            detalle="Animales registrados"
            icono="🐄"
          />

          <Tarjeta
            titulo="Lotes activos"
            valor="0"
            detalle="Grupos de ganado"
            icono="▣"
          />

          <Tarjeta
            titulo="Nacimientos"
            valor="0"
            detalle="Esta gestión"
            icono="🐮"
          />

          <Tarjeta
            titulo="Peso promedio"
            valor="—"
            detalle="Últimos pesajes"
            icono="⚖"
          />

          <Tarjeta
            titulo="Potreros"
            valor="0"
            detalle="Registrados"
            icono="🌱"
          />

          <Tarjeta
            titulo="Gastos"
            valor="$0"
            detalle="Mes actual"
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
            <div
              style={{
                height: "220px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#91a097",
                textAlign: "center",
              }}
            >
              Los datos de lotes y potreros aparecerán aquí.
            </div>
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
                valor="0"
              />
              <Resumen
                etiqueta="Hembras"
                valor="0"
              />
              <Resumen
                etiqueta="Total"
                valor="0"
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
          <Panel titulo="Feedlot">
            <div
              style={{
                display: "grid",
                gap: "12px",
              }}
            >
              <Resumen
                etiqueta="Animales en feedlot"
                valor="0"
              />
              <Resumen
                etiqueta="Corrales activos"
                valor="0"
              />
              <Resumen
                etiqueta="Consumo diario"
                valor="—"
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
        boxShadow: "0 5px 18px rgba(26,72,45,0.05)",
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
        boxShadow: "0 5px 18px rgba(26,72,45,0.04)",
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
