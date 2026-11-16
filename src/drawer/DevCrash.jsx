// DEV ONLY switch for frame 22 (Lisa's answers Nov 16, Q7 option C). No visible control.
// Add ?devCrash=drawer to the URL in `npm run dev`, then open the drawer: this throws inside the drawer.
// AssistantDrawer loads this file only when import.meta.env.DEV is true, so it is not in the Vercel build.
export default function DevCrash() {
  if (new URLSearchParams(window.location.search).get('devCrash') === 'drawer') {
    throw new Error('devCrash=drawer: the drawer threw on purpose (dev-only test switch).');
  }
  return null;
}
