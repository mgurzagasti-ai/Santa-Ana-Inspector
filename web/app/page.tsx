"use client";

import { CalendarDays, Clock, RefreshCcw } from "lucide-react";
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

const generalMapUrl =
  "https://www.openstreetmap.org/export/embed.html?bbox=-65.3600%2C-24.2300%2C-65.2500%2C-24.1400&layer=mapnik&marker=-24.1858%2C-65.2995";

const toLocalDateValue = (value: Date) => {
  const offsetDate = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
};

const toMonthValue = (value: Date) => toLocalDateValue(value).slice(0, 7);

export default function Home() {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [inspectorFilter, setInspectorFilter] = useState("todos");
  const [dayFilter, setDayFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState(() => toMonthValue(new Date()));
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
    return checkins.filter((item) => {
      const itemDate = toLocalDateValue(new Date(item.timestamp));
      const matchesInspector = inspectorFilter === "todos" || item.inspectorId === inspectorFilter;
      const matchesDay = dayFilter ? itemDate === dayFilter : true;
      const matchesMonth = !dayFilter && monthFilter ? itemDate.startsWith(monthFilter) : true;

      return matchesInspector && matchesDay && matchesMonth;
    });
  }, [checkins, inspectorFilter, dayFilter, monthFilter]);

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
  const entriesInReport = filtered.filter((item) => item.type === "entrada").length;
  const exitsInReport = filtered.filter((item) => item.type === "salida").length;

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
            <span>Entradas filtradas</span>
            <strong>{entriesInReport}</strong>
          </div>
          <div className="metric">
            <span>Salidas filtradas</span>
            <strong>{exitsInReport}</strong>
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
            <h1>Registros de marcas</h1>
            <div className="toolbar">
              <button className="icon-button" type="button" onClick={load} title="Actualizar">
                <RefreshCcw size={18} />
              </button>
            </div>
          </div>

          <div className="general-map">
            <iframe
              className="general-map-frame"
              src={generalMapUrl}
              title="Mapa general de San Salvador de Jujuy"
            />
            <div className="general-map-footer">
              <strong>San Salvador de Jujuy</strong>
              <span>{filtered.length} marcas visibles</span>
            </div>
          </div>

          <div className="filters-bar">
            <label className="filter-field">
              <span>Inspector</span>
              <select
                className="select"
                value={inspectorFilter}
                onChange={(event) => setInspectorFilter(event.target.value)}
              >
                <option value="todos">Todos</option>
                {inspectors.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Dia</span>
              <input className="date-input" type="date" value={dayFilter} onChange={(event) => setDayFilter(event.target.value)} />
            </label>
            <label className="filter-field">
              <span>Mes</span>
              <input
                className="date-input"
                type="month"
                value={monthFilter}
                onChange={(event) => setMonthFilter(event.target.value)}
                disabled={Boolean(dayFilter)}
              />
            </label>
            <button
              className="clear-button"
              type="button"
              onClick={() => {
                setInspectorFilter("todos");
                setDayFilter("");
                setMonthFilter("");
              }}
            >
              Limpiar
            </button>
          </div>

          <div className="report-summary">
            <div>
              <CalendarDays size={18} />
              <strong>{filtered.length}</strong>
              <span>marcas</span>
            </div>
            <div>
              <span className="chip in">entrada</span>
              <strong>{entriesInReport}</strong>
            </div>
            <div>
              <span className="chip out">salida</span>
              <strong>{exitsInReport}</strong>
            </div>
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
      </section>
    </main>
  );
}
