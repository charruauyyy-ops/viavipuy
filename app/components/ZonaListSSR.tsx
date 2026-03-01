import { PublicacionItem } from "@/lib/queryPublicaciones";
import ListadoGrid from "./ListadoGrid";
import PlanSeparator from "./PlanSeparator";

interface ZonaListSSRProps {
  title: string;
  subtitle: string;
  emptyTestId: string;
  data: PublicacionItem[];
  basePath: string;
}

export default function ZonaListSSR({
  title,
  subtitle,
  emptyTestId,
  data,
  basePath,
}: ZonaListSSRProps) {
  if (data.length === 0) {
    return (
      <div className="vv-zone-empty" data-testid={emptyTestId}>
        <div className="vv-zone-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="vv-zone-empty-svg">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <h1 className="vv-zone-empty-title" data-testid="text-zone-title">{title}</h1>
        <p className="vv-zone-empty-subtitle" data-testid="text-zone-subtitle">{subtitle}</p>
        <div className="vv-zone-empty-line" />
      </div>
    );
  }

  // Group items by plan
  const grouped = data.reduce(
    (acc, item) => {
      let plan = (item.plan_actual || "general").trim().toLowerCase();
      if (!["diamante", "platino", "plus"].includes(plan)) {
        plan = "general";
      }
      if (!acc[plan]) acc[plan] = [];
      acc[plan].push(item);
      return acc;
    },
    {} as Record<string, PublicacionItem[]>,
  );

  const planOrder = ["diamante", "platino", "plus", "general"];

  return (
    <div className="vv-container" style={{ paddingBottom: '40px' }}>
      <div style={{ padding: '20px 16px 10px' }}>
        <h1 className="vv-section-title" style={{ fontSize: '24px', margin: 0 }}>{title}</h1>
        <p style={{ color: '#999', fontSize: '14px', marginTop: '4px' }}>{data.length} perfiles disponibles</p>
      </div>

      {planOrder.map((plan, index) => {
        const planItems = grouped[plan];
        if (!planItems || planItems.length === 0) return null;

        const gridItems = planItems.map(({ user_id, ...rest }) => ({
          ...rest,
          fotos: rest.fotos || [],
        }));

        return (
          <section
            key={plan}
            className="vv-plan-section"
            style={{
              marginTop: index === 0 ? "6px" : "12px",
              marginBottom: "0",
            }}
          >
            <div style={{ marginBottom: "6px" }}>
              <PlanSeparator plan={plan} />
            </div>
            <ListadoGrid items={gridItems} basePath={basePath} />
          </section>
        );
      })}
    </div>
  );
}
