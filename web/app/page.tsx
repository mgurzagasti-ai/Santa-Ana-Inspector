"use client";

import { Clock, LocateFixed, RefreshCcw } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type CheckinType = "entrada" | "salida";

type Checkin = {
  id: string;
  inspectorId: string;
  inspectorName: string;
  type: CheckinType;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  phoneId?: string;
  notes?: string;
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));

const mapUrl = (checkin: Checkin) =>
  `https://www.openstreetmap.org/export/embed.html?bbox=${checkin.longitude - 0.01}%2C${
    checkin.latitude - 0.01
  }%2C${checkin.longitude + 0.01}%2C${checkin.latitude + 0.01}&layer=mapnik&marker=${
    checkin.latitude
  }%2C${checkin.longitude}`;

export default function Home() {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [filter, setFilter] = useState("todos");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/checkins", { cache: "no-store" });
    const data = (await response.json()) as { checkins: Checkin[] };
    setCheckins(data.checkins);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    if (filter === "todos") return checkins;
    return checkins.filter((item) => item.inspectorId === filter);
  }, [checkins, filter]);

  const inspectors = useMemo(
    () => Array.from(new Map(checkins.map((item) => [item.inspectorId, item.inspectorName])).entries()),
    [checkins]
  );

  const latestByInspector = useMemo(() => {
    const latest = new Map<string, Checkin>();
    for (const item of checkins) {
      const previous = latest.get(item.inspectorId);
      if (!previous || new Date(item.timestamp) > new Date(previous.timestamp)) {
        latest.set(item.inspectorId, item);
      }
    }
    return Array.from(latest.values());
  }, [checkins]);

  const activeCount = latestByInspector.filter((item) => item.type === "entrada").length;
  const exitsToday = checkins.filter((item) => item.type === "salida").length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <Image src="/LogoB.png" alt="Santa Ana" width={260} height={78} priority />
          <div className="brand-title">
            <strong>Inspector</strong>
            <span>Monitor de rastreo y horarios</span>
          </div>
        </div>
        <div className="status-strip">
          <div className="metric">
            <span>Inspectores activos</span>
            <strong>{activeCount}</strong>
          </div>
          <div className="metric">
            <span>Marcas de salida</span>
            <strong>{exitsToday}</strong>
          </div>
          <div className="metric">
            <span>Actualizacion</span>
            <strong>{loading ? "..." : "15s"}</strong>
          </div>
        </div>
      </header>

      <section className="content">
        <div className="panel">
          <div className="panel-header">
            <h1>Ubicacion en tiempo real</h1>
            <div className="toolbar">
              <select className="select" value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="todos">Todos</option>
                {inspectors.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
              <button className="icon-button" type="button" onClick={load} title="Actualizar">
                <RefreshCcw size={18} />
              </button>
            </div>
          </div>

          <div className="map-grid">
            {filtered.slice(0, 6).map((item) => (
              <article className="location-card" key={item.id}>
                <iframe className="map-frame" src={mapUrl(item)} title={`Mapa de ${item.inspectorName}`} />
                <footer>
                  <div>
                    <strong>{item.inspectorName}</strong>
                    <div className="muted">{formatDateTime(item.timestamp)}</div>
                  </div>
                  <span className={`chip ${item.type === "entrada" ? "in" : "out"}`}>{item.type}</span>
                </footer>
              </article>
            ))}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Inspector</th>
                  <th>Marca</th>
                  <th>Horario</th>
                  <th>Latitud</th>
                  <th>Longitud</th>
                  <th>Precision</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>{item.inspectorName}</td>
                    <td>
                      <span className={`chip ${item.type === "entrada" ? "in" : "out"}`}>{item.type}</span>
                    </td>
                    <td>
                      <Clock size={14} /> {formatDateTime(item.timestamp)}
                    </td>
                    <td>{item.latitude.toFixed(6)}</td>
                    <td>{item.longitude.toFixed(6)}</td>
                    <td>{item.accuracyMeters ? `${Math.round(item.accuracyMeters)} m` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="panel">
          <div className="panel-header">
            <h2>APK inspector</h2>
            <LocateFixed size={20} />
          </div>
          <div className="login-preview">
            <div className="phone">
              <div className="phone-screen">
                <Image src="/LogoB.png" alt="Santa Ana" width={220} height={70} />
                <div className="field">
                  <label>Legajo</label>
                  <input value="INS-001" readOnly />
                </div>
                <div className="field">
                  <label>Clave</label>
                  <input value="********" readOnly />
                </div>
                <button className="primary" type="button">Ingresar</button>
                <div className="actions">
                  <button className="primary entry" type="button">Entrada</button>
                  <button className="primary exit" type="button">Salida</button>
                </div>
                <p className="muted">
                  La APK Kotlin envia legajo, horario, latitud, longitud y precision GPS al endpoint del monitor.
                </p>
              </div>
            </div>
          </div>
          <p className="api-note">
            Para conectar tu API ya hecha de colectivos, configurar `COLECTIVOS_API_URL` en el entorno del monitor.
          </p>
        </aside>
      </section>
    </main>
  );
}
