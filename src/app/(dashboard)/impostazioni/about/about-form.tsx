"use client";

import { useActionState } from "react";
import { updateAbout, type AboutState } from "./actions";

const initialState: AboutState = { error: null, success: false };

const inputClass =
  "glass-input px-3.5 py-2.5 text-sm";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

function SocialField({
  name,
  label,
  prefix,
  defaultValue,
}: {
  name: string;
  label: string;
  prefix: string;
  defaultValue: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <div className={`${inputClass} flex items-center gap-0 p-0 overflow-hidden`}>
        <span className="pl-3.5 text-gray-500 dark:text-gray-400 text-sm shrink-0">{prefix}</span>
        <input
          name={name}
          defaultValue={defaultValue}
          className="flex-1 bg-transparent px-1 py-2.5 pr-3.5 outline-none"
        />
      </div>
    </label>
  );
}

export function AboutForm({
  about,
  linkedin,
  facebook,
  instagram,
}: {
  about: string;
  linkedin: string;
  facebook: string;
  instagram: string;
}) {
  const [state, formAction, pending] = useActionState(updateAbout, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>About</span>
        <textarea
          name="about"
          required
          rows={5}
          defaultValue={about}
          className={inputClass}
          placeholder="Raccontati in poche righe: chi sei, cosa offri, perché lavorare con te."
        />
      </label>

      <SocialField name="linkedin" label="LinkedIn" prefix="linkedin.com/" defaultValue={linkedin} />
      <SocialField name="facebook" label="Facebook" prefix="facebook.com/" defaultValue={facebook} />
      <SocialField name="instagram" label="Instagram" prefix="instagram.com/" defaultValue={instagram} />

      <button
        type="submit"
        disabled={pending}
        className="self-start glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Salvataggio..." : "Salva"}
      </button>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 rounded-lg px-3 py-2">
          Salvato.
        </p>
      )}
    </form>
  );
}
