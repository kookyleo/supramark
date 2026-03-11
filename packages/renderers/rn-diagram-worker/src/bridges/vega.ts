import type { BridgeEngine } from './types';

const VEGA_CDN = 'https://cdn.jsdelivr.net/npm/vega@5';
const VEGA_LITE_CDN = 'https://cdn.jsdelivr.net/npm/vega-lite@5';

const handleVegaJs = `
function handleVega(msg, send) {
  var id = msg.id;

  if (typeof vega === 'undefined' || !vega || typeof vega.parse !== 'function' || typeof vega.View !== 'function') {
    send({ type: 'result', id: id, success: false, error: 'Vega runtime is not available in WebView' });
    return;
  }

  var spec;
  try {
    spec = JSON.parse(msg.code);
  } catch (err) {
    send({ type: 'result', id: id, success: false, error: 'Failed to parse vega JSON: ' + String(err) });
    return;
  }

  var view = null;
  try {
    view = new vega.View(vega.parse(spec), { renderer: 'none' });
    view.toSVG()
      .then(function(svg) {
        try {
          var parser = new DOMParser();
          var doc = parser.parseFromString(svg, 'image/svg+xml');
          var svgEl = doc.documentElement;
          if (!svgEl || svgEl.nodeName.toLowerCase() !== 'svg') {
            throw new Error('Vega did not return a valid SVG document');
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
        } catch (err2) {
          send({ type: 'result', id: id, success: false, error: String(err2) });
        } finally {
          if (view && typeof view.finalize === 'function') {
            try { view.finalize(); } catch (_) {}
          }
        }
      })
      .catch(function(err) {
        if (view && typeof view.finalize === 'function') {
          try { view.finalize(); } catch (_) {}
        }
        send({ type: 'result', id: id, success: false, error: String(err) });
      });
  } catch (err) {
    if (view && typeof view.finalize === 'function') {
      try { view.finalize(); } catch (_) {}
    }
    send({ type: 'result', id: id, success: false, error: String(err) });
  }
}
`;

const handleVegaLiteJs = `
function handleVegalite(msg, send) {
  var id = msg.id;

  if (typeof vega === 'undefined' || !vega || typeof vega.parse !== 'function' || typeof vega.View !== 'function') {
    send({ type: 'result', id: id, success: false, error: 'Vega runtime is not available in WebView' });
    return;
  }
  if (typeof vegaLite === 'undefined' || !vegaLite || typeof vegaLite.compile !== 'function') {
    send({ type: 'result', id: id, success: false, error: 'Vega-Lite runtime is not available in WebView' });
    return;
  }

  var spec;
  try {
    spec = JSON.parse(msg.code);
  } catch (err) {
    send({ type: 'result', id: id, success: false, error: 'Failed to parse vega-lite JSON: ' + String(err) });
    return;
  }

  var view = null;
  try {
    var compiled = vegaLite.compile(spec);
    view = new vega.View(vega.parse(compiled.spec), { renderer: 'none' });
    view.toSVG()
      .then(function(svg) {
        try {
          var parser = new DOMParser();
          var doc = parser.parseFromString(svg, 'image/svg+xml');
          var svgEl = doc.documentElement;
          if (!svgEl || svgEl.nodeName.toLowerCase() !== 'svg') {
            throw new Error('Vega-Lite did not return a valid SVG document');
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
        } catch (err2) {
          send({ type: 'result', id: id, success: false, error: String(err2) });
        } finally {
          if (view && typeof view.finalize === 'function') {
            try { view.finalize(); } catch (_) {}
          }
        }
      })
      .catch(function(err) {
        if (view && typeof view.finalize === 'function') {
          try { view.finalize(); } catch (_) {}
        }
        send({ type: 'result', id: id, success: false, error: String(err) });
      });
  } catch (err) {
    if (view && typeof view.finalize === 'function') {
      try { view.finalize(); } catch (_) {}
    }
    send({ type: 'result', id: id, success: false, error: String(err) });
  }
}
`;

export function createVegaBridge(cdnUrl?: string): BridgeEngine {
  return {
    name: 'vega',
    cdnScripts: [cdnUrl ?? VEGA_CDN],
    handleRenderJs: handleVegaJs,
  };
}

export function createVegaLiteBridge(cdnUrl?: string, vegaCdnUrl?: string): BridgeEngine {
  return {
    name: 'vega-lite',
    cdnScripts: [vegaCdnUrl ?? VEGA_CDN, cdnUrl ?? VEGA_LITE_CDN],
    handleRenderJs: handleVegaLiteJs,
  };
}
