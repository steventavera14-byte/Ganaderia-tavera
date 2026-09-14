"use client";

import { usePathname, useRouter } from "next/navigation";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    {
      texto: "Dashboard",
      icono: "▦",
      ruta: "/dashboard",
    },
    {
      texto: "Ganado",
      icono: "🐄",
      ruta: null,
    },
    {
      texto: "Lotes",
      icono: "▣",
      ruta: "/lotes",
    },
    {
      texto: "Potreros",
      icono: "🌱",
      ruta: "/potreros",
    },
    {
      texto: "Nacimientos",
      icono: "🐮",
      ruta: "/nacimientos",
    },
    {
      texto: "Pesajes",
      icono: "⚖",
      ruta: "/pesajes",
    },
    {
      texto: "Movimientos",
      icono: "↔",
      ruta: "/movimientos",
    },
    {
      texto: "Sanidad",
      icono: "♥",
      ruta: null,
    },
    {
      texto: "Feedlot",
      icono: "🌾",
      ruta: null,
    },
    {
      texto: "Maquinaria",
      icono: "🚜",
      ruta: null,
    },
    {
      texto: "Personal",
      icono: "👥",
      ruta: null,
    },
    {
      texto: "Gastos",
      icono: "$",
      ruta: null,
    },
    {
      texto: "Reportes",
      icono: "▤",
      ruta: null,
    },
  ];

  return (
    <aside style={estilos.sidebar}>
      <div style={estilos.logo}>
        <div style={estilos.logoIcono}>🐂</div>

        <div>
          <strong>Ganadería</strong>
          <br />
          <strong>Tavera</strong>
        </div>
      </div>

      <nav>
        {menuItems.map((item) => {
          const activo =
            item.ruta !== null &&
            pathname === item.ruta;

          return (
            <div
              key={item.texto}
              onClick={() => {
                if (item.ruta) {
                  router.push(item.ruta);
                }
              }}
              style={{
                ...estilos.menuItem,
                background: activo
                  ? "rgba(255,255,255,0.14)"
                  : "transparent",
                cursor: item.ruta
                  ? "pointer"
                  : "default",
                fontWeight: activo ? 700 : 500,
                opacity: item.ruta ? 1 : 0.75,
              }}
            >
              <span style={estilos.icono}>
                {item.icono}
              </span>

              <span>{item.texto}</span>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  sidebar: {
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
    zIndex: 100,
  },

  logo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "32px",
    paddingLeft: "8px",
  },

  logoIcono: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    background: "#1b7542",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
  },

  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "11px 12px",
    marginBottom: "5px",
    borderRadius: "9px",
    fontSize: "14px",
    transition: "background 0.15s ease",
    userSelect: "none",
  },

  icono: {
    width: "22px",
    textAlign: "center",
    flexShrink: 0,
  },
};
