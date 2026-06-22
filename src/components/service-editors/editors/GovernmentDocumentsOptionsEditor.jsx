export default function GovernmentDocumentsOptionsEditor({
  serviceKey,
  opts = {},
  onChangeOptions,
}) {
  const update = (patch) => onChangeOptions?.({ ...patch });
  const isBirthCertificate = serviceKey === "acta-nacimiento";
  const isTaxCertificate = serviceKey === "constancia-situacion-fiscal";

  return (
    <div className="space-y-4 text-[13px] leading-snug">
      {isBirthCertificate && (
        <div>
          <label
            htmlFor="document-curp"
            className="label mb-1 text-[11px] uppercase tracking-[0.16em] text-slate-300/80"
          >
            CURP <span className="text-red-300">*</span>
          </label>
          <input
            id="document-curp"
            className="input h-10 font-mono uppercase"
            value={opts.documentCurp || ""}
            maxLength={18}
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="18 caracteres"
            onChange={(event) =>
              update({
                documentCurp: event.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, ""),
              })
            }
          />
          <p className="mt-1.5 text-[11px] text-slate-400">
            Para solicitar el acta de nacimiento solo necesitamos la CURP.
          </p>
        </div>
      )}

      {isTaxCertificate && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="document-rfc"
              className="label mb-1 text-[11px] uppercase tracking-[0.16em] text-slate-300/80"
            >
              RFC <span className="text-red-300">*</span>
            </label>
            <input
              id="document-rfc"
              className="input h-10 font-mono uppercase"
              value={opts.documentRfc || ""}
              maxLength={13}
              required
              autoComplete="off"
              spellCheck={false}
              placeholder="RFC con homoclave"
              onChange={(event) =>
                update({
                  documentRfc: event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9&Ñ]/g, ""),
                })
              }
            />
          </div>
          <div>
            <label
              htmlFor="document-idcif"
              className="label mb-1 text-[11px] uppercase tracking-[0.16em] text-slate-300/80"
            >
              ID de CIF <span className="text-red-300">*</span>
            </label>
            <input
              id="document-idcif"
              className="input h-10 font-mono uppercase"
              value={opts.documentIdCif || ""}
              required
              autoComplete="off"
              spellCheck={false}
              placeholder="ID de la cédula fiscal"
              onChange={(event) =>
                update({
                  documentIdCif: event.target.value
                    .toUpperCase()
                    .replace(/\s/g, ""),
                })
              }
            />
          </div>
          <p className="text-[11px] text-slate-400 sm:col-span-2">
            Para la constancia de situación fiscal necesitamos RFC e ID de CIF.
          </p>
        </div>
      )}

      {!isBirthCertificate && !isTaxCertificate && (
        <div className="rounded-lg border border-blue-400/20 bg-blue-500/5 px-4 py-3 text-sm text-slate-300">
          Agrega en notas los datos que tengas del acta. Te contactaremos para
          confirmar la información necesaria antes de realizar el trámite.
        </div>
      )}

      <div>
        <label
          htmlFor={`document-notes-${serviceKey}`}
          className="label mb-1 text-[11px] uppercase tracking-[0.16em] text-slate-300/80"
        >
          Notas <span className="normal-case tracking-normal text-slate-500">(opcional)</span>
        </label>
        <textarea
          id={`document-notes-${serviceKey}`}
          className="input min-h-[72px] py-2"
          value={opts.documentNotes || ""}
          placeholder="Información adicional para localizar o preparar el documento"
          onChange={(event) => update({ documentNotes: event.target.value })}
        />
      </div>
    </div>
  );
}
