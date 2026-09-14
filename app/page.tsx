"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setMensaje("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error("Error Supabase:", error);
        setMensaje(`Supabase: ${error.message}`);
        setLoading(false);
        return;
      }

      if (!data.session) {
        setMensaje("Supabase no devolvió una sesión válida.");
        setLoading(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Error inesperado:", error);

      if (error instanceof Error) {
        setMensaje(`Error: ${error.message}`);
      } else {
        setMensaje("Ocurrió un error inesperado.");
      }

      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #f4f7f3 0%, #e7efe8 100%)",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#ffffff",
          borderRadius: "20px",
          padding: "42px 36px",
          boxShadow: "0 20px 60px rgba(20, 70, 40, 0.12)",
          border: "1px solid #e4ebe5",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "34px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 18px",
              borderRadius: "18px",
              background: "#176b3a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "32px",
            }}
          >
            🐂
          </div>

          <h1
            style={{
              margin: 0,
              color: "#155c35",
              fontSize: "30px",
              fontWeight: 800,
            }}
          >
            Ganadería Tavera
          </h1>

          <p
            style={{
              marginTop: "8px",
              color: "#718078",
              fontSize: "14px",
            }}
          >
            Sistema de Gestión Ganadera
          </p>
        </div>

        <form onSubmit={iniciarSesion}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 600,
              color: "#34453b",
              fontSize: "14px",
            }}
          >
            Correo electrónico
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            required
            autoComplete="email"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #d7dfd9",
              marginBottom: "20px",
              fontSize: "15px",
              outline: "none",
            }}
          />

          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: 600,
              color: "#34453b",
              fontSize: "14px",
            }}
          >
            Contraseña
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #d7dfd9",
              marginBottom: "22px",
              fontSize: "15px",
              outline: "none",
            }}
          />

          {mensaje && (
            <div
              style={{
                background: "#fff1f1",
                color: "#b42318",
                padding: "11px",
                borderRadius: "8px",
                marginBottom: "18px",
                fontSize: "13px",
                textAlign: "center",
                wordBreak: "break-word",
              }}
            >
              {mensaje}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "15px",
              border: "none",
              borderRadius: "10px",
              background: loading ? "#789987" : "#176b3a",
              color: "white",
              fontWeight: 700,
              fontSize: "15px",
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: "26px",
            marginBottom: 0,
            color: "#98a39c",
            fontSize: "12px",
          }}
        >
          Acceso exclusivo para personal autorizado
        </p>
      </div>
    </main>
  );
}
