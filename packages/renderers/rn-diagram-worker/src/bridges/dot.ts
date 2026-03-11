import type { BridgeEngine } from './types';

const VIZ_CDN = 'https://cdn.jsdelivr.net/npm/@viz-js/viz@3.24.0/dist/viz-global.js';

const handleDotJs = `
var _vizInstancePromise = null;

function getVizInstance() {
  if (_vizInstancePromise) return _vizInstancePromise;
  if (typeof Viz === 'undefined' || !Viz || typeof Viz.instance !== 'function') {
    return Promise.reject(new Error('Viz.js runtime is not available in WebView'));
  }
  _vizInstancePromise = Viz.instance();
  return _vizInstancePromise;
}

function handleDot(msg, send) {
  var id = msg.id;
  var options = msg.options || {};
  var layoutEngine = options.layoutEngine || options.engine || 'dot';

  getVizInstance()
    .then(function(viz) {
      var svg = viz.renderString(msg.code, {
        format: 'svg',
        engine: layoutEngine
      });

      var parser = new DOMParser();
      var doc = parser.parseFromString(svg, 'image/svg+xml');
      var svgEl = doc.documentElement;
      if (!svgEl || svgEl.nodeName.toLowerCase() !== 'svg') {
        throw new Error('Graphviz did not return a valid SVG document');
      }

      var width = svgEl.getAttribute('width');
      var height = svgEl.getAttribute('height');
      if (!svgEl.getAttribute('viewBox') && width && height) {
        var svgW = parseFloat(width);
        var svgH = parseFloat(height);
        if (svgW > 0 && svgH > 0) {
          svgEl.setAttribute('viewBox', '0 0 ' + svgW + ' ' + svgH);
        }
      }
      svgEl.removeAttribute('width');
      svgEl.removeAttribute('height');

      var svgStr = new XMLSerializer().serializeToString(svgEl);
      send({ type: 'result', id: id, success: true, format: 'svg', payload: svgStr });
    })
    .catch(function(err) {
      send({ type: 'result', id: id, success: false, error: String(err) });
    });
}
`;

export function createDotBridge(cdnUrl?: string): BridgeEngine {
  return {
    name: 'dot',
    cdnScripts: [cdnUrl ?? VIZ_CDN],
    handleRenderJs: handleDotJs,
  };
}
