"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [esMovil, setEsMovil] = useState(false);

  useEffect(() => {
    const comprobarPantalla = () => {
      setEsMovil(window.innerWidth <= 820);
    };

    comprobarPantalla();

    window.addEventListener("resize", comprobarPantalla);

    return () => {
      window.removeEventListener(
        "resize",
        comprobarPantalla
      );
    };
  }, []);

  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname]);

  const menuItems = [
    {
      texto: "Dashboard",
      icono: "▦",
      ruta: "/dashboard",
    },
    {
      texto: "Ganado",
      icono: "🐄",
      ruta: "/ganado",
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
      ruta: "/sanidad",
    },
    {
      texto: "Feedlot",
      icono: "🌾",
      ruta: null,
    },
    {
      texto: "Maquinaria",
      icono: "🚜",
      ruta: "/maquinaria",
    },
    {
      texto: "Personal",
      icono: "👥",
      ruta: "/personal",
    },
    {
      texto: "Gastos",
      icono: "$",
      ruta: "/gastos",
    },
    {
      texto: "Reportes",
      icono: "▤",
      ruta: null,
    },
  ];

  const navegar = (ruta: string | null) => {
    if (!ruta) return;

    setMenuAbierto(false);
    router.push(ruta);
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const contenidoMenu = (
    <div style={estilos.contenidoSidebar}>
      <div>
        <div style={estilos.logo}>
          <div style={estilos.logoIcono}>🐂</div>

          <div style={estilos.logoTexto}>
            <strong>Ganadería</strong>
            <strong>Tavera</strong>
          </div>
        </div>

        <nav>
          {menuItems.map((item) => {
            const activo =
              item.ruta !== null &&
              pathname === item.ruta;

            const disponible = Boolean(item.ruta);

            return (
              <button
                key={item.texto}
                type="button"
                disabled={!disponible}
                onClick={() => navegar(item.ruta)}
                style={{
                  ...estilos.menuItem,
                  ...(activo
                    ? estilos.menuItemActivo
                    : {}),
                  opacity: disponible ? 1 : 0.48,
                  cursor: disponible
                    ? "pointer"
                    : "default",
                }}
              >
                <span style={estilos.icono}>
                  {item.icono}
                </span>

                <span>{item.texto}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <button
        type="button"
        onClick={cerrarSesion}
        style={estilos.cerrarSesion}
      >
        <span style={estilos.icono}>↪</span>
        <span>Cerrar sesión</span>
      </button>
    </div>
  );

  if (esMovil) {
    return (
      <>
        <header style={estilos.mobileHeader}>
          <div style={estilos.mobileMarca}>
            <div style={estilos.mobileLogo}>
              🐂
            </div>

            <div>
              <div style={estilos.mobileNombre}>
                Ganadería Tavera
              </div>

              <div style={estilos.mobileSubtitulo}>
                Gestión ganadera
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() =>
              setMenuAbierto((anterior) => !anterior)
            }
            style={estilos.botonMenu}
          >
            {menuAbierto ? "✕" : "☰"}
          </button>
        </header>

        {menuAbierto && (
          <>
            <div
              style={estilos.overlay}
              onClick={() => setMenuAbierto(false)}
            />

            <aside style={estilos.sidebarMovil}>
              {contenidoMenu}
            </aside>
          </>
        )}
      </>
    );
  }

  return (
    <aside style={estilos.sidebarDesktop}>
      {contenidoMenu}
    </aside>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  sidebarDesktop: {
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    width: "235px",
    background:
      "linear-gradient(180deg, #0d4a2d 0%, #103d28 100%)",
    color: "white",
    zIndex: 100,
    boxSizing: "border-box",
  },

  contenidoSidebar: {
    height: "100%",
    padding: "24px 16px 18px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    overflowY: "auto",
  },

  logo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "28px",
    padding: "0 7px",
  },

  logoIcono: {
    width: "44px",
    height: "44px",
    flexShrink: 0,
    borderRadius: "13px",
    background: "#1b7542",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
    boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
  },

  logoTexto: {
    display: "flex",
    flexDirection: "column",
    lineHeight: 1.05,
    fontSize: "15px",
  },

  menuItem: {
    width: "100%",
    minHeight: "43px",
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "10px 12px",
    marginBottom: "4px",
    border: "none",
    borderRadius: "10px",
    background: "transparent",
    color: "white",
    fontSize: "13px",
    fontWeight: 600,
    fontFamily: "inherit",
    textAlign: "left",
  },

  menuItemActivo: {
    background: "rgba(255,255,255,0.16)",
    boxShadow:
      "inset 0 0 0 1px rgba(255,255,255,0.04)",
  },

  icono: {
    width: "22px",
    textAlign: "center",
    flexShrink: 0,
    fontSize: "15px",
  },

  cerrarSesion: {
    width: "100%",
    minHeight: "43px",
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "10px 12px",
    marginTop: "20px",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.07)",
    color: "white",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },

  mobileHeader: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "68px",
    padding:
      "env(safe-area-inset-top, 0px) 16px 0",
    boxSizing: "border-box",
    background:
      "linear-gradient(135deg, #0d4a2d 0%, #176b3a 100%)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 300,
    boxShadow: "0 3px 14px rgba(0,0,0,0.12)",
  },

  mobileMarca: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
  },

  mobileLogo: {
    width: "38px",
    height: "38px",
    flexShrink: 0,
    borderRadius: "11px",
    background: "rgba(255,255,255,0.14)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
  },

  mobileNombre: {
    fontSize: "15px",
    fontWeight: 800,
    lineHeight: 1.15,
  },

  mobileSubtitulo: {
    marginTop: "2px",
    fontSize: "10px",
    color: "rgba(255,255,255,0.72)",
  },

  botonMenu: {
    width: "42px",
    height: "42px",
    flexShrink: 0,
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: "11px",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    fontSize: "21px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(8,25,16,0.48)",
    backdropFilter: "blur(2px)",
    zIndex: 310,
  },

  sidebarMovil: {
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    width: "min(82vw, 300px)",
    background:
      "linear-gradient(180deg, #0d4a2d 0%, #103d28 100%)",
    color: "white",
    zIndex: 320,
    boxShadow: "10px 0 30px rgba(0,0,0,0.22)",
    boxSizing: "border-box",
  },
};
