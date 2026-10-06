import type { SVGProps } from 'react';

/**
 * National flag of Rwanda (2:3). Blue upper half, yellow and green quarter bands,
 * 24-ray sun in the fly of the blue band. Colours follow the official specification.
 */
const BLUE = '#00A1DE';
const YELLOW = '#FAD201';
const GREEN = '#20603D';
const SUN = '#E5BE01';

const W = 900;
const H = 600;
const SUN_CX = 735;
const SUN_CY = 160;
const DISC_R = 40;
const RAY_INNER = 52;
const RAY_OUTER = 112;
const RAY_HALF_WIDTH = 7;

function sunRays(): string {
  const parts: string[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI * 2) / 24;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    // perpendicular unit vector for ray base width
    const px = -sin;
    const py = cos;
    const bx1 = SUN_CX + cos * RAY_INNER + px * RAY_HALF_WIDTH;
    const by1 = SUN_CY + sin * RAY_INNER + py * RAY_HALF_WIDTH;
    const bx2 = SUN_CX + cos * RAY_INNER - px * RAY_HALF_WIDTH;
    const by2 = SUN_CY + sin * RAY_INNER - py * RAY_HALF_WIDTH;
    const tx = SUN_CX + cos * RAY_OUTER;
    const ty = SUN_CY + sin * RAY_OUTER;
    parts.push(`M${bx1.toFixed(1)} ${by1.toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}L${bx2.toFixed(1)} ${by2.toFixed(1)}Z`);
  }
  return parts.join('');
}

const RAYS_PATH = sunRays();

export interface RwandaFlagProps extends Omit<SVGProps<SVGSVGElement>, 'viewBox'> {
  /** Accessible title. Defaults to "Flag of Rwanda"; pass an empty string for decorative use. */
  title?: string;
}

export function RwandaFlag({ title = 'Flag of Rwanda', className, ...rest }: RwandaFlagProps) {
  const decorative = title === '';
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : title}
      className={className}
      preserveAspectRatio="xMidYMid slice"
      {...rest}
    >
      {!decorative && <title>{title}</title>}
      <rect width={W} height={H / 2} fill={BLUE} />
      <rect y={H / 2} width={W} height={H / 4} fill={YELLOW} />
      <rect y={(H * 3) / 4} width={W} height={H / 4} fill={GREEN} />
      <circle cx={SUN_CX} cy={SUN_CY} r={DISC_R} fill={SUN} />
      <path d={RAYS_PATH} fill={SUN} />
    </svg>
  );
}
