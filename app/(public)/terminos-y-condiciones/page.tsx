export default function TerminosYCondicionesPage() {
  const terminos = `TÉRMINOS Y CONDICIONES – VIAVIP

ÍNDICE
A. Condiciones Generales
B. Condiciones para Visitantes
C. Condiciones para Anunciantes
D. Política de Privacidad (resumen)
E. Contacto

A. CONDICIONES GENERALES

1. Aceptación
Al acceder o utilizar viavip.com (la "Plataforma"), usted acepta estos Términos. Si no está de acuerdo, debe abandonar el sitio.

2. Definiciones
Plataforma: sitio viavip.com y sus subdominios.
Visitante: usuario que navega sin publicar.
Anunciante: persona mayor de edad que publica anuncios.
Contenido: textos, imágenes, videos o datos subidos por usuarios.
Material del Sitio: diseño, software, base de datos y marcas de VIAVIP.

3. Mayoría de edad
El uso está estrictamente limitado a mayores de 18 años. La Plataforma utiliza etiquetado para adultos con el fin de facilitar controles parentales.

4. Contenido prohibido
Se prohíbe publicar contenido que:
- involucre menores de edad;
- promueva actividades ilegales;
- infrinja derechos de terceros;
- resulte engañoso, fraudulento o difamatorio.

5. Política de tolerancia cero
VIAVIP mantiene tolerancia cero frente a la trata de personas y cooperará con autoridades cuando corresponda.

6. Naturaleza del servicio
VIAVIP funciona únicamente como plataforma de avisos. No actúa como agencia ni participa en acuerdos entre usuarios. No garantiza encuentros ni obtiene beneficios de ellos.

7. Sin relación laboral
La publicación de anuncios no genera vínculo laboral, societario ni de representación entre VIAVIP y los anunciantes.

8. Verificaciones limitadas
VIAVIP puede realizar revisiones razonables, pero no garantiza la identidad real de los usuarios ni la exactitud absoluta de la información publicada. El uso offline es bajo riesgo del usuario.

9. Cookies
La Plataforma utiliza cookies técnicas y analíticas no identificatorias.

10. Modificaciones
VIAVIP puede modificar o discontinuar servicios en cualquier momento y sin obligación de notificación previa.

11. Conducta del usuario
Queda prohibido:
- acosar o suplantar a terceros;
- usar bots o scraping sin autorización;
- distribuir malware;
- utilizar la Plataforma con fines ilícitos.

12. Exclusión de responsabilidad
La Plataforma se ofrece "tal cual". En la máxima medida legal, VIAVIP no será responsable por daños directos o indirectos derivados del uso del sitio.

13. Indemnidad
El usuario se compromete a mantener indemne a VIAVIP frente a reclamos derivados de su uso de la Plataforma o del incumplimiento de estos términos.

14. Política de pagos y reembolsos
Los servicios publicitarios contratados no son reembolsables bajo ninguna circunstancia.

15. Propiedad intelectual
Todo el Material del Sitio está protegido por derechos de propiedad intelectual. Su uso no autorizado está prohibido.

B. CONDICIONES PARA VISITANTES

1. Acceso
La navegación es gratuita y no requiere registro.

2. Uso responsable
El Visitante se compromete a no copiar ni reutilizar contenido sin autorización y a no utilizar la información con fines ilegales.

3. Limitación
VIAVIP no garantiza la exactitud absoluta de los anuncios. El uso de la información es responsabilidad del Visitante.

C. CONDICIONES PARA ANUNCIANTES

1. Registro
El Anunciante debe proporcionar documentación válida que acredite su mayoría de edad.

2. Declaraciones
El Anunciante declara:
- ser mayor de 18 años;
- publicar contenido propio y veraz;
- cumplir la normativa aplicable.

3. Moderación
VIAVIP puede revisar, editar, suspender o eliminar anuncios en cualquier momento y sin previo aviso.

4. Responsabilidad del contenido
El Anunciante es el único responsable del contenido publicado y mantendrá indemne a VIAVIP frente a reclamos de terceros.

5. Licencia de uso
Al publicar, el Anunciante otorga a VIAVIP licencia no exclusiva para mostrar el contenido mientras el anuncio esté activo.

6. Persistencia en buscadores
El Anunciante reconoce que copias en caché o buscadores externos pueden permanecer fuera del control de VIAVIP tras la eliminación.

D. POLÍTICA DE PRIVACIDAD (RESUMEN)

VIAVIP trata los datos conforme a la Ley Nº 18.331 de Uruguay.

Datos recopilados:
- Visitantes: datos técnicos anónimos.
- Anunciantes: datos de registro, contacto e identidad.

Finalidades:
- verificación de edad;
- gestión de anuncios;
- comunicaciones del servicio.

Derechos ARCO:
El usuario puede solicitar acceso, rectificación o eliminación escribiendo a soporte.

Seguridad:
Se aplican medidas técnicas razonables de protección.

E. CONTACTO

Soporte general: admin@viavip.com
Última actualización: 2026`;

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-gray-200">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="mb-6 text-2xl font-semibold text-[#D4AF37] md:text-3xl">
          Términos y Condiciones
        </h1>

        <pre className="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-200">
          {terminos}
        </pre>
      </div>
    </main>
  );
}
