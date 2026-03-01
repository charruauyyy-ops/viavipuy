export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function makeServiceSlug(nombre: string, id: string): string {
  return `${slugify(nombre)}-${id}`;
}

export function parseServiceSlug(slug: string): { uuid: string | null; nameSlug: string } {
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const match = slug.match(uuidPattern);
  if (match) {
    const nameSlug = slug.slice(0, slug.length - match[0].length).replace(/-$/, "");
    return { uuid: match[0], nameSlug };
  }
  return { uuid: null, nameSlug: slug };
}
