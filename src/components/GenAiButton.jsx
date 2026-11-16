import Button from '@cloudscape-design/components/button';
import {
  colorBackgroundButtonNormalActive,
  colorBackgroundButtonNormalDefault,
  colorBackgroundButtonNormalDisabled,
  colorBackgroundButtonNormalHover,
  colorBackgroundButtonPrimaryDisabled,
  colorBorderButtonNormalDisabled,
  colorBorderButtonPrimaryDisabled,
  colorTextButtonPrimaryDefault,
  colorTextButtonPrimaryDisabled,
} from '@cloudscape-design/design-tokens';

// Approved deviation D4 (docs/deviations.md): the AWS gen-ai gradient on the entry point buttons.
// Source: Lisa's Figma frames (HR file, section "Demo 2", style "aws gen ai"). Approved by Lisa Nov 16.
// Public Cloudscape gen-ai buttons only add the gen-ai icon (Ingress). This uses the Button style API
// only. No CSS overrides Cloudscape class names, and the Cloudscape focus ring stays as it is.
//
// The gradient is the radial gradient from the Figma button, copied as an SVG (stretched to the
// button size, as in Figma).
const STOPS = [
  ['184,231,255', 0], ['138,212,255', 0.075], ['92,192,255', 0.15], ['69,182,255', 0.1875],
  ['46,173,255', 0.225], ['23,163,255', 0.2625], ['12,158,255', 0.28125], ['0,153,255', 0.3],
  ['12,150,255', 0.31875], ['23,147,255', 0.3375], ['46,140,255', 0.375], ['69,134,255', 0.4125],
  ['92,127,255', 0.45], ['133,117,255', 0.6], ['142,82,255', 0.7], ['150,46,255', 0.8],
];
function gradient(stops) {
  const svg = `<svg viewBox='0 0 184 32' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect width='100%' height='100%' fill='url(%23g)'/><defs><radialGradient id='g' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(-21.685 3.7712 -27.745 -4.8253 200.42 -2.8562)'>${stops
    .map(([rgb, offset]) => `<stop stop-color='rgb(${rgb})' offset='${offset}'/>`)
    .join('')}</radialGradient></defs></svg>`;
  return `url("data:image/svg+xml;utf8,${svg}")`;
}
export const GEN_AI_GRADIENT = gradient(STOPS);

// Primary (filled) variant only: the same gradient, with each stop darker (same hue, lower lightness)
// until white text is at least 4.75:1 on each stop (WCAG AA needs 4.5:1). Measured on the rendered
// button: 4.74:1 at the lowest point (docs/deviations.md, D4 contrast). Lisa's answer, Nov 16 (step 1
// fixes report, item 5). The last stop was already 5.08:1 and is unchanged.
const DARK_STOPS = [
  ['0,120,181', 0], ['0,118,186', 0.075], ['0,119,194', 0.15], ['0,118,194', 0.1875],
  ['0,118,194', 0.225], ['0,117,194', 0.2625], ['0,118,196', 0.28125], ['0,118,196', 0.3],
  ['0,115,203', 0.31875], ['0,113,212', 0.3375], ['0,108,240', 0.375], ['21,102,255', 0.4125],
  ['56,99,255', 0.45], ['106,86,255', 0.6], ['135,72,255', 0.7], ['150,46,255', 0.8],
];
export const GEN_AI_GRADIENT_DARK = gradient(DARK_STOPS);

// Darker layer for hover and active on the filled button, so the state change stays visible.
const shade = (alpha) => `linear-gradient(rgba(0, 7, 22, ${alpha}), rgba(0, 7, 22, ${alpha}))`;
// Solid fill inside the border, gradient under the border (gradient border for the normal variant).
const inside = (color) => `linear-gradient(${color}, ${color}) padding-box`;

const NORMAL_STYLE = {
  root: {
    background: {
      default: `${inside(colorBackgroundButtonNormalDefault)}, ${GEN_AI_GRADIENT} border-box`,
      hover: `${inside(colorBackgroundButtonNormalHover)}, ${GEN_AI_GRADIENT} border-box`,
      active: `${inside(colorBackgroundButtonNormalActive)}, ${GEN_AI_GRADIENT} border-box`,
      disabled: colorBackgroundButtonNormalDisabled,
    },
    borderColor: {
      default: 'transparent',
      hover: 'transparent',
      active: 'transparent',
      disabled: colorBorderButtonNormalDisabled,
    },
  },
};

const PRIMARY_STYLE = {
  root: {
    background: {
      default: `${GEN_AI_GRADIENT_DARK} border-box`,
      hover: `${shade(0.2)} border-box, ${GEN_AI_GRADIENT_DARK} border-box`,
      active: `${shade(0.35)} border-box, ${GEN_AI_GRADIENT_DARK} border-box`,
      disabled: colorBackgroundButtonPrimaryDisabled,
    },
    borderColor: {
      default: 'transparent',
      hover: 'transparent',
      active: 'transparent',
      disabled: colorBorderButtonPrimaryDisabled,
    },
    color: {
      default: colorTextButtonPrimaryDefault,
      hover: colorTextButtonPrimaryDefault,
      active: colorTextButtonPrimaryDefault,
      disabled: colorTextButtonPrimaryDisabled,
    },
  },
};

// Entry point button: gen-ai icon before the text (Button, Ingress), with the gen-ai gradient.
// variant "normal": gradient border, Cloudscape normal text color (as in the frames).
// variant "primary": gradient fill, white text (Product requests frame).
export default function GenAiButton({ variant = 'normal', ...props }) {
  return (
    <Button
      {...props}
      variant={variant}
      iconName="gen-ai"
      style={variant === 'primary' ? PRIMARY_STYLE : NORMAL_STYLE}
      data-gen-ai-button={variant}
    />
  );
}
