export default function PoliticaDePrivacidadPage() {
  const politica = `POLÍTICA DE PRIVACIDAD – VIAVIP

Introducción
VIAVIP se compromete a proteger la privacidad de sus usuarios conforme a la Ley Nº 18.331 de Protección de Datos Personales de Uruguay y demás normativa aplicable. La presente Política describe cómo se recopila, utiliza y protege la información dentro de la plataforma.

Datos de contacto
Correo electrónico: admin@viavip.com

Información que recopilamos

3.1. Visitantes
VIAVIP no recopila información que permita identificar personalmente a los visitantes que navegan sin registrarse. Únicamente se utilizan cookies técnicas y analíticas conforme a lo indicado en el apartado de Cookies.

3.2. Anunciantes
Para la creación y gestión de publicaciones, VIAVIP puede recopilar los siguientes datos de los anunciantes:
- nombre o alias
- correo electrónico
- número de teléfono
- fotografías y material multimedia
- documento de identidad para verificación de mayoría de edad

Esta información no se comercializa ni se cede a terceros con fines comerciales. Solo podrá ser comunicada a autoridades competentes cuando exista orden judicial válida o indicios razonables de actividad ilícita conforme a la legislación vigente.

Finalidades del tratamiento de la información de anunciantes
Los datos de los anunciantes se utilizan exclusivamente para:
- verificar identidad y mayoría de edad
- permitir la publicación y administración de anuncios
- gestionar la cuenta del anunciante
- enviar comunicaciones relacionadas con el servicio de VIAVIP (incluyendo promociones propias), siempre con opción de cancelación de suscripción

Legitimación
El tratamiento de datos se basa en:
- el consentimiento del titular
- la ejecución de la relación contractual de servicios publicitarios dentro de la plataforma

Cookies
VIAVIP utiliza cookies propias y de terceros con fines técnicos, de preferencia y de análisis estadístico anónimo.
Estas cookies permiten:
- recordar configuraciones del usuario
- mejorar la experiencia de navegación
- obtener métricas agregadas de uso

El Usuario puede configurar su navegador para rechazar o eliminar cookies. Al continuar navegando en la plataforma, se entiende que acepta su utilización.

Seguridad de la información
VIAVIP aplica medidas técnicas y organizativas razonables para proteger la información, incluyendo:
- cifrado de comunicaciones cuando corresponde
- controles de acceso internos
- registro de eventos de seguridad

No obstante, el usuario reconoce que ningún sistema en Internet es absolutamente invulnerable.

Derechos de los titulares (ARCO)
El Usuario podrá ejercer en cualquier momento sus derechos de:
- acceso
- rectificación
- actualización
- supresión

mediante solicitud enviada a: admin@viavip.com
VIAVIP podrá requerir verificación de identidad antes de procesar la solicitud.

Cambios en la Política
VIAVIP podrá actualizar la presente Política de Privacidad en cualquier momento. Las modificaciones se publicarán en esta misma página indicando la fecha de última actualización.

Fecha de última actualización: 2026`;

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-gray-200">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="mb-6 text-2xl font-semibold text-[#D4AF37] md:text-3xl">
          Política de Privacidad
        </h1>

        <pre className="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-200">
          {politica}
        </pre>
      </div>
    </main>
  );
}
