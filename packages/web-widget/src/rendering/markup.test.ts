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

  it('describes the reserved pending slot boundary', () => {
    expect(createPendingBoundary()).to.deep.equal({
      ariaBusy: true,
      display: 'contents',
      localName: 'div',
      slot: 'web-widget-pending',
    });
    expect(
      serializePendingBoundary(createPendingBoundary(), '<p>wait</p>')
    ).to.equal(
      '<div aria-busy="true" slot="web-widget-pending" style="display:contents"><p>wait</p></div>'
    );
  });
});
