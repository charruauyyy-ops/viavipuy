import Link from "next/link";

interface Props {
  currentCat: string;
  basePath: string;
  searchParams: any;
}

export default function MiniCategoryTabs({ currentCat, basePath, searchParams }: Props) {
  const cats = [
    { id: "mujer", label: "Mujeres" },
    { id: "hombre", label: "Hombres" },
    { id: "trans", label: "Trans" },
  ];

  return (
    <div className="vv-container" style={{ padding: "0 16px 10px" }}>
      <div style={{ display: "flex", gap: "8px" }}>
        {cats.map((cat) => {
          const isActive = currentCat === cat.id;
          const params = new URLSearchParams();
          Object.entries(searchParams).forEach(([k, v]) => {
            if (k !== "cat") {
              if (Array.isArray(v)) v.forEach(val => params.append(k, val as string));
              else if (v) params.set(k, v as string);
            }
          });
          params.set("cat", cat.id);
          
          return (
            <Link
              key={cat.id}
              href={`${basePath}?${params.toString()}`}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                textAlign: "center",
                border: "1px solid",
                borderColor: isActive ? "var(--gold, #c6a75e)" : "#1e1e1e",
                background: isActive ? "rgba(198, 167, 94, 0.1)" : "#141414",
                color: isActive ? "var(--gold, #c6a75e)" : "#999",
                textDecoration: "none",
                transition: "all 0.2s",
              }}
            >
              {cat.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
