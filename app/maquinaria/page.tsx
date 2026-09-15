"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { supabase } from "../../lib/supabase";

type Maquinaria = {
  id: string;
  finca_id: string;
  nombre: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  placa: string | null;
  numero_serie: string | null;
  tipo_medicion: "horas" | "km" | "ninguno";
  lectura_actual: number;
  estado: "activo" | "mantenimiento" | "fuera_servicio";
  fecha_compra: string | null;
  costo_compra: number | null;
  observaciones: string | null;
  created_at: string;
};

type FormularioMaquinaria = {
  nombre: string;
  tipo: string;
  marca: string;
  modelo: string;
  anio: string;
  placa: string;
  numero_serie: string;
  tipo_medicion: "horas" | "km" | "ninguno";
  lectura_actual: string;
  estado: "activo" | "mantenimiento" | "fuera_servicio";
  fecha_compra: string;
  costo_compra: string;
  observaciones: string;
};

const formularioInicial: FormularioMaquinaria = {
  nombre: "",
  tipo: "tractor",
  marca: "",
  modelo: "",
  anio: "",
  placa: "",
  numero_serie: "",
  tipo_medicion: "horas",
  lectura_actual: "0",
  estado: "activo",
  fecha_compra: "",
  costo_compra: "",
  observaciones: "",
};

export default function MaquinariaPage() {
  const router = useRouter();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const [fincaId, setFincaId] = useState("");
  const [usuarioId, setUsuarioId] = useState("");

  const [maquinarias, setMaquinarias] = useState<Maquinaria[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [formulario, setFormulario] =
    useState<FormularioMaquinaria>(formularioInicial);

  useEffect(() => {
    iniciar();
  }, []);

  async function iniciar() {
    try {
      setCargando(true);
      setError("");

      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario || !user) {
        router.replace("/");
        return;
      }

      setUsuarioId(user.id);

      const { data: membresia, error: errorMembresia } = await supabase
        .from("gan_usuarios")
        .select("finca_id, activo")
        .eq("user_id", user.id)
        .eq("activo", true)
        .limit(1)
        .maybeSingle();

      if (errorMembresia) {
        throw errorMembresia;
      }

      if (!membresia?.finca_id) {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      setFincaId(membresia.finca_id);

      const { data: datosMaquinaria, error: errorMaquinaria } = await supabase
        .from("gan_maquinaria")
        .select("*")
        .eq("finca_id", membresia.finca_id)
        .order("nombre", { ascending: true });

      if (errorMaquinaria) {
        throw errorMaquinaria;
      }

      const listaMaquinaria = (datosMaquinaria || []) as Maquinaria[];
      setMaquinarias(listaMaquinaria);

      const idEditar =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("editar")
          : null;

      if (idEditar) {
        const maquinaEditar = listaMaquinaria.find(
          (item) => item.id === idEditar
        );

        if (maquinaEditar) {
          editarMaquina(maquinaEditar);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "No se pudo cargar Maquinaria.");
    } finally {
      setCargando(false);
    }
  }

  async function cargarMaquinaria(idFinca = fincaId) {
    if (!idFinca) return;

    const { data, error: errorConsulta } = await supabase
      .from("gan_maquinaria")
      .select("*")
      .eq("finca_id", idFinca)
      .order("nombre", { ascending: true });

    if (errorConsulta) {
      throw errorConsulta;
    }

    setMaquinarias((data || []) as Maquinaria[]);
  }

  function actualizarCampo(
    campo: keyof FormularioMaquinaria,
    valor: string
  ) {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function nuevaMaquina() {
    setEditandoId(null);
    setFormulario(formularioInicial);
    setMensaje("");
    setError("");
    setMostrarFormulario(true);
  }

  function cancelar() {
    setMostrarFormulario(false);
    setEditandoId(null);
    setFormulario(formularioInicial);
    setMensaje("");
    setError("");
  }

  function editarMaquina(maquina: Maquinaria) {
    setEditandoId(maquina.id);

    setFormulario({
      nombre: maquina.nombre || "",
      tipo: maquina.tipo || "tractor",
      marca: maquina.marca || "",
      modelo: maquina.modelo || "",
      anio: maquina.anio ? String(maquina.anio) : "",
      placa: maquina.placa || "",
      numero_serie: maquina.numero_serie || "",
      tipo_medicion: maquina.tipo_medicion || "horas",
      lectura_actual:
        maquina.lectura_actual !== null &&
        maquina.lectura_actual !== undefined
          ? String(maquina.lectura_actual)
          : "0",
      estado: maquina.estado || "activo",
      fecha_compra: maquina.fecha_compra || "",
      costo_compra:
        maquina.costo_compra !== null &&
        maquina.costo_compra !== undefined
          ? String(maquina.costo_compra)
          : "",
      observaciones: maquina.observaciones || "",
    });

    setMensaje("");
    setError("");
    setMostrarFormulario(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function guardarMaquina(e: React.FormEvent) {
    e.preventDefault();

    if (!fincaId) return;

    if (!formulario.nombre.trim()) {
      setError("Ingresa el nombre de la máquina.");
      return;
    }

    if (!formulario.tipo.trim()) {
      setError("Selecciona el tipo de máquina.");
      return;
    }

    const lectura = Number(formulario.lectura_actual || 0);

    if (Number.isNaN(lectura) || lectura < 0) {
      setError("La lectura actual no puede ser negativa.");
      return;
    }

    if (
      formulario.anio &&
      (Number(formulario.anio) < 1900 ||
        Number(formulario.anio) > new Date().getFullYear() + 1)
    ) {
      setError("Revisa el año de la máquina.");
      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const datos = {
        finca_id: fincaId,
        nombre: formulario.nombre.trim(),
        tipo: formulario.tipo.trim(),
        marca: formulario.marca.trim() || null,
        modelo: formulario.modelo.trim() || null,
        anio: formulario.anio ? Number(formulario.anio) : null,
        placa: formulario.placa.trim() || null,
        numero_serie: formulario.numero_serie.trim() || null,
        tipo_medicion: formulario.tipo_medicion,
        lectura_actual:
          formulario.tipo_medicion === "ninguno" ? 0 : lectura,
        estado: formulario.estado,
        fecha_compra: formulario.fecha_compra || null,
        costo_compra: formulario.costo_compra
          ? Number(formulario.costo_compra)
          : null,
        observaciones: formulario.observaciones.trim() || null,
      };

      if (editandoId) {
        const { error: errorActualizar } = await supabase
          .from("gan_maquinaria")
          .update(datos)
          .eq("id", editandoId)
          .eq("finca_id", fincaId);

        if (errorActualizar) throw errorActualizar;

        await cargarMaquinaria();

        setMensaje("Maquinaria actualizada correctamente.");
        setMostrarFormulario(false);
        setEditandoId(null);
        setFormulario(formularioInicial);
      } else {
        const { error: errorInsertar } = await supabase
          .from("gan_maquinaria")
          .insert(datos);

        if (errorInsertar) throw errorInsertar;

        await cargarMaquinaria();

        setMensaje("Maquinaria registrada correctamente.");
        setMostrarFormulario(false);
        setFormulario(formularioInicial);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "No se pudo guardar la maquinaria.");
    } finally {
      setGuardando(false);
    }
  }

  const resumen = useMemo(() => {
    const total = maquinarias.length;

    const activas = maquinarias.filter(
      (maquina) => maquina.estado === "activo"
    ).length;

    const mantenimiento = maquinarias.filter(
      (maquina) => maquina.estado === "mantenimiento"
    ).length;

    const fueraServicio = maquinarias.filter(
      (maquina) => maquina.estado === "fuera_servicio"
    ).length;

    return {
      total,
      activas,
      mantenimiento,
      fueraServicio,
    };
  }, [maquinarias]);

  function etiquetaEstado(estado: Maquinaria["estado"]) {
    if (estado === "activo") return "Activo";
    if (estado === "mantenimiento") return "Mantenimiento";
    return "Fuera de servicio";
  }

  function etiquetaMedicion(tipo: Maquinaria["tipo_medicion"]) {
    if (tipo === "horas") return "h";
    if (tipo === "km") return "km";
    return "";
  }

  function etiquetaTipo(tipo: string) {
    const tipos: Record<string, string> = {
      tractor: "Tractor",
      camioneta: "Camioneta",
      camion: "Camión",
      motocicleta: "Motocicleta",
      implemento: "Implemento",
      generador: "Generador",
      bomba: "Bomba",
      otro: "Otro",
    };

    return tipos[tipo] || tipo;
  }

  if (cargando) {
    return (
      <>
        <Sidebar />

        <main className="pagina">
          <div className="cargando">Cargando maquinaria...</div>

          <style jsx>{estilos}</style>
        </main>
      </>
    );
  }

  return (
    <>
      <Sidebar />

      <main className="pagina">
        <div className="encabezado">
          <div>
            <div className="eyebrow">OPERACIÓN DE LA FINCA</div>

            <h1>Maquinaria</h1>

            <p>
              Control de tractores, vehículos, implementos y equipos de la
              ganadería.
            </p>
          </div>

          <button className="boton-principal" onClick={nuevaMaquina}>
            + Registrar maquinaria
          </button>
        </div>

        {error && <div className="alerta error">{error}</div>}
        {mensaje && <div className="alerta exito">{mensaje}</div>}

        <section className="resumen">
          <div className="tarjeta-resumen">
            <span>Total maquinaria</span>
            <strong>{resumen.total}</strong>
            <small>Equipos registrados</small>
          </div>

          <div className="tarjeta-resumen">
            <span>Activos</span>
            <strong>{resumen.activas}</strong>
            <small>Disponibles para trabajar</small>
          </div>

          <div className="tarjeta-resumen">
            <span>En mantenimiento</span>
            <strong>{resumen.mantenimiento}</strong>
            <small>Equipos en servicio</small>
          </div>

          <div className="tarjeta-resumen">
            <span>Fuera de servicio</span>
            <strong>{resumen.fueraServicio}</strong>
            <small>No disponibles</small>
          </div>
        </section>

        {mostrarFormulario && (
          <section className="panel formulario-panel">
            <div className="titulo-panel">
              <div>
                <h2>
                  {editandoId
                    ? "Editar maquinaria"
                    : "Registrar nueva maquinaria"}
                </h2>

                <p>
                  {editandoId
                    ? "Puedes modificar la información de esta máquina cuando lo necesites."
                    : "Registra la información principal del equipo."}
                </p>
              </div>

              <button className="boton-cerrar" onClick={cancelar}>
                ×
              </button>
            </div>

            <form onSubmit={guardarMaquina}>
              <div className="form-grid">
                <label>
                  <span>Nombre *</span>
                  <input
                    value={formulario.nombre}
                    onChange={(e) =>
                      actualizarCampo("nombre", e.target.value)
                    }
                    placeholder="Ej. Tractor New Holland 1"
                    required
                  />
                </label>

                <label>
                  <span>Tipo *</span>
                  <select
                    value={formulario.tipo}
                    onChange={(e) =>
                      actualizarCampo("tipo", e.target.value)
                    }
                  >
                    <option value="tractor">Tractor</option>
                    <option value="camioneta">Camioneta</option>
                    <option value="camion">Camión</option>
                    <option value="motocicleta">Motocicleta</option>
                    <option value="implemento">Implemento</option>
                    <option value="generador">Generador</option>
                    <option value="bomba">Bomba</option>
                    <option value="otro">Otro</option>
                  </select>
                </label>

                <label>
                  <span>Marca</span>
                  <input
                    value={formulario.marca}
                    onChange={(e) =>
                      actualizarCampo("marca", e.target.value)
                    }
                    placeholder="Ej. New Holland"
                  />
                </label>

                <label>
                  <span>Modelo</span>
                  <input
                    value={formulario.modelo}
                    onChange={(e) =>
                      actualizarCampo("modelo", e.target.value)
                    }
                    placeholder="Ej. TT4.75"
                  />
                </label>

                <label>
                  <span>Año</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formulario.anio}
                    onChange={(e) =>
                      actualizarCampo("anio", e.target.value)
                    }
                    placeholder="2024"
                  />
                </label>

                <label>
                  <span>Placa</span>
                  <input
                    value={formulario.placa}
                    onChange={(e) =>
                      actualizarCampo("placa", e.target.value)
                    }
                    placeholder="Si corresponde"
                  />
                </label>

                <label>
                  <span>Número de serie / chasis</span>
                  <input
                    value={formulario.numero_serie}
                    onChange={(e) =>
                      actualizarCampo("numero_serie", e.target.value)
                    }
                    placeholder="Número de identificación"
                  />
                </label>

                <label>
                  <span>Estado</span>
                  <select
                    value={formulario.estado}
                    onChange={(e) =>
                      actualizarCampo("estado", e.target.value)
                    }
                  >
                    <option value="activo">Activo</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="fuera_servicio">
                      Fuera de servicio
                    </option>
                  </select>
                </label>

                <label>
                  <span>Control de uso</span>
                  <select
                    value={formulario.tipo_medicion}
                    onChange={(e) =>
                      actualizarCampo("tipo_medicion", e.target.value)
                    }
                  >
                    <option value="horas">Horómetro / horas</option>
                    <option value="km">Kilómetros</option>
                    <option value="ninguno">Sin medición</option>
                  </select>
                </label>

                {formulario.tipo_medicion !== "ninguno" && (
                  <label>
                    <span>
                      {formulario.tipo_medicion === "horas"
                        ? "Horómetro actual"
                        : "Kilometraje actual"}
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={formulario.lectura_actual}
                      onChange={(e) =>
                        actualizarCampo(
                          "lectura_actual",
                          e.target.value
                        )
                      }
                    />
                  </label>
                )}

                <label>
                  <span>Fecha de compra</span>
                  <input
                    type="date"
                    value={formulario.fecha_compra}
                    onChange={(e) =>
                      actualizarCampo(
                        "fecha_compra",
                        e.target.value
                      )
                    }
                  />
                </label>

                <label>
                  <span>Costo de compra</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={formulario.costo_compra}
                    onChange={(e) =>
                      actualizarCampo(
                        "costo_compra",
                        e.target.value
                      )
                    }
                    placeholder="0.00"
                  />
                </label>

                <label className="campo-completo">
                  <span>Observaciones</span>
                  <textarea
                    value={formulario.observaciones}
                    onChange={(e) =>
                      actualizarCampo(
                        "observaciones",
                        e.target.value
                      )
                    }
                    placeholder="Información adicional de la máquina..."
                    rows={4}
                  />
                </label>
              </div>

              <div className="acciones-formulario">
                <button
                  type="button"
                  className="boton-secundario"
                  onClick={cancelar}
                  disabled={guardando}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="boton-principal"
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : editandoId
                    ? "Guardar cambios"
                    : "Registrar maquinaria"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="panel">
          <div className="titulo-panel lista-titulo">
            <div>
              <h2>Inventario de maquinaria</h2>

              <p>
                Equipos y vehículos registrados en Ganadería Tavera.
              </p>
            </div>

            <span className="contador">
              {maquinarias.length}{" "}
              {maquinarias.length === 1 ? "equipo" : "equipos"}
            </span>
          </div>

          {maquinarias.length === 0 ? (
            <div className="vacio">
              <div className="vacio-icono">🚜</div>

              <h3>No hay maquinaria registrada</h3>

              <p>
                Registra el primer tractor, vehículo o equipo de la finca.
              </p>

              <button
                className="boton-principal"
                onClick={nuevaMaquina}
              >
                + Registrar maquinaria
              </button>
            </div>
          ) : (
            <div className="maquinas-grid">
              {maquinarias.map((maquina) => (
                <article className="maquina-card" key={maquina.id}>
                  <div className="maquina-superior">
                    <div className="icono-maquina">
                      {maquina.tipo === "tractor"
                        ? "🚜"
                        : maquina.tipo === "camioneta" ||
                          maquina.tipo === "camion"
                        ? "🚙"
                        : maquina.tipo === "motocicleta"
                        ? "🏍️"
                        : "⚙️"}
                    </div>

                    <div className="maquina-identidad">
                      <span className="tipo">
                        {etiquetaTipo(maquina.tipo)}
                      </span>

                      <h3>{maquina.nombre}</h3>

                      <p>
                        {[maquina.marca, maquina.modelo]
                          .filter(Boolean)
                          .join(" ") || "Sin marca / modelo"}
                      </p>
                    </div>

                    <span
                      className={`estado estado-${maquina.estado}`}
                    >
                      {etiquetaEstado(maquina.estado)}
                    </span>
                  </div>

                  <div className="datos-maquina">
                    <div>
                      <span>
                        {maquina.tipo_medicion === "horas"
                          ? "Horómetro"
                          : maquina.tipo_medicion === "km"
                          ? "Kilometraje"
                          : "Medición"}
                      </span>

                      <strong>
                        {maquina.tipo_medicion === "ninguno"
                          ? "—"
                          : `${Number(
                              maquina.lectura_actual || 0
                            ).toLocaleString(
                              "es-BO"
                            )} ${etiquetaMedicion(
                              maquina.tipo_medicion
                            )}`}
                      </strong>
                    </div>

                    <div>
                      <span>Año</span>
                      <strong>{maquina.anio || "—"}</strong>
                    </div>

                    <div>
                      <span>Placa</span>
                      <strong>{maquina.placa || "—"}</strong>
                    </div>

                    <div>
                      <span>N.º serie</span>
                      <strong>{maquina.numero_serie || "—"}</strong>
                    </div>
                  </div>

                  {maquina.observaciones && (
                    <div className="observacion">
                      {maquina.observaciones}
                    </div>
                  )}

                  <div className="acciones-maquina">
                    <button
                      className="boton-editar"
                      onClick={() =>
                        router.push(`/maquinaria/${maquina.id}`)
                      }
                    >
                      Ver ficha
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <style jsx>{estilos}</style>
      </main>
    </>
  );
}

const estilos = `
  .pagina {
    margin-left: 235px;
    min-height: 100vh;
    background: #f4f7f4;
    padding: 34px;
    color: #17251c;
  }

  .encabezado {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    margin-bottom: 24px;
  }

  .eyebrow {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1.3px;
    color: #67816d;
    margin-bottom: 7px;
  }

  h1 {
    margin: 0;
    font-size: 34px;
    line-height: 1.1;
    color: #173d27;
  }

  .encabezado p,
  .titulo-panel p {
    margin: 8px 0 0;
    color: #6b786e;
    line-height: 1.5;
  }

  .boton-principal {
    border: none;
    background: #1f6b3a;
    color: white;
    padding: 12px 18px;
    border-radius: 10px;
    font-weight: 750;
    font-size: 14px;
    cursor: pointer;
    min-height: 44px;
  }

  .boton-principal:hover {
    background: #195b31;
  }

  .boton-principal:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .boton-secundario {
    border: 1px solid #ccd6ce;
    background: white;
    color: #314238;
    padding: 11px 17px;
    border-radius: 10px;
    font-weight: 700;
    cursor: pointer;
    min-height: 44px;
  }

  .resumen {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 22px;
  }

  .tarjeta-resumen {
    background: white;
    border: 1px solid #e1e8e2;
    border-radius: 15px;
    padding: 20px;
    box-shadow: 0 3px 12px rgba(22, 50, 30, 0.04);
  }

  .tarjeta-resumen span {
    display: block;
    color: #6b786e;
    font-size: 13px;
    font-weight: 650;
  }

  .tarjeta-resumen strong {
    display: block;
    margin: 8px 0 3px;
    color: #173d27;
    font-size: 30px;
    line-height: 1;
  }

  .tarjeta-resumen small {
    color: #8b958d;
    font-size: 12px;
  }

  .panel {
    background: white;
    border: 1px solid #e0e7e1;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 22px;
    box-shadow: 0 3px 14px rgba(20, 50, 29, 0.04);
  }

  .formulario-panel {
    border-top: 4px solid #1f6b3a;
  }

  .titulo-panel {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 22px;
  }

  .titulo-panel h2 {
    margin: 0;
    color: #173d27;
    font-size: 20px;
  }

  .boton-cerrar {
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    border-radius: 50%;
    border: 1px solid #d9e1da;
    background: white;
    color: #526157;
    font-size: 23px;
    line-height: 1;
    cursor: pointer;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 17px;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  label span {
    color: #3f5045;
    font-size: 13px;
    font-weight: 700;
  }

  input,
  select,
  textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #ccd6ce;
    border-radius: 10px;
    background: white;
    color: #1e2e23;
    padding: 11px 12px;
    font-size: 15px;
    outline: none;
    font-family: inherit;
  }

  input,
  select {
    min-height: 44px;
  }

  textarea {
    resize: vertical;
  }

  input:focus,
  select:focus,
  textarea:focus {
    border-color: #3c8656;
    box-shadow: 0 0 0 3px rgba(60, 134, 86, 0.09);
  }

  .campo-completo {
    grid-column: 1 / -1;
  }

  .acciones-formulario {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 22px;
    padding-top: 20px;
    border-top: 1px solid #edf1ed;
  }

  .alerta {
    padding: 13px 15px;
    border-radius: 10px;
    margin-bottom: 18px;
    font-size: 14px;
    font-weight: 650;
  }

  .alerta.error {
    background: #fff0f0;
    color: #9c2929;
    border: 1px solid #f2cccc;
  }

  .alerta.exito {
    background: #edf8f0;
    color: #24633a;
    border: 1px solid #cfe7d5;
  }

  .lista-titulo {
    align-items: center;
  }

  .contador {
    background: #eef5f0;
    color: #2c6440;
    border-radius: 999px;
    padding: 7px 11px;
    font-size: 12px;
    font-weight: 750;
    white-space: nowrap;
  }

  .maquinas-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .maquina-card {
    border: 1px solid #e0e7e1;
    border-radius: 14px;
    padding: 18px;
    background: #fff;
  }

  .maquina-superior {
    display: flex;
    align-items: flex-start;
    gap: 13px;
  }

  .icono-maquina {
    width: 46px;
    height: 46px;
    flex: 0 0 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eef5f0;
    border-radius: 12px;
    font-size: 24px;
  }

  .maquina-identidad {
    flex: 1;
    min-width: 0;
  }

  .maquina-identidad .tipo {
    color: #728078;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    font-size: 10px;
    font-weight: 800;
  }

  .maquina-identidad h3 {
    margin: 3px 0 3px;
    color: #183d27;
    font-size: 17px;
    overflow-wrap: anywhere;
  }

  .maquina-identidad p {
    margin: 0;
    color: #78847c;
    font-size: 13px;
  }

  .estado {
    border-radius: 999px;
    padding: 6px 9px;
    font-size: 10px;
    font-weight: 800;
    white-space: nowrap;
  }

  .estado-activo {
    background: #eaf7ee;
    color: #24713d;
  }

  .estado-mantenimiento {
    background: #fff5dd;
    color: #946813;
  }

  .estado-fuera_servicio {
    background: #f3eeee;
    color: #7d4a4a;
  }

  .datos-maquina {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 9px;
    margin-top: 17px;
  }

  .datos-maquina > div {
    background: #f7f9f7;
    border-radius: 9px;
    padding: 10px;
    min-width: 0;
  }

  .datos-maquina span {
    display: block;
    color: #7b867e;
    font-size: 10px;
    margin-bottom: 4px;
  }

  .datos-maquina strong {
    display: block;
    color: #28382d;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .observacion {
    margin-top: 13px;
    padding: 11px 12px;
    border-radius: 9px;
    background: #fafbfa;
    color: #667269;
    font-size: 12px;
    line-height: 1.45;
  }

  .acciones-maquina {
    display: flex;
    justify-content: flex-end;
    margin-top: 15px;
    padding-top: 14px;
    border-top: 1px solid #edf1ed;
  }

  .boton-editar {
    border: 1px solid #cbd8ce;
    background: white;
    color: #24613a;
    border-radius: 9px;
    padding: 9px 13px;
    font-size: 12px;
    font-weight: 750;
    cursor: pointer;
  }

  .vacio {
    text-align: center;
    padding: 46px 20px;
    color: #718078;
  }

  .vacio-icono {
    font-size: 42px;
    margin-bottom: 8px;
  }

  .vacio h3 {
    margin: 0;
    color: #294233;
  }

  .vacio p {
    margin: 7px 0 18px;
  }

  .cargando {
    padding: 50px;
    text-align: center;
    color: #647168;
  }

  @media (max-width: 1100px) {
    .resumen {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .maquinas-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 820px) {
    .pagina {
      margin-left: 0;
      padding: 88px 14px 28px;
    }

    .encabezado {
      display: block;
      margin-bottom: 18px;
    }

    h1 {
      font-size: 27px;
    }

    .encabezado p {
      font-size: 13px;
    }

    .encabezado .boton-principal {
      width: 100%;
      margin-top: 16px;
    }

    .resumen {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }

    .tarjeta-resumen {
      padding: 15px 13px;
      border-radius: 12px;
    }

    .tarjeta-resumen span {
      font-size: 11px;
    }

    .tarjeta-resumen strong {
      font-size: 25px;
    }

    .tarjeta-resumen small {
      font-size: 10px;
      line-height: 1.3;
      display: block;
    }

    .panel {
      padding: 16px;
      border-radius: 13px;
      margin-bottom: 16px;
    }

    .titulo-panel {
      margin-bottom: 17px;
    }

    .titulo-panel h2 {
      font-size: 17px;
    }

    .titulo-panel p {
      font-size: 12px;
    }

    .form-grid {
      grid-template-columns: 1fr;
      gap: 14px;
    }

    .campo-completo {
      grid-column: auto;
    }

    .acciones-formulario {
      display: grid;
      grid-template-columns: 1fr;
    }

    .acciones-formulario button {
      width: 100%;
    }

    .acciones-formulario .boton-principal {
      grid-row: 1;
    }

    .lista-titulo {
      align-items: flex-start;
    }

    .contador {
      font-size: 10px;
    }

    .maquinas-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .maquina-card {
      padding: 14px;
    }

    .maquina-superior {
      position: relative;
      padding-bottom: 29px;
    }

    .estado {
      position: absolute;
      left: 59px;
      bottom: 0;
    }

    .datos-maquina {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 13px;
    }

    .acciones-maquina {
      display: block;
    }

    .boton-editar {
      width: 100%;
      min-height: 42px;
    }
  }

  @media (max-width: 390px) {
    .resumen {
      grid-template-columns: 1fr 1fr;
    }

    .tarjeta-resumen {
      padding: 13px 11px;
    }
  }
`;
