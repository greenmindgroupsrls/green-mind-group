"use client";

import { deleteAddress } from "./actions";

export function DeleteAddressButton({ id }: { id: number }) {
  return (
    <button
      type="button"
      onClick={() => deleteAddress(id)}
      className="text-red-600 dark:text-red-400 text-sm font-medium hover:underline"
    >
      Elimina
    </button>
  );
}
