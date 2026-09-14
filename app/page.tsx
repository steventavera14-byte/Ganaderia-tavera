export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f4f7f4",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            color: "#174d2c",
            fontSize: "42px",
            marginBottom: "10px",
          }}
        >
          Ganadería Tavera
        </h1>

        <p
          style={{
            color: "#66736b",
            fontSize: "18px",
          }}
        >
          Sistema de Gestión Ganadera
        </p>
      </div>
    </main>
  );
}
