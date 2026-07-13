import './(css)/large.css';
import { defineMeta, defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from './(components)/BaseLayout';

export const meta = defineMeta({
  title: 'Large CSS',
  description:
    'This route imports a CSS file exceeding the inline threshold (8 KB), so the CSS is served as an external <link> tag instead of an inlined <style> tag.',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Large CSS</h1>
      <p>
        When a route imports more than 8 KB of CSS, the build emits it as an
        external file instead of inlining it. View source to verify the{' '}
        <code>&lt;link&gt;</code> tag.
      </p>

      <h2>Card components</h2>
      <div className="lc-grid">
        <div className="lc-card">
          <h3 className="lc-card-title">Hover effect</h3>
          <p className="lc-card-text">
            A card with hover effect, shadow, and rounded corners.
          </p>
          <div className="lc-card-footer">
            <span className="lc-badge lc-badge-primary">New</span>
            <span className="lc-badge lc-badge-success">Active</span>
          </div>
        </div>

        <div className="lc-card">
          <h3 className="lc-card-title">Badges</h3>
          <p className="lc-card-text">Colored badges for status indicators.</p>
          <div className="lc-card-footer">
            <span className="lc-badge lc-badge-primary">Primary</span>
            <span className="lc-badge lc-badge-success">Success</span>
            <span className="lc-badge lc-badge-danger">Danger</span>
            <span className="lc-badge lc-badge-warning">Warning</span>
            <span className="lc-badge lc-badge-info">Info</span>
          </div>
        </div>

        <div className="lc-card">
          <h3 className="lc-card-title">Progress bars</h3>
          <p className="lc-card-text">Animated progress indicators.</p>
          <div className="lc-progress">
            <div
              className="lc-progress-bar lc-progress-primary"
              style={{ width: '75%' }}></div>
          </div>
          <div className="lc-progress">
            <div
              className="lc-progress-bar lc-progress-success"
              style={{ width: '90%' }}></div>
          </div>
        </div>
      </div>

      <h2>Buttons &amp; alerts</h2>
      <div className="lc-grid">
        <div className="lc-card">
          <h3 className="lc-card-title">Buttons</h3>
          <p className="lc-card-text">Various button styles.</p>
          <div className="lc-card-footer">
            <a href="#" className="lc-btn lc-btn-primary">
              Primary
            </a>
            <a href="#" className="lc-btn lc-btn-success">
              Success
            </a>
            <a href="#" className="lc-btn lc-btn-danger">
              Danger
            </a>
            <a href="#" className="lc-btn lc-btn-outline">
              Outline
            </a>
          </div>
        </div>

        <div className="lc-card">
          <h3 className="lc-card-title">Alerts</h3>
          <div className="lc-alert lc-alert-success">
            Operation completed successfully.
          </div>
          <div className="lc-alert lc-alert-danger">An error occurred.</div>
          <div className="lc-alert lc-alert-warning">
            Please review your input.
          </div>
          <div className="lc-alert lc-alert-info">
            Here is some information.
          </div>
        </div>

        <div className="lc-card">
          <h3 className="lc-card-title">Stats</h3>
          <div className="lc-stat" style={{ marginBottom: 12 }}>
            <div className="lc-stat-icon">★</div>
            <div>
              <div className="lc-stat-value">12,345</div>
              <div className="lc-stat-label">Total stars</div>
            </div>
          </div>
          <div className="lc-stat">
            <div
              className="lc-stat-icon"
              style={{ background: 'var(--sk-green)' }}>
              ✓
            </div>
            <div>
              <div className="lc-stat-value">98%</div>
              <div className="lc-stat-label">Success rate</div>
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
});
