import Badge from '@cloudscape-design/components/badge';
import { COPY } from '../../shared/copy.js';

// Approved deviation, decision 33 (logged in docs/deviations.md, D1): purple "Approved for purchase" badge.
// Cloudscape Badge has no purple color and says to avoid badges for status. Lisa decided to keep it
// (spec row 1 open question 2, Nov 14). The color is the console badge color from Lisa's
// private-marketplace-prototype (style.css .badge--pmp, #3759ce). Cloudscape has no design token for it.
const PMP_BADGE_COLOR = '#3759ce';

export default function ApprovedBadge() {
  return (
    <Badge style={{ root: { background: PMP_BADGE_COLOR, borderColor: PMP_BADGE_COLOR, color: '#ffffff' } }}>
      {COPY.approvedBadge}
    </Badge>
  );
}
