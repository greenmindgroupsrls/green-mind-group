import Image from "next/image";

// Il marchio Green Mind Group.
//
// Il disegno e' a tratto sottile: sotto i 40px le foglie e le circonvoluzioni
// si impastano e resta una macchia. Per questo il simbolo si usa grande, e
// dove lo spazio e' poco si tiene la scritta accanto invece di rimpicciolire
// ancora il segno.
//
// Il file originale e' nero: sul tema scuro sparirebbe. Le due versioni sono
// due immagini, non un filtro CSS - un'inversione avrebbe schiarito anche i
// bordi morbidi, sporcando il contorno.

type Props = { className?: string; priority?: boolean };

export function MarchioCompleto({ className, priority }: Props) {
  return (
    <>
      <Image
        src="/marchio/logo.png"
        alt="Green Mind Group"
        width={900}
        height={740}
        priority={priority}
        className={`dark:hidden ${className ?? ""}`}
      />
      <Image
        src="/marchio/logo-bianco.png"
        alt=""
        aria-hidden="true"
        width={900}
        height={740}
        priority={priority}
        className={`hidden dark:block ${className ?? ""}`}
      />
    </>
  );
}

export function MarchioSimbolo({ className, priority }: Props) {
  return (
    <>
      <Image
        src="/marchio/simbolo.png"
        alt="Green Mind Group"
        width={512}
        height={581}
        priority={priority}
        className={`dark:hidden ${className ?? ""}`}
      />
      <Image
        src="/marchio/simbolo-bianco.png"
        alt=""
        aria-hidden="true"
        width={512}
        height={581}
        priority={priority}
        className={`hidden dark:block ${className ?? ""}`}
      />
    </>
  );
}
