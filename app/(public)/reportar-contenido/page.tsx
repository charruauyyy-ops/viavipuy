export default function ReportarContenidoPage() {
  const email = "admin@viavip.com";
  const whatsappNumber = "598XXXXXXXX";
  const whatsappMsg = encodeURIComponent(
    "Hola VIAVIP, quiero reportar contenido. Detalles: (pegar link del perfil/publicación) ..."
  );
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMsg}`;

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-gray-200">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="mb-6 text-2xl font-semibold text-[#D4AF37] md:text-3xl">
          Reportar Contenido
        </h1>

        <div className="space-y-4 text-[15px] leading-relaxed text-gray-200">
          <p>
            Para denunciar un contenido, por favor contáctese a{" "}
            <a
              className="text-[#D4AF37] underline underline-offset-4 hover:opacity-90"
              href={`mailto:${email}`}
            >
              {email}
            </a>{" "}
            o envíenos un WhatsApp haciendo click aquí.
          </p>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-[#D4AF37] px-5 py-3 font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
          >
            Hacer click aquí (WhatsApp)
          </a>

          <p className="text-xs text-gray-400">
            Sugerencia: incluya el enlace del perfil/publicación y una breve
            descripción del motivo del reporte.
          </p>
        </div>
      </div>
    </main>
  );
}
