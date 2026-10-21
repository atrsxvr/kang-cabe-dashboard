import { Field } from "@/components/common/form-field";
import { NativeSelect } from "@/components/common/native-select";
import { Input } from "@/components/ui/input";
import { BUYER_KINDS, buyerKindLabels, type BuyerKindValue } from "@/lib/buyers";

/**
 * A buyer's own fields, shared by the buyer form and the sale form's "new
 * buyer". The sale form prefixes the names ("buyerName", "buyerLocation"…)
 * so they cannot be mistaken for the sale's; the server reads them back the
 * same way.
 *
 * Location and kind are required, as the owner asked: they are what makes a
 * price comparable — a pengepul at the farm gate and a stall in the market
 * are not paying for the same thing.
 */
export function BuyerFields({
  prefix = "",
  defaults,
  errors,
}: {
  prefix?: string;
  defaults?: {
    name?: string;
    location?: string | null;
    kind?: BuyerKindValue | null;
    whatsapp?: string | null;
  };
  errors: Record<string, string>;
}) {
  const key = (field: string) =>
    prefix ? `${prefix}${field[0].toUpperCase()}${field.slice(1)}` : field;

  return (
    <>
      <Field id={key("name")} label="Nama pembeli" error={errors[key("name")]}>
        <Input
          id={key("name")}
          name={key("name")}
          required
          defaultValue={defaults?.name ?? ""}
          placeholder="Pak Dedi"
          aria-invalid={Boolean(errors[key("name")])}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={key("location")}
          label="Lokasi"
          error={errors[key("location")]}
          hint="Desa, pasar, atau kotanya"
        >
          <Input
            id={key("location")}
            name={key("location")}
            required
            defaultValue={defaults?.location ?? ""}
            placeholder="Pasar Cisarua"
            aria-invalid={Boolean(errors[key("location")])}
          />
        </Field>

        <Field id={key("kind")} label="Jenis" error={errors[key("kind")]}>
          <NativeSelect
            id={key("kind")}
            name={key("kind")}
            required
            defaultValue={defaults?.kind ?? ""}
            aria-invalid={Boolean(errors[key("kind")])}
          >
            <option value="" disabled>
              — pilih jenis —
            </option>
            {BUYER_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {buyerKindLabels[kind]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <Field
        id={key("whatsapp")}
        label="No. WhatsApp (opsional)"
        error={errors[key("whatsapp")]}
      >
        <Input
          id={key("whatsapp")}
          name={key("whatsapp")}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          defaultValue={defaults?.whatsapp ?? ""}
          placeholder="0812 3456 7890"
          aria-invalid={Boolean(errors[key("whatsapp")])}
        />
      </Field>
    </>
  );
}
