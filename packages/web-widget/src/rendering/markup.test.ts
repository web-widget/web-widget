import {
  createPendingBoundary,
  serializeAttributes,
  serializePendingBoundary,
} from './markup';

describe('render protocol', () => {
  it('escapes serialized attribute values consistently', () => {
    expect(
      serializeAttributes({
        disabled: '',
        contextdata: '{"label":"A&B \\"quoted\\""}',
      })
    ).to.equal(
      'disabled contextdata="{&quot;label&quot;:&quot;A&amp;B \\&quot;quoted\\&quot;&quot;}"'
    );
  });

  it('owns pending boundary placement for each root mode', () => {
    expect(
      serializePendingBoundary(createPendingBoundary('light'), '<p>wait</p>')
    ).to.equal(
      '<web-widget-pending aria-busy="true" style="display:contents"><p>wait</p></web-widget-pending>'
    );
    expect(
      serializePendingBoundary(createPendingBoundary('shadow'), '<p>wait</p>')
    ).to.equal(
      '<web-widget-pending aria-busy="true" slot="web-widget-pending" style="display:contents"><p>wait</p></web-widget-pending>'
    );
  });
});
