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
      <div className="showcase">
        <h2>Large CSS Showcase</h2>
        <p>
          This page imports more than 8 KB of CSS. The build pipeline keeps it
          as an external stylesheet (<code>&lt;link&gt;</code>) rather than
          inlining it into a <code>&lt;style&gt;</code> tag. View source to
          verify.
        </p>

        <hr className="divider" />

        <div className="grid">
          <div className="card">
            <h3 className="card-title">Card component</h3>
            <p className="card-text">
              A card with hover effect, shadow, and rounded corners.
            </p>
            <div className="card-footer">
              <span className="badge badge-primary">New</span>
              <span className="badge badge-success">Active</span>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Badges</h3>
            <p className="card-text">Colored badges for status indicators.</p>
            <div className="card-footer">
              <span className="badge badge-primary">Primary</span>
              <span className="badge badge-success">Success</span>
              <span className="badge badge-danger">Danger</span>
              <span className="badge badge-warning">Warning</span>
              <span className="badge badge-info">Info</span>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Progress bars</h3>
            <p className="card-text">Animated progress indicators.</p>
            <div className="progress">
              <div
                className="progress-bar progress-bar-primary"
                style={{ width: '75%' }}></div>
            </div>
            <div className="progress">
              <div
                className="progress-bar progress-bar-success"
                style={{ width: '90%' }}></div>
            </div>
          </div>
        </div>

        <div className="grid">
          <div className="card">
            <h3 className="card-title">Buttons</h3>
            <p className="card-text">Various button styles.</p>
            <div className="card-footer">
              <a href="#" className="btn btn-primary">
                Primary
              </a>
              <a href="#" className="btn btn-success">
                Success
              </a>
              <a href="#" className="btn btn-danger">
                Danger
              </a>
              <a href="#" className="btn btn-outline">
                Outline
              </a>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Alerts</h3>
            <div className="alert alert-success">
              Operation completed successfully.
            </div>
            <div className="alert alert-danger">An error occurred.</div>
            <div className="alert alert-warning">Please review your input.</div>
            <div className="alert alert-info">Here is some information.</div>
          </div>

          <div className="card">
            <h3 className="card-title">Stats</h3>
            <div className="stat" style={{ marginBottom: 12 }}>
              <div className="stat-icon">★</div>
              <div>
                <div className="stat-value">12,345</div>
                <div className="stat-label">Total stars</div>
              </div>
            </div>
            <div className="stat">
              <div
                className="stat-icon"
                style={{ background: 'var(--color-success)' }}>
                ✓
              </div>
              <div>
                <div className="stat-value">98%</div>
                <div className="stat-label">Success rate</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
});
