"use client";

import { CalendarDays, Clock, MapPinOff, Pencil, Plus, RefreshCcw, Save, Trash2, UserCog, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type CheckinType = "entrada" | "salida";
type ViewMode = "monitor" | "inspectors";

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

type TrackingPoint = {
  id: string;
  inspectorId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  phoneId?: string;
};

type MapPoint = {
  inspectorId: string;
  inspectorName?: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  source: "rastreo" | "marca";
};

type Inspector = {
  id: string;
  name: string;
  employeeCode: string;
  active: boolean;
};

type InspectorForm = {
  id?: string;
  name: string;
  employeeCode: string;
  pin: string;
  active: boolean;
};

const emptyInspectorForm: InspectorForm = {
  name: "",
  employeeCode: "",
  pin: "",
  active: true
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));

const mapUrl = (point: MapPoint) => {
  const delta = 0.012;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${point.longitude - delta}%2C${
    point.latitude - delta
  }%2C${point.longitude + delta}%2C${point.latitude + delta}&layer=mapnik&marker=${point.latitude}%2C${
    point.longitude
  }`;
};

const toLocalDateValue = (value: Date) => {
  const offsetDate = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
};

const toMonthValue = (value: Date) => toLocalDateValue(value).slice(0, 7);

export default function Home() {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [tracking, setTracking] = useState<TrackingPoint[]>([]);
  const [inspectorRecords, setInspectorRecords] = useState<Inspector[]>([]);
  const [inspectorFilter, setInspectorFilter] = useState("todos");
  const [dayFilter, setDayFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState(() => toMonthValue(new Date()));
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("monitor");
  const [adminOpen, setAdminOpen] = useState(false);
  const [inspectorForm, setInspectorForm] = useState<InspectorForm>(emptyInspectorForm);
  const [inspectorSaving, setInspectorSaving] = useState(false);
  const [inspectorMessage, setInspectorMessage] = useState("");

  const load = async () => {
    setLoading(true);
    const [checkinsResponse, trackingResponse, inspectorsResponse] = await Promise.all([
      fetch("/api/checkins", { cache: "no-store" }),
      fetch("/api/tracking", { cache: "no-store" }),
      fetch("/api/inspectors", { cache: "no-store" })
    ]);
    const checkinsData = (await checkinsResponse.json()) as { checkins: Checkin[] };
    const trackingData = (await trackingResponse.json()) as { tracking: TrackingPoint[] };
    const inspectorsData = (await inspectorsResponse.json()) as { inspectors: Inspector[] };
    setCheckins(checkinsData.checkins);
    setTracking(trackingData.tracking);
    setInspectorRecords(inspectorsData.inspectors);
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
    () =>
      Array.from(
        new Map([
          ...inspectorRecords.map((item) => [item.id, item.name] as const),
          ...checkins.map((item) => [item.inspectorId, item.inspectorName] as const),
          ...tracking.map((item) => [item.inspectorId, item.inspectorId] as const)
        ]).entries()
      ),
    [checkins, tracking, inspectorRecords]
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
  const activeInspectorIds = useMemo(
    () =>
      new Set(
        latestByInspector
          .filter((item) => item.type === "entrada")
          .flatMap((item) => {
            const inspector = inspectorRecords.find(
              (record) => record.id === item.inspectorId || record.employeeCode === item.inspectorId
            );
            return inspector ? [inspector.id, inspector.employeeCode] : [item.inspectorId];
          })
      ),
    [latestByInspector, inspectorRecords]
  );
  const entriesInReport = filtered.filter((item) => item.type === "entrada").length;
  const exitsInReport = filtered.filter((item) => item.type === "salida").length;
  const filteredTracking = useMemo(() => {
    return tracking.filter((item) => {
      const itemDate = toLocalDateValue(new Date(item.timestamp));
      const matchesInspector = inspectorFilter === "todos" || item.inspectorId === inspectorFilter;
      const isActive = activeInspectorIds.has(item.inspectorId);
      const matchesDay = dayFilter ? itemDate === dayFilter : true;
      const matchesMonth = !dayFilter && monthFilter ? itemDate.startsWith(monthFilter) : true;

      return isActive && matchesInspector && matchesDay && matchesMonth;
    });
  }, [tracking, inspectorFilter, dayFilter, monthFilter, activeInspectorIds]);

  const currentMapPoint = useMemo<MapPoint | null>(() => {
    const latestTracking = filteredTracking[0];
    if (latestTracking) {
      const inspector = inspectorRecords.find(
        (record) => record.id === latestTracking.inspectorId || record.employeeCode === latestTracking.inspectorId
      );
      return {
        ...latestTracking,
        inspectorId: inspector?.id ?? latestTracking.inspectorId,
        inspectorName: inspector?.name ?? inspectors.find(([id]) => id === latestTracking.inspectorId)?.[1],
        source: "rastreo"
      };
    }

    const latestCheckin = filtered[0];
    if (!latestCheckin) return null;

    return {
      inspectorId: latestCheckin.inspectorId,
      inspectorName: latestCheckin.inspectorName,
      timestamp: latestCheckin.timestamp,
      latitude: latestCheckin.latitude,
      longitude: latestCheckin.longitude,
      accuracyMeters: latestCheckin.accuracyMeters,
      source: "marca"
    };
  }, [filteredTracking, filtered, inspectorRecords, inspectors]);

  const beginEditInspector = (inspector: Inspector) => {
    setInspectorForm({
      id: inspector.id,
      name: inspector.name,
      employeeCode: inspector.employeeCode,
      pin: "",
      active: inspector.active
    });
    setInspectorMessage("Editando inspector");
  };

  const resetInspectorForm = () => {
    setInspectorForm(emptyInspectorForm);
    setInspectorMessage("");
  };

  const saveInspector = async () => {
    setInspectorSaving(true);
    setInspectorMessage("");

    const response = await fetch("/api/inspectors", {
      method: inspectorForm.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inspectorForm)
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setInspectorMessage(data.error ?? "No se pudo guardar el inspector");
      setInspectorSaving(false);
      return;
    }

    await load();
    setInspectorForm(emptyInspectorForm);
    setInspectorMessage("Inspector guardado");
    setInspectorSaving(false);
  };

  const removeInspector = async (id: string) => {
    const confirmed = window.confirm("Eliminar inspector?");
    if (!confirmed) return;

    const response = await fetch(`/api/inspectors?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setInspectorMessage(data.error ?? "No se pudo eliminar el inspector");
      return;
    }

    await load();
    resetInspectorForm();
    setInspectorMessage("Inspector eliminado");
  };

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
        <nav className="main-nav" aria-label="Navegacion principal">
          <button
            className={`nav-button ${viewMode === "monitor" ? "active" : ""}`}
            type="button"
            onClick={() => setViewMode("monitor")}
          >
            Monitor
          </button>
          <div className="admin-menu">
            <button
              className={`icon-button ${viewMode === "inspectors" ? "active" : ""}`}
              type="button"
              onClick={() => setAdminOpen((current) => !current)}
              title="Administrador"
              aria-label="Administrador"
              aria-expanded={adminOpen}
            >
              <UserCog size={18} />
            </button>
            {adminOpen ? (
              <div className="admin-dropdown">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("inspectors");
                    setAdminOpen(false);
                  }}
                >
                  Inspectores
                </button>
              </div>
            ) : null}
          </div>
        </nav>
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
        {viewMode === "monitor" ? (
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
            {currentMapPoint ? (
              <>
                <iframe
                  className="general-map-frame"
                  src={mapUrl(currentMapPoint)}
                  title="Mapa de ultima ubicacion activa del inspector"
                />
                <div className="general-map-footer">
                  <strong>{currentMapPoint.inspectorName ?? currentMapPoint.inspectorId}</strong>
                  <span>
                    {currentMapPoint.source === "rastreo" ? "rastreo activo" : "ultima marca"} -{" "}
                    {formatDateTime(currentMapPoint.timestamp)} -{" "}
                    {currentMapPoint.latitude.toFixed(6)}, {currentMapPoint.longitude.toFixed(6)}
                  </span>
                </div>
              </>
            ) : (
              <div className="empty-map">
                <MapPinOff size={34} />
                <strong>Sin ubicaciones registradas</strong>
                <span>Marque entrada o salida desde la APK para ver una ubicacion.</span>
              </div>
            )}
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
        ) : (
          <div className="panel admin-panel">
            <div className="panel-header">
              <h1>ABM de inspectores</h1>
              <button className="icon-button" type="button" onClick={resetInspectorForm} title="Nuevo inspector">
                <Plus size={18} />
              </button>
            </div>

            <div className="inspector-editor">
              <label className="filter-field">
                <span>Nombre</span>
                <input
                  className="text-input"
                  value={inspectorForm.name}
                  onChange={(event) => setInspectorForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label className="filter-field">
                <span>Legajo</span>
                <input
                  className="text-input"
                  value={inspectorForm.employeeCode}
                  onChange={(event) => setInspectorForm((current) => ({ ...current, employeeCode: event.target.value }))}
                />
              </label>
              <label className="filter-field">
                <span>Clave</span>
                <input
                  className="text-input"
                  type="password"
                  placeholder={inspectorForm.id ? "Sin cambios" : ""}
                  value={inspectorForm.pin}
                  onChange={(event) => setInspectorForm((current) => ({ ...current, pin: event.target.value }))}
                />
              </label>
              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={inspectorForm.active}
                  onChange={(event) => setInspectorForm((current) => ({ ...current, active: event.target.checked }))}
                />
                <span>Activo</span>
              </label>
              <div className="editor-actions">
                <button className="primary-button" type="button" onClick={saveInspector} disabled={inspectorSaving}>
                  <Save size={16} /> {inspectorSaving ? "Guardando" : "Guardar"}
                </button>
                {inspectorForm.id ? (
                  <button className="clear-button" type="button" onClick={resetInspectorForm}>
                    <X size={16} /> Cancelar
                  </button>
                ) : null}
              </div>
              {inspectorMessage ? <p className="form-message">{inspectorMessage}</p> : null}
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Legajo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectorRecords.map((inspector) => (
                    <tr key={inspector.id}>
                      <td>{inspector.name}</td>
                      <td>{inspector.employeeCode}</td>
                      <td>
                        <span className={`chip ${inspector.active ? "in" : "out"}`}>
                          {inspector.active ? "activo" : "inactivo"}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-button secondary" type="button" onClick={() => beginEditInspector(inspector)} title="Editar">
                            <Pencil size={16} />
                          </button>
                          <button className="icon-button danger" type="button" onClick={() => removeInspector(inspector.id)} title="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {inspectorRecords.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty-cell">
                        No hay inspectores cargados
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
